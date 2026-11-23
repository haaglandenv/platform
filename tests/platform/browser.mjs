import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { randomBytes } from "node:crypto";
import { chromium } from "@playwright/test";
import { createServer } from "../../server/index.mjs";
import { readConfig } from "../../server/config.mjs";
import { LocalStore } from "../../server/store.mjs";
import { createInitialState, actorFor } from "../../server/domain.mjs";
import { createMailService } from "../../server/mail.mjs";
import { routes } from "../../web/routes.js";
const root = resolve("."),
  dir = await mkdtemp(join(tmpdir(), "haagv-browser-"));
let browser;
const servers = [];
const errors = [],
  results = [];
const report = (name) => results.push({ name, ok: true });
async function start(overrides = {}) {
  const config = {
    ...readConfig({ env: { HAAGV_ENABLE_LOCAL_SESSION: "1" }, root }),
    port: 0,
    ...overrides.config,
  };
  const server = await createServer({
    config,
    store: new LocalStore({
      file: join(dir, "state-" + servers.length + ".json"),
      initialState:
        overrides.initialState || createInitialState({ example: true }),
    }),
    mailService: createMailService({
      file: join(dir, "mail-" + servers.length + ".json"),
      encryptionKey: randomBytes(32).toString("base64"),
      fetchImpl: async () => Response.json({ id: "resend-test-receipt" }),
    }),
    ...overrides.options,
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  config.origin = "http://127.0.0.1:" + server.address().port;
  servers.push(server);
  return config.origin;
}
try {
  const origin = await start();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    locale: "nl-NL",
    timezoneId: "Europe/Amsterdam",
    viewport: { width: 1280, height: 900 },
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(origin);
  await page.locator("[data-route-picker]").waitFor();
  await page.evaluate(() => document.fonts.ready);
  for (const width of [360, 390, 800, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [...routes, { id: "instellingen" }]) {
      await page.evaluate((id) => {
        location.hash = id;
      }, route.id);
      await page.waitForFunction(
        (id) => document.querySelector("[data-route-picker]")?.value === id,
        route.id,
      );
      await page.evaluate(
        () =>
          new Promise((r) =>
            requestAnimationFrame(() => requestAnimationFrame(r)),
          ),
      );
      assert.equal(await page.locator("h1").count(), 1, `${route.id}: heading`);
      const overflow = await page.evaluate(() => ({
        body: document.documentElement.scrollWidth,
        width: innerWidth,
      }));
      assert.ok(
        overflow.body <= overflow.width + 1,
        `${route.id}@${width}: overflow ${JSON.stringify(overflow)}`,
      );
    }
    report(`54 routes zonder pagina-overloop op ${width}px`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin + "/#home");
  await page.locator('[data-action="local-session"]').click();
  await page
    .locator('[data-action="edit"][data-entity="club"]')
    .first()
    .waitFor()
    .catch(() => {});
  await page.goto(origin + "/#club");
  await page
    .locator('[data-action="edit"][data-entity="club"]')
    .first()
    .click();
  await page
    .locator('[data-editor-form] [name="name"]')
    .fill("Mijn voorbeeldvereniging");
  await page.locator('[data-editor-form] button[type="submit"]').click();
  await page.waitForFunction(
    () => !document.querySelector("[data-editor]").open,
  );
  await page.reload();
  await page
    .getByText("Mijn voorbeeldvereniging", { exact: true })
    .first()
    .waitFor();
  report("Lokale beheersessie, API opslaan en herladen");
  await page.goto(origin + "/#instellingen");
  await page.locator("[data-mail-form]").waitFor();
  await page
    .locator('[data-mail-form] [name="apiKey"]')
    .fill("re_exampleonly123456789");
  await page
    .locator('[data-mail-form] [name="from"]')
    .fill("Haaglanden <mail@example.invalid>");
  await page.locator('[data-mail-form] [name="enabled"]').check();
  await page.locator('[data-mail-form] [type="submit"]').click();
  await page.waitForFunction(
    () =>
      document.querySelector('[data-mail-form] [name="apiKey"]')?.value === "",
  );
  assert.ok(!(await page.content()).includes("re_exampleonly123456789"));
  await page.reload();
  await page.locator("[data-mail-form]").waitFor();
  assert.equal(
    await page.locator('[data-mail-form] [name="apiKey"]').inputValue(),
    "",
  );
  assert.equal(
    await page.locator('[data-mail-form] [name="from"]').inputValue(),
    "Haaglanden <mail@example.invalid>",
  );
  assert.equal(
    await page.locator('[data-mail-form] [name="enabled"]').isChecked(),
    true,
  );
  await page
    .locator('[data-mail-test] [name="to"]')
    .fill("recipient@example.invalid");
  await page.locator('[data-mail-test] [type="submit"]').click();
  await page
    .locator("[data-toast]")
    .filter({ hasText: "aangeboden aan Resend" })
    .waitFor();
  report(
    "Resend-instellingen alleen schrijven; testacceptatie via fake provider",
  );
  await page.goto(origin + "/#home");
  await page.locator("[data-toast]").waitFor({ state: "hidden" });
  await mkdir(join(root, "artifacts"), { recursive: true });
  await page.screenshot({
    path: join(root, "artifacts", "web-mobile.png"),
    fullPage: true,
  });
  const initial = createInitialState();
  initial.memberships = [
    {
      id: "otp-own",
      userId: "11111111-1111-4111-8111-111111111111",
      role: "leadership",
      status: "active",
    },
  ];
  const user = {
    id: initial.memberships[0].userId,
    email: "beheer@example.invalid",
  };
  const token = [
    Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url"),
    Buffer.from(
      JSON.stringify({
        sub: user.id,
        exp: Math.floor(Date.now() / 1000) + 3600,
        aud: "authenticated",
      }),
    ).toString("base64url"),
    "test-signature",
  ].join(".");
  const auth = {
    resolve: async (req, state) =>
      actorFor(
        state,
        req.headers.authorization === "Bearer " + token ? user : null,
      ),
    resolveEmail: async () => null,
  };
  const otpOrigin = await start({
    config: {
      dataMode: "supabase",
      supabaseUrl: "https://otp.example.invalid",
      publishableKey: "sb_publishable_exampleonly",
      localSessionEnabled: false,
    },
    initialState: initial,
    options: { auth },
  });
  const otp = await browser.newPage({ viewport: { width: 390, height: 844 } });
  otp.on("pageerror", (e) => errors.push(e.message));
  let otpRequested = false,
    verified = false;
  await otp.route("https://otp.example.invalid/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    let body = {};
    try {
      body = req.postDataJSON();
    } catch {}
    const cors = {
      "access-control-allow-origin": otpOrigin,
      "access-control-allow-headers": "*",
    };
    if (req.method() === "OPTIONS")
      return route.fulfill({ status: 204, headers: cors });
    if (url.pathname.endsWith("/otp")) {
      assert.equal(body.create_user, false);
      otpRequested = true;
      return route.fulfill({ json: {}, headers: cors });
    }
    if (url.pathname.endsWith("/verify")) {
      if (body.token !== "123456")
        return route.fulfill({
          status: 403,
          json: {
            code: "otp_expired",
            msg: "De code is ongeldig of verlopen.",
          },
          headers: cors,
        });
      verified = true;
      return route.fulfill({
        json: {
          access_token: token,
          refresh_token: "fake-refresh-test",
          expires_in: 3600,
          token_type: "bearer",
          user: {
            ...user,
            aud: "authenticated",
            role: "authenticated",
            created_at: new Date().toISOString(),
          },
        },
        headers: cors,
      });
    }
    if (url.pathname.endsWith("/user"))
      return route.fulfill({ json: user, headers: cors });
    return route.fulfill({ status: 200, json: {}, headers: cors });
  });
  await otp.goto(otpOrigin + "/#account");
  await otp.locator('[data-auth-form] [name="email"]').fill(user.email);
  await otp.locator('[data-auth-form] [type="submit"]').click();
  await otp.locator('[data-auth-form] [name="code"]').waitFor();
  assert.ok(otpRequested);
  await otp.locator('[data-auth-form] [name="code"]').fill("000000");
  await otp.locator('[data-auth-form] [type="submit"]').click();
  await otp
    .locator("[data-auth-feedback]")
    .filter({ hasText: "ongeldig of verlopen" })
    .waitFor();
  await otp.locator('[data-auth-form] [name="code"]').fill("123456");
  await otp.locator('[data-auth-form] [type="submit"]').click();
  await otp.waitForFunction(() => location.hash === "#start");
  assert.ok(verified);
  await otp
    .locator("[data-context]")
    .filter({ hasText: "Toernooileiding" })
    .waitFor();
  report(
    "OTP aanvraag, ongeldige code en geslaagde login met geïsoleerde Authstub",
  );
  assert.deepEqual(errors, []);
  report("Geen JavaScript-paginafouten");
  await writeFile(
    join(root, "artifacts", "browser-results.json"),
    JSON.stringify(
      {
        ok: true,
        results,
        errors,
        note: "Auth en Resend zijn geïsoleerde testdoubles; geen live project gekoppeld.",
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      { ok: true, routeChecks: 54 * 5, checks: results.length, results },
      null,
      2,
    ),
  );
} finally {
  await browser?.close();
  for (const server of servers) await new Promise((r) => server.close(r));
  await rm(dir, { recursive: true, force: true });
}
