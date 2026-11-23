import { createHash, randomUUID } from "node:crypto";

export class PlatformError extends Error {
  constructor(status, code, message, details) {
    super(message);
    Object.assign(this, { status, code, details });
  }
}
export const fail = (code, message, status = 422, details) => {
  throw new PlatformError(status, code, message, details);
};
export const COLLECTIONS = [
  "editions",
  "clubs",
  "teams",
  "players",
  "officials",
  "cups",
  "matches",
  "news",
  "registrations",
  "rosters",
  "lineups",
  "events",
  "objections",
  "volunteers",
  "shifts",
  "messages",
  "favorites",
  "kits",
  "media",
];
export const ROLES = [
  "leadership",
  "club",
  "team",
  "official",
  "player",
  "supporter",
  "editor",
  "photographer",
  "press",
  "volunteer",
];
export const DEFAULT_RULES = Object.freeze({
  halfMinutes: 45,
  starterCount: 11,
  minimumPlayers: 7,
  maxSquadSize: 18,
  minAge: null,
  maxAge: null,
  referenceDate: "2027-01-01",
  maxDispensations: 0,
  penalties: true,
  extraTime: false,
  maxSubstitutions: 5,
});
const upserts = {
  edition: {
    collection: "editions",
    fields: ["name", "season", "status", "finalDate", "venue"],
    required: ["name"],
  },
  club: {
    collection: "clubs",
    fields: [
      "name",
      "city",
      "venue",
      "contactName",
      "contactEmail",
      "contactPhone",
    ],
    required: ["name"],
  },
  team: {
    collection: "teams",
    fields: ["name", "clubId", "category"],
    required: ["name", "clubId", "category"],
  },
  player: {
    collection: "players",
    fields: [
      "name",
      "teamId",
      "birthDate",
      "relationCode",
      "identityPhoto",
      "number",
      "publicName",
      "publicPhoto",
      "userId",
    ],
    required: ["name", "teamId", "birthDate", "relationCode"],
  },
  official: {
    collection: "officials",
    fields: ["name", "level", "userId"],
    required: ["name"],
  },
  cup: {
    collection: "cups",
    fields: ["name", "editionId", "category", "status", "rules"],
    required: ["name", "editionId", "category"],
  },
  match: {
    collection: "matches",
    fields: [
      "cupId",
      "homeTeamId",
      "awayTeamId",
      "date",
      "time",
      "venue",
      "field",
      "round",
      "roundKey",
    ],
    required: ["cupId", "homeTeamId", "date", "time"],
  },
  news: {
    collection: "news",
    fields: [
      "title",
      "body",
      "status",
      "publishedAt",
      "cupIds",
      "teamIds",
      "clubIds",
    ],
    required: ["title", "body"],
  },
  volunteer: {
    collection: "volunteers",
    fields: ["name", "userId", "email", "phone"],
    required: ["name"],
  },
  shift: {
    collection: "shifts",
    fields: ["name", "date", "from", "until", "venue", "capacity"],
    required: ["name", "date", "from", "until"],
  },
};
const flowFields = {
  "kit.update": [
    "clubId",
    "variant",
    "shirtColor",
    "shortsColor",
    "socksColor",
    "note",
  ],
  "media.submit": [
    "matchId",
    "title",
    "credit",
    "dataUrl",
    "rights",
    "consent",
  ],
  "media.review": ["mediaId", "decision", "reason"],
  "registration.submit": ["cupId", "teamId"],
  "registration.review": ["registrationId", "decision", "reason"],
  "roster.submit": ["cupId", "teamId", "playerIds"],
  "roster.review": ["rosterId", "decision", "reason"],
  "dispensation.decide": ["cupId", "playerId", "allowed", "reason"],
  "lineup.submit": ["matchId", "teamId", "players", "attested", "reason"],
  "lineup.review": ["lineupId", "decision", "checks", "reason"],
  "assignment.set": ["matchId", "officialId", "reason"],
  "assignment.accept": ["matchId", "accepted", "reason"],
  "match.start": ["matchId"],
  "match.event": [
    "matchId",
    "type",
    "teamId",
    "playerId",
    "relatedPlayerId",
    "minute",
    "note",
    "eventId",
    "decision",
    "reason",
  ],
  "match.finalize": [
    "matchId",
    "homeScore",
    "awayScore",
    "penHome",
    "penAway",
    "reason",
    "eventsComplete",
  ],
  "objection.submit": ["matchId", "teamId", "subject", "reason"],
  "objection.decide": [
    "objectionId",
    "decision",
    "reason",
    "homeScore",
    "awayScore",
    "winnerTeamId",
  ],
  "publication.update": ["playerId", "publicName", "publicPhoto", "reason"],
  "shift.signup": ["shiftId", "volunteerId", "cancel"],
  "message.send": ["recipientUserIds", "subject", "body", "matchId"],
  "message.read": ["messageId"],
  "favorite.toggle": ["entityType", "entityId"],
  "membership.upsert": [
    "id",
    "userId",
    "role",
    "clubId",
    "teamId",
    "officialId",
    "playerId",
    "volunteerId",
    "status",
    "reason",
  ],
  "bracket.draw": ["cupId", "teamIds", "bracketSize", "seed"],
  "bracket.publish": ["cupId"],
  "player.availability": ["playerId", "matchId", "availability"],
};
export const COMMAND_SCHEMAS = Object.freeze({
  ...Object.fromEntries(
    Object.entries(upserts).map(([type, schema]) => [
      type + ".upsert",
      { ...schema, fields: ["id", ...schema.fields] },
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(flowFields).map(([type, fields]) => [type, { fields }]),
  ),
});
const roleCommands = {
  leadership: [...Object.keys(COMMAND_SCHEMAS), "settings.manage"],
  club: [
    "kit.update",
    "media.submit",
    "club.upsert",
    "team.upsert",
    "registration.submit",
    "roster.submit",
    "message.send",
    "message.read",
    "favorite.toggle",
  ],
  team: [
    "media.submit",
    "player.upsert",
    "roster.submit",
    "lineup.submit",
    "match.event",
    "objection.submit",
    "message.send",
    "message.read",
    "favorite.toggle",
  ],
  official: [
    "assignment.accept",
    "lineup.review",
    "match.start",
    "match.event",
    "match.finalize",
    "message.send",
    "message.read",
    "favorite.toggle",
  ],
  player: [
    "player.availability",
    "publication.update",
    "message.read",
    "favorite.toggle",
  ],
  editor: ["news.upsert", "message.send", "message.read", "favorite.toggle"],
  volunteer: ["shift.signup", "message.read", "favorite.toggle"],
  supporter: ["media.submit", "favorite.toggle", "message.read"],
  photographer: ["media.submit", "favorite.toggle", "message.read"],
  press: ["favorite.toggle", "message.read"],
};
const clone = (value) => structuredClone(value);
const timestamp = () => new Date().toISOString();
const identifier = (value, label = "ID") => {
  if (
    typeof value !== "string" ||
    !value ||
    value.length > 128 ||
    !/^[A-Za-z0-9_.:-]+$/.test(value)
  )
    fail("VALIDATION", label + " is ongeldig.");
  return value;
};
const text = (value, label, { min = 1, max = 5000 } = {}) => {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.length > max
  )
    fail("VALIDATION", label + " is verplicht of te lang.");
  return value.trim();
};
const integer = (value, label, min = 0, max = 10000) => {
  if (!Number.isInteger(value) || value < min || value > max)
    fail("VALIDATION", label + " is ongeldig.");
  return value;
};
const date = (value) => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value + "T12:00:00Z")) ||
    new Date(value + "T12:00:00Z").toISOString().slice(0, 10) !== value
  )
    fail("VALIDATION", "Datum is ongeldig.");
  return value;
};
const time = (value) => {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value))
    fail("VALIDATION", "Tijd is ongeldig.");
  return value;
};
const reason = (value) => text(value, "Motivering", { min: 10, max: 1600 });
function strict(value, fields) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    fail("VALIDATION", "Verwacht een object.");
  for (const key of Object.keys(value))
    if (!fields.includes(key)) fail("UNKNOWN_FIELD", "Onbekend veld: " + key);
  return value;
}
const record = (state, collection, id) => {
  identifier(id);
  const found = state.data[collection].find((row) => row.id === id);
  if (!found) fail("NOT_FOUND", "Dit record is niet gevonden.", 404);
  return found;
};
const optionalRecord = (state, collection, id) =>
  id ? record(state, collection, id) : null;
const uniqueIds = (values, label = "Selectie") => {
  if (!Array.isArray(values) || values.length > 128)
    fail("VALIDATION", label + " is ongeldig.");
  values.forEach((id) => identifier(id));
  if (new Set(values).size !== values.length)
    fail("VALIDATION", label + " bevat dubbelen.");
  return values;
};
export function createInitialState({ example = false } = {}) {
  const state = {
    schemaVersion: 1,
    version: 0,
    updatedAt: null,
    data: Object.fromEntries(COLLECTIONS.map((key) => [key, []])),
    memberships: [],
    audit: [],
    mailOutbox: [],
  };
  if (!example) return state;
  state.memberships = [
    {
      id: "local-leadership",
      userId: "local-admin",
      role: "leadership",
      status: "active",
    },
  ];
  state.data.editions = [
    {
      id: "HV-ED-EXAMPLE",
      name: "Voorbeeldeditie",
      season: "2026/27",
      status: "preparation",
      finalDate: null,
      venue: "",
    },
  ];
  state.data.clubs = [
    {
      id: "HV-V-EXAMPLE",
      name: "Voorbeeldvereniging",
      city: "Haaglanden",
      venue: "Voorbeeldsportpark",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
    },
  ];
  state.data.teams = [
    {
      id: "HV-T-EXAMPLE",
      clubId: "HV-V-EXAMPLE",
      name: "Voorbeeldteam",
      category: "Senioren",
    },
  ];
  state.data.players = [
    {
      id: "HV-P-EXAMPLE",
      teamId: "HV-T-EXAMPLE",
      name: "Voorbeeldspeler",
      birthDate: "2000-01-01",
      relationCode: "VOORBEELD",
      identityPhoto: "",
      number: 1,
      publicName: false,
      publicPhoto: false,
      dispensations: {},
    },
  ];
  state.data.officials = [
    { id: "HV-O-EXAMPLE", name: "Voorbeeldofficial", level: "In te richten" },
  ];
  state.data.cups = [
    {
      id: "HV-CUP-EXAMPLE",
      editionId: "HV-ED-EXAMPLE",
      name: "Voorbeeldbeker",
      category: "Senioren",
      status: "preparation",
      rules: clone(DEFAULT_RULES),
      rulesVersion: 1,
    },
  ];
  state.data.matches = [
    {
      id: "HV-W-EXAMPLE",
      cupId: "HV-CUP-EXAMPLE",
      homeTeamId: "HV-T-EXAMPLE",
      awayTeamId: null,
      date: "2027-06-05",
      time: "19:30",
      venue: "Voorbeeldsportpark",
      field: "Veld 1",
      round: "Eerste ronde",
      roundKey: "first",
      status: "scheduled",
      homeScore: null,
      awayScore: null,
      officialId: null,
      assignmentStatus: "open",
    },
  ];
  state.data.news = [
    {
      id: "HV-N-EXAMPLE",
      title: "Welkom bij Haaglanden Voetbal",
      body: "Dit voorbeeldbericht kun je vervangen door het eerste eigen nieuwsbericht.",
      status: "published",
      publishedAt: "2026-11-23T00:00:00Z",
      cupIds: [],
      teamIds: [],
      clubIds: [],
    },
  ];
  state.data.volunteers = [
    {
      id: "HV-VOL-EXAMPLE",
      name: "Voorbeeldvrijwilliger",
      email: "",
      phone: "",
    },
  ];
  state.data.shifts = [
    {
      id: "HV-SHIFT-EXAMPLE",
      name: "Voorbeeld ontvangst",
      date: "2027-06-05",
      from: "18:00",
      until: "20:00",
      venue: "Voorbeeldsportpark",
      capacity: 1,
      volunteerIds: [],
    },
  ];
  return state;
}
export function normalizeState(value) {
  const empty = createInitialState();
  const state = {
    ...empty,
    ...clone(value),
    data: { ...empty.data, ...clone(value.data || {}) },
  };
  for (const key of COLLECTIONS)
    if (!Array.isArray(state.data[key]))
      fail("STORAGE_FORMAT", "Een gegevenscollectie is ongeldig.", 503);
  state.mailOutbox ||= [];
  return state;
}
export function actorFor(state, user, membershipId) {
  const memberships = user
    ? state.memberships.filter(
        (m) => m.userId === user.id && m.status === "active",
      )
    : [];
  if (membershipId && !memberships.some((m) => m.id === membershipId))
    fail(
      "FORBIDDEN",
      "Dit lidmaatschap hoort niet bij je actieve account.",
      403,
    );
  return {
    user: user || null,
    membership:
      memberships.find((m) => m.id === membershipId) || memberships[0] || null,
    memberships,
  };
}
export function capabilitiesFor(actor) {
  return actor?.user
    ? [...(roleCommands[actor.membership?.role || "supporter"] || [])]
    : [];
}
export function authorize(actor, type) {
  if (!actor?.user) fail("UNAUTHENTICATED", "Log eerst in.", 401);
  if (!capabilitiesFor(actor).includes(type))
    fail("FORBIDDEN", "Je actieve rol mag deze handeling niet uitvoeren.", 403);
}
export function assertCommandAccess(state, command, actor) {
  const fresh = actorFor(state, actor.user, actor.membership?.id);
  authorize(fresh, command.type);
  return fresh;
}
function teamScope(state, actor, teamId) {
  const t = record(state, "teams", teamId),
    m = actor.membership;
  if (m?.role === "leadership") return t;
  if (m?.role === "team" && m.teamId === t.id) return t;
  if (m?.role === "club" && m.clubId === t.clubId) return t;
  fail("FORBIDDEN", "Dit team valt buiten je actieve rol.", 403);
}
function officialScope(state, actor, match) {
  if (actor.membership?.role === "leadership") return;
  if (
    actor.membership?.role !== "official" ||
    !match.officialId ||
    actor.membership.officialId !== match.officialId
  )
    fail("FORBIDDEN", "Deze wedstrijd is niet aan jou toegewezen.", 403);
}
function matchTeams(match, teamId) {
  if (![match.homeTeamId, match.awayTeamId].includes(teamId))
    fail("VALIDATION", "Het team speelt niet in deze wedstrijd.");
}
function matchScope(state, actor, match) {
  if (actor.membership?.role === "leadership") return;
  if (actor.membership?.role === "official")
    return officialScope(state, actor, match);
  return (
    teamScope(state, actor, actor.membership?.teamId),
    matchTeams(match, actor.membership.teamId)
  );
}
function rulesFor(state, match) {
  return match.rulesSnapshot || record(state, "cups", match.cupId).rules;
}
function checkRules(input) {
  strict(input, Object.keys(DEFAULT_RULES));
  const value = { ...DEFAULT_RULES, ...input };
  integer(value.halfMinutes, "Minuten per helft", 5, 90);
  integer(value.starterCount, "Basisspelers", 3, 11);
  integer(value.minimumPlayers, "Minimale bezetting", 3, value.starterCount);
  integer(value.maxSquadSize, "Maximale selectie", value.starterCount, 40);
  integer(value.maxDispensations, "Dispensaties", 0, 40);
  integer(value.maxSubstitutions, "Wissels", 0, 40);
  for (const field of ["minAge", "maxAge"])
    if (value[field] != null) integer(value[field], field, 0, 100);
  if (
    value.minAge != null &&
    value.maxAge != null &&
    value.minAge > value.maxAge
  )
    fail("VALIDATION", "Leeftijdsgrenzen spreken elkaar tegen.");
  for (const key of ["penalties", "extraTime"])
    if (typeof value[key] !== "boolean")
      fail("VALIDATION", "Beslisregel moet ja of nee zijn.");
  date(value.referenceDate);
  return value;
}
export function amsterdamInstant(day, clock) {
  date(day);
  time(clock);
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const wanted = day + " " + clock;
  const candidates = ["+01:00", "+02:00"]
    .map((offset) => new Date(day + "T" + clock + ":00" + offset))
    .filter((d) => formatter.format(d) === wanted);
  if (!candidates.length)
    fail(
      "INVALID_LOCAL_TIME",
      "Dit lokale tijdstip bestaat niet door de overgang naar zomertijd.",
    );
  return candidates[0].toISOString();
}
export function ageOn(birthDate, referenceDate) {
  date(birthDate);
  date(referenceDate);
  const a = new Date(birthDate + "T00:00:00Z"),
    b = new Date(referenceDate + "T00:00:00Z");
  return (
    b.getUTCFullYear() -
    a.getUTCFullYear() -
    Number(
      b.getUTCMonth() < a.getUTCMonth() ||
        (b.getUTCMonth() === a.getUTCMonth() &&
          b.getUTCDate() < a.getUTCDate()),
    )
  );
}
const idFor = (prefix) => prefix + "-" + randomUUID();
function eligible(state, player, cupId, rules) {
  const age = ageOn(player.birthDate, rules.referenceDate);
  const needs =
    (rules.minAge != null && age < rules.minAge) ||
    (rules.maxAge != null && age > rules.maxAge);
  if (needs && !player.dispensations?.[cupId]?.allowed)
    fail(
      "INELIGIBLE",
      "Leeftijdsdispensatie ontbreekt voor " + player.name + ".",
    );
  return !!needs;
}
function registrationFor(state, cupId, teamId) {
  return state.data.registrations.find(
    (row) => row.cupId === cupId && row.teamId === teamId,
  );
}
function assertOpenCup(state, cupId) {
  const cup = record(state, "cups", cupId);
  if (cup.status === "closed") fail("CLOSED", "Deze beker is afgesloten.");
  return cup;
}
function ensureNoFollowerStarted(state, match) {
  for (const next of state.data.matches.filter(
    (m) => m.homeSourceId === match.id || m.awaySourceId === match.id,
  )) {
    if (next.status !== "scheduled")
      fail(
        "FOLLOWER_STARTED",
        "Een vervolgwedstrijd is al begonnen; herbeoordeling is nodig.",
        409,
      );
  }
}
function propagate(state, match, winner) {
  ensureNoFollowerStarted(state, match);
  for (const next of state.data.matches) {
    if (next.homeSourceId === match.id) next.homeTeamId = winner;
    if (next.awaySourceId === match.id) next.awayTeamId = winner;
  }
}
function upsert(state, type, payload, actor, now) {
  const name = type.split(".")[0],
    schema = upserts[name],
    previous = payload.id ? record(state, schema.collection, payload.id) : null;
  for (const field of schema.required)
    if (!previous || payload[field] !== undefined) {
      if (
        payload[field] === undefined ||
        payload[field] === null ||
        payload[field] === ""
      )
        fail("VALIDATION", field + " is verplicht.");
    }
  const value = {
    ...previous,
    ...clone(payload),
    id:
      previous?.id ||
      idFor(
        {
          edition: "HV-ED",
          club: "HV-V",
          team: "HV-T",
          player: "HV-P",
          official: "HV-O",
          cup: "HV-CUP",
          match: "HV-W",
          news: "HV-N",
          volunteer: "HV-VOL",
          shift: "HV-SHIFT",
        }[name],
      ),
  };
  for (const field of [
    "name",
    "category",
    "title",
    "season",
    "venue",
    "city",
    "field",
    "round",
    "roundKey",
    "contactName",
    "contactPhone",
    "relationCode",
    "level",
    "phone",
  ])
    if (value[field] !== undefined)
      value[field] = text(value[field], field, {
        min: schema.required.includes(field) ? 1 : 0,
        max: field === "title" ? 200 : 240,
      });
  for (const field of ["contactEmail", "email"])
    if (value[field]) {
      text(value[field], field, { max: 254 });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value[field]))
        fail("VALIDATION", "E-mailadres is ongeldig.");
    }
  if (name === "edition") {
    value.status = value.status || "preparation";
    if (!["preparation", "active", "closed"].includes(value.status))
      fail("VALIDATION", "Editiestatus is ongeldig.");
    if (value.finalDate) date(value.finalDate);
  }
  if (
    name === "club" &&
    actor.membership.role !== "leadership" &&
    actor.membership.clubId !== value.id
  )
    fail("FORBIDDEN", "Alleen je eigen vereniging kan worden gewijzigd.", 403);
  if (name === "team") {
    record(state, "clubs", value.clubId);
    if (
      actor.membership.role !== "leadership" &&
      actor.membership.clubId !== value.clubId
    )
      fail("FORBIDDEN", "Dit clubverband valt buiten je rol.", 403);
    if (previous && previous.clubId !== value.clubId)
      fail("IMMUTABLE_RELATION", "Een bestaand team behoudt zijn vereniging.");
  }
  if (name === "player") {
    teamScope(state, actor, value.teamId);
    date(value.birthDate);
    if (value.number !== undefined) integer(value.number, "Rugnummer", 1, 99);
    for (const key of ["publicName", "publicPhoto"])
      if (value[key] !== undefined && typeof value[key] !== "boolean")
        fail("VALIDATION", "Publicatiekeuze is ongeldig.");
    if (
      value.identityPhoto &&
      (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(
        value.identityPhoto,
      ) ||
        value.identityPhoto.length > 300000)
    )
      fail("VALIDATION", "Gebruik een beperkte JPG/PNG/WebP-controlefoto.");
    if (previous && previous.teamId !== value.teamId)
      fail(
        "IMMUTABLE_RELATION",
        "Verplaats een bestaande speler via een gecontroleerde teamovergang.",
      );
    value.dispensations = previous?.dispensations || {};
  }
  if (name === "cup") {
    record(state, "editions", value.editionId);
    value.status = value.status || "preparation";
    if (!["preparation", "active", "closed"].includes(value.status))
      fail("VALIDATION", "Bekerstatus is ongeldig.");
    value.rules = checkRules(value.rules || {});
    value.rulesVersion =
      (previous?.rulesVersion || 0) +
      (JSON.stringify(previous?.rules) !== JSON.stringify(value.rules) ? 1 : 0);
  }
  if (name === "match") {
    const cup = assertOpenCup(state, value.cupId),
      home = record(state, "teams", value.homeTeamId),
      away = optionalRecord(state, "teams", value.awayTeamId);
    if (
      home.category !== cup.category ||
      (away && away.category !== cup.category)
    )
      fail("VALIDATION", "Teamcategorie past niet bij deze beker.");
    if (away?.id === home.id)
      fail("VALIDATION", "Een team kan niet tegen zichzelf spelen.");
    if (previous && previous.status !== "scheduled")
      fail(
        "STARTED",
        "Een begonnen wedstrijd kan alleen via de wedstrijdprocedure worden gewijzigd.",
      );
    date(value.date);
    time(value.time);
    value.status = previous?.status || "scheduled";
    value.homeScore = previous?.homeScore ?? null;
    value.awayScore = previous?.awayScore ?? null;
    value.assignmentStatus = previous?.assignmentStatus || "open";
    value.officialId = previous?.officialId || null;
  }
  if (name === "news") {
    value.body = text(value.body, "Bericht", { max: 30000 });
    value.status = value.status || "draft";
    if (!["draft", "published"].includes(value.status))
      fail("VALIDATION", "Nieuwsstatus is ongeldig.");
    if (value.status === "published") {
      value.publishedAt = value.publishedAt || now;
      if (!Number.isFinite(Date.parse(value.publishedAt)))
        fail("VALIDATION", "Publicatietijd is ongeldig.");
    }
    for (const [key, collection] of [
      ["cupIds", "cups"],
      ["teamIds", "teams"],
      ["clubIds", "clubs"],
    ]) {
      value[key] = uniqueIds(value[key] || []);
      value[key].forEach((id) => record(state, collection, id));
    }
  }
  if (name === "shift") {
    date(value.date);
    time(value.from);
    time(value.until);
    if (value.from >= value.until)
      fail("VALIDATION", "Het einde van de dienst moet na het begin liggen.");
    integer(value.capacity ?? 1, "Capaciteit", 1, 1000);
    value.capacity ??= 1;
    value.volunteerIds = previous?.volunteerIds || [];
    if (value.capacity < value.volunteerIds.length)
      fail(
        "CAPACITY",
        "De dienst bevat meer vrijwilligers dan de nieuwe capaciteit.",
      );
  }
  value.updatedAt = now;
  if (previous) Object.assign(previous, value);
  else state.data[schema.collection].push(value);
  return { entity: schema.collection, record: clone(value) };
}
export function validateCommandEnvelope(command) {
  strict(command, ["type", "payload", "requestId", "expectedVersion"]);
  if (
    typeof command.type !== "string" ||
    !Object.hasOwn(COMMAND_SCHEMAS, command.type)
  )
    fail("UNKNOWN_COMMAND", "Dit commando is niet bekend.");
  strict(command.payload, COMMAND_SCHEMAS[command.type].fields);
  identifier(command.requestId, "Request-ID");
  if (command.expectedVersion !== undefined)
    integer(command.expectedVersion, "Bronversie", 0, Number.MAX_SAFE_INTEGER);
  return command;
}
export function applyCommand(
  input,
  command,
  initialActor,
  { now = timestamp() } = {},
) {
  validateCommandEnvelope(command);
  const { type, payload } = command;
  const actor = actorFor(input, initialActor.user, initialActor.membership?.id);
  authorize(actor, type);
  const state = clone(input);
  let result;
  if (type.endsWith(".upsert") && type !== "membership.upsert")
    result = upsert(state, type, payload, actor, now);
  else
    switch (type) {
      case "kit.update": {
        const club = record(state, "clubs", payload.clubId);
        if (
          actor.membership.role !== "leadership" &&
          (actor.membership.role !== "club" ||
            actor.membership.clubId !== club.id)
        )
          fail(
            "FORBIDDEN",
            "Je beheert alleen de eigen verenigingstenues.",
            403,
          );
        if (!["home", "away"].includes(payload.variant))
          fail("VALIDATION", "Kies thuis- of uittenue.");
        for (const key of ["shirtColor", "shortsColor", "socksColor"])
          if (
            typeof payload[key] !== "string" ||
            !/^#[a-fA-F0-9]{6}$/.test(payload[key])
          )
            fail("VALIDATION", "Kies geldige hexkleuren voor het tenue.");
        const existing = state.data.kits.find(
            (r) => r.clubId === club.id && r.variant === payload.variant,
          ),
          row = {
            id: existing?.id || idFor("HV-KIT"),
            clubId: club.id,
            variant: payload.variant,
            shirtColor: payload.shirtColor,
            shortsColor: payload.shortsColor,
            socksColor: payload.socksColor,
            note: payload.note
              ? text(payload.note, "Toelichting", { max: 600 })
              : "",
            updatedAt: now,
          };
        if (existing) Object.assign(existing, row);
        else state.data.kits.push(row);
        result = { kit: clone(row) };
        break;
      }
      case "media.submit": {
        record(state, "matches", payload.matchId);
        const title = text(payload.title, "Titel", { max: 200 }),
          credit = text(payload.credit, "Credit", { max: 200 });
        if (payload.consent !== true)
          fail("CONSENT", "Bevestig de toestemming voor de inzending.");
        if (
          typeof payload.dataUrl !== "string" ||
          payload.dataUrl.length > 280000 ||
          !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(
            payload.dataUrl,
          )
        )
          fail(
            "VALIDATION",
            "Gebruik een JPG/PNG/WebP-bestand van maximaal 200 kB.",
          );
        strict(payload.rights, ["website", "articles", "press", "social"]);
        for (const field of ["website", "articles", "press", "social"])
          if (typeof payload.rights[field] !== "boolean")
            fail("VALIDATION", "Leg ieder gebruiksrecht expliciet vast.");
        const row = {
          id: idFor("HV-MEDIA"),
          matchId: payload.matchId,
          title,
          credit,
          dataUrl: payload.dataUrl,
          rights: clone(payload.rights),
          consent: true,
          status: "pending",
          submittedBy: actor.user.id,
          submittedAt: now,
          history: [],
        };
        state.data.media.push(row);
        result = { media: clone(row) };
        break;
      }
      case "media.review": {
        const media = record(state, "media", payload.mediaId);
        if (!["approved", "rejected", "revoked"].includes(payload.decision))
          fail("VALIDATION", "Mediabesluit is ongeldig.");
        if (
          media.submittedBy === actor.user.id &&
          payload.decision === "approved"
        )
          fail(
            "FOUR_EYES",
            "Een inzender kan eigen beeld niet zelf goedkeuren.",
          );
        media.status = payload.decision;
        const review = {
          by: actor.user.id,
          at: now,
          reason: reason(payload.reason),
          decision: payload.decision,
        };
        media.history.push(review);
        media.review = review;
        result = { media: clone(media) };
        break;
      }

      case "membership.upsert": {
        reason(payload.reason);
        if (!ROLES.includes(payload.role))
          fail("VALIDATION", "Rol is ongeldig.");
        identifier(payload.userId, "Gebruikers-ID");
        if (!["active", "revoked"].includes(payload.status || "active"))
          fail("VALIDATION", "Lidmaatschapsstatus is ongeldig.");
        for (const [field, collection] of [
          ["clubId", "clubs"],
          ["teamId", "teams"],
          ["officialId", "officials"],
          ["playerId", "players"],
          ["volunteerId", "volunteers"],
        ])
          if (payload[field]) record(state, collection, payload[field]);
        if (
          (payload.role === "club" && !payload.clubId) ||
          (payload.role === "team" && !payload.teamId) ||
          (payload.role === "official" && !payload.officialId) ||
          (payload.role === "player" && !payload.playerId) ||
          (payload.role === "volunteer" && !payload.volunteerId)
        )
          fail("VALIDATION", "Deze rol vereist een toegewezen entiteit.");
        const previous = payload.id
          ? state.memberships.find((m) => m.id === payload.id)
          : null;
        if (payload.id && !previous)
          fail("NOT_FOUND", "Lidmaatschap niet gevonden.", 404);
        if (
          previous?.role === "leadership" &&
          previous.userId === actor.user.id &&
          payload.status === "revoked" &&
          state.memberships.filter(
            (m) => m.status === "active" && m.role === "leadership",
          ).length === 1
        )
          fail(
            "LAST_LEADER",
            "Het laatste actieve leidinglid kan niet worden ingetrokken.",
          );
        const row = {
          ...previous,
          ...payload,
          id: previous?.id || idFor("HV-M"),
          status: payload.status || "active",
          updatedAt: now,
        };
        delete row.reason;
        if (previous) Object.assign(previous, row);
        else state.memberships.push(row);
        result = { membership: clone(row) };
        break;
      }
      case "registration.submit": {
        const cup = assertOpenCup(state, payload.cupId),
          team = teamScope(state, actor, payload.teamId);
        if (team.category !== cup.category)
          fail("VALIDATION", "Teamcategorie past niet bij deze beker.");
        if (registrationFor(state, cup.id, team.id))
          fail(
            "DUPLICATE",
            "Dit team is al voor deze beker ingeschreven.",
            409,
          );
        const row = {
          id: idFor("HV-REG"),
          cupId: cup.id,
          teamId: team.id,
          status: "submitted",
          submittedBy: actor.user.id,
          submittedAt: now,
        };
        state.data.registrations.push(row);
        result = { registration: clone(row) };
        break;
      }
      case "registration.review": {
        const row = record(state, "registrations", payload.registrationId);
        if (!["approved", "rejected", "returned"].includes(payload.decision))
          fail("VALIDATION", "Beoordeling is ongeldig.");
        row.status = payload.decision;
        row.decision = {
          by: actor.user.id,
          at: now,
          reason: reason(payload.reason),
        };
        result = { registration: clone(row) };
        break;
      }
      case "roster.submit": {
        const cup = assertOpenCup(state, payload.cupId);
        teamScope(state, actor, payload.teamId);
        if (
          registrationFor(state, cup.id, payload.teamId)?.status !== "approved"
        )
          fail("REGISTRATION_REQUIRED", "Keur eerst de teaminschrijving goed.");
        const ids = uniqueIds(payload.playerIds);
        if (!ids.length) fail("VALIDATION", "Selecteer ten minste één speler.");
        for (const id of ids)
          if (record(state, "players", id).teamId !== payload.teamId)
            fail("FORBIDDEN", "Een speler hoort niet bij dit team.", 403);
        const old = state.data.rosters.filter(
          (r) => r.cupId === cup.id && r.teamId === payload.teamId,
        );
        if (old.some((r) => r.status === "submitted"))
          fail("PENDING", "Er ligt al een spelerslijst ter beoordeling.");
        const row = {
          id: idFor("HV-ROSTER"),
          cupId: cup.id,
          teamId: payload.teamId,
          version: old.length + 1,
          playerIds: ids,
          status: "submitted",
          submittedBy: actor.user.id,
          submittedAt: now,
        };
        state.data.rosters.push(row);
        result = { roster: clone(row) };
        break;
      }
      case "roster.review": {
        const row = record(state, "rosters", payload.rosterId);
        if (!["approved", "rejected", "returned"].includes(payload.decision))
          fail("VALIDATION", "Beoordeling is ongeldig.");
        if (row.status !== "submitted")
          fail("STATE", "Deze lijst wacht niet op beoordeling.");
        row.status = payload.decision;
        row.decision = {
          by: actor.user.id,
          at: now,
          reason: reason(payload.reason),
        };
        result = { roster: clone(row) };
        break;
      }
      case "dispensation.decide": {
        assertOpenCup(state, payload.cupId);
        const player = record(state, "players", payload.playerId);
        if (typeof payload.allowed !== "boolean")
          fail("VALIDATION", "Kies toestaan of afwijzen.");
        player.dispensations ||= {};
        player.dispensations[payload.cupId] = {
          allowed: payload.allowed,
          reason: reason(payload.reason),
          by: actor.user.id,
          at: now,
        };
        result = { player: clone(player) };
        break;
      }
      case "lineup.submit": {
        const match = record(state, "matches", payload.matchId);
        assertOpenCup(state, match.cupId);
        teamScope(state, actor, payload.teamId);
        matchTeams(match, payload.teamId);
        if (match.status !== "scheduled")
          fail("STARTED", "De wedstrijdopgave staat na de aftrap vast.");
        if (payload.attested !== true)
          fail("ATTESTATION", "Bevestig de speelgerechtigdheid.");
        const roster = state.data.rosters
          .filter(
            (r) =>
              r.cupId === match.cupId &&
              r.teamId === payload.teamId &&
              r.status === "approved",
          )
          .at(-1);
        if (!roster)
          fail("ROSTER_REQUIRED", "Een goedgekeurde toernooilijst is vereist.");
        const rules = rulesFor(state, match);
        if (
          !Array.isArray(payload.players) ||
          payload.players.length > rules.maxSquadSize ||
          !payload.players.length
        )
          fail("VALIDATION", "Selectiegrootte is ongeldig.");
        const ids = [],
          numbers = [];
        let dispensations = 0;
        const players = payload.players.map((p) => {
          strict(p, [
            "playerId",
            "number",
            "position",
            "captain",
            "goalkeeper",
          ]);
          const person = record(state, "players", p.playerId);
          if (!roster.playerIds.includes(person.id))
            fail(
              "INELIGIBLE",
              "Een speler staat niet op de goedgekeurde toernooilijst.",
            );
          ids.push(person.id);
          numbers.push(integer(p.number, "Rugnummer", 1, 99));
          if (!["starter", "sub"].includes(p.position))
            fail("VALIDATION", "Selecteer basis of reserve.");
          if (
            typeof p.captain !== "boolean" ||
            typeof p.goalkeeper !== "boolean"
          )
            fail("VALIDATION", "Aanvoerder/keeper moet ja of nee zijn.");
          if (eligible(state, person, match.cupId, rules)) dispensations++;
          return clone(p);
        });
        uniqueIds(ids);
        if (new Set(numbers).size !== numbers.length)
          fail("VALIDATION", "Rugnummers moeten uniek zijn.");
        if (
          players.filter((p) => p.position === "starter").length !==
            rules.starterCount ||
          players.filter((p) => p.captain && p.position === "starter")
            .length !== 1 ||
          players.filter((p) => p.goalkeeper && p.position === "starter")
            .length !== 1
        )
          fail(
            "LINEUP_RULES",
            "Selecteer het vereiste aantal basisspelers, één aanvoerder en één keeper in de basis.",
          );
        if (dispensations > rules.maxDispensations)
          fail(
            "DISPENSATION_LIMIT",
            "Te veel dispensaties in de wedstrijdselectie.",
          );
        const old = state.data.lineups.filter(
          (l) => l.matchId === match.id && l.teamId === payload.teamId,
        );
        if (old.length) reason(payload.reason);
        const row = {
          id: idFor("HV-LINEUP"),
          matchId: match.id,
          teamId: payload.teamId,
          rosterId: roster.id,
          rosterVersion: roster.version,
          version: old.length + 1,
          players,
          status: "submitted",
          submittedBy: actor.user.id,
          submittedAt: now,
        };
        state.data.lineups.push(row);
        result = { lineup: clone(row) };
        break;
      }
      case "assignment.set": {
        const match = record(state, "matches", payload.matchId);
        if (match.status !== "scheduled")
          fail(
            "STARTED",
            "Gebruik voor een begonnen wedstrijd een overdrachtsprocedure.",
          );
        record(state, "officials", payload.officialId);
        match.officialId = payload.officialId;
        match.assignmentStatus = "invited";
        match.assignmentHistory ||= [];
        match.assignmentHistory.push({
          by: actor.user.id,
          at: now,
          reason: reason(payload.reason),
          officialId: payload.officialId,
        });
        result = { match: clone(match) };
        break;
      }
      case "assignment.accept": {
        const match = record(state, "matches", payload.matchId);
        officialScope(state, actor, match);
        if (match.status !== "scheduled")
          fail("STARTED", "Deze aanstelling kan niet meer worden gewijzigd.");
        if (typeof payload.accepted !== "boolean")
          fail("VALIDATION", "Kies accepteren of weigeren.");
        if (!payload.accepted) reason(payload.reason);
        match.assignmentStatus = payload.accepted ? "confirmed" : "declined";
        match.assignmentHistory ||= [];
        match.assignmentHistory.push({
          by: actor.user.id,
          at: now,
          reason: payload.reason || "Aanstelling geaccepteerd",
          accepted: payload.accepted,
        });
        result = { match: clone(match) };
        break;
      }
      case "lineup.review": {
        const lineup = record(state, "lineups", payload.lineupId),
          match = record(state, "matches", lineup.matchId);
        officialScope(state, actor, match);
        if (match.assignmentStatus !== "confirmed")
          fail("ASSIGNMENT", "Bevestig eerst de aanstelling.");
        if (match.status !== "scheduled")
          fail("STARTED", "De opgave is bevroren.");
        if (
          lineup !==
          state.data.lineups
            .filter((l) => l.matchId === match.id && l.teamId === lineup.teamId)
            .at(-1)
        )
          fail("STALE_LINEUP", "Er is een nieuwere opgave.", 409);
        if (!["approved", "returned"].includes(payload.decision))
          fail("VALIDATION", "Beoordeling is ongeldig.");
        if (payload.decision === "approved") {
          strict(
            payload.checks,
            lineup.players.map((p) => p.playerId),
          );
          if (
            lineup.players.some(
              (p) =>
                !["seen", "absent", "issue"].includes(
                  payload.checks[p.playerId],
                ),
            )
          )
            fail("IDENTITY_CHECK", "Controleer iedere geselecteerde speler.");
          const starters = lineup.players.filter(
            (p) =>
              p.position === "starter" && payload.checks[p.playerId] === "seen",
          );
          if (
            lineup.players.some(
              (p) => payload.checks[p.playerId] === "issue",
            ) ||
            starters.length < rulesFor(state, match).minimumPlayers ||
            !starters.some((p) => p.goalkeeper)
          )
            fail(
              "PRESENCE",
              "Identiteitscontrole, aanwezige keeper of minimale bezetting ontbreekt.",
            );
        } else reason(payload.reason);
        lineup.status = payload.decision;
        lineup.checks = clone(payload.checks || {});
        lineup.review = {
          by: actor.user.id,
          at: now,
          reason: payload.reason || "Spelers fysiek gecontroleerd",
        };
        result = { lineup: clone(lineup) };
        break;
      }
      case "match.start": {
        const match = record(state, "matches", payload.matchId);
        officialScope(state, actor, match);
        assertOpenCup(state, match.cupId);
        if (
          match.status !== "scheduled" ||
          !match.homeTeamId ||
          !match.awayTeamId
        )
          fail(
            "NOT_READY",
            "Beide teams en een geplande wedstrijd zijn vereist.",
          );
        if (match.assignmentStatus !== "confirmed")
          fail("ASSIGNMENT", "De aanstelling is nog niet bevestigd.");
        const rules = rulesFor(state, match);
        match.lineupSnapshots = {};
        for (const teamId of [match.homeTeamId, match.awayTeamId]) {
          if (
            registrationFor(state, match.cupId, teamId)?.status !== "approved"
          )
            fail(
              "REGISTRATION_REQUIRED",
              "Beide inschrijvingen moeten zijn goedgekeurd.",
            );
          const sheet = state.data.lineups
            .filter((l) => l.matchId === match.id && l.teamId === teamId)
            .at(-1);
          if (sheet?.status !== "approved")
            fail("LINEUP_REQUIRED", "Keur beide actuele opgaven goed.");
          let disp = 0;
          for (const p of sheet.players) {
            const person = record(state, "players", p.playerId);
            if (eligible(state, person, match.cupId, rules)) disp++;
          }
          if (disp > rules.maxDispensations)
            fail(
              "DISPENSATION_LIMIT",
              "De selectie bevat te veel dispensaties.",
            );
          match.lineupSnapshots[teamId] = clone(sheet);
          sheet.frozenAt = now;
        }
        match.rulesSnapshot = clone(rules);
        match.rulesVersion = record(state, "cups", match.cupId).rulesVersion;
        match.status = "live";
        match.homeScore = 0;
        match.awayScore = 0;
        match.startedAt = now;
        result = { match: clone(match) };
        break;
      }
      case "match.event": {
        const match = record(state, "matches", payload.matchId);
        matchScope(state, actor, match);
        if (match.status !== "live")
          fail(
            "NOT_LIVE",
            "Deze wedstrijd staat niet open voor gebeurtenissen.",
          );
        if (payload.eventId) {
          officialScope(state, actor, match);
          const event = record(state, "events", payload.eventId);
          if (event.matchId !== match.id || event.status !== "provisional")
            fail("STATE", "Deze melding wacht niet op beoordeling.");
          if (!["confirmed", "rejected"].includes(payload.decision))
            fail("VALIDATION", "Kies bevestigen of afwijzen.");
          if (payload.decision === "rejected") reason(payload.reason);
          event.status = payload.decision;
          event.review = {
            by: actor.user.id,
            at: now,
            reason: payload.reason || "Bevestigd",
          };
          if (event.status === "confirmed") validateEvent(state, match, event);
          recomputeScore(state, match);
          result = { event: clone(event), match: clone(match) };
          break;
        }
        matchTeams(match, payload.teamId);
        if (
          actor.membership.role === "team" &&
          actor.membership.teamId !== payload.teamId
        )
          fail("FORBIDDEN", "Je kunt alleen het eigen team melden.", 403);
        const types = [
          "goal",
          "penalty-goal",
          "own-goal",
          "yellow",
          "second-yellow",
          "red",
          "substitution",
          "incident",
        ];
        if (!types.includes(payload.type))
          fail("VALIDATION", "Gebeurtenistype is ongeldig.");
        integer(payload.minute, "Minuut", 0, 180);
        const row = {
          id: idFor("HV-E"),
          matchId: match.id,
          type: payload.type,
          teamId: payload.teamId,
          playerId: payload.playerId || null,
          relatedPlayerId: payload.relatedPlayerId || null,
          minute: payload.minute,
          note: payload.note
            ? text(payload.note, "Toelichting", { max: 600 })
            : "",
          status:
            actor.membership.role === "team" ? "provisional" : "confirmed",
          createdBy: actor.user.id,
          createdAt: now,
        };
        if (row.type === "incident" && !row.note)
          fail("VALIDATION", "Geef een toelichting bij de bijzonderheid.");
        validateEvent(state, match, row);
        if (
          state.data.events.some(
            (e) =>
              e.matchId === row.matchId &&
              e.status !== "rejected" &&
              e.type === row.type &&
              e.teamId === row.teamId &&
              e.playerId === row.playerId &&
              e.minute === row.minute,
          )
        )
          fail(
            "POSSIBLE_DUPLICATE",
            "Een vergelijkbaar wedstrijdmoment bestaat al; beoordeel de melding.",
            409,
          );
        state.data.events.push(row);
        if (row.status === "confirmed")
          for (const event of state.data.events
            .filter((e) => e.matchId === match.id && e.status === "confirmed")
            .sort((a, b) => a.minute - b.minute))
            validateEvent(state, match, event);
        recomputeScore(state, match);
        result = { event: clone(row), match: clone(match) };
        break;
      }
      case "match.finalize": {
        const match = record(state, "matches", payload.matchId);
        officialScope(state, actor, match);
        if (match.status !== "live")
          fail("NOT_LIVE", "Registreer eerst de aftrap.");
        if (
          state.data.events.some(
            (e) => e.matchId === match.id && e.status === "provisional",
          )
        )
          fail("PENDING_EVENTS", "Beoordeel eerst alle voorlopige meldingen.");
        integer(payload.homeScore, "Thuisuitslag", 0, 99);
        integer(payload.awayScore, "Uituitslag", 0, 99);
        const tied = payload.homeScore === payload.awayScore,
          rules = rulesFor(state, match);
        let winner =
          payload.homeScore > payload.awayScore
            ? match.homeTeamId
            : match.awayTeamId;
        if (tied) {
          if (!rules.penalties)
            fail(
              "NO_WINNER",
              "Een knock-outwedstrijd vereist een geldige winnaar.",
            );
          integer(payload.penHome, "Serie thuis", 0, 99);
          integer(payload.penAway, "Serie uit", 0, 99);
          if (payload.penHome === payload.penAway)
            fail("NO_WINNER", "De strafschoppenserie is niet beslist.");
          winner =
            payload.penHome > payload.penAway
              ? match.homeTeamId
              : match.awayTeamId;
        }
        if (
          payload.homeScore !== match.homeScore ||
          payload.awayScore !== match.awayScore
        )
          reason(payload.reason);
        if (
          payload.eventsComplete === true &&
          (payload.homeScore !== match.homeScore ||
            payload.awayScore !== match.awayScore)
        )
          fail(
            "EVENT_MISMATCH",
            "Volledig verloop vereist passende bevestigde goals.",
          );
        propagate(state, match, winner);
        match.status = "finished";
        match.homeScore = payload.homeScore;
        match.awayScore = payload.awayScore;
        match.penHome = tied ? payload.penHome : null;
        match.penAway = tied ? payload.penAway : null;
        match.winnerTeamId = winner;
        match.eventsComplete = payload.eventsComplete === true;
        match.officialResult = {
          homeScore: payload.homeScore,
          awayScore: payload.awayScore,
          penHome: match.penHome,
          penAway: match.penAway,
          by: actor.user.id,
          at: now,
          reason: payload.reason || "",
        };
        match.publishedAt = now;
        result = { match: clone(match) };
        break;
      }
      case "objection.submit": {
        const match = record(state, "matches", payload.matchId);
        teamScope(state, actor, payload.teamId);
        matchTeams(match, payload.teamId);
        if (match.status !== "finished")
          fail("NOT_OFFICIAL", "Bezwaar kan na de officiële uitslag.");
        if (
          state.data.objections.some(
            (o) =>
              o.matchId === match.id &&
              o.teamId === payload.teamId &&
              o.status === "open",
          )
        )
          fail("DUPLICATE", "Voor dit team bestaat al een open bezwaar.", 409);
        const row = {
          id: idFor("HV-BZ"),
          matchId: match.id,
          teamId: payload.teamId,
          subject: text(payload.subject, "Onderwerp", { max: 200 }),
          reason: reason(payload.reason),
          status: "open",
          referenceResult: clone(match.officialResult),
          createdBy: actor.user.id,
          createdAt: now,
          history: [],
        };
        state.data.objections.push(row);
        result = { objection: clone(row) };
        break;
      }
      case "objection.decide": {
        const objection = record(state, "objections", payload.objectionId),
          match = record(state, "matches", objection.matchId);
        if (objection.status !== "open")
          fail("STATE", "Dit bezwaar is al besloten.");
        if (!["rejected", "upheld", "corrected"].includes(payload.decision))
          fail("VALIDATION", "Besluit is ongeldig.");
        const why = reason(payload.reason);
        if (payload.decision === "corrected") {
          integer(payload.homeScore, "Thuisuitslag", 0, 99);
          integer(payload.awayScore, "Uituitslag", 0, 99);
          if (payload.homeScore === payload.awayScore)
            fail("NO_WINNER", "Geef een beslissende gecorrigeerde score.");
          const winner =
            payload.homeScore > payload.awayScore
              ? match.homeTeamId
              : match.awayTeamId;
          if (payload.winnerTeamId && payload.winnerTeamId !== winner)
            fail("NO_WINNER", "Winnaar past niet bij de score.");
          propagate(state, match, winner);
          match.corrections ||= [];
          match.corrections.push({
            previous: {
              homeScore: match.homeScore,
              awayScore: match.awayScore,
            },
            homeScore: payload.homeScore,
            awayScore: payload.awayScore,
            by: actor.user.id,
            at: now,
            reason: why,
            objectionId: objection.id,
          });
          match.homeScore = payload.homeScore;
          match.awayScore = payload.awayScore;
          match.winnerTeamId = winner;
          match.eventsComplete = false;
          match.correctedAt = now;
          match.publishedAt = now;
          match.penHome = null;
          match.penAway = null;
        }
        objection.status = payload.decision;
        objection.decision = { by: actor.user.id, at: now, reason: why };
        objection.history.push(clone(objection.decision));
        result = { objection: clone(objection), match: clone(match) };
        break;
      }
      case "publication.update": {
        const p = record(state, "players", payload.playerId);
        if (
          actor.membership.role !== "leadership" &&
          actor.membership.playerId !== p.id
        )
          fail(
            "FORBIDDEN",
            "Alleen de eigen publicatievoorkeur is beschikbaar.",
            403,
          );
        for (const field of ["publicName", "publicPhoto"]) {
          if (typeof payload[field] !== "boolean")
            fail("VALIDATION", "Publicatievoorkeur moet ja of nee zijn.");
          p[field] = payload[field];
        }
        p.publicationDecision = {
          by: actor.user.id,
          at: now,
          reason: reason(payload.reason),
        };
        result = { player: clone(p) };
        break;
      }
      case "player.availability": {
        const p = record(state, "players", payload.playerId),
          match = record(state, "matches", payload.matchId);
        if (
          actor.membership.role !== "leadership" &&
          actor.membership.playerId !== p.id
        )
          fail(
            "FORBIDDEN",
            "Je kunt alleen je eigen beschikbaarheid wijzigen.",
            403,
          );
        matchTeams(match, p.teamId);
        if (
          !["available", "unavailable", "discuss"].includes(
            payload.availability,
          )
        )
          fail("VALIDATION", "Beschikbaarheid is ongeldig.");
        p.availability ||= {};
        p.availability[match.id] = { status: payload.availability, at: now };
        result = { player: clone(p) };
        break;
      }
      case "shift.signup": {
        const shift = record(state, "shifts", payload.shiftId),
          volunteer = record(state, "volunteers", payload.volunteerId);
        if (
          actor.membership.role !== "leadership" &&
          actor.membership.volunteerId !== volunteer.id
        )
          fail("FORBIDDEN", "Je kunt alleen je eigen dienst wijzigen.", 403);
        shift.volunteerIds ||= [];
        if (payload.cancel === true)
          shift.volunteerIds = shift.volunteerIds.filter(
            (id) => id !== volunteer.id,
          );
        else {
          if (shift.volunteerIds.includes(volunteer.id))
            fail("DUPLICATE", "Je bent al ingeschreven.");
          if (shift.volunteerIds.length >= shift.capacity)
            fail("CAPACITY", "Deze dienst is vol.");
          if (
            state.data.shifts.some(
              (s) =>
                s.id !== shift.id &&
                s.date === shift.date &&
                s.volunteerIds?.includes(volunteer.id) &&
                s.from < shift.until &&
                s.until > shift.from,
            )
          )
            fail("OVERLAP", "Deze dienst overlapt een bestaande afspraak.");
          shift.volunteerIds.push(volunteer.id);
        }
        result = { shift: clone(shift) };
        break;
      }
      case "message.send": {
        const recipients = uniqueIds(payload.recipientUserIds);
        if (!recipients.length) fail("VALIDATION", "Kies een ontvanger.");
        if (
          recipients.some(
            (id) =>
              !state.memberships.some(
                (m) => m.userId === id && m.status === "active",
              ),
          )
        )
          fail("VALIDATION", "Een ontvanger heeft geen actief lidmaatschap.");
        if (payload.matchId)
          matchScope(state, actor, record(state, "matches", payload.matchId));
        const row = {
          id: idFor("HV-MSG"),
          senderUserId: actor.user.id,
          recipientUserIds: recipients,
          subject: text(payload.subject, "Onderwerp", { max: 200 }),
          body: text(payload.body, "Bericht", { max: 5000 }),
          matchId: payload.matchId || null,
          readBy: [],
          createdAt: now,
        };
        state.data.messages.push(row);
        result = { message: clone(row) };
        break;
      }
      case "message.read": {
        const row = record(state, "messages", payload.messageId);
        if (!row.recipientUserIds.includes(actor.user.id))
          fail("FORBIDDEN", "Alleen een ontvanger kan dit bericht lezen.", 403);
        if (!row.readBy.includes(actor.user.id)) row.readBy.push(actor.user.id);
        result = { message: clone(row) };
        break;
      }
      case "favorite.toggle": {
        if (!["clubs", "teams", "cups", "matches"].includes(payload.entityType))
          fail("VALIDATION", "Dit soort favoriet is niet toegestaan.");
        record(state, payload.entityType, payload.entityId);
        const found = state.data.favorites.find(
          (f) =>
            f.userId === actor.user.id &&
            f.entityType === payload.entityType &&
            f.entityId === payload.entityId,
        );
        if (found)
          state.data.favorites = state.data.favorites.filter(
            (f) => f !== found,
          );
        else
          state.data.favorites.push({
            id: idFor("HV-FAV"),
            userId: actor.user.id,
            entityType: payload.entityType,
            entityId: payload.entityId,
          });
        result = { followed: !found };
        break;
      }
      case "bracket.draw": {
        const cup = assertOpenCup(state, payload.cupId);
        if (state.data.matches.some((m) => m.cupId === cup.id))
          fail("EXISTING_MATCHES", "Deze beker heeft al wedstrijden.");
        if (![8, 16, 32].includes(payload.bracketSize))
          fail("VALIDATION", "Kies 8, 16 of 32 bracketplekken.");
        const ids = uniqueIds(payload.teamIds);
        if (
          ids.length < payload.bracketSize / 2 ||
          ids.length > payload.bracketSize
        )
          fail(
            "BRACKET_SIZE",
            "Aantal deelnemers past niet bij de bracketgrootte.",
          );
        ids.forEach((id) => {
          if (registrationFor(state, cup.id, id)?.status !== "approved")
            fail(
              "REGISTRATION_REQUIRED",
              "Alle deelnemers moeten zijn goedgekeurd.",
            );
        });
        const seed = text(payload.seed, "Lotingssleutel", { max: 200 });
        const order = ids.slice().sort((a, b) =>
          createHash("sha256")
            .update(seed + "|" + a)
            .digest("hex")
            .localeCompare(
              createHash("sha256")
                .update(seed + "|" + b)
                .digest("hex"),
            ),
        );
        cup.draw = {
          status: "draft",
          bracketSize: payload.bracketSize,
          teamIds: order,
          seed,
          by: actor.user.id,
          at: now,
        };
        result = { draw: clone(cup.draw) };
        break;
      }
      case "bracket.publish": {
        const cup = assertOpenCup(state, payload.cupId);
        if (
          cup.draw?.status !== "draft" ||
          state.data.matches.some((m) => m.cupId === cup.id)
        )
          fail("DRAW_REQUIRED", "Maak eerst een nieuwe concepttrekking.");
        cup.draw.teamIds.forEach((id) => {
          if (registrationFor(state, cup.id, id)?.status !== "approved")
            fail(
              "REGISTRATION_REQUIRED",
              "Een inschrijving is intussen gewijzigd.",
            );
        });
        const size = cup.draw.bracketSize,
          firstCount = size / 2,
          slots = Array.from({ length: size }, () => null);
        cup.draw.teamIds.forEach(
          (id, i) =>
            (slots[i < firstCount ? i * 2 : (i - firstCount) * 2 + 1] = id),
        );
        let previous = [];
        for (
          let count = firstCount, round = 1;
          count >= 1;
          count /= 2, round++
        ) {
          const current = [];
          for (let i = 0; i < count; i++) {
            const home = round === 1 ? slots[i * 2] : null,
              away = round === 1 ? slots[i * 2 + 1] : null,
              id = idFor("HV-W"),
              row = {
                id,
                cupId: cup.id,
                homeTeamId: home,
                awayTeamId: away,
                homeSourceId: round === 1 ? null : previous[i * 2],
                awaySourceId: round === 1 ? null : previous[i * 2 + 1],
                date: null,
                time: null,
                venue: "",
                field: "",
                round: count === 1 ? "Finale" : "Ronde " + round,
                roundKey: count === 1 ? "final" : "round-" + round,
                status: round === 1 && !away ? "bye" : "scheduled",
                homeScore: null,
                awayScore: null,
                officialId: null,
                assignmentStatus: "open",
              };
            if (row.status === "bye") row.winnerTeamId = home;
            state.data.matches.push(row);
            current.push(id);
          }
          previous = current;
        }
        for (const m of state.data.matches.filter(
          (m) => m.cupId === cup.id && m.status === "bye",
        ))
          propagate(state, m, m.winnerTeamId);
        cup.draw.status = "published";
        cup.draw.publishedAt = now;
        result = {
          draw: clone(cup.draw),
          matches: clone(state.data.matches.filter((m) => m.cupId === cup.id)),
        };
        break;
      }
      default:
        fail("UNKNOWN_COMMAND", "Dit commando is niet beschikbaar.");
    }
  enqueueNotification(
    state,
    type,
    payload,
    actor,
    result,
    now,
    command.requestId,
  );
  state.version = input.version + 1;
  state.updatedAt = now;
  state.audit.push({
    id: idFor("HV-AUDIT"),
    version: state.version,
    type,
    userId: actor.user.id,
    membershipId: actor.membership?.id || null,
    at: now,
    requestId: command.requestId,
    reason: payload.reason || null,
  });
  return { state, result };
}

function enqueueNotification(
  state,
  type,
  payload,
  actor,
  result,
  now,
  requestId,
) {
  const subjects = {
    "message.send": "Nieuw bericht",
    "assignment.set": "Nieuwe scheidsrechtersaanstelling",
    "registration.review": "Beoordeling teaminschrijving",
    "match.upsert": "Wedstrijdplanning bijgewerkt",
    "objection.decide": "Besluit op bezwaar",
  };
  if (!subjects[type]) return;
  let recipientUserIds = [];
  if (type === "message.send") recipientUserIds = payload.recipientUserIds;
  if (type === "registration.review")
    recipientUserIds = [result.registration.submittedBy];
  if (type === "objection.decide")
    recipientUserIds = [result.objection.createdBy];
  if (type === "assignment.set")
    recipientUserIds = state.memberships
      .filter(
        (m) => m.officialId === payload.officialId && m.status === "active",
      )
      .map((m) => m.userId);
  if (type === "match.upsert") {
    const match = result.record,
      teams = [match.homeTeamId, match.awayTeamId];
    recipientUserIds = state.memberships
      .filter(
        (m) =>
          m.status === "active" &&
          (teams.includes(m.teamId) ||
            (m.officialId && m.officialId === match.officialId)),
      )
      .map((m) => m.userId);
  }
  recipientUserIds = [...new Set(recipientUserIds.filter(Boolean))];
  if (!recipientUserIds.length) return;
  state.mailOutbox ||= [];
  state.mailOutbox.push({
    id: idFor("HV-MAIL"),
    recipientUserIds,
    subject: subjects[type],
    text:
      type === "message.send"
        ? payload.subject + "\n\n" + payload.body
        : subjects[type] +
          ". Open je werkruimte in Haaglanden Voetbal voor de actuele gegevens en het volledige besluit.",
    status: "pending",
    createdAt: now,
    commandType: type,
    requestId,
  });
}
function validateEvent(state, match, event) {
  if (event.type === "incident") return;
  const sheet = match.lineupSnapshots?.[event.teamId];
  if (!sheet) fail("INELIGIBLE", "De geldige wedstrijdopgave ontbreekt.");
  const player = sheet.players.find((p) => p.playerId === event.playerId);
  if (!player || sheet.checks?.[player.playerId] !== "seen")
    fail("INELIGIBLE", "De speler is niet aanwezig en toegelaten.");
  let field = new Set(
    sheet.players
      .filter(
        (p) =>
          p.position === "starter" && sheet.checks?.[p.playerId] === "seen",
      )
      .map((p) => p.playerId),
  );
  let excluded = new Set();
  let substitutions = 0;
  const events = state.data.events
    .filter(
      (e) =>
        e.matchId === match.id &&
        e.teamId === event.teamId &&
        e.status === "confirmed" &&
        e.id !== event.id &&
        e.minute <= event.minute,
    )
    .sort((a, b) => a.minute - b.minute);
  for (const e of events) {
    if (["red", "second-yellow"].includes(e.type)) {
      excluded.add(e.playerId);
      field.delete(e.playerId);
    }
    if (e.type === "substitution") {
      field.delete(e.playerId);
      field.add(e.relatedPlayerId);
      substitutions++;
    }
  }
  if (excluded.has(event.playerId))
    fail("SENT_OFF", "Een uitgesloten speler kan niet terugkeren of scoren.");
  if (!field.has(event.playerId))
    fail("NOT_ON_FIELD", "Deze speler staat op dat moment niet op het veld.");
  if (event.type === "substitution") {
    const incoming = sheet.players.find(
      (p) => p.playerId === event.relatedPlayerId,
    );
    if (
      !incoming ||
      sheet.checks?.[incoming.playerId] !== "seen" ||
      field.has(incoming.playerId) ||
      excluded.has(incoming.playerId)
    )
      fail(
        "INVALID_SUBSTITUTION",
        "Inkomende speler is niet beschikbaar op de bank.",
      );
    if (substitutions >= rulesFor(state, match).maxSubstitutions)
      fail("SUBSTITUTION_LIMIT", "Het maximumaantal wissels is bereikt.");
  }
}
function recomputeScore(state, match) {
  match.homeScore = 0;
  match.awayScore = 0;
  for (const e of state.data.events.filter(
    (e) =>
      e.matchId === match.id &&
      e.status === "confirmed" &&
      ["goal", "penalty-goal", "own-goal"].includes(e.type),
  )) {
    const home = e.teamId === match.homeTeamId;
    match[home !== (e.type === "own-goal") ? "homeScore" : "awayScore"]++;
  }
}
const pick = (row, fields) =>
  Object.fromEntries(
    fields
      .filter((key) => row[key] !== undefined)
      .map((key) => [key, clone(row[key])]),
  );
export function projectBootstrap(state, actor, config) {
  const data = Object.fromEntries(COLLECTIONS.map((key) => [key, []])),
    m = actor.membership,
    leader = m?.role === "leadership",
    now = Date.now();
  data.editions = state.data.editions.map((r) =>
    pick(r, ["id", "name", "season", "status", "finalDate", "venue"]),
  );
  data.clubs = state.data.clubs.map((r) =>
    pick(r, ["id", "name", "city", "venue"]),
  );
  data.teams = state.data.teams.map((r) =>
    pick(r, ["id", "name", "clubId", "category"]),
  );
  data.cups = state.data.cups.map((r) =>
    pick(r, [
      "id",
      "name",
      "editionId",
      "category",
      "status",
      "rules",
      "rulesVersion",
    ]),
  );
  data.matches = state.data.matches.map((r) => ({
    ...pick(r, [
      "id",
      "cupId",
      "homeTeamId",
      "awayTeamId",
      "date",
      "time",
      "venue",
      "field",
      "round",
      "roundKey",
      "homeSourceId",
      "awaySourceId",
      "status",
      "homeScore",
      "awayScore",
      "penHome",
      "penAway",
      "winnerTeamId",
      "publishedAt",
      "correctedAt",
      "eventsComplete",
    ]),
    corrected: !!r.correctedAt,
  }));
  data.kits = clone(state.data.kits);
  data.media = state.data.media
    .filter(
      (r) =>
        r.status === "approved" &&
        r.consent === true &&
        r.rights?.website === true,
    )
    .map((r) =>
      pick(r, [
        "id",
        "matchId",
        "title",
        "credit",
        "dataUrl",
        "rights",
        "status",
      ]),
    );
  data.news = state.data.news
    .filter((r) => r.status === "published" && Date.parse(r.publishedAt) <= now)
    .map((r) =>
      pick(r, [
        "id",
        "title",
        "body",
        "status",
        "publishedAt",
        "cupIds",
        "teamIds",
        "clubIds",
      ]),
    );
  data.players = state.data.players
    .filter((r) => r.publicName === true)
    .map((r) => pick(r, ["id", "name", "teamId", "number"]));
  data.events = state.data.events
    .filter((r) => r.status === "confirmed")
    .map((r) => ({
      ...pick(r, ["id", "matchId", "type", "teamId", "minute", "status"]),
      ...(state.data.players.some(
        (p) => p.id === r.playerId && p.publicName === true,
      )
        ? { playerId: r.playerId }
        : {}),
    }));
  if (actor.user) {
    const ownTeamIds = new Set(
      m?.role === "club"
        ? state.data.teams.filter((t) => t.clubId === m.clubId).map((t) => t.id)
        : [
            m?.teamId ||
              state.data.players.find((p) => p.id === m?.playerId)?.teamId,
          ].filter(Boolean),
    );
    const assignedMatches = new Set(
      state.data.matches
        .filter(
          (row) => m?.role === "official" && row.officialId === m.officialId,
        )
        .map((row) => row.id),
    );
    const ownMatchIds = new Set(
      state.data.matches
        .filter(
          (row) =>
            ownTeamIds.has(row.homeTeamId) || ownTeamIds.has(row.awayTeamId),
        )
        .map((row) => row.id),
    );
    const scopedTeams = new Set([
      ...ownTeamIds,
      ...state.data.matches
        .filter((row) => assignedMatches.has(row.id))
        .flatMap((row) => [row.homeTeamId, row.awayTeamId]),
    ]);
    if (leader)
      for (const key of COLLECTIONS) data[key] = clone(state.data[key]);
    else {
      data.clubs = state.data.clubs.map((row) =>
        m?.role === "club" && row.id === m.clubId
          ? clone(row)
          : pick(row, ["id", "name", "city", "venue"]),
      );
      if (["team", "club", "official", "player"].includes(m?.role)) {
        data.players = state.data.players
          .filter((p) => scopedTeams.has(p.teamId) || p.id === m.playerId)
          .map((p) => {
            if (m.role === "player")
              return p.id === m.playerId
                ? clone(p)
                : p.publicName
                  ? pick(p, ["id", "name", "teamId", "number"])
                  : null;
            if (m.role === "official") {
              const allowed = state.data.matches.some(
                (match) =>
                  assignedMatches.has(match.id) &&
                  [match.homeTeamId, match.awayTeamId].includes(p.teamId) &&
                  match.assignmentStatus === "confirmed" &&
                  ["scheduled", "live"].includes(match.status) &&
                  match.date &&
                  match.time &&
                  Math.abs(
                    new Date(
                      amsterdamInstant(match.date, match.time),
                    ).getTime() - now,
                  ) <
                    6 * 3600000,
              );
              return allowed
                ? clone(p)
                : pick(p, ["id", "name", "teamId", "number"]);
            }
            return clone(p);
          })
          .filter(Boolean);
        for (const key of ["registrations", "rosters"])
          data[key] = clone(
            state.data[key].filter((r) => scopedTeams.has(r.teamId)),
          );
        data.lineups = clone(
          state.data.lineups.filter((r) =>
            m.role === "official"
              ? assignedMatches.has(r.matchId)
              : ownTeamIds.has(r.teamId),
          ),
        );
        data.events = clone(
          state.data.events.filter(
            (r) => assignedMatches.has(r.matchId) || ownMatchIds.has(r.matchId),
          ),
        );
        data.objections = clone(
          state.data.objections.filter(
            (r) => ownTeamIds.has(r.teamId) || assignedMatches.has(r.matchId),
          ),
        );
        data.matches = state.data.matches.map((r) => {
          const publicRow = data.matches.find((row) => row.id === r.id);
          if (assignedMatches.has(r.id) || ownMatchIds.has(r.id))
            return {
              ...publicRow,
              ...pick(r, [
                "officialId",
                "assignmentStatus",
                "rulesVersion",
                "rulesSnapshot",
                "startedAt",
              ]),
              lineupSnapshots: undefined,
            };
          return publicRow;
        });
      }
      if (m?.role === "editor") data.news = clone(state.data.news);
      if (m?.role === "official")
        data.officials = clone(
          state.data.officials.filter((o) => o.id === m.officialId),
        );
      if (m?.role === "volunteer") {
        data.volunteers = clone(
          state.data.volunteers.filter((v) => v.id === m.volunteerId),
        );
        data.shifts = state.data.shifts.map((s) => ({
          ...pick(s, [
            "id",
            "name",
            "date",
            "from",
            "until",
            "venue",
            "capacity",
          ]),
          signedUp: s.volunteerIds?.includes(m.volunteerId) || false,
          placesLeft: s.capacity - (s.volunteerIds?.length || 0),
        }));
      }
      data.media = state.data.media
        .filter(
          (r) =>
            r.submittedBy === actor.user.id ||
            (r.status === "approved" &&
              r.consent === true &&
              r.rights?.[m?.role === "press" ? "press" : "website"] === true),
        )
        .map((r) =>
          r.submittedBy === actor.user.id
            ? clone(r)
            : pick(r, [
                "id",
                "matchId",
                "title",
                "credit",
                "dataUrl",
                "rights",
                "status",
              ]),
        );
      data.messages = clone(
        state.data.messages.filter(
          (row) =>
            row.senderUserId === actor.user.id ||
            row.recipientUserIds.includes(actor.user.id),
        ),
      );
      data.favorites = clone(
        state.data.favorites.filter((row) => row.userId === actor.user.id),
      );
    }
  }
  return {
    apiVersion: "1",
    version: state.version,
    mode: config.dataMode,
    user: actor.user ? pick(actor.user, ["id", "email", "name"]) : null,
    memberships: clone(actor.memberships || []),
    activeMembership: clone(m || null),
    capabilities: capabilitiesFor(actor),
    data,
    config: {
      auth: {
        supabaseUrl: config.supabaseUrl || "",
        publishableKey: config.publishableKey || "",
      },
      localSessionEnabled: config.localSessionEnabled === true,
    },
  };
}
export function fingerprintCommand(command) {
  function ordered(v) {
    if (Array.isArray(v)) return v.map(ordered);
    if (v && typeof v === "object")
      return Object.fromEntries(
        Object.keys(v)
          .sort()
          .map((k) => [k, ordered(v[k])]),
      );
    return v;
  }
  return createHash("sha256")
    .update(
      JSON.stringify(ordered({ type: command.type, payload: command.payload })),
    )
    .digest("hex");
}
