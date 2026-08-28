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
      mediaSubmissions: data.runtime.mediaSubmissions,
      notifications: data.runtime.notifications.filter(
        (item) => item.role === "all" || item.role === "supporter",
      ),
      notificationSettings: data.runtime.notificationSettings,
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
        notifications: data.runtime.notifications.filter(
          (item) => item.role === "all" || item.role === role,
        ),
      },
    };
  }
  if (role === "referee") {
    const allowedIds = new Set(data.runtime.selectedPlayerIds);
    return {
      ...base,
      players: data.players.filter((player) => allowedIds.has(player.id)),
      rosters: [],
      runtime: {
        ...data.runtime,
        notifications: data.runtime.notifications.filter(
          (item) => item.role === "all" || item.role === role,
        ),
      },
    };
  }
  return base;
}
