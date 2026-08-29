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

async function apiAction(
  page: Page,
  action: string,
  payload: Record<string, unknown> = {},
  expectedStatus = 200,
) {
  const result = await page.evaluate(
    async ({ action, payload }) => {
      const response = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      return { status: response.status, body: await response.json() };
    },
    { action, payload },
  );
  expect(result.status, `${action}: ${JSON.stringify(result.body)}`).toBe(expectedStatus);
  return result.body as { error?: string };
}

async function operationState(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/state?surface=operations", { cache: "no-store" });
    return (await response.json()) as {
      data: {
        matches: Array<{ id: string; kickoff: string; venue: string }>;
        runtime: {
          fixtureChangeRequests: Array<{ id: string; status: string }>;
          mediaSubmissions: Array<{ id: string; status: string }>;
          securityEvents: Array<{ action: string; outcome: string }>;
          rules: { version: number; format: string; maxDispensations: number };
        };
      };
    };
  });
}

test("fixture changes require opponent and leadership approval", async ({ page }) => {
  await page.goto("/inloggen");
  await apiAction(page, "reset-demo");
  await setRole(page, "team");
  await page.goto("/beheer/team");
  await apiAction(page, "request-fixture-change", {
    kickoff: "2026-09-13T19:30:00+02:00",
    venue: "Sportpark Houtrust",
    reason: "Beide teams hebben een aantoonbaar programma-conflict.",
  });
  let state = await operationState(page);
  const requestId = state.data.runtime.fixtureChangeRequests[0].id;
  expect(state.data.runtime.fixtureChangeRequests[0].status).toBe("REQUESTED");

  await setRole(page, "matchops");
  await page.goto("/beheer/wedstrijdleiding");
  await apiAction(page, "approve-fixture-change-opponent", { requestId });

  await setRole(page, "leadership");
  await page.goto("/beheer/toernooileiding/wedstrijden");
  await apiAction(page, "approve-fixture-change-leadership", { requestId });
  state = await operationState(page);
  expect(state.data.runtime.fixtureChangeRequests[0].status).toBe("APPROVED");
  expect(state.data.matches.find((match) => match.id === "match_qf_1")?.kickoff).toBe(
    "2026-09-13T19:30:00+02:00",
  );
  expect(state.data.matches.find((match) => match.id === "match_qf_1")?.venue).toBe(
    "Sportpark Houtrust",
  );
});

test("media rights, moderation and press scope persist", async ({ page }) => {
  await page.goto("/inloggen");
  await apiAction(page, "reset-demo");
  await setRole(page, "supporter");
  await apiAction(page, "submit-media", {
    name: "supportersvak-houtrust.jpg",
    consent: true,
    matchId: "match_qf_1",
    clubId: "club_duindorp",
    website: true,
    articles: true,
    social: false,
    credit: "Demo Supporter",
  });

  await setRole(page, "press");
  await page.goto("/beheer/pers");
  let state = await operationState(page);
  expect(state.data.runtime.mediaSubmissions[0].status).toBe("IN_MODERATIE");
  await apiAction(page, "moderate-media", {
    id: state.data.runtime.mediaSubmissions[0].id,
    status: "GOEDGEKEURD",
    reason: "Rechten en wedstrijdkoppeling gecontroleerd.",
  });
  state = await operationState(page);
  expect(state.data.runtime.mediaSubmissions[0].status).toBe("GOEDGEKEURD");
});

test("versioned rules and denied security events are auditable", async ({ page }) => {
  await page.goto("/inloggen");
  await apiAction(page, "reset-demo");
  await setRole(page, "leadership");
  await apiAction(page, "save-rules", {
    effectiveFrom: "2026-09-01",
    category: "B",
    format: "8X8",
    minimumAge: 16,
    birthYearFrom: 1980,
    birthYearTo: 2010,
    maxDispensations: 2,
    halfDurationMinutes: 35,
    halves: 2,
    timeoutsPerTeam: 1,
    starterCount: 8,
    maxSquadSize: 14,
    substitutions: "DOORLOPEND",
    extraTimeRounds: ["FINAL"],
    penaltiesAfterDraw: true,
    yellowCardsForSuspension: 3,
    refereeType: "NEUTRAL",
    assistantsRequired: 1,
    standardMatchDay: "Zaterdag",
    standardKickoff: "19:30",
    finalExtraTimeMinutes: 20,
  });
  let state = await operationState(page);
  expect(state.data.runtime.rules).toMatchObject({
    version: 2,
    format: "8X8",
    maxDispensations: 2,
  });

  await setRole(page, "team");
  await apiAction(page, "confirm-result", {}, 403);
  await apiAction(
    page,
    "submit-media",
    {
      name: "ongeldige-scope.jpg",
      consent: true,
      matchId: "match_buiten_scope",
      website: true,
    },
    409,
  );
  await setRole(page, "leadership");
  await page.goto("/beheer/toernooileiding/privacy");
  state = await operationState(page);
  expect(state.data.runtime.securityEvents).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ action: "confirm-result", outcome: "DENIED" }),
    ]),
  );
});
