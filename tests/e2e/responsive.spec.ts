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
  { slug: "association", route: "/beheer/vereniging", role: "association" },
  { slug: "team", route: "/beheer/team", role: "team" },
  { slug: "referee", route: "/beheer/scheidsrechter", role: "referee" },
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
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
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
});
