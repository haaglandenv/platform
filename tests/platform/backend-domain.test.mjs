import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialState,
  actorFor,
  applyCommand,
  projectBootstrap,
  PlatformError,
  DEFAULT_RULES,
  fingerprintCommand,
} from "../../server/domain.mjs";
let sequence = 0;
const config = {
  dataMode: "local",
  supabaseUrl: "",
  publishableKey: "",
  localSessionEnabled: true,
};
function harness() {
  let state = createInitialState({ example: true });
  return {
    get state() {
      return state;
    },
    send(type, payload, userId = "local-admin", membershipId) {
      const actor = actorFor(state, { id: userId }, membershipId);
      const next = applyCommand(
        state,
        { type, payload, requestId: "test-" + ++sequence },
        actor,
      );
      state = next.state;
      return next.result;
    },
    project(userId = null, membershipId) {
      return projectBootstrap(
        state,
        actorFor(state, userId ? { id: userId } : null, membershipId),
        config,
      );
    },
  };
}
const rejected = (fn, code) =>
  assert.throws(fn, (e) => e instanceof PlatformError && e.code === code);
function setupMatch() {
  const h = harness(),
    home = "HV-T-EXAMPLE",
    cup = "HV-CUP-EXAMPLE";
  h.send("cup.upsert", {
    id: cup,
    rules: {
      ...DEFAULT_RULES,
      starterCount: 3,
      minimumPlayers: 3,
      maxSquadSize: 6,
      minAge: 18,
      maxDispensations: 1,
    },
  });
  const club = h.send("club.upsert", { name: "Tweede vereniging" }).record,
    away = h.send("team.upsert", {
      name: "Tweede team",
      clubId: club.id,
      category: "Senioren",
    }).record.id;
  h.send("match.upsert", { id: "HV-W-EXAMPLE", awayTeamId: away });
  const players = { [home]: ["HV-P-EXAMPLE"], [away]: [] };
  for (const team of [home, away])
    while (players[team].length < 3)
      players[team].push(
        h.send("player.upsert", {
          name: "Speler " + sequence,
          teamId: team,
          birthDate: "2000-01-01",
          relationCode: "TEST-" + sequence,
          number: players[team].length + 1,
        }).record.id,
      );
  for (const team of [home, away]) {
    const r = h.send("registration.submit", {
      cupId: cup,
      teamId: team,
    }).registration;
    h.send("registration.review", {
      registrationId: r.id,
      decision: "approved",
      reason: "Inschrijving inhoudelijk gecontroleerd.",
    });
    const roster = h.send("roster.submit", {
      cupId: cup,
      teamId: team,
      playerIds: players[team],
    }).roster;
    h.send("roster.review", {
      rosterId: roster.id,
      decision: "approved",
      reason: "Spelersgegevens en lijst gecontroleerd.",
    });
    h.send("membership.upsert", {
      userId: "manager-" + team,
      role: "team",
      teamId: team,
      status: "active",
      reason: "Eigen teammanager voor de acceptatie.",
    });
  }
  h.send("membership.upsert", {
    userId: "official-user",
    role: "official",
    officialId: "HV-O-EXAMPLE",
    status: "active",
    reason: "Aanstelling voor de controletest.",
  });
  h.send("assignment.set", {
    matchId: "HV-W-EXAMPLE",
    officialId: "HV-O-EXAMPLE",
    reason: "Neutrale official voor deze wedstrijd.",
  });
  h.send(
    "assignment.accept",
    { matchId: "HV-W-EXAMPLE", accepted: true },
    "official-user",
  );
  for (const team of [home, away]) {
    const lineup = h.send(
      "lineup.submit",
      {
        matchId: "HV-W-EXAMPLE",
        teamId: team,
        players: players[team].map((playerId, i) => ({
          playerId,
          number: i + 1,
          position: "starter",
          captain: i === 0,
          goalkeeper: i === 0,
        })),
        attested: true,
      },
      "manager-" + team,
    ).lineup;
    h.send(
      "lineup.review",
      {
        lineupId: lineup.id,
        decision: "approved",
        checks: Object.fromEntries(players[team].map((id) => [id, "seen"])),
      },
      "official-user",
    );
  }
  return { h, home, away, cup, players, matchId: "HV-W-EXAMPLE" };
}

test("Supabase begins without demo entities, memberships or results", () => {
  const s = createInitialState();
  assert(Object.values(s.data).every((v) => v.length === 0));
  assert.deepEqual(s.memberships, []);
  assert.equal(s.version, 0);
});
test("Local example has exactly one primary entity and no invented opponent or result", () => {
  const s = createInitialState({ example: true });
  for (const key of [
    "editions",
    "clubs",
    "teams",
    "players",
    "officials",
    "cups",
    "matches",
    "news",
    "volunteers",
    "shifts",
  ])
    assert.equal(s.data[key].length, 1, key);
  assert.equal(s.data.matches[0].awayTeamId, null);
  assert.equal(s.data.matches[0].homeScore, null);
  assert.equal(s.data.events.length, 0);
});
test("Public projection excludes private identity/contact fields and future drafts", () => {
  const h = harness();
  h.send("news.upsert", {
    title: "Nog niet openbaar",
    body: "Alleen redactioneel concept",
    status: "draft",
  });
  const data = h.project();
  const serialized = JSON.stringify(data);
  for (const secret of [
    "birthDate",
    "relationCode",
    "identityPhoto",
    "contactEmail",
    "dispensations",
    "local-admin",
  ])
    assert(!serialized.includes(secret), secret);
  assert.equal(data.data.players.length, 0);
  assert.equal(data.data.news.length, 1);
  assert.equal(data.user, null);
});
test("User-editable metadata cannot create a leadership context", () => {
  const s = createInitialState();
  const actor = actorFor(s, {
    id: "unprivileged",
    user_metadata: { role: "leadership" },
  });
  rejected(
    () =>
      applyCommand(
        s,
        {
          type: "club.upsert",
          payload: { name: "Verboden" },
          requestId: "metadata",
        },
        actor,
      ),
    "FORBIDDEN",
  );
});
test("Foreign and revoked membership selections fail before a command", () => {
  const h = harness();
  const own = h.send("membership.upsert", {
    userId: "team-owner",
    role: "team",
    teamId: "HV-T-EXAMPLE",
    status: "active",
    reason: "Eigen teamrol voor deze controle.",
  }).membership;
  rejected(() => actorFor(h.state, { id: "intruder" }, own.id), "FORBIDDEN");
  h.send("membership.upsert", {
    id: own.id,
    userId: own.userId,
    role: own.role,
    teamId: own.teamId,
    status: "revoked",
    reason: "Rol wordt direct ingetrokken.",
  });
  rejected(() => actorFor(h.state, { id: "team-owner" }, own.id), "FORBIDDEN");
});
test("CRUD keeps stable IDs, checks relations and rejects arbitrary state fields", () => {
  const h = harness(),
    old = "HV-T-EXAMPLE";
  h.send("team.upsert", { id: old, name: "Nieuwe naam" });
  assert.equal(h.state.data.teams[0].id, old);
  rejected(
    () => h.send("match.upsert", { id: "HV-W-EXAMPLE", homeScore: 9 }),
    "UNKNOWN_FIELD",
  );
  rejected(
    () => h.send("club.upsert", { name: "X", state: {} }),
    "UNKNOWN_FIELD",
  );
  rejected(
    () =>
      h.send("team.upsert", {
        name: "Onbekend",
        clubId: "MISSING",
        category: "Senioren",
      }),
    "NOT_FOUND",
  );
});
test("Invalid dates, contradictory player limits and unknown commands fail", () => {
  const h = harness();
  rejected(
    () => h.send("match.upsert", { id: "HV-W-EXAMPLE", date: "2027-02-30" }),
    "VALIDATION",
  );
  rejected(
    () =>
      h.send("cup.upsert", {
        id: "HV-CUP-EXAMPLE",
        rules: { ...DEFAULT_RULES, starterCount: 3, minimumPlayers: 4 },
      }),
    "VALIDATION",
  );
  rejected(() => h.send("__proto__", {}), "UNKNOWN_COMMAND");
});
test("Registrations deduplicate and are required before submitting a roster", () => {
  const h = harness();
  rejected(
    () =>
      h.send("roster.submit", {
        cupId: "HV-CUP-EXAMPLE",
        teamId: "HV-T-EXAMPLE",
        playerIds: ["HV-P-EXAMPLE"],
      }),
    "REGISTRATION_REQUIRED",
  );
  h.send("registration.submit", {
    cupId: "HV-CUP-EXAMPLE",
    teamId: "HV-T-EXAMPLE",
  });
  rejected(
    () =>
      h.send("registration.submit", {
        cupId: "HV-CUP-EXAMPLE",
        teamId: "HV-T-EXAMPLE",
      }),
    "DUPLICATE",
  );
});
test("Full chain publishes referee result without a team agreement", () => {
  const { h, home, players, matchId } = setupMatch();
  h.send("match.start", { matchId }, "official-user");
  const snapshot = structuredClone(h.state.data.matches[0].rulesSnapshot);
  h.send("cup.upsert", {
    id: "HV-CUP-EXAMPLE",
    rules: { ...DEFAULT_RULES, halfMinutes: 30 },
  });
  assert.deepEqual(h.state.data.matches[0].rulesSnapshot, snapshot);
  h.send(
    "match.event",
    {
      matchId,
      type: "goal",
      teamId: home,
      playerId: players[home][1],
      minute: 12,
    },
    "official-user",
  );
  h.send(
    "match.finalize",
    { matchId, homeScore: 1, awayScore: 0, eventsComplete: true },
    "official-user",
  );
  assert.equal(h.state.data.matches[0].status, "finished");
  assert.equal(h.project().data.matches[0].homeScore, 1);
  assert.equal(h.state.data.matches[0].officialResult.by, "official-user");
});
test("Kickoff requires two teams, confirmed assignment and both latest lineups", () => {
  const h = harness();
  rejected(
    () => h.send("match.start", { matchId: "HV-W-EXAMPLE" }),
    "NOT_READY",
  );
  const { h: ready, matchId } = setupMatch();
  const team = ready.state.data.lineups[0].teamId;
  ready.send(
    "lineup.submit",
    {
      matchId,
      teamId: team,
      players: ready.state.data.lineups[0].players,
      attested: true,
      reason: "Gewijzigde opgave vereist hercontrole.",
    },
    "manager-" + team,
  );
  rejected(
    () => ready.send("match.start", { matchId }, "official-user"),
    "LINEUP_REQUIRED",
  );
});
test("A team cannot submit another team lineup or event", () => {
  const { h, home, away, players, matchId } = setupMatch();
  rejected(
    () =>
      h.send(
        "lineup.submit",
        { matchId, teamId: away, players: [], attested: true },
        "manager-" + home,
      ),
    "FORBIDDEN",
  );
  h.send("match.start", { matchId }, "official-user");
  rejected(
    () =>
      h.send(
        "match.event",
        {
          matchId,
          type: "goal",
          teamId: away,
          playerId: players[away][1],
          minute: 1,
        },
        "manager-" + home,
      ),
    "FORBIDDEN",
  );
});
test("Team observation remains provisional until official review", () => {
  const { h, home, players, matchId } = setupMatch();
  h.send("match.start", { matchId }, "official-user");
  const event = h.send(
    "match.event",
    {
      matchId,
      type: "goal",
      teamId: home,
      playerId: players[home][1],
      minute: 12,
    },
    "manager-" + home,
  ).event;
  assert.equal(h.state.data.matches[0].homeScore, 0);
  rejected(
    () =>
      h.send(
        "match.finalize",
        { matchId, homeScore: 0, awayScore: 1, eventsComplete: false },
        "official-user",
      ),
    "PENDING_EVENTS",
  );
  h.send(
    "match.event",
    { matchId, eventId: event.id, decision: "confirmed" },
    "official-user",
  );
  assert.equal(h.state.data.matches[0].homeScore, 1);
});
test("Red-card exclusion applies to later events and retroactive insertion", () => {
  const { h, home, players, matchId } = setupMatch();
  h.send("match.start", { matchId }, "official-user");
  h.send(
    "match.event",
    {
      matchId,
      type: "goal",
      teamId: home,
      playerId: players[home][1],
      minute: 30,
    },
    "official-user",
  );
  rejected(
    () =>
      h.send(
        "match.event",
        {
          matchId,
          type: "red",
          teamId: home,
          playerId: players[home][1],
          minute: 20,
        },
        "official-user",
      ),
    "SENT_OFF",
  );
  h.send(
    "match.event",
    {
      matchId,
      type: "red",
      teamId: home,
      playerId: players[home][1],
      minute: 40,
    },
    "official-user",
  );
  rejected(
    () =>
      h.send(
        "match.event",
        {
          matchId,
          type: "goal",
          teamId: home,
          playerId: players[home][1],
          minute: 50,
        },
        "official-user",
      ),
    "SENT_OFF",
  );
});
test("Dispensation requires a reason and max squad dispensation is enforced", () => {
  const { h, home, cup, players, matchId } = setupMatch();
  const playerId = players[home][1];
  h.send("player.upsert", { id: playerId, birthDate: "2012-01-01" });
  const lineup = h.state.data.lineups.find((l) => l.teamId === home);
  rejected(
    () =>
      h.send(
        "lineup.submit",
        {
          matchId,
          teamId: home,
          players: lineup.players,
          attested: true,
          reason: "Nieuwe selectie met leeftijdscontrole.",
        },
        "manager-" + home,
      ),
    "INELIGIBLE",
  );
  rejected(
    () =>
      h.send("dispensation.decide", {
        cupId: cup,
        playerId,
        allowed: true,
        reason: "x",
      }),
    "VALIDATION",
  );
  h.send("dispensation.decide", {
    cupId: cup,
    playerId,
    allowed: true,
    reason: "Leiding verleent de leeftijdsdispensatie.",
  });
  h.send(
    "lineup.submit",
    {
      matchId,
      teamId: home,
      players: lineup.players,
      attested: true,
      reason: "Goedgekeurde dispensatie verwerkt.",
    },
    "manager-" + home,
  );
  h.send("cup.upsert", {
    id: cup,
    rules: { ...h.state.data.cups[0].rules, maxDispensations: 0 },
  });
  rejected(
    () =>
      h.send(
        "lineup.submit",
        {
          matchId,
          teamId: home,
          players: lineup.players,
          attested: true,
          reason: "Nieuwe selectie voor limietcontrole.",
        },
        "manager-" + home,
      ),
    "DISPENSATION_LIMIT",
  );
});
test("A penalty-series score is separate from ordinary goals", () => {
  const { h, matchId } = setupMatch();
  h.send("match.start", { matchId }, "official-user");
  rejected(
    () =>
      h.send(
        "match.finalize",
        {
          matchId,
          homeScore: 0,
          awayScore: 0,
          penHome: 3,
          penAway: 3,
          eventsComplete: true,
        },
        "official-user",
      ),
    "NO_WINNER",
  );
  h.send(
    "match.finalize",
    {
      matchId,
      homeScore: 0,
      awayScore: 0,
      penHome: 4,
      penAway: 3,
      eventsComplete: true,
    },
    "official-user",
  );
  assert.equal(h.state.data.events.length, 0);
  assert.equal(h.project().data.matches[0].homeScore, 0);
  assert.equal(h.project().data.matches[0].penHome, 4);
});
test("Objection preserves official score until a motivated correction and public marker", () => {
  const { h, home, players, matchId } = setupMatch();
  h.send("match.start", { matchId }, "official-user");
  h.send(
    "match.event",
    {
      matchId,
      type: "goal",
      teamId: home,
      playerId: players[home][1],
      minute: 12,
    },
    "official-user",
  );
  h.send(
    "match.finalize",
    { matchId, homeScore: 1, awayScore: 0, eventsComplete: true },
    "official-user",
  );
  const objection = h.send(
    "objection.submit",
    {
      matchId,
      teamId: home,
      subject: "Uitslag",
      reason: "Controleer deze vastgestelde uitslag.",
    },
    "manager-" + home,
  ).objection;
  assert.equal(h.project().data.matches[0].homeScore, 1);
  rejected(
    () =>
      h.send("objection.decide", {
        objectionId: objection.id,
        decision: "corrected",
        reason: "kort",
        homeScore: 2,
        awayScore: 0,
      }),
    "VALIDATION",
  );
  h.send("objection.decide", {
    objectionId: objection.id,
    decision: "corrected",
    reason: "De leiding stelt deze correctie expliciet vast.",
    homeScore: 2,
    awayScore: 0,
  });
  const published = h.project().data.matches[0];
  assert.equal(published.homeScore, 2);
  assert(published.corrected);
  assert(published.correctedAt);
  assert.equal(h.state.data.matches[0].officialResult.homeScore, 1);
  assert.equal(h.state.data.events.length, 1);
});
test("Team projection never includes opposing private players via match snapshots", () => {
  const { h, home, away, matchId } = setupMatch();
  h.send("match.start", { matchId }, "official-user");
  const own = h.project("manager-" + home);
  assert(own.data.players.every((p) => p.teamId === home));
  assert(!JSON.stringify(own.data.matches).includes("lineupSnapshots"));
  assert(!own.data.lineups.some((l) => l.teamId === away));
});
test("Publication withdrawal immediately removes the player from public projection", () => {
  const h = harness();
  h.send("publication.update", {
    playerId: "HV-P-EXAMPLE",
    publicName: true,
    publicPhoto: false,
    reason: "Publicatie is met toestemming toegestaan.",
  });
  assert.equal(h.project().data.players.length, 1);
  h.send("publication.update", {
    playerId: "HV-P-EXAMPLE",
    publicName: false,
    publicPhoto: false,
    reason: "Publicatietoestemming wordt ingetrokken.",
  });
  assert.equal(h.project().data.players.length, 0);
});
test("Volunteer capacity/overlap and per-recipient read receipts are enforced", () => {
  const h = harness();
  h.send("membership.upsert", {
    userId: "volunteer",
    role: "volunteer",
    volunteerId: "HV-VOL-EXAMPLE",
    status: "active",
    reason: "Eigen vrijwilliger voor deze controle.",
  });
  h.send(
    "shift.signup",
    { shiftId: "HV-SHIFT-EXAMPLE", volunteerId: "HV-VOL-EXAMPLE" },
    "volunteer",
  );
  const other = h.send("shift.upsert", {
    name: "Overlappende dienst",
    date: "2027-06-05",
    from: "19:00",
    until: "21:00",
    capacity: 1,
  }).record;
  rejected(
    () =>
      h.send(
        "shift.signup",
        { shiftId: other.id, volunteerId: "HV-VOL-EXAMPLE" },
        "volunteer",
      ),
    "OVERLAP",
  );
  const message = h.send("message.send", {
    recipientUserIds: ["volunteer"],
    subject: "Dienst",
    body: "Je dienst staat klaar.",
  }).message;
  rejected(
    () => h.send("message.read", { messageId: message.id }),
    "FORBIDDEN",
  );
  h.send("message.read", { messageId: message.id }, "volunteer");
  assert.deepEqual(h.state.data.messages[0].readBy, ["volunteer"]);
  assert(
    h.state.mailOutbox.some(
      (row) =>
        row.recipientUserIds.includes("volunteer") && row.status === "pending",
    ),
  );
});
test("Bracket draw is reproducible, publication explicit and byes have no fake score", () => {
  const h = harness();
  h.state.data.matches = [];
  const teamIds = ["HV-T-EXAMPLE"];
  for (let i = 0; i < 3; i++)
    teamIds.push(
      h.send("team.upsert", {
        name: "Team " + i,
        clubId: "HV-V-EXAMPLE",
        category: "Senioren",
      }).record.id,
    );
  for (const teamId of teamIds) {
    const r = h.send("registration.submit", {
      cupId: "HV-CUP-EXAMPLE",
      teamId,
    }).registration;
    h.send("registration.review", {
      registrationId: r.id,
      decision: "approved",
      reason: "Deelname voor de loting goedgekeurd.",
    });
  }
  const draw = h.send("bracket.draw", {
    cupId: "HV-CUP-EXAMPLE",
    teamIds,
    bracketSize: 8,
    seed: "controle-1",
  }).draw;
  assert.equal(h.state.data.matches.length, 0);
  assert.deepEqual(
    h.send("bracket.draw", {
      cupId: "HV-CUP-EXAMPLE",
      teamIds: [...teamIds].reverse(),
      bracketSize: 8,
      seed: "controle-1",
    }).draw.teamIds,
    draw.teamIds,
  );
  h.send("bracket.publish", { cupId: "HV-CUP-EXAMPLE" });
  assert.equal(h.state.data.matches.length, 7);
  assert.equal(
    h.state.data.matches.filter((m) => m.status === "bye").length,
    4,
  );
  assert(h.state.data.matches.every((m) => m.homeScore === null));
});
test("Command fingerprint ignores object ordering but binds type and payload", () => {
  assert.equal(
    fingerprintCommand({ type: "x", payload: { a: 1, b: 2 } }),
    fingerprintCommand({ type: "x", payload: { b: 2, a: 1 } }),
  );
  assert.notEqual(
    fingerprintCommand({ type: "x", payload: { a: 1 } }),
    fingerprintCommand({ type: "x", payload: { a: 2 } }),
  );
});

test("Kit changes stay in own club and public colors use the same canonical record", () => {
  const h = harness();
  h.send("membership.upsert", {
    userId: "club-user",
    role: "club",
    clubId: "HV-V-EXAMPLE",
    status: "active",
    reason: "Verenigingsleiding voor de tenuecontrole.",
  });
  const payload = {
    clubId: "HV-V-EXAMPLE",
    variant: "home",
    shirtColor: "#003399",
    shortsColor: "#FFFFFF",
    socksColor: "#003399",
  };
  const first = h.send("kit.update", payload, "club-user").kit;
  assert.equal(h.project().data.kits[0].id, first.id);
  const other = h.send("club.upsert", { name: "Andere vereniging" }).record;
  rejected(
    () => h.send("kit.update", { ...payload, clubId: other.id }, "club-user"),
    "FORBIDDEN",
  );
  h.send("kit.update", { ...payload, shirtColor: "#00AA00" }, "club-user");
  assert.equal(h.project().data.kits.length, 1);
  assert.equal(h.project().data.kits[0].id, first.id);
});
test("Media needs consent, independent approval and current per-purpose rights", () => {
  const h = harness();
  h.send("membership.upsert", {
    userId: "photographer",
    role: "photographer",
    status: "active",
    reason: "Fotograaf voor de beeldrechtencontrole.",
  });
  const input = {
    matchId: "HV-W-EXAMPLE",
    title: "Fictief controlebeeld",
    credit: "Fotograaf",
    dataUrl:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1cAAAAASUVORK5CYII=",
    rights: { website: true, articles: false, press: false, social: false },
    consent: true,
  };
  rejected(
    () => h.send("media.submit", { ...input, consent: false }, "photographer"),
    "CONSENT",
  );
  const row = h.send("media.submit", input, "photographer").media;
  assert.equal(h.project().data.media.length, 0);
  h.send("media.review", {
    mediaId: row.id,
    decision: "approved",
    reason: "Toestemming en websitegebruik zijn gecontroleerd.",
  });
  assert.equal(h.project().data.media.length, 1);
  assert.equal(h.project("photographer").data.media[0].status, "approved");
  h.send("media.review", {
    mediaId: row.id,
    decision: "revoked",
    reason: "Gebruikstoestemming voor dit beeld wordt ingetrokken.",
  });
  assert.equal(h.project().data.media.length, 0);
  const own = h.send("media.submit", input).media;
  rejected(
    () =>
      h.send("media.review", {
        mediaId: own.id,
        decision: "approved",
        reason: "Eigen inzending mag niet zelf worden goedgekeurd.",
      }),
    "FOUR_EYES",
  );
});
test("Amsterdam winter/summer conversion rejects nonexistent spring local time", async () => {
  const { amsterdamInstant } = await import("../../server/domain.mjs");
  assert.equal(
    amsterdamInstant("2027-01-10", "19:30"),
    "2027-01-10T18:30:00.000Z",
  );
  assert.equal(
    amsterdamInstant("2027-06-10", "19:30"),
    "2027-06-10T17:30:00.000Z",
  );
  rejected(() => amsterdamInstant("2027-03-28", "02:30"), "INVALID_LOCAL_TIME");
});
