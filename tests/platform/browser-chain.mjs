import { chromium } from "@playwright/test";
import fs from "node:fs";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "../../server/index.mjs";
import { readConfig } from "../../server/config.mjs";
import { LocalStore } from "../../server/store.mjs";
// Every domain mutation in this test is performed through the actual web UI.
// Only the test's server-side store is initialized; API calls below only read.
const root = resolve("."),
  dir = fs.mkdtempSync(join(tmpdir(), "haagv-browser-chain-"));
const out = join(root, "artifacts", "browser-chain");
fs.mkdirSync(out, { recursive: true });
let b, p, server, origin;
const results = [],
  errors = [];
const m = () => p.locator("[data-editor]"),
  f = (n) => m().locator('[name="' + n + '"]');
async function route(id) {
  await p.goto(origin + "/#" + id);
  await p.locator("[data-route-picker]").waitFor();
}
async function save() {
  await m().locator("[type=submit]").click();
  await m().waitFor({ state: "hidden" });
}
async function test(name, fn) {
  await fn();
  results.push({ name, ok: true });
  console.log(name);
}
async function snapshot() {
  return (await p.request.get(origin + "/api/v1/bootstrap")).json();
}
async function command(type) {
  await p
    .locator('[data-command="' + type + '"]')
    .first()
    .click();
}
async function player(name, teamId, n) {
  await route("spelersbeheer");
  await p.locator("[data-entity=player]:not([data-id])").click();
  await f("name").fill(name);
  await f("teamId").selectOption(teamId);
  await f("birthDate").fill("2000-01-01");
  await f("relationCode").fill("WEBQA" + n);
  await f("number").fill(String(n));
  await save();
}
(async () => {
  const config = {
    ...readConfig({ env: { HAAGV_ENABLE_LOCAL_SESSION: "1" }, root }),
    port: 0,
  };
  server = await createServer({
    config,
    store: new LocalStore({ file: join(dir, "state.json") }),
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = "http://127.0.0.1:" + server.address().port;
  config.origin = origin;
  b = await chromium.launch({ headless: true });
  p = await (
    await b.newContext({
      viewport: { width: 1280, height: 900 },
      locale: "nl-NL",
    })
  ).newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.setDefaultTimeout(8000);
  try {
    await route("account");
    await p.locator("[data-action=local-session]").last().click();
    await p.locator("#start").waitFor();
    await route("toernooibeheer");
    await p.locator("[data-entity=cup][data-id]").first().click();
    await f("rules.starterCount").fill("3");
    await f("rules.minimumPlayers").fill("3");
    await save();
    await route("club");
    await p.locator("[data-entity=team]:not([data-id])").click();
    await f("name").fill("UI QA Tweede Team");
    await f("clubId").selectOption("HV-V-EXAMPLE");
    await f("category").fill("Senioren");
    await save();
    let s = await snapshot();
    const second = s.data.teams.find((t) => t.name === "UI QA Tweede Team").id;
    await player("UI QA Speler 2", "HV-T-EXAMPLE", 2);
    await player("UI QA Speler 3", "HV-T-EXAMPLE", 3);
    for (let n = 4; n <= 6; n++) await player("UI QA Speler " + n, second, n);
    await test("Player CRUD and second-team CRUD persist through UI", async () => {
      s = await snapshot();
      assert.equal(s.data.players.length, 6);
      assert.equal(s.data.teams.length, 2);
    });
    for (const team of ["HV-T-EXAMPLE", second]) {
      await route("seizoen");
      await command("registration.submit");
      await f("cupId").selectOption("HV-CUP-EXAMPLE");
      await f("teamId").selectOption(team);
      await save();
      await p
        .locator(
          '[data-command="registration.review"][data-team="' + team + '"]',
        )
        .click();
      await f("decision").selectOption("approved");
      await f("reason").fill("UI QA: passend team expliciet toegelaten.");
      await save();
      await route("team");
      await command("roster.submit");
      await f("cupId").selectOption("HV-CUP-EXAMPLE");
      await f("teamId").selectOption(team);
      const inputs = f("playerIds");
      for (let i = 0; i < (await inputs.count()); i++) {
        if (await inputs.nth(i).isVisible()) await inputs.nth(i).check();
      }
      await save();
      s = await snapshot();
      const roster = s.data.rosters.find((r) => r.teamId === team);
      await p
        .locator('[data-command="roster.review"][data-id="' + roster.id + '"]')
        .click();
      await f("decision").selectOption("approved");
      await f("reason").fill(
        "UI QA identiteit en geldige leeftijd gecontroleerd.",
      );
      await save();
    }
    await test("Both registrations and both player rosters approve separately", async () => {
      s = await snapshot();
      assert(s.data.registrations.every((r) => r.status === "approved"));
      assert(s.data.rosters.every((r) => r.status === "approved"));
    });
    await route("planning");
    await p.locator('[data-entity=match][data-id="HV-W-EXAMPLE"]').click();
    await f("awayTeamId").selectOption(second);
    await save();
    await route("arbitrage");
    await command("assignment.set");
    await f("matchId").selectOption("HV-W-EXAMPLE");
    await f("officialId").selectOption("HV-O-EXAMPLE");
    await f("reason").fill("UI QA bevoegd aangesteld voor deze wedstrijd.");
    await save();
    await route("wedstrijd-HV-W-EXAMPLE");
    await command("assignment.accept");
    await f("accepted").check();
    await save();
    for (const team of ["HV-T-EXAMPLE", second]) {
      await route("team");
      await p.locator("[data-action=lineup-open]").click();
      await f("matchId").selectOption("HV-W-EXAMPLE");
      await f("teamId").selectOption(team);
      s = await snapshot();
      const players = s.data.players.filter((pl) => pl.teamId === team);
      for (const [i, pl] of players.entries()) {
        await f("include:" + pl.id).check();
        if (i === 0) {
          await f("captain:" + pl.id).check();
          await f("goalkeeper:" + pl.id).check();
        }
      }
      await f("attested").check();
      await f("reason").fill(
        "UI QA gecontroleerde wedstrijdselectie ingediend.",
      );
      await save();
      s = await snapshot();
      const line = s.data.lineups.filter((l) => l.teamId === team).at(-1);
      await p
        .locator('[data-action=lineup-review][data-id="' + line.id + '"]')
        .click();
      for (const pl of players) await f("check:" + pl.id).selectOption("seen");
      await f("decision").selectOption("approved");
      await f("reason").fill(
        "UI QA aanwezige spelers en identiteit gecontroleerd.",
      );
      await save();
    }
    await test("Custom lineup submission and physical-review payloads work", async () => {
      s = await snapshot();
      assert.equal(s.data.lineups.length, 2);
      assert(
        s.data.lineups.every(
          (l) => l.status === "approved" && l.players.length === 3,
        ),
      );
    });
    await route("wedstrijd-HV-W-EXAMPLE");
    await command("match.start");
    await save();
    await command("match.event");
    await f("type").selectOption("goal");
    await f("teamId").selectOption("HV-T-EXAMPLE");
    await f("playerId").selectOption("HV-P-EXAMPLE");
    await f("minute").fill("12");
    await save();
    await command("match.finalize");
    await f("homeScore").fill("1");
    await f("awayScore").fill("0");
    await f("eventsComplete").check();
    await f("reason").fill(
      "UI QA gecontroleerde gebeurtenissen en uitslag vastgesteld.",
    );
    await save();
    await test("Assignment, match start, goal and official result work", async () => {
      s = await snapshot();
      assert.equal(s.data.matches[0].status, "finished");
      assert.equal(s.data.matches[0].homeScore, 1);
      assert.equal(s.data.events[0].status, "confirmed");
    });
    await route("tenues");
    await command("kit.update");
    await f("clubId").selectOption("HV-V-EXAMPLE");
    await f("variant").selectOption("home");
    await f("shirtColor").fill("#005016");
    await f("shortsColor").fill("#ffffff");
    await f("socksColor").fill("#005016");
    await save();
    await test("Kit colors persist and render from API", async () => {
      s = await snapshot();
      assert.equal(s.data.kits[0].shirtColor, "#005016");
      assert((await p.locator("#tenues").innerText()).includes("Thuistenue"));
    });
    await route("fotograaf");
    await command("media.submit");
    await f("matchId").selectOption("HV-W-EXAMPLE");
    await f("title").fill("UI QA beeld");
    await f("credit").fill("Fictieve testfotograaf");
    await f("dataUrl").setInputFiles({
      name: "qa.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf1EAAAAASUVORK5CYII=",
        "base64",
      ),
    });
    await f("rights.website").check();
    await f("consent").check();
    await save();
    await test("Media upload stores explicit rights pending review", async () => {
      s = await snapshot();
      assert.equal(s.data.media[0].status, "pending");
      assert.equal(s.data.media[0].rights.website, true);
    });
    await command("media.review");
    await f("decision").selectOption("approved");
    await f("reason").fill("UI QA probeert eigen beeld goed te keuren.");
    await m().locator("[type=submit]").click();
    await p.waitForTimeout(150);
    await test("Four-eyes error keeps media review input", async () => {
      assert(await m().isVisible());
      assert(
        (await m().locator("[data-editor-error]").innerText()).includes(
          "eigen beeld",
        ),
      );
      assert.equal(
        await f("reason").inputValue(),
        "UI QA probeert eigen beeld goed te keuren.",
      );
    });
    await f("decision").selectOption("rejected");
    await f("reason").fill("UI QA inzending uitsluitend als test afgewezen.");
    await save();
    for (const width of [390, 1280]) {
      await p.setViewportSize({ width, height: 900 });
      for (const type of ["cup", "player"]) {
        await route(type === "cup" ? "toernooibeheer" : "spelersbeheer");
        await p.locator("[data-entity=" + type + "]:not([data-id])").click();
        const g = await m().evaluate((d) => {
          const r = d.getBoundingClientRect(),
            f = d.querySelector(".dialog-footer").getBoundingClientRect();
          return {
            left: r.left,
            right: r.right,
            top: r.top,
            bottom: r.bottom,
            footer: f.bottom,
            view: innerHeight,
            overflow:
              d.querySelector(".dialog-body").scrollWidth >
              d.querySelector(".dialog-body").clientWidth,
          };
        });
        assert(
          g.left >= 0 &&
            g.right <= width &&
            g.top >= 0 &&
            g.bottom <= 900 &&
            g.footer <= g.bottom &&
            !g.overflow,
        );
        await p.screenshot({
          path: out + "/modal-" + type + "-" + width + ".png",
        });
        await m().locator("[data-action=editor-close]").first().click();
      }
      await test(
        "Modal forms stay within " + width + "px viewport with visible actions",
        async () => {},
      );
    }
    await route("home");
    await p.locator(".skip-link").focus();
    await p.keyboard.press("Enter");
    await test("Keyboard skip link focuses content without changing route", async () => {
      assert.equal(
        await p.evaluate(() => document.activeElement.id),
        "main-content",
      );
      assert.equal(new URL(p.url()).hash, "#home");
    });
    await p.locator('.hv-nav a[href="#programma"]').click();
    await p.waitForFunction(() => document.activeElement?.tagName === "H1");
    await test("Hash navigation moves focus to the page heading", async () =>
      assert.equal(await p.locator("h1").count(), 1));
    await route("seizoen");
    const opener = p.locator("[data-entity=club]:not([data-id])");
    await opener.click();
    await f("name").fill("Niet opgeslagen toetsenbordcontrole");
    await m().locator("[type=submit]").focus();
    await p.keyboard.press("Tab");
    assert(
      await p.evaluate(() => !!document.activeElement.closest("[data-editor]")),
    );
    await p.keyboard.press("Escape");
    assert.equal(
      await p.evaluate(() => document.activeElement.dataset.action),
      "editor-keep",
    );
    await m().locator("[data-action=editor-keep]").click();
    assert.equal(
      await f("name").inputValue(),
      "Niet opgeslagen toetsenbordcontrole",
    );
    await p.keyboard.press("Escape");
    await m().locator("[data-action=editor-discard]").click();
    await test("Dialog contains keyboard focus; Escape keeps input and restores opener on discard", async () => {
      assert(!(await m().isVisible()));
      assert.equal(
        await p.evaluate(() => document.activeElement.dataset.entity),
        "club",
      );
    });
    assert.deepEqual(errors, []);
  } catch (e) {
    console.error(e);
    results.push({ name: "failure", ok: false, error: e.stack });
    await p.screenshot({ path: out + "/failure.png" }).catch(() => {});
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(
      out + "/results.json",
      JSON.stringify({ results, errors }, null, 2),
    );
    await b?.close();
    if (server) await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(JSON.stringify({ count: results.length, errors }));
  }
})();
