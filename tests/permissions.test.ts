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
    expect(referee.players).toHaveLength(1);
    expect(referee.players[0].id).toBe("p_ds_01");
    expect(referee.rosters).toEqual([]);
  });
});
