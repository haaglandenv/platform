import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { mkdir, readFile, lstat, open, rename, unlink } from "node:fs/promises";
import path from "node:path";
import {
  MAIL_TEMPLATE_CATALOG,
  templateDefinition,
  templateItem,
  validateTemplate,
  renderTemplate,
  exportAuthTemplate,
  MailTemplateError,
} from "./mail-templates.mjs";
export class MailError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "MailError";
    Object.assign(this, {
      code,
      status,
      statusCode: status,
      httpStatus: status,
    });
  }
}
const invalid = (message) => {
  throw new MailError("MAIL_SETTINGS_INVALID", message);
};
const email = (value) =>
  typeof value === "string" &&
  value.length <= 254 &&
  !/[\r\n<>\s,;]/.test(value) &&
  /^[^@]+@[^@]+\.[^@]+$/.test(value);
function fromAddress(value) {
  if (typeof value !== "string" || value.length > 320 || /[\r\n]/.test(value))
    return false;
  const match = /^(?:[^<>]{1,100}\s*)?<([^<>]+)>$/.exec(value);
  return email(match ? match[1] : value);
}
function encryptionKey(value) {
  if (!value) return null;
  const buffer = Buffer.from(value, "base64");
  if (buffer.length !== 32 || buffer.toString("base64") !== value)
    throw new MailError(
      "MAIL_ENCRYPTION_UNAVAILABLE",
      "De server heeft geen geldige versleutelingssleutel voor mailinstellingen.",
      503,
    );
  return buffer;
}
const AAD = Buffer.from("haagv.mail-settings.v1");
function seal(value, key) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(AAD);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return (
    JSON.stringify({
      version: 1,
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    }) + "\n"
  );
}
function unseal(raw, key) {
  try {
    const data = JSON.parse(raw);
    if (data.version !== 1) throw Error();
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(data.iv, "base64"),
    );
    decipher.setAAD(AAD);
    decipher.setAuthTag(Buffer.from(data.tag, "base64"));
    return JSON.parse(
      Buffer.concat([
        decipher.update(Buffer.from(data.ciphertext, "base64")),
        decipher.final(),
      ]).toString("utf8"),
    );
  } catch {
    throw new MailError(
      "MAIL_SETTINGS_UNREADABLE",
      "De opgeslagen mailinstellingen kunnen niet veilig worden geopend.",
      503,
    );
  }
}
export function createMailService({
  file,
  encryptionKey: secret,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  appOrigin = "https://example.invalid",
} = {}) {
  if (!file)
    throw new MailError(
      "MAIL_SETTINGS_PATH_MISSING",
      "De serveropslag voor mailinstellingen ontbreekt.",
      503,
    );
  const key = encryptionKey(secret),
    attempts = new Map();
  let serial = Promise.resolve();
  const lock = (fn) => {
    const result = serial.then(fn);
    serial = result.catch(() => {});
    return result;
  };
  async function load() {
    try {
      const stat = await lstat(file);
      if (!stat.isFile() || stat.isSymbolicLink())
        throw new MailError(
          "MAIL_SETTINGS_UNREADABLE",
          "De mailinstellingen staan niet in een veilig bestand.",
          503,
        );
      if (!key)
        throw new MailError(
          "MAIL_ENCRYPTION_UNAVAILABLE",
          "Stel eerst de serverversleuteling voor mailinstellingen in.",
          503,
        );
      return unseal(await readFile(file, "utf8"), key);
    } catch (error) {
      if (error.code === "ENOENT")
        return {
          enabled: false,
          from: "",
          replyTo: "",
          apiKey: null,
          updatedAt: null,
        };
      throw error;
    }
  }
  const masked = (settings) => ({
    available: !!key,
    configured: !!settings.apiKey,
    last4: settings.apiKey ? settings.apiKey.slice(-4) : null,
    enabled: settings.enabled === true,
    from: settings.from || "",
    replyTo: settings.replyTo || "",
    updatedAt: settings.updatedAt || null,
  });
  async function save(settings) {
    if (!key)
      throw new MailError(
        "MAIL_ENCRYPTION_UNAVAILABLE",
        "Stel eerst de serverversleuteling voor mailinstellingen in.",
        503,
      );
    await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
    const tmp = file + "." + randomUUID() + ".tmp";
    let handle;
    try {
      handle = await open(tmp, "wx", 0o600);
      await handle.writeFile(seal(settings, key));
      await handle.sync();
      await handle.close();
      handle = null;
      await rename(tmp, file);
    } catch (error) {
      if (handle) await handle.close().catch(() => {});
      await unlink(tmp).catch(() => {});
      throw new MailError(
        "MAIL_SETTINGS_SAVE_FAILED",
        "De mailinstellingen konden niet worden opgeslagen.",
        503,
      );
    }
  }
  async function send({ to, subject, text, html, idempotencyKey }) {
    const settings = await load();
    if (!settings.enabled || !settings.apiKey || !fromAddress(settings.from))
      throw new MailError(
        "MAIL_NOT_CONFIGURED",
        "Stel eerst de Resend API-sleutel en geverifieerde afzender in.",
        503,
      );
    if (!email(to)) invalid("Vul één geldig e-mailadres in.");
    if (
      typeof subject !== "string" ||
      !subject.trim() ||
      subject.length > 200 ||
      /[\r\n]/.test(subject) ||
      typeof text !== "string" ||
      !text.trim() ||
      text.length > 20000 ||
      (html !== undefined && (typeof html !== "string" || html.length > 80000))
    )
      invalid("Het mailbericht is ongeldig.");
    let response;
    try {
      response = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + settings.apiKey,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          from: settings.from,
          to: [to],
          subject,
          text,
          ...(html ? { html } : {}),
          ...(settings.replyTo ? { reply_to: settings.replyTo } : {}),
        }),
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new MailError(
        "MAIL_PROVIDER_UNAVAILABLE",
        "De e-maildienst is niet bereikbaar. De verzending is niet bevestigd.",
        502,
      );
    }
    if (!response.ok)
      throw new MailError(
        "MAIL_PROVIDER_REJECTED",
        "De e-maildienst weigert het bericht. Controleer de API-sleutel, afzender en domeinverificatie.",
        502,
      );
    let data;
    try {
      data = await response.json();
    } catch {
      throw new MailError(
        "MAIL_PROVIDER_INVALID_RESPONSE",
        "De e-maildienst gaf geen geldige bevestiging.",
        502,
      );
    }
    if (typeof data.id !== "string" || !data.id)
      throw new MailError(
        "MAIL_PROVIDER_INVALID_RESPONSE",
        "De e-maildienst gaf geen berichtnummer terug.",
        502,
      );
    return { id: data.id, status: "accepted" };
  }
  function checkFields(input, allowed) {
    if (!input || typeof input !== "object" || Array.isArray(input) ||
      Object.keys(input).some((field) => !allowed.includes(field)))
      throw new MailTemplateError("MAIL_TEMPLATE_INVALID", "De templateaanvraag bevat onbekende of ongeldige velden.");
  }
  function checkRevision(input, item) {
    if (input.expectedRevision !== undefined && (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0))
      throw new MailTemplateError("MAIL_TEMPLATE_INVALID", "De templaterevisie is ongeldig.");
    if (input.expectedRevision !== undefined && input.expectedRevision !== item.revision)
      throw new MailTemplateError("MAIL_TEMPLATE_CONFLICT", "Deze template is ondertussen gewijzigd. Laad de actuele versie voordat je opslaat.", 409);
  }
  function auditUser(user) {
    if (!user?.id || typeof user.id !== "string")
      throw new MailError("AUTH_REQUIRED", "Log in voordat je mailtemplates beheert.", 401);
    return user.id;
  }
  async function changeTemplate(id, input, user, reset = false) {
    const userId = auditUser(user);
    checkFields(input, reset ? ["expectedRevision"] : ["subject", "text", "html", "expectedRevision"]);
    const settings = await load(), current = templateItem(id, settings.templates);
    checkRevision(input, current);
    const content = validateTemplate(id, reset ? templateDefinition(id) : input);
    const updatedAt = new Date(now()).toISOString();
    settings.templates ||= {};
    settings.templates[id] = { ...content, revision: current.revision + 1, updatedAt, status: reset ? "default" : "custom" };
    settings.templateAudit = [...(settings.templateAudit || []), {
      id: randomUUID(), action: reset ? "reset" : "update", templateId: id,
      revision: current.revision + 1, userId, at: updatedAt,
    }].slice(-200);
    await save(settings);
    return templateItem(id, settings.templates);
  }
  async function testTemplate(id, { to, user, requestId = randomUUID() }) {
    auditUser(user);
    if (templateDefinition(id).type !== "resend-api")
      throw new MailTemplateError("AUTH_PROVIDER_ONLY", "Supabase Auth verstuurt inlogcodes. Exporteer deze template en publiceer hem afzonderlijk bij Supabase; een Resend-test is niet beschikbaar.", 409);
    if (typeof requestId !== "string" || !requestId || requestId.length > 100 || !/^[a-zA-Z0-9._-]+$/.test(requestId))
      invalid("De aanvraagcode is ongeldig.");
    const recent = (attempts.get(user.id) || []).filter((at) => now() - at < 60000);
    if (recent.length >= 3)
      throw new MailError("MAIL_RATE_LIMITED", "Wacht een minuut voordat je opnieuw een testmail verstuurt.", 429);
    attempts.set(user.id, [...recent, now()]);
    const settings = await load();
    const rendered = renderTemplate(id, templateItem(id, settings.templates), {}, { appOrigin });
    return send({ to, ...rendered, idempotencyKey: "haagv-test-" + user.id + "-" + requestId });
  }
  return {
    getSettings: () => lock(async () => masked(await load())),
    updateSettings: (input) =>
      lock(async () => {
        if (!input || typeof input !== "object" || Array.isArray(input))
          invalid("Gebruik geldige mailinstellingen.");
        const allowed = new Set([
          "apiKey",
          "from",
          "replyTo",
          "enabled",
          "clearApiKey",
        ]);
        if (Object.keys(input).some((k) => !allowed.has(k)))
          invalid("Onbekende mailinstelling.");
        const current = await load(),
          next = { ...current };
        if (input.apiKey !== undefined && input.apiKey !== "") {
          if (
            typeof input.apiKey !== "string" ||
            !/^re_[A-Za-z0-9_-]{10,200}$/.test(input.apiKey.trim())
          )
            invalid("Gebruik een geldige Resend API-sleutel.");
          next.apiKey = input.apiKey.trim();
        }
        if (input.clearApiKey === true) {
          next.apiKey = null;
          next.enabled = false;
        }
        if (input.from !== undefined) {
          if (
            typeof input.from !== "string" ||
            (input.from !== "" && !fromAddress(input.from.trim()))
          )
            invalid(
              "Gebruik één geldige afzender, eventueel met weergavenaam.",
            );
          next.from = input.from.trim();
        }
        if (input.replyTo !== undefined) {
          if (
            typeof input.replyTo !== "string" ||
            (input.replyTo !== "" && !email(input.replyTo.trim()))
          )
            invalid("Gebruik een geldig antwoordadres.");
          next.replyTo = input.replyTo.trim();
        }
        if (input.enabled !== undefined) {
          if (typeof input.enabled !== "boolean")
            invalid("De mailstatus moet aan of uit zijn.");
          next.enabled = input.enabled;
        }
        if (next.enabled && (!next.apiKey || !fromAddress(next.from)))
          invalid(
            "Een API-sleutel en afzender zijn nodig voordat mail wordt ingeschakeld.",
          );
        next.updatedAt = new Date(now()).toISOString();
        await save(next);
        return masked(next);
      }),
    getTemplates: () => lock(async () => {
      const settings = await load();
      return MAIL_TEMPLATE_CATALOG.map((entry) => ({
        ...templateItem(entry.id, settings.templates),
        configured: entry.type === "resend-api" ? !!settings.enabled && !!settings.apiKey : null,
      }));
    }),
    getTemplate: (id) => lock(async () => templateItem(id, (await load()).templates)),
    getTemplateAudit: () => lock(async () => (await load()).templateAudit || []),
    updateTemplate: (id, input, { user } = {}) => lock(() => changeTemplate(id, input, user)),
    resetTemplate: (id, input, { user } = {}) => lock(() => changeTemplate(id, input, user, true)),
    renderTemplate: (id, input = {}) => lock(async () => {
      checkFields(input, ["subject", "text", "html", "values"]);
      const draft = ["subject", "text", "html"].some((field) => input[field] !== undefined);
      const source = draft ? validateTemplate(id, input) : templateItem(id, (await load()).templates);
      return renderTemplate(id, source, input.values === undefined ? {} : input.values, { appOrigin });
    }),
    exportTemplate: (id) => lock(async () => {
      const item = templateItem(id, (await load()).templates);
      return { ...exportAuthTemplate(id, item, { appOrigin }), revision: item.revision };
    }),
    testTemplate: (id, input) => testTemplate(id, input),
    sendTest: (input) => testTemplate("system.test", input),
    async sendNotification({ id, to, subject, text, templateId, values }) {
      if (
        typeof id !== "string" ||
        !id ||
        id.length > 150 ||
        !/^[a-zA-Z0-9._-]+$/.test(id)
      )
        invalid("De mailaanvraag is ongeldig.");
      const rendered = templateId
        ? renderTemplate(templateId, templateItem(templateId, (await load()).templates), values || {}, { appOrigin })
        : { subject, text };
      if (templateId && templateDefinition(templateId).type !== "resend-api")
        throw new MailTemplateError("AUTH_PROVIDER_ONLY", "Inlogcodes worden alleen door Supabase Auth verstuurd.", 409);
      return send({
        to,
        ...rendered,
        idempotencyKey: "haagv-notification-" + id,
      });
    },
  };
}
