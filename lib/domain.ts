import type { Match, Player, Role, RuntimeData, SeedData } from "@/lib/types";

export const roleLabels: Record<Role, string> = {
  leadership: "Toernooileiding",
  association: "Verenigingsmanager",
  team: "Teammanager",
  referee: "Scheidsrechter",
  supporter: "Supporter",
};

export function defaultRuntime(): RuntimeData {
  return {
    clockPreset: "preT60",
    rosterStatus: "INCOMPLEET",
    lineupStatus: "NIET_GESTART",
    selectedPlayerIds: [],
    checks: {},
    discrepancy: "NONE",
    favorites: ["club_duindorp", "tournament_swc_2026"],
    votes: [],
    notificationSettings: { match: true, news: true, club: true },
    notifications: [
      {
        id: "n-roster-missing",
        title: "Spelerslijst mist twee gegevens",
        detail: "Vul de pasfoto en het referentienummer van Niels Kramer aan.",
        href: "/beheer/team/spelerslijst",
        read: false,
        role: "team",
      },
      {
        id: "n-match",
        title: "Quick – Duindorp SV nadert",
        detail: "Kwartfinale · zaterdag 20:00 · Nieuw Hanenburg.",
        href: "/wedstrijden/quick-duindorp-sv",
        read: false,
        role: "all",
      },
    ],
    audit: [
      {
        id: "audit-baseline",
        timestamp: "2026-09-12T16:30:00+02:00",
        actor: "association",
        action: "TEAM_REGISTERED",
        entity: "team_duindorp_1",
        before: "NIET_INGESCHREVEN",
        after: "INGESCHREVEN",
      },
    ],
    messages: [
      {
        id: "message-1",
        from: "Toernooicommissie",
        body: "Controleer de spelerslijst vóór de deadline van vrijdag 18:00.",
        at: "2026-09-11T10:00:00+02:00",
      },
    ],
    mediaSubmissions: [],
    matchReport: { publicSummary: "", internalNote: "" },
    resultConfirmations: { home: false, away: false },
    draftTournaments: [],
    teamAssignment: "Demo Teammanager",
    clubProfile: {
      contactVisible: false,
      venueNote: "Hoofdveld via ingang Houtrustweg",
      excluded: false,
    },
    tournamentFinalized: false,
    seasonLocked: false,
  };
}

export function hydrateState(seed: SeedData): SeedData & { runtime: RuntimeData } {
  return { ...seed, runtime: { ...defaultRuntime(), ...seed.runtime } };
}

export function validateRoster(players: Player[]) {
  const errors: string[] = [];
  const refs = new Set<string>();
  const numbers = new Set<number>();
  for (const player of players) {
    if (!player.name.trim()) errors.push(`${player.id}: naam ontbreekt`);
    if (!player.reference) errors.push(`${player.name}: referentienummer ontbreekt`);
    else if (refs.has(player.reference)) errors.push(`${player.name}: dubbel referentienummer`);
    else refs.add(player.reference);
    if (!player.photo) errors.push(`${player.name}: pasfoto ontbreekt`);
    if (numbers.has(player.shirtNumber))
      errors.push(`${player.name}: dubbel rugnummer ${player.shirtNumber}`);
    numbers.add(player.shirtNumber);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(player.dateOfBirth))
      errors.push(`${player.name}: ongeldige geboortedatum`);
  }
  return { valid: errors.length === 0, errors };
}

export function validateEligibility(
  players: Player[],
  asOf = "2026-09-12",
  minimumAge = 18,
  suspendedPlayerIds: string[] = [],
) {
  const errors: string[] = [];
  const cutoff = new Date(`${asOf}T00:00:00Z`);
  for (const player of players) {
    const birth = new Date(`${player.dateOfBirth}T00:00:00Z`);
    let age = cutoff.getUTCFullYear() - birth.getUTCFullYear();
    const birthdayPassed =
      cutoff.getUTCMonth() > birth.getUTCMonth() ||
      (cutoff.getUTCMonth() === birth.getUTCMonth() && cutoff.getUTCDate() >= birth.getUTCDate());
    if (!birthdayPassed) age -= 1;
    if (!Number.isFinite(birth.getTime()) || age < minimumAge)
      errors.push(`${player.name}: voldoet niet aan de leeftijdsregel (${minimumAge}+)`);
    if (suspendedPlayerIds.includes(player.id))
      errors.push(`${player.name}: actieve schorsing blokkeert goedkeuring`);
  }
  return { valid: errors.length === 0, errors };
}

export function validateLineup(selectedIds: string[], players: Player[]) {
  const known = new Set(players.map((player) => player.id));
  const unknown = selectedIds.filter((id) => !known.has(id));
  const errors: string[] = [];
  if (selectedIds.length < 11) errors.push("Selecteer minimaal 11 spelers.");
  if (selectedIds.length > 18) errors.push("Selecteer maximaal 18 spelers.");
  if (new Set(selectedIds).size !== selectedIds.length)
    errors.push("Een speler kan maar één keer worden geselecteerd.");
  if (unknown.length) errors.push("De selectie bevat een speler buiten het goedgekeurde team.");
  return { valid: errors.length === 0, errors };
}

export function scoreFromEvents(match: Match, events: SeedData["liveEvents"]) {
  const score = { home: 0, away: 0 };
  for (const event of events) {
    if (event.matchId !== match.id || event.type !== "GOAL") continue;
    if (event.teamId === match.homeTeamId) score.home += 1;
    else if (event.teamId === match.awayTeamId) score.away += 1;
  }
  return score;
}

export function canApproveLineupChecks(
  selectedIds: string[],
  checks: RuntimeData["checks"],
  discrepancy: RuntimeData["discrepancy"],
) {
  return (
    selectedIds.length > 0 &&
    discrepancy !== "OPEN" &&
    selectedIds.every((id) => checks[id] === "AKKOORD")
  );
}

export function t60IsOpen(kickoff: string, now: string) {
  const opensAt = new Date(kickoff).getTime() - 60 * 60 * 1000;
  return new Date(now).getTime() >= opensAt;
}

export function officialWinner(match: Match): string | null {
  if (!match.official) return null;
  if (match.status === "BYE" || match.status === "WALKOVER") {
    return match.winnerTeamId &&
      (match.winnerTeamId === match.homeTeamId || match.winnerTeamId === match.awayTeamId)
      ? match.winnerTeamId
      : null;
  }
  if (!match.score) return null;
  if (match.score.home > match.score.away) return match.homeTeamId;
  if (match.score.away > match.score.home) return match.awayTeamId;
  if (!match.shootout) return null;
  return match.shootout.home > match.shootout.away ? match.homeTeamId : match.awayTeamId;
}

export function recalculateBracket(data: SeedData): SeedData {
  const matches = data.matches.map((match) => ({ ...match }));
  const qf1 = matches.find((match) => match.id === "match_qf_1");
  const sf1 = matches.find((match) => match.id === "match_sf_1");
  if (qf1 && sf1) {
    const winner = officialWinner(qf1);
    sf1.homeTeamId = winner;
    sf1.status = winner ? "SCHEDULED" : "AWAITING_TEAMS";
    if (winner) qf1.winnerTeamId = winner;
    else delete qf1.winnerTeamId;
  }
  return { ...data, matches };
}

export function setResult(
  data: SeedData,
  score: { home: number; away: number },
  official: boolean,
): SeedData {
  const matches = data.matches.map((match) =>
    match.id === data.scenario.matchId
      ? {
          ...match,
          score,
          official,
          status: (official ? "FINISHED" : "FINISHED_PROVISIONAL") as Match["status"],
        }
      : match,
  );
  return recalculateBracket({ ...data, matches });
}

export function canAccessRoute(role: Role, path: string) {
  if (!path.startsWith("/beheer")) return true;
  if (path === "/beheer" || path === "/beheer/berichten" || path === "/beheer/media")
    return role !== "supporter";
  const boundaries: Array<[string, Role]> = [
    ["/beheer/toernooileiding", "leadership"],
    ["/beheer/vereniging", "association"],
    ["/beheer/team", "team"],
    ["/beheer/scheidsrechter", "referee"],
  ];
  return boundaries.some(([prefix, allowed]) => path.startsWith(prefix) && role === allowed);
}

export const actionRoles: Record<string, Role[]> = {
  "fix-player": ["team"],
  "submit-roster": ["team"],
  "approve-roster": ["leadership"],
  "request-correction": ["association", "leadership"],
  "submit-lineup": ["team"],
  "open-t60": ["referee"],
  "check-player": ["referee"],
  "check-all": ["referee"],
  "resolve-discrepancy": ["leadership"],
  "approve-lineups": ["referee"],
  "start-match": ["leadership"],
  "submit-result": ["referee"],
  "confirm-team-result": ["team"],
  "confirm-result": ["leadership"],
  "create-tournament": ["leadership"],
  "assign-team": ["leadership"],
  "update-fixture": ["leadership"],
  "regulatory-result": ["leadership"],
  "match-state": ["leadership"],
  "save-club-profile": ["association"],
  "toggle-exclusion": ["association"],
  "finalize-tournament": ["leadership"],
  "lock-season": ["leadership"],
  "send-message": ["leadership", "association", "team", "referee"],
  "submit-media": ["leadership", "association", "team", "referee", "supporter"],
  follow: ["leadership", "association", "team", "referee", "supporter"],
  vote: ["leadership", "association", "team", "referee", "supporter"],
  "mark-read": ["leadership", "association", "team", "referee", "supporter"],
  preference: ["leadership", "association", "team", "referee", "supporter"],
  "set-clock": ["leadership", "association", "team", "referee", "supporter"],
};

export function authorizeAction(role: Role, action: string) {
  return actionRoles[action]?.includes(role) ?? false;
}
