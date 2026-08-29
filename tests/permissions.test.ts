import { describe, expect, it } from "vitest";
import seedJson from "@/demo-data/tournamentos-seed.json";
import { authorizeAction, canAccessRoute, hydrateState } from "@/lib/domain";
import { publicProjection, scopedProjection } from "@/lib/projections";
import type { SeedData } from "@/lib/types";
import type { Player } from "@/lib/types";

describe("role and record boundaries", () => {
  it("denies copied operation URLs across roles", () => {
    expect(canAccessRoute("team", "/beheer/toernooileiding/uitslagen")).toBe(false);
    expect(canAccessRoute("referee", "/beheer/team/spelerslijst")).toBe(false);
    expect(canAccessRoute("association", "/beheer/scheidsrechter/wedstrijden/other/controle")).toBe(
      false,
    );
    expect(canAccessRoute("referee", "/beheer/scheidsrechter/wedstrijden/other/controle")).toBe(
      false,
    );
    expect(
      canAccessRoute("referee", "/beheer/scheidsrechter/wedstrijden/match_qf_1/controle"),
    ).toBe(true);
    expect(canAccessRoute("leadership", "/beheer/toernooileiding/audit")).toBe(true);
  });

  it("enforces mutation permissions independently of UI visibility", () => {
    expect(authorizeAction("team", "confirm-result")).toBe(false);
    expect(authorizeAction("referee", "fix-player")).toBe(false);
    expect(authorizeAction("leadership", "confirm-result")).toBe(true);
  });

  it("keeps private roster fields out of public projection", () => {
    const state = hydrateState(structuredClone(seedJson) as SeedData);
    const publicData = publicProjection(state);
    expect("players" in publicData).toBe(false);
    expect("rosters" in publicData).toBe(false);
    expect(JSON.stringify(publicData)).not.toContain("dateOfBirth");
    expect(JSON.stringify(publicData)).not.toContain("HV-D1001");
  });

  it("limits referee projection to the locked selection", () => {
    const state = hydrateState(structuredClone(seedJson) as SeedData);
    state.runtime.selectedPlayerIds = ["p_ds_01"];
    const referee = scopedProjection(state, "referee") as unknown as {
      players: Player[];
      rosters: unknown[];
    };
    expect(referee.players).toHaveLength(19);
    expect(referee.players.map((player) => player.id)).toContain("p_ds_01");
    expect(referee.players.map((player) => player.id)).toContain("p_q_01");
    expect(referee.rosters).toEqual([]);
  });

  it("supports the additional operation roles without widening private roster access", () => {
    expect(canAccessRoute("matchops", "/beheer/wedstrijdleiding/incidenten")).toBe(true);
    expect(canAccessRoute("press", "/beheer/pers")).toBe(true);
    expect(canAccessRoute("photographer", "/beheer/fotograaf")).toBe(true);
    expect(canAccessRoute("press", "/beheer/team/spelerslijst")).toBe(false);
    expect(authorizeAction("photographer", "submit-media")).toBe(true);
    expect(authorizeAction("press", "approve-roster")).toBe(false);
  });

  it("publishes only approved website media and keeps photographer inboxes private", () => {
    const state = hydrateState(structuredClone(seedJson) as SeedData);
    state.runtime.mediaSubmissions = [
      {
        id: "pending-supporter",
        name: "pending.jpg",
        consent: true,
        status: "IN_MODERATIE",
        matchId: "match_qf_1",
        uploaderRole: "supporter",
        rights: { website: true, articles: true, social: false },
      },
      {
        id: "approved-photo",
        name: "approved.jpg",
        consent: true,
        status: "GOEDGEKEURD",
        matchId: "match_qf_1",
        uploaderRole: "photographer",
        rights: { website: true, articles: true, social: false },
      },
      {
        id: "social-only",
        name: "social.jpg",
        consent: true,
        status: "GOEDGEKEURD",
        matchId: "match_qf_1",
        uploaderRole: "supporter",
        rights: { website: false, articles: false, social: true },
      },
    ];
    expect(publicProjection(state).runtime.mediaSubmissions.map((item) => item.id)).toEqual([
      "approved-photo",
    ]);
    const photographer = scopedProjection(state, "photographer") as unknown as {
      runtime: { mediaSubmissions: Array<{ id: string }> };
    };
    expect(photographer.runtime.mediaSubmissions.map((item) => item.id)).toEqual([
      "approved-photo",
    ]);
  });

  it("removes internal workflow data from the press projection", () => {
    const state = hydrateState(structuredClone(seedJson) as SeedData);
    state.runtime.pressPermissions.lineups = false;
    state.runtime.matchReport.internalNote = "Alleen voor officials";
    state.runtime.securityEvents.push({
      id: "security-private",
      timestamp: "2026-09-12T19:00:00+02:00",
      role: "leadership",
      action: "private-action",
      outcome: "DENIED",
      detail: "Intern detail",
    });
    const press = scopedProjection(state, "press") as unknown as {
      runtime: {
        selectedPlayerIds: string[];
        securityEvents: unknown[];
        matchReport: { internalNote: string };
      };
    };
    expect(press.runtime.selectedPlayerIds).toEqual([]);
    expect(press.runtime.securityEvents).toEqual([]);
    expect(press.runtime.matchReport.internalNote).toBe("");
    expect(JSON.stringify(press)).not.toContain("Alleen voor officials");
  });
});
