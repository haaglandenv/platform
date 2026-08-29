import type { PublicState, Role, SeedData } from "@/lib/types";

export function publicProjection(
  data: SeedData & { runtime: NonNullable<SeedData["runtime"]> },
): PublicState {
  return {
    meta: data.meta,
    clubs: data.clubs,
    teams: data.teams,
    tournaments: data.tournaments,
    matches: data.matches,
    liveEvents: data.liveEvents,
    runtime: {
      favorites: data.runtime.favorites,
      votes: data.runtime.votes,
      mediaSubmissions: data.runtime.mediaSubmissions
        .filter((item) => item.status === "GOEDGEKEURD" && item.rights.website)
        .map(({ id, name, status }) => ({
          id,
          name,
          status,
        })),
      notifications: data.runtime.notifications.filter(
        (item) => item.role === "all" || item.role === "supporter",
      ),
      notificationSettings: data.runtime.notificationSettings,
      pushPermission: data.runtime.pushPermission,
      matchEvents: data.runtime.matchEvents.filter((item) => !item.corrected),
      matchMetrics: data.runtime.matchMetrics,
      rules: data.runtime.rules,
      matchReport: { publicSummary: data.runtime.matchReport.publicSummary },
    },
  };
}

export function scopedProjection(
  data: SeedData & { runtime: NonNullable<SeedData["runtime"]> },
  role: Role,
) {
  if (role === "supporter") return publicProjection(data);
  const base = {
    ...data,
    demoUsers: data.demoUsers.map((user) => ({
      id: user.id,
      name: user.name,
      roleId: user.roleId,
      scopeIds: user.scopeIds,
    })),
  };
  if (role === "team" || role === "association") {
    return {
      ...base,
      players: data.players.filter((player) => player.teamId === "team_duindorp_1"),
      rosters: data.rosters.filter((roster) => roster.teamId === "team_duindorp_1"),
      runtime: {
        ...data.runtime,
        audit: data.runtime.audit.filter((event) => event.actor === role),
        checkNotes: {},
        securityEvents: [],
        interruptionSnapshots: [],
        disciplinaryCases: [],
        matchReport: { publicSummary: data.runtime.matchReport.publicSummary, internalNote: "" },
        notifications: data.runtime.notifications.filter(
          (item) => item.role === "all" || item.role === role,
        ),
      },
    };
  }
  if (role === "referee") {
    const allowedIds = new Set([
      ...data.runtime.homeSelectedPlayerIds,
      ...data.runtime.selectedPlayerIds,
    ]);
    return {
      ...base,
      players: data.players.filter((player) => allowedIds.has(player.id)),
      rosters: [],
      runtime: {
        ...data.runtime,
        audit: data.runtime.audit.filter(
          (event) => event.actor === "referee" || event.entity === data.scenario.matchId,
        ),
        securityEvents: [],
        notifications: data.runtime.notifications.filter(
          (item) => item.role === "all" || item.role === role,
        ),
      },
    };
  }
  if (role === "matchops") {
    return {
      ...base,
      players: [],
      rosters: [],
      runtime: {
        ...data.runtime,
        checkNotes: {},
        playerApprovals: {},
        audit: data.runtime.audit.filter(
          (event) => event.actor === "matchops" || event.entity === data.scenario.matchId,
        ),
        securityEvents: [],
        matchReport: { publicSummary: data.runtime.matchReport.publicSummary, internalNote: "" },
        notifications: data.runtime.notifications.filter(
          (item) => item.role === "all" || item.role === role,
        ),
      },
    };
  }
  if (role === "press") {
    const lineupVisible =
      data.runtime.pressPermissions.names && data.runtime.pressPermissions.lineups;
    return {
      ...base,
      players: data.runtime.pressPermissions.names
        ? data.players.map(({ id, teamId, name, shirtNumber, position }) => ({
            id,
            teamId,
            name,
            shirtNumber: data.runtime.pressPermissions.shirtNumbers ? shirtNumber : 0,
            position,
          }))
        : [],
      rosters: [],
      runtime: {
        ...data.runtime,
        selectedPlayerIds: lineupVisible ? data.runtime.selectedPlayerIds : [],
        homeSelectedPlayerIds: lineupVisible ? data.runtime.homeSelectedPlayerIds : [],
        lineupSnapshot: lineupVisible
          ? data.runtime.lineupSnapshot
          : {
              version: data.runtime.lineupSnapshot.version,
              starters: [],
              substitutes: [],
              captainId: null,
              goalkeeperId: null,
            },
        checks: {},
        checkNotes: {},
        playerApprovals: {},
        audit: [],
        securityEvents: [],
        messages: [],
        interruptionSnapshots: [],
        fixtureChangeRequests: [],
        disciplinaryCases: [],
        suspendedPlayerIds: [],
        mediaSubmissions: data.runtime.mediaSubmissions.filter(
          (item) =>
            item.status === "IN_MODERATIE" ||
            (data.runtime.pressPermissions.media && item.status === "GOEDGEKEURD"),
        ),
        matchReport: { publicSummary: data.runtime.matchReport.publicSummary, internalNote: "" },
        notifications: data.runtime.notifications.filter(
          (item) => item.role === "all" || item.role === role,
        ),
      },
    };
  }
  if (role === "photographer") {
    return {
      ...publicProjection(data),
      runtime: {
        ...publicProjection(data).runtime,
        mediaSubmissions: data.runtime.mediaSubmissions.filter(
          (item) => item.uploaderRole === "photographer",
        ),
        notifications: data.runtime.notifications.filter(
          (item) => item.role === "all" || item.role === role,
        ),
      },
    };
  }
  return base;
}
