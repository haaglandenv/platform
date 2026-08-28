import { expect, test } from "@playwright/test";

test("public core routes render and mobile bracket stays within the viewport", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Hier wordt/i })).toBeVisible();
  await page.goto("/toernooien/sir-winston-cup/bracket");
  await expect(page.getByRole("heading", { name: "Knock-outschema" })).toBeVisible();
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(page.getByText("1 van 3")).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});

test("server-scoped role denies a copied leadership URL", async ({ page, context }) => {
  await context.addCookies([
    {
      name: "hv-demo-role",
      value: "team",
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  await page.goto("/beheer/toernooileiding/uitslagen");
  await expect(page.getByRole("heading", { name: /Geen toegang voor Teammanager/i })).toBeVisible();
});

test("public response does not include private player fields", async ({ request }) => {
  const response = await request.get("/api/state?surface=public");
  expect(response.ok()).toBe(true);
  const body = await response.text();
  expect(body).not.toContain("dateOfBirth");
  expect(body).not.toContain("HV-D1001");
});
