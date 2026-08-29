export type Role =
  | "leadership"
  | "matchops"
  | "association"
  | "team"
  | "referee"
  | "press"
  | "photographer"
  | "supporter";
export type MatchStatus =
  | "SCHEDULED"
  | "PRE_MATCH"
  | "LIVE"
  | "HALF_TIME"
  | "FINISHED_PROVISIONAL"
  | "FINISHED"
  | "POSTPONED"
  | "CANCELLED"
  | "STOPPED"
  | "BYE"
  | "WALKOVER"
  | "AWAITING_TEAMS";

export interface Club {
  id: string;
  name: string;
  region: string;
  crest: string;
  venue: string;
}

export interface Team {
  id: string;
  clubId: string;
  name: string;
  category: string;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  reference: string | null;
  dateOfBirth: string;
  shirtNumber: number;
  position: string;
  photo: string | null;
  consent?: boolean;
  dispensation?: boolean;
}

export type PlayerApprovalStatus =
  | "CONCEPT"
  | "WACHT_OP_GOEDKEURING"
  | "GOEDGEKEURD"
  | "AANVULLING_NODIG"
  | "AFGEKEURD";

export interface TournamentRules {
  version: number;
  effectiveFrom: string;
  category: "A" | "B";
  format: "6X6" | "8X8" | "11X11";
  minimumAge: number;
  birthYearFrom: number;
  birthYearTo: number;
  maxDispensations: number;
  halfDurationMinutes: number;
  halves: number;
  timeoutsPerTeam: number;
  starterCount: number;
  maxSquadSize: number;
  substitutions: "DOORLOPEND" | "MAX_5";
  extraTimeRounds: string[];
  penaltiesAfterDraw: boolean;
  yellowCardsForSuspension: number;
  refereeType: "NEUTRAL" | "CLUB";
  assistantsRequired: number;
  standardMatchDay: string;
  standardKickoff: string;
  finalExtraTimeMinutes: number;
}

export interface MatchEvent {
  id: string;
  matchId: string;
  minute: number;
  type: "GOAL" | "YELLOW" | "RED" | "SUBSTITUTION" | "HALF_TIME" | "RESUMED";
  teamId?: string;
  playerId?: string;
  relatedPlayerId?: string;
  note?: string;
  corrected?: boolean;
}

export interface InterruptionSnapshot {
  id: string;
  matchId: string;
  type: "TEMPORARY" | "FINAL";
  reason: string;
  minute: number;
  score: { home: number; away: number };
  possession: string;
  lastRestart: string;
  lastKickoff: string;
  playersOnField: string[];
  cards: string[];
  substitutions: string[];
  comments: string;
  refereeReport: string;
  createdAt: string;
  decision?:
    | "RESUME_NOW"
    | "REMAINING_TIME_LATER"
    | "REPLAY"
    | "KEEP_RESULT"
    | "REGULATORY_RESULT"
    | "EXCLUDE_TEAM"
    | "OTHER";
  decisionReason?: string;
}

export interface FixtureChangeRequest {
  id: string;
  matchId: string;
  proposedKickoff: string;
  proposedVenue: string;
  reason: string;
  opponentApproved: boolean;
  leadershipApproved: boolean;
  status: "REQUESTED" | "OPPONENT_APPROVED" | "APPROVED" | "REJECTED";
}

export interface DisciplinaryCase {
  id: string;
  matchId: string;
  playerId?: string;
  type: "YELLOW" | "RED" | "INCIDENT";
  status: "OPEN" | "DECIDED";
  summary: string;
  decision?: string;
}

export interface Match {
  id: string;
  tournamentId: string;
  round: string;
  slot: number;
  homeTeamId: string | null;
  awayTeamId: string | null;
  sourceMatchIds?: string[];
  kickoff: string;
  venue: string;
  field?: string;
  refereeUserId?: string;
  status: MatchStatus;
  minute?: number;
  score: { home: number; away: number } | null;
  shootout?: { home: number; away: number };
  official: boolean;
  winnerTeamId?: string;
}

export interface Roster {
  id: string;
  teamId: string;
  version: number;
  status: string;
  playerIds: string[];
  issues: Array<{ playerId: string; fields: string[] }>;
  submittedAt?: string;
  approvedAt?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: Role;
  action: string;
  entity: string;
  before: string;
  after: string;
  reason?: string;
  version?: number;
}

export interface Notification {
  id: string;
  title: string;
  detail: string;
  href: string;
  read: boolean;
  role: Role | "all";
}

export interface RuntimeData {
  clockPreset: "preT60" | "t60" | "live78" | "postMatch";
  rosterStatus: "INCOMPLEET" | "CONCEPT" | "INGEDIEND" | "GOEDGEKEURD" | "VERGRENDELD";
  lineupStatus:
    | "NIET_GESTART"
    | "CONCEPT"
    | "INGEDIEND"
    | "T60_CONTROLE"
    | "AFWIJKING"
    | "AKKOORD"
    | "OFFICIEEL";
  selectedPlayerIds: string[];
  homeSelectedPlayerIds: string[];
  lineupSnapshot: {
    version: number;
    starters: string[];
    substitutes: string[];
    captainId: string | null;
    goalkeeperId: string | null;
    submittedAt?: string;
  };
  checks: Record<string, "AKKOORD" | "NIET_AANWEZIG" | "IDENTITEIT" | "AFWIJKING">;
  checkNotes: Record<string, string>;
  discrepancy: "NONE" | "OPEN" | "RESOLVED";
  playerApprovals: Record<
    string,
    { status: PlayerApprovalStatus; reasonCode?: string; note?: string }
  >;
  rules: TournamentRules;
  regulationHistory: TournamentRules[];
  favorites: string[];
  votes: string[];
  notificationSettings: { match: boolean; news: boolean; club: boolean };
  notifications: Notification[];
  audit: AuditEvent[];
  messages: Array<{ id: string; from: string; body: string; at: string }>;
  mediaSubmissions: Array<{
    id: string;
    name: string;
    consent: boolean;
    status: "IN_MODERATIE" | "GOEDGEKEURD" | "AFGEKEURD";
    matchId: string;
    clubId?: string;
    uploaderRole: Role;
    rights: { website: boolean; articles: boolean; social: boolean };
    credit?: string;
  }>;
  matchReport: { publicSummary: string; internalNote: string };
  resultConfirmations: { referee: boolean; home: boolean; away: boolean };
  resultDispute: { open: boolean; note: string; resolution?: string };
  matchEvents: MatchEvent[];
  matchMetrics: Record<
    string,
    {
      possession: { home: number; away: number };
      shots: { home: number; away: number };
    }
  >;
  interruptionSnapshots: InterruptionSnapshot[];
  fixtureChangeRequests: FixtureChangeRequest[];
  disciplinaryCases: DisciplinaryCase[];
  suspendedPlayerIds: string[];
  securityEvents: Array<{
    id: string;
    timestamp: string;
    role: Role;
    action: string;
    outcome: "ALLOWED" | "DENIED";
    detail: string;
  }>;
  pressPermissions: { names: boolean; shirtNumbers: boolean; lineups: boolean; media: boolean };
  pushPermission: "DEFAULT" | "ENABLED" | "DENIED";
  draftTournaments: Array<{ id: string; name: string; format: string; status: "CONCEPT" }>;
  teamAssignment: string;
  clubProfile: { contactVisible: boolean; venueNote: string; excluded: boolean };
  tournamentFinalized: boolean;
  seasonLocked: boolean;
}

export interface SeedData {
  meta: { schemaVersion: number; timezone: string; syntheticData: boolean; resetScenario: string };
  demoClock: { defaultNow: string; presets: Record<string, string> };
  roles: Array<{ id: string; label: string }>;
  demoUsers: Array<{ id: string; email: string; name: string; roleId: string; scopeIds: string[] }>;
  clubs: Club[];
  teams: Team[];
  tournaments: Array<{
    id: string;
    name: string;
    season: string;
    format: string;
    status: string;
    teamIds: string[];
  }>;
  matches: Match[];
  players: Player[];
  rosters: Roster[];
  scenario: {
    id: string;
    matchId: string;
    initialRosterId: string;
    expectedFinalScore: { home: number; away: number };
    expectedWinnerTeamId: string;
    expectedDestinationMatchId: string;
    discrepancy: {
      playerId: string;
      type: string;
      submitted: number;
      observed: number;
      resolutionReasonCode: string;
    };
  };
  liveEvents: Array<{ id: string; matchId: string; minute: number; type: string; teamId: string }>;
  runtime?: RuntimeData;
}

export interface PublicState {
  meta: SeedData["meta"];
  clubs: Club[];
  teams: Team[];
  tournaments: SeedData["tournaments"];
  matches: Match[];
  liveEvents: SeedData["liveEvents"];
  runtime: Pick<
    RuntimeData,
    | "favorites"
    | "votes"
    | "notifications"
    | "notificationSettings"
    | "pushPermission"
    | "matchEvents"
    | "matchMetrics"
    | "rules"
  > & {
    mediaSubmissions: Array<{
      id: string;
      name: string;
      status: "IN_MODERATIE" | "GOEDGEKEURD" | "AFGEKEURD";
    }>;
    matchReport: { publicSummary: string };
  };
}
