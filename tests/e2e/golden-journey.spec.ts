import { expect, test, type Page } from "@playwright/test";
import type { Role } from "@/lib/types";

async function setRole(page: Page, role: Role) {
  await page.context().addCookies([
    {
      name: "hv-demo-role",
      value: role,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
}

async function action(page: Page, name: string, payload: Record<string, unknown> = {}) {
  const result = await page.evaluate(
    async ({ name, payload }) => {
      const response = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: name, payload }),
      });
      return { status: response.status, body: (await response.json()) as { error?: string } };
    },
    { name, payload },
  );
  expect(result.status, `${name}: ${result.body.error ?? "ok"}`).toBe(200);
}

async function operationsState(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/state?surface=operations", { cache: "no-store" });
    return (await response.json()) as {
      data: {
        players: Array<{ id: string }>;
        matches: Array<{
          id: string;
          status: string;
          official: boolean;
          homeTeamId: string | null;
        }>;
        runtime: {
          rosterStatus: string;
          lineupStatus: string;
          discrepancy: string;
        };
      };
    };
  });
}

test("complete seeded roster-to-official-bracket journey remains coherent", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/inloggen");
  await action(page, "reset-demo");

  await setRole(page, "team");
  await page.goto("/beheer/team/spelerslijst");
  await action(page, "fix-player", { reference: "HV-D1018" });
  await action(page, "submit-roster");
  expect((await operationsState(page)).data.runtime.rosterStatus).toBe("INGEDIEND");

  await setRole(page, "leadership");
  await page.goto("/beheer/toernooileiding/spelerscontrole");
  await action(page, "approve-roster");
  expect((await operationsState(page)).data.runtime.rosterStatus).toBe("GOEDGEKEURD");

  await setRole(page, "team");
  await page.goto("/beheer/team/wedstrijden/match_qf_1/opstelling");
  const teamState = await operationsState(page);
  await action(page, "submit-lineup", {
    playerIds: teamState.data.players.map((player) => player.id),
  });
  expect((await operationsState(page)).data.runtime.lineupStatus).toBe("INGEDIEND");

  await setRole(page, "referee");
  await page.goto("/beheer/scheidsrechter/wedstrijden/match_qf_1/controle");
  await action(page, "set-clock", { preset: "t60" });
  await action(page, "open-t60");
  await action(page, "check-all");
  const flagged = await operationsState(page);
  expect(flagged.data.runtime.discrepancy).toBe("OPEN");
  expect(flagged.data.runtime.lineupStatus).toBe("AFWIJKING");

  await setRole(page, "leadership");
  await page.goto("/beheer/toernooileiding/spelerscontrole");
  await action(page, "resolve-discrepancy", { reason: "NUMBER_CONFIRMED_AT_VENUE" });

  await setRole(page, "referee");
  await page.goto("/beheer/scheidsrechter/wedstrijden/match_qf_1/controle");
  await action(page, "approve-lineups");
  expect((await operationsState(page)).data.runtime.lineupStatus).toBe("AKKOORD");

  await setRole(page, "leadership");
  await page.goto("/beheer/toernooileiding/wedstrijden");
  await action(page, "start-match");

  await setRole(page, "referee");
  await page.goto("/beheer/scheidsrechter/wedstrijden/match_qf_1/rapport");
  await action(page, "submit-result");
  const provisional = await operationsState(page);
  expect(provisional.data.matches.find((match) => match.id === "match_qf_1")?.status).toBe(
    "FINISHED_PROVISIONAL",
  );
  expect(
    provisional.data.matches.find((match) => match.id === "match_sf_1")?.homeTeamId,
  ).toBeNull();

  await setRole(page, "team");
  await page.goto("/beheer/team");
  await action(page, "confirm-team-result");

  await setRole(page, "leadership");
  await page.goto("/beheer/toernooileiding/uitslagen");
  await action(page, "confirm-result");

  await setRole(page, "supporter");
  await page.goto("/wedstrijden/quick-duindorp-sv", { waitUntil: "networkidle" });
  await expect(page.getByText("✓ OFFICIEEL").first()).toBeVisible();
  await expect(page.getByLabel("Stand 2 – 1").first()).toBeVisible();
  await page.goto("/toernooien/sir-winston-cup/bracket", { waitUntil: "networkidle" });
  await expect(page.getByText("Quick 1").first()).toBeVisible();
  const finalState = await page.evaluate(async () => {
    const response = await fetch("/api/state?surface=public", { cache: "no-store" });
    return (await response.json()) as {
      data: { matches: Array<{ id: string; official: boolean; homeTeamId: string | null }> };
    };
  });
  expect(finalState.data.matches.find((match) => match.id === "match_qf_1")?.official).toBe(true);
  expect(finalState.data.matches.find((match) => match.id === "match_sf_1")?.homeTeamId).toBe(
    "team_quick_1",
  );
});
