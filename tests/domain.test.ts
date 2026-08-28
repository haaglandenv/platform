import { describe, expect, it } from "vitest";
import seedJson from "@/demo-data/tournamentos-seed.json";
import {
  canApproveLineupChecks,
  hydrateState,
  officialWinner,
  recalculateBracket,
  scoreFromEvents,
  setResult,
  t60IsOpen,
  validateEligibility,
  validateLineup,
  validateRoster,
} from "@/lib/domain";
import type { SeedData } from "@/lib/types";

function seed() {
  return hydrateState(structuredClone(seedJson) as SeedData);
}

describe("tournament progression", () => {
  it("does not advance a provisional winner", () => {
    const state = setResult(seed(), { home: 2, away: 1 }, false);
    const semi = state.matches.find((match) => match.id === "match_sf_1");
    expect(semi?.homeTeamId).toBeNull();
    expect(semi?.status).toBe("AWAITING_TEAMS");
  });

  it("advances only the official winner to the expected semifinal", () => {
    const state = setResult(seed(), { home: 2, away: 1 }, true);
    const semi = state.matches.find((match) => match.id === "match_sf_1");
    expect(semi?.homeTeamId).toBe("team_quick_1");
    expect(semi?.status).toBe("SCHEDULED");
  });

  it("safely recalculates the dependent slot after an official correction", () => {
    const first = setResult(seed(), { home: 2, away: 1 }, true);
    const corrected = setResult(first, { home: 1, away: 3 }, true);
    expect(corrected.matches.find((match) => match.id === "match_sf_1")?.homeTeamId).toBe(
      "team_duindorp_1",
    );
  });

  it.each(["BYE", "WALKOVER"] as const)(
    "advances an official %s winner without inventing a score",
    (status) => {
      const state = seed();
      const quarterfinal = state.matches.find((match) => match.id === "match_qf_1")!;
      quarterfinal.status = status;
      quarterfinal.official = true;
      quarterfinal.score = null;
      quarterfinal.winnerTeamId = quarterfinal.homeTeamId ?? undefined;
      expect(officialWinner(quarterfinal)).toBe("team_quick_1");
      const recalculated = recalculateBracket(state);
      expect(recalculated.matches.find((match) => match.id === "match_sf_1")?.homeTeamId).toBe(
        "team_quick_1",
      );
      expect(quarterfinal.score).toBeNull();
    },
  );
});

describe("roster and lineup integrity", () => {
  it("reports the seeded missing photo and reference", () => {
    const result = validateRoster(seed().players);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Niels Kramer: referentienummer ontbreekt");
    expect(result.errors).toContain("Niels Kramer: pasfoto ontbreekt");
  });

  it("blocks duplicate identities and shirt numbers", () => {
    const players = seed().players.map((player) => ({ ...player }));
    players[17].reference = players[0].reference;
    players[17].photo = "/brand/player-placeholder.svg";
    players[17].shirtNumber = players[0].shirtNumber;
    const result = validateRoster(players);
    expect(result.errors.some((error) => error.includes("dubbel referentienummer"))).toBe(true);
    expect(result.errors.some((error) => error.includes("dubbel rugnummer"))).toBe(true);
  });

  it("blocks age-rule and suspension eligibility warnings", () => {
    const players = seed().players.map((player) => ({ ...player }));
    players[0].dateOfBirth = "2012-02-14";
    const result = validateEligibility(players, "2026-09-12", 18, [players[1].id]);
    expect(result.errors).toContain(`${players[0].name}: voldoet niet aan de leeftijdsregel (18+)`);
    expect(result.errors).toContain(`${players[1].name}: actieve schorsing blokkeert goedkeuring`);
  });

  it("rejects out-of-scope and oversized lineups", () => {
    const players = seed().players;
    const ids = [...players.map((player) => player.id), "outside-team"];
    const result = validateLineup(ids, players);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Selecteer maximaal 18 spelers.");
    expect(result.errors).toContain("De selectie bevat een speler buiten het goedgekeurde team.");
  });
});

describe("referee approval gate", () => {
  it("opens exactly at kickoff minus sixty minutes", () => {
    const kickoff = "2026-09-12T20:00:00+02:00";
    expect(t60IsOpen(kickoff, "2026-09-12T18:59:59+02:00")).toBe(false);
    expect(t60IsOpen(kickoff, "2026-09-12T19:00:00+02:00")).toBe(true);
  });

  it("requires every check and no open discrepancy", () => {
    const selected = ["p1", "p2"];
    expect(canApproveLineupChecks(selected, { p1: "AKKOORD" }, "NONE")).toBe(false);
    expect(canApproveLineupChecks(selected, { p1: "AKKOORD", p2: "AKKOORD" }, "OPEN")).toBe(false);
    expect(canApproveLineupChecks(selected, { p1: "AKKOORD", p2: "AKKOORD" }, "RESOLVED")).toBe(
      true,
    );
  });
});

describe("live event reconciliation", () => {
  it("derives the scoreboard from canonical goal events", () => {
    const state = seed();
    const match = state.matches.find((item) => item.id === "match_live_1")!;
    expect(scoreFromEvents(match, state.liveEvents)).toEqual({ home: 2, away: 2 });
  });
});
