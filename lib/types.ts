export type Role = "leadership" | "association" | "team" | "referee" | "supporter";
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
  checks: Record<string, "AKKOORD" | "NIET_AANWEZIG" | "IDENTITEIT" | "AFWIJKING">;
  discrepancy: "NONE" | "OPEN" | "RESOLVED";
  favorites: string[];
  votes: string[];
  notificationSettings: { match: boolean; news: boolean; club: boolean };
  notifications: Notification[];
  audit: AuditEvent[];
  messages: Array<{ id: string; from: string; body: string; at: string }>;
  mediaSubmissions: Array<{ id: string; name: string; consent: boolean; status: "IN_MODERATIE" }>;
  matchReport: { publicSummary: string; internalNote: string };
  resultConfirmations: { home: boolean; away: boolean };
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
    "favorites" | "votes" | "notifications" | "notificationSettings" | "mediaSubmissions"
  >;
}
