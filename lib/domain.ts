import type { Match, Player, Role, RuntimeData, SeedData, TournamentRules } from "@/lib/types";

export const roleLabels: Record<Role, string> = {
  leadership: "Toernooileiding",
  matchops: "Wedstrijdleiding",
  association: "Verenigingsmanager",
  team: "Teammanager",
  referee: "Scheidsrechter",
  press: "Pers / Redactie",
  photographer: "Fotograaf",
  supporter: "Supporter",
};

export const defaultRules: TournamentRules = {
  version: 1,
  effectiveFrom: "2026-08-01",
  category: "A",
  format: "11X11",
  minimumAge: 18,
  birthYearFrom: 1980,
  birthYearTo: 2008,
  maxDispensations: 3,
  halfDurationMinutes: 45,
  halves: 2,
  timeoutsPerTeam: 0,
  starterCount: 11,
  maxSquadSize: 18,
  substitutions: "MAX_5",
  extraTimeRounds: ["FINAL"],
  penaltiesAfterDraw: true,
  yellowCardsForSuspension: 3,
  refereeType: "NEUTRAL",
  assistantsRequired: 2,
  standardMatchDay: "Zaterdag",
  standardKickoff: "20:00",
  finalExtraTimeMinutes: 30,
};

const extendedDemoRoles: SeedData["roles"] = [
  { id: "role_matchops", label: "Wedstrijdleiding" },
  { id: "role_press", label: "Pers / Redactie" },
  { id: "role_photographer", label: "Fotograaf" },
];

const extendedDemoUsers: SeedData["demoUsers"] = [
  {
    id: "user_matchops",
    email: "wedstrijdleiding@demo.tournamentos.local",
    name: "Demo Wedstrijdleiding",
    roleId: "role_matchops",
    scopeIds: ["tournament_swc_2026", "match_qf_1"],
  },
  {
    id: "user_press",
    email: "pers@demo.tournamentos.local",
    name: "Demo Redactie",
    roleId: "role_press",
    scopeIds: ["tournament_swc_2026"],
  },
  {
    id: "user_photographer",
    email: "foto@demo.tournamentos.local",
    name: "Demo Fotograaf",
    roleId: "role_photographer",
    scopeIds: ["match_qf_1"],
  },
];

const quickPlayerSpecs = [
  ["Bram de Wit", "1997-01-12", "Keeper"],
  ["Jens Mulder", "1999-03-04", "Verdediger"],
  ["Ravi de Jong", "1998-07-16", "Verdediger"],
  ["Tobias Meijer", "2000-11-22", "Verdediger"],
  ["Samir Haddad", "1996-05-10", "Verdediger"],
  ["Luuk Smit", "2001-02-18", "Middenvelder"],
  ["Adam El Idrissi", "2002-09-01", "Middenvelder"],
  ["Joris van Dam", "1999-12-14", "Middenvelder"],
  ["Daan van Meer", "1998-04-21", "Aanvaller"],
  ["Noah Verhoeven", "2000-06-30", "Aanvaller"],
  ["Rachid Azzam", "1997-10-08", "Aanvaller"],
  ["Stijn Vos", "2003-03-12", "Keeper"],
  ["Mats Hendriks", "2001-08-25", "Verdediger"],
  ["Ismail Kaya", "1999-09-19", "Middenvelder"],
  ["Koen Blom", "2002-01-05", "Verdediger"],
  ["Youssef Amrani", "2000-10-27", "Middenvelder"],
  ["Niek Prins", "2001-04-11", "Aanvaller"],
  ["Mo El Kharfi", "1998-12-03", "Aanvaller"],
] as const;

const quickPlayers: Player[] = quickPlayerSpecs.map(([name, dateOfBirth, position], index) => {
  const number = index + 1;
  return {
    id: `p_q_${String(number).padStart(2, "0")}`,
    teamId: "team_quick_1",
    name,
    reference: `HV-Q${2000 + number}`,
    dateOfBirth,
    shirtNumber: number,
    position,
    photo: "/brand/player-placeholder.svg",
    consent: true,
  };
});

export function defaultRuntime(): RuntimeData {
  return {
    clockPreset: "preT60",
    rosterStatus: "INCOMPLEET",
    lineupStatus: "NIET_GESTART",
    selectedPlayerIds: [],
    homeSelectedPlayerIds: Array.from(
      { length: 18 },
      (_, index) => `p_q_${String(index + 1).padStart(2, "0")}`,
    ),
    lineupSnapshot: {
      version: 0,
      starters: [],
      substitutes: [],
      captainId: null,
      goalkeeperId: null,
    },
    checks: {},
    checkNotes: {},
    discrepancy: "NONE",
    playerApprovals: {},
    rules: { ...defaultRules },
    regulationHistory: [{ ...defaultRules }],
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
    resultConfirmations: { referee: false, home: false, away: false },
    resultDispute: { open: false, note: "" },
    matchEvents: [],
    matchMetrics: {
      match_live_1: {
        possession: { home: 54, away: 46 },
        shots: { home: 12, away: 8 },
      },
    },
    interruptionSnapshots: [],
    fixtureChangeRequests: [],
    disciplinaryCases: [],
    suspendedPlayerIds: [],
    securityEvents: [],
    pressPermissions: { names: true, shirtNumbers: true, lineups: true, media: true },
    pushPermission: "DEFAULT",
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
  const expandedSeed: SeedData = {
    ...seed,
    clubs: seed.clubs.map((club) => ({
      ...club,
      crest:
        club.crest === "/assets/brand/club-placeholder.svg"
          ? "/brand/club-placeholder.svg"
          : club.crest,
    })),
    roles: [
      ...seed.roles,
      ...extendedDemoRoles.filter((role) => !seed.roles.some((item) => item.id === role.id)),
    ],
    demoUsers: [
      ...seed.demoUsers,
      ...extendedDemoUsers.filter((user) => !seed.demoUsers.some((item) => item.id === user.id)),
    ],
    players: [
      ...seed.players.map((player) => ({
        ...player,
        photo:
          player.photo === "/assets/brand/player-placeholder.svg"
            ? "/brand/player-placeholder.svg"
            : player.photo,
      })),
      ...quickPlayers.filter((player) => !seed.players.some((item) => item.id === player.id)),
    ],
  };
  const defaults = defaultRuntime();
  const incoming = expandedSeed.runtime;
  const playerApprovals = Object.fromEntries(
    expandedSeed.players
      .filter((player) => player.teamId === "team_duindorp_1")
      .map((player) => [
        player.id,
        {
          status: player.reference && player.photo ? "CONCEPT" : "AANVULLING_NODIG",
        } as const,
      ]),
  );
  return {
    ...expandedSeed,
    runtime: {
      ...defaults,
      ...incoming,
      notificationSettings: {
        ...defaults.notificationSettings,
        ...incoming?.notificationSettings,
      },
      resultConfirmations: {
        ...defaults.resultConfirmations,
        ...incoming?.resultConfirmations,
      },
      resultDispute: { ...defaults.resultDispute, ...incoming?.resultDispute },
      matchMetrics: { ...defaults.matchMetrics, ...incoming?.matchMetrics },
      lineupSnapshot: { ...defaults.lineupSnapshot, ...incoming?.lineupSnapshot },
      rules: { ...defaults.rules, ...incoming?.rules },
      pressPermissions: { ...defaults.pressPermissions, ...incoming?.pressPermissions },
      playerApprovals: {
        ...playerApprovals,
        ...incoming?.playerApprovals,
      },
    },
  };
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

export function evaluateRules(
  players: Player[],
  rules: TournamentRules,
  options: { asOf?: string; suspendedPlayerIds?: string[] } = {},
) {
  const errors = validateEligibility(
    players,
    options.asOf ?? "2026-09-12",
    rules.minimumAge,
    options.suspendedPlayerIds ?? [],
  ).errors;
  const warnings: string[] = [];
  const dispensations = players.filter((player) => player.dispensation);
  if (dispensations.length > rules.maxDispensations) {
    errors.push(
      `Maximaal ${rules.maxDispensations} dispensaties toegestaan; ${dispensations.length} geselecteerd.`,
    );
  } else if (dispensations.length) {
    warnings.push(`${dispensations.length}/${rules.maxDispensations} dispensaties gebruikt.`);
  }
  for (const player of players) {
    const year = Number(player.dateOfBirth.slice(0, 4));
    if (year < rules.birthYearFrom || year > rules.birthYearTo) {
      warnings.push(`${player.name}: geboortejaar ${year} valt buiten de standaardbandbreedte.`);
    }
  }
  return { valid: errors.length === 0, errors, warnings };
}

export function validateLineup(
  selectedIds: string[],
  players: Player[],
  rules: Pick<TournamentRules, "starterCount" | "maxSquadSize"> = defaultRules,
) {
  const known = new Set(players.map((player) => player.id));
  const unknown = selectedIds.filter((id) => !known.has(id));
  const errors: string[] = [];
  if (selectedIds.length < rules.starterCount)
    errors.push(`Selecteer minimaal ${rules.starterCount} spelers.`);
  if (selectedIds.length > rules.maxSquadSize)
    errors.push(`Selecteer maximaal ${rules.maxSquadSize} spelers.`);
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
    ["/beheer/wedstrijdleiding", "matchops"],
    ["/beheer/vereniging", "association"],
    ["/beheer/team", "team"],
    ["/beheer/scheidsrechter", "referee"],
    ["/beheer/pers", "press"],
    ["/beheer/fotograaf", "photographer"],
  ];
  const boundaryAllowed = boundaries.some(
    ([prefix, allowed]) => path.startsWith(prefix) && role === allowed,
  );
  if (!boundaryAllowed) return false;
  if (
    (role === "team" || role === "referee") &&
    path.includes("/wedstrijden/") &&
    !path.includes("/wedstrijden/match_qf_1/")
  )
    return false;
  return true;
}

export const actionRoles: Record<string, Role[]> = {
  "fix-player": ["team"],
  "save-player": ["team"],
  "remove-player": ["team"],
  "submit-roster": ["team"],
  "approve-roster": ["leadership"],
  "review-player": ["leadership"],
  "request-correction": ["association", "leadership"],
  "submit-lineup": ["team"],
  "open-t60": ["referee"],
  "check-player": ["referee"],
  "check-all": ["referee"],
  "resolve-discrepancy": ["leadership"],
  "approve-lineups": ["referee"],
  "start-match": ["leadership", "matchops"],
  "add-match-event": ["referee", "matchops"],
  "correct-match-event": ["referee", "matchops"],
  "interrupt-match": ["referee", "matchops", "leadership"],
  "decide-incident": ["leadership"],
  "decide-discipline": ["leadership"],
  "submit-result": ["referee"],
  "confirm-team-result": ["team"],
  "confirm-home-result": ["matchops"],
  "dispute-result": ["team"],
  "resolve-result-dispute": ["leadership"],
  "confirm-result": ["leadership"],
  "create-tournament": ["leadership"],
  "assign-team": ["leadership"],
  "update-fixture": ["leadership"],
  "request-fixture-change": ["team", "association", "matchops"],
  "approve-fixture-change-opponent": ["matchops"],
  "approve-fixture-change-leadership": ["leadership"],
  "regulatory-result": ["leadership"],
  "match-state": ["leadership", "matchops"],
  "save-rules": ["leadership"],
  "save-club-profile": ["association"],
  "toggle-exclusion": ["association"],
  "finalize-tournament": ["leadership"],
  "lock-season": ["leadership"],
  "send-message": ["leadership", "association", "team", "referee"],
  "submit-media": [
    "leadership",
    "matchops",
    "association",
    "team",
    "referee",
    "press",
    "photographer",
    "supporter",
  ],
  "moderate-media": ["press"],
  "set-press-permissions": ["leadership"],
  follow: ["leadership", "association", "team", "referee", "supporter"],
  vote: ["leadership", "association", "team", "referee", "supporter"],
  "mark-read": ["leadership", "association", "team", "referee", "supporter"],
  preference: [
    "leadership",
    "matchops",
    "association",
    "team",
    "referee",
    "press",
    "photographer",
    "supporter",
  ],
  "set-push": [
    "leadership",
    "matchops",
    "association",
    "team",
    "referee",
    "press",
    "photographer",
    "supporter",
  ],
  "set-clock": [
    "leadership",
    "matchops",
    "association",
    "team",
    "referee",
    "press",
    "photographer",
    "supporter",
  ],
};

export function authorizeAction(role: Role, action: string) {
  return actionRoles[action]?.includes(role) ?? false;
}
