import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import type { Role } from "@/lib/types";

const viewports = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

const reviewRoutes: Array<{ slug: string; route: string; role: Role }> = [
  { slug: "home", route: "/", role: "supporter" },
  { slug: "bracket", route: "/toernooien/sir-winston-cup/bracket", role: "supporter" },
  { slug: "match-centre", route: "/wedstrijden/quick-duindorp-sv", role: "supporter" },
  { slug: "hv-next", route: "/next", role: "supporter" },
  { slug: "leadership", route: "/beheer/toernooileiding", role: "leadership" },
  { slug: "matchops", route: "/beheer/wedstrijdleiding", role: "matchops" },
  { slug: "association", route: "/beheer/vereniging", role: "association" },
  { slug: "team", route: "/beheer/team", role: "team" },
  { slug: "referee", route: "/beheer/scheidsrechter", role: "referee" },
  { slug: "press", route: "/beheer/pers", role: "press" },
  { slug: "photographer", route: "/beheer/fotograaf", role: "photographer" },
];

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

test("representative product areas pass the required viewport matrix", async ({ page }) => {
  test.setTimeout(180_000);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const networkErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const errorText = request.failure()?.errorText;
    const isCancelledNextPrefetch =
      errorText === "net::ERR_ABORTED" && request.url().includes("_rsc=");
    if (!isCancelledNextPrefetch)
      networkErrors.push(`${request.method()} ${request.url()} · ${errorText}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400)
      networkErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`);
  });
  const screenshotRoot = path.join(process.cwd(), "artifacts", "qa", "screenshots");
  await mkdir(screenshotRoot, { recursive: true });

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const item of reviewRoutes) {
      await setRole(page, item.role);
      await page.goto(item.route, { waitUntil: "networkidle" });
      await expect(page.locator("main")).toBeVisible();
      const dimensions = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }));
      expect(
        Math.max(dimensions.document, dimensions.body),
        `${item.route} overflows at ${viewport.width}px`,
      ).toBeLessThanOrEqual(dimensions.viewport + 1);
      if (viewport.width === 390 || viewport.width === 1440) {
        await page.screenshot({
          path: path.join(screenshotRoot, `${item.slug}-${viewport.width}.png`),
          fullPage: true,
        });
      }
    }
  }

  expect(pageErrors, "uncaught page errors").toEqual([]);
  expect(consoleErrors, "browser console errors").toEqual([]);
  expect(networkErrors, "failed browser requests").toEqual([]);
});

test("all declared route families support direct load and hard refresh", async ({ page }) => {
  test.setTimeout(120_000);
  const publicRoutes = [
    "/nieuws",
    "/nieuws/quick-klaar-voor-kwartfinale",
    "/toernooien",
    "/toernooien/sir-winston-cup",
    "/toernooien/sir-winston-cup/programma",
    "/toernooien/sir-winston-cup/teams",
    "/toernooien/sir-winston-cup/statistieken",
    "/toernooien/sir-winston-cup/nieuws",
    "/toernooien/sir-winston-cup/reglement",
    "/wedstrijden",
    "/clubs",
    "/clubs/duindorp-sv",
    "/spelers/demo-speler",
    "/media",
    "/media/matchday-live",
    "/historie",
    "/finaledag",
    "/zoeken",
    "/account",
    "/meldingen",
    "/inloggen",
    "/next/favorieten",
    "/next/meldingen",
    "/next/instellingen",
  ];
  await setRole(page, "supporter");
  for (const route of publicRoutes) {
    await test.step(route, async () => {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status(), route).toBe(200);
      await expect(page.locator("main"), route).toBeVisible();
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.locator("main"), `${route} hard refresh`).toBeVisible();
    });
  }

  const operationsRoutes: Array<{ role: Role; route: string }> = [
    { role: "leadership", route: "/beheer" },
    { role: "leadership", route: "/beheer/toernooileiding" },
    { role: "leadership", route: "/beheer/toernooileiding/toernooien" },
    { role: "leadership", route: "/beheer/toernooileiding/wedstrijden" },
    { role: "leadership", route: "/beheer/toernooileiding/bracket" },
    { role: "leadership", route: "/beheer/toernooileiding/spelerscontrole" },
    { role: "leadership", route: "/beheer/toernooileiding/uitslagen" },
    { role: "leadership", route: "/beheer/toernooileiding/tucht" },
    { role: "leadership", route: "/beheer/toernooileiding/audit" },
    { role: "leadership", route: "/beheer/toernooileiding/privacy" },
    { role: "leadership", route: "/beheer/berichten" },
    { role: "leadership", route: "/beheer/media" },
    { role: "matchops", route: "/beheer/wedstrijdleiding" },
    { role: "matchops", route: "/beheer/wedstrijdleiding/wedstrijden" },
    { role: "matchops", route: "/beheer/wedstrijdleiding/incidenten" },
    { role: "association", route: "/beheer/vereniging" },
    { role: "association", route: "/beheer/vereniging/teams" },
    { role: "association", route: "/beheer/vereniging/spelerslijsten" },
    { role: "association", route: "/beheer/vereniging/profiel" },
    { role: "team", route: "/beheer/team" },
    { role: "team", route: "/beheer/team/spelerslijst" },
    { role: "team", route: "/beheer/team/wedstrijden/match_qf_1/opstelling" },
    { role: "referee", route: "/beheer/scheidsrechter" },
    { role: "referee", route: "/beheer/scheidsrechter/wedstrijden/match_qf_1/controle" },
    { role: "referee", route: "/beheer/scheidsrechter/wedstrijden/match_qf_1/rapport" },
    { role: "press", route: "/beheer/pers" },
    { role: "photographer", route: "/beheer/fotograaf" },
  ];
  for (const item of operationsRoutes) {
    await test.step(item.route, async () => {
      await setRole(page, item.role);
      const response = await page.goto(item.route, { waitUntil: "domcontentloaded" });
      expect(response?.status(), item.route).toBe(200);
      await expect(page.locator("main"), item.route).toBeVisible();
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.locator("main"), `${item.route} hard refresh`).toBeVisible();
    });
  }
});
