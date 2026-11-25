import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { createMailService } from "../../server/mail.mjs";
import { createServer } from "../../server/index.mjs";
import { LocalStore } from "../../server/store.mjs";
import { createInitialState, actorFor } from "../../server/domain.mjs";
import { readConfig } from "../../server/config.mjs";
import { MAIL_TEMPLATE_CATALOG, NOTIFICATION_TEMPLATE_IDS, templateDefinition, validateTemplate, renderTemplate, exportAuthTemplate } from "../../server/mail-templates.mjs";

const user = { id: "local-admin" };
async function setup(t, fetchImpl = async () => { throw Error("No external mail permitted in tests"); }) {
  const dir = await mkdtemp(join(tmpdir(), "haagv-template-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const options = { file: join(dir, "vault.enc"), encryptionKey: randomBytes(32).toString("base64"), appOrigin: "https://platform.example.invalid", fetchImpl };
  return { dir, options, service: createMailService(options) };
}
const content = (item) => ({ subject: item.subject, text: item.text, html: item.html });

test("catalogue covers every platform notification and exports only six-digit Supabase OTP templates", async () => {
  assert.equal(MAIL_TEMPLATE_CATALOG.length, 8);
  for (const id of Object.values(NOTIFICATION_TEMPLATE_IDS)) assert.equal(templateDefinition(id).type, "resend-api");
  for (const entry of MAIL_TEMPLATE_CATALOG) {
    validateTemplate(entry.id, entry);
    const preview = renderTemplate(entry.id, entry);
    assert(!preview.html.includes("{{"));
    assert(!preview.subject.includes("{{"));
  }
  for (const id of ["auth.otp", "auth.confirmation"]) {
    const entry = templateDefinition(id), exported = exportAuthTemplate(id, entry);
    assert.equal(exported.status, "not-published");
    assert.equal(exported.config.mailer_otp_length, 6);
    assert.match(exported.template.content, /{{ \.Token }}/);
    assert(!exported.template.content.includes("ConfirmationURL"));
    assert(!exported.template.content.includes("{{ platform_name }}"));
    assert.match(renderTemplate(id, entry).html, /123456/);
    assert.throws(() => renderTemplate(id, entry, { ".Token": "12345" }), { code: "MAIL_TEMPLATE_INVALID" });
    assert.throws(() => validateTemplate(id, { ...entry, html: "<p>Code ontbreekt</p>" }), { code: "MAIL_TEMPLATE_INVALID" });
    assert.throws(() => validateTemplate(id, { ...entry, html: "<p>{{ .ConfirmationURL }}</p>" }), { code: "MAIL_TEMPLATE_INVALID" });
    const filename = id === "auth.otp" ? "otp" : "confirmation";
    assert.equal((await readFile(new URL(`../../emails/supabase/${filename}.html`, import.meta.url), "utf8")).trim(), exported.template.content.trim());
  }
  assert.equal(exportAuthTemplate("auth.otp", templateDefinition("auth.otp")).template.fieldNames.content, "mailer_templates_magic_link_content");
});

test("HTML grammar rejects active content, malformed attributes, dynamic links and shortcode expressions", () => {
  const entry = templateDefinition("notification.message");
  const attacks = [
    '<script>alert(1)</script>', '<iframe src="https://example.invalid"></iframe>',
    '<svg onload="alert(1)"></svg>', '<img src="https://example.invalid/a" onerror="alert(1)">',
    '<a href="javascript:alert(1)">x</a>', '<a href="jav&#x61;script:alert(1)">x</a>',
    '<a href="//attacker.invalid">x</a>', '<a href="data:text/html,test">x</a>',
    '<a href="http://remote.invalid">x</a>', '<a href="{{ message_body }}">x</a>',
    '<a href="https://example.invalid/{{ app_url }}">x</a>', '<p style="background-image:url(https://tracker.invalid)">x</p>',
    '<p style="width:expression(alert(1))">x</p>', '<p style="color:r&#101;d">x</p>',
    '<p title={{ message_subject }}>x</p>', '<p title="{{ message_subject }}">x</p>',
    '<p style="color:red" style="color:blue">x</p>', '<p><strong>x</p></strong>',
    '<!-- {{ message_body }} --><p>x</p>', '<p>{{ unknown }}</p>', '<p>{{ if .Token }}</p>',
    '<p>{{ message_body </p>', '<p><img src="https://example.invalid"></p></bad>',
  ];
  for (const html of attacks) assert.throws(() => validateTemplate(entry.id, { ...entry, html }), { code: "MAIL_TEMPLATE_INVALID" }, html);
  for (const subject of ["Titel\r\nBcc: x@example.invalid", "x".repeat(201), "{{ unknown }}"])
    assert.throws(() => validateTemplate(entry.id, { ...entry, subject }), { code: "MAIL_TEMPLATE_INVALID" });
});

test("render escapes untrusted values and validates URL, header and unknown value boundaries", () => {
  const entry = templateDefinition("notification.message"), body = '<img src=x onerror="alert(1)"> & {{ platform_name }}';
  const preview = renderTemplate(entry.id, entry, { message_subject: "Een <onderwerp>", message_body: body, app_url: "https://platform.example.invalid/?a=1&b=2" });
  assert.match(preview.html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt; &amp; {{ platform_name }}/);
  assert(!preview.html.includes('<img src=x'));
  assert(preview.text.includes(body));
  assert(preview.html.includes('href="https://platform.example.invalid/?a=1&amp;b=2"'));
  for (const app_url of ["javascript:alert(1)", "https://user:password@example.invalid", "http://remote.invalid", 'https://x.invalid/" onclick="alert(1)'])
    assert.throws(() => renderTemplate(entry.id, entry, { app_url }), { code: "MAIL_TEMPLATE_INVALID" });
  assert.throws(() => renderTemplate(entry.id, entry, { message_subject: "x\nInjected" }), { code: "MAIL_TEMPLATE_INVALID" });
  assert.throws(() => renderTemplate(entry.id, entry, { apiKey: "secret" }), { code: "MAIL_TEMPLATE_INVALID" });
  assert.match(renderTemplate(entry.id, entry, {}, { appOrigin: "http://127.0.0.1:4175" }).html, /127.0.0.1:4175/);
});

test("template revisions, reset and audit persist encrypted beside existing credentials without leaking content", async (t) => {
  const { options, service } = await setup(t);
  const apiKey = "re_fake_key_only_for_template_tests";
  await service.updateSettings({ apiKey, from: "mail@example.invalid", enabled: true });
  const initial = await service.getTemplate("system.test"), draft = { ...content(initial), subject: "Aangepaste test {{ platform_name }}", expectedRevision: 0 };
  const changed = await service.updateTemplate(initial.id, draft, { user });
  assert.equal(changed.revision, 1);
  assert.equal(changed.status, "custom");
  const disk = await readFile(options.file, "utf8");
  assert(!disk.includes(apiKey));
  assert(!disk.includes("Aangepaste test"));
  const fresh = createMailService(options);
  assert.equal((await fresh.getTemplate(initial.id)).subject, draft.subject);
  assert.equal((await fresh.getSettings()).configured, true);
  await assert.rejects(fresh.updateTemplate(initial.id, draft, { user }), { code: "MAIL_TEMPLATE_CONFLICT" });
  await assert.rejects(fresh.resetTemplate(initial.id, { expectedRevision: 0 }, { user }), { code: "MAIL_TEMPLATE_CONFLICT" });
  const reset = await fresh.resetTemplate(initial.id, { expectedRevision: 1 }, { user });
  assert.equal(reset.revision, 2);
  assert.equal(reset.status, "default");
  assert.equal(reset.subject, initial.subject);
  const audit = await fresh.getTemplateAudit();
  assert.deepEqual(audit.map((row) => [row.action, row.revision, row.userId]), [["update", 1, user.id], ["reset", 2, user.id]]);
  assert(!JSON.stringify(audit).includes(apiKey));
  assert(!JSON.stringify(audit).includes("Aangepaste test"));
  const serialized = await Promise.allSettled([1, 2].map((n) => fresh.updateTemplate(initial.id, { ...content(initial), subject: "Wijziging " + n, expectedRevision: 2 }, { user })));
  assert.equal(serialized.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(serialized.find((r) => r.status === "rejected").reason.code, "MAIL_TEMPLATE_CONFLICT");
  await fresh.updateSettings({ apiKey: "", replyTo: "reply@example.invalid" });
  assert.equal((await fresh.getTemplate(initial.id)).revision, 3);
});

test("draft preview never persists; missing encryption refuses edits but leaves defaults usable", async (t) => {
  const { options, service } = await setup(t), initial = await service.getTemplate("system.test");
  const preview = await service.renderTemplate(initial.id, { ...content(initial), subject: "Onopgeslagen voorbeeld" });
  assert.equal(preview.subject, "Onopgeslagen voorbeeld");
  assert.equal((await service.getTemplate(initial.id)).revision, 0);
  assert.equal((await service.getTemplate(initial.id)).subject, initial.subject);
  assert.deepEqual(await service.getTemplateAudit(), []);
  await assert.rejects(service.renderTemplate(initial.id, { subject: "Alleen onderwerp" }), { code: "MAIL_TEMPLATE_INVALID" });
  await assert.rejects(service.updateTemplate(initial.id, { ...content(initial), apiKey: "no" }, { user }), { code: "MAIL_TEMPLATE_INVALID" });
  const unready = createMailService({ file: options.file });
  assert.equal((await unready.getTemplates()).length, 8);
  await assert.rejects(unready.updateTemplate(initial.id, content(initial), { user }), { code: "MAIL_ENCRYPTION_UNAVAILABLE" });
  await assert.rejects(service.updateTemplate(initial.id, content(initial)), { code: "AUTH_REQUIRED" });
});

test("notification and test sends use saved HTML templates; auth templates never call the Resend API", async (t) => {
  const requests = [], { service } = await setup(t, async (url, options) => {
    requests.push({ url, options, message: JSON.parse(options.body) });
    return { ok: true, json: async () => ({ id: "provider-" + requests.length }) };
  });
  await service.updateSettings({ apiKey: "re_fake_key_for_templates_1234", from: "mail@example.invalid", enabled: true });
  const original = await service.getTemplate("notification.message");
  await service.updateTemplate(original.id, { ...content(original), subject: "Aangepast: {{ message_subject }}", html: "<p>{{ message_body }}</p>" }, { user });
  const receipt = await service.sendNotification({ id: "outbox-user", to: "verified@example.invalid", templateId: original.id, values: { message_subject: "Nieuws", message_body: "<b>Onvertrouwde tekst</b>" } });
  assert.equal(receipt.status, "accepted");
  assert.equal(requests[0].message.subject, "Aangepast: Nieuws");
  assert.equal(requests[0].message.html, "<p>&lt;b&gt;Onvertrouwde tekst&lt;/b&gt;</p>");
  assert.equal(requests[0].options.headers["Idempotency-Key"], "haagv-notification-outbox-user");
  await service.sendTest({ to: "verified@example.invalid", user, requestId: "test-request" });
  assert.match(requests[1].message.html, /Supabase Auth/);
  for (const id of ["auth.otp", "auth.confirmation"]) {
    await assert.rejects(service.testTemplate(id, { to: "verified@example.invalid", user }), { code: "AUTH_PROVIDER_ONLY" });
    await assert.rejects(service.sendNotification({ id: "not-auth", to: "verified@example.invalid", templateId: id }), { code: "AUTH_PROVIDER_ONLY" });
  }
  assert.equal(requests.length, 2);
});

test("template HTTP APIs require current managed leadership and enforce CAS, draft and provider boundaries", async (t) => {
  const { service, dir } = await setup(t), state = createInitialState({ example: true });
  state.memberships.push({ id: "club-only", userId: "club-user", role: "club", clubId: state.data.clubs[0].id, status: "active" });
  const store = new LocalStore({ initialState: state });
  const config = readConfig({ root: dir, env: {} });
  const server = await createServer({ config, store, mailService: service, logger: { error() {} }, auth: {
    resolve: async (req, current) => actorFor(current, req.headers.authorization ? { id: req.headers.authorization.slice(7) } : null),
  } });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = "http://127.0.0.1:" + server.address().port;
  const request = async (path, { actor = "local-admin", method = "GET", data } = {}) => {
    const response = await fetch(origin + "/api/v1/admin/mail-templates" + path, { method, headers: { ...(actor ? { Authorization: "Bearer " + actor } : {}), ...(data ? { "Content-Type": "application/json" } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  assert.equal((await request("", { actor: null })).status, 403);
  assert.equal((await request("", { actor: "club-user" })).status, 403);
  const listing = await request("");
  assert.equal(listing.status, 200);
  assert.equal(listing.body.items.length, 8);
  const item = listing.body.items.find((row) => row.id === "system.test");
  const saved = await request("/system.test", { method: "PUT", data: { ...content(item), subject: "Beheer {{ platform_name }}", expectedRevision: 0 } });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.item.revision, 1);
  assert.equal((await request("/system.test", { method: "PUT", data: { ...content(item), expectedRevision: 0 } })).status, 409);
  const preview = await request("/system.test/render", { method: "POST", data: { ...content(item), subject: "Niet opgeslagen" } });
  assert.equal(preview.body.preview.subject, "Niet opgeslagen");
  assert.equal((await request("/system.test")).body.item.subject, "Beheer {{ platform_name }}");
  assert.equal((await request("/auth.otp/export")).body.status, "not-published");
  const denied = await request("/auth.otp/test", { method: "POST", data: { to: "nobody@example.invalid" } });
  assert.equal(denied.body.error.code, "AUTH_PROVIDER_ONLY");
  assert.equal((await request("/audit")).body.items.length, 1);
  const revoked = await store.read();
  revoked.memberships.find((row) => row.userId === "local-admin").status = "revoked";
  await store.replaceStateForTest(revoked);
  assert.equal((await request("/system.test/reset", { method: "POST", data: { expectedRevision: 1 } })).status, 403);
});
