import { createServer as httpServer } from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import { resolve, relative, extname, isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import { readConfig } from "./config.mjs";
import { createStore } from "./store.mjs";
import { createAuth } from "./auth.mjs";
import { MAIL_TEMPLATE_CATALOG, templateItem, renderTemplate, exportAuthTemplate } from "./mail-templates.mjs";
import {
  actorFor,
  projectBootstrap,
  capabilitiesFor,
  fail,
  PlatformError,
} from "./domain.mjs";

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".ico": "image/x-icon",
};
function send(res, status, value) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(value));
}
async function body(req, limit) {
  if (
    !String(req.headers["content-type"] || "")
      .toLowerCase()
      .startsWith("application/json")
  )
    fail("CONTENT_TYPE", "Gebruik application/json.", 415);
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) fail("BODY_TOO_LARGE", "Deze invoer is te groot.", 413);
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    fail("INVALID_JSON", "De JSON-invoer is ongeldig.", 400);
  }
}
function requireLeader(actor) {
  if (!capabilitiesFor(actor).includes("settings.manage"))
    fail(
      "FORBIDDEN",
      "Alleen de toernooileiding beheert deze instelling.",
      403,
    );
}
const unconfiguredMail = {
  getTemplates: async () => MAIL_TEMPLATE_CATALOG.map((item) => ({ ...templateItem(item.id), configured: item.type === "resend-api" ? false : null })),
  getTemplate: async (id) => templateItem(id),
  getTemplateAudit: async () => [],
  renderTemplate: async (id, input = {}) => renderTemplate(id, input.subject !== undefined || input.html !== undefined || input.text !== undefined ? input : templateItem(id), input.values),
  exportTemplate: async (id) => exportAuthTemplate(id, templateItem(id)),
  updateTemplate: async () => fail("MAIL_ENCRYPTION_UNAVAILABLE", "Stel eerst de serverversleuteling voor mailinstellingen in.", 503),
  resetTemplate: async () => fail("MAIL_ENCRYPTION_UNAVAILABLE", "Stel eerst de serverversleuteling voor mailinstellingen in.", 503),
  testTemplate: async () => fail("MAIL_NOT_CONFIGURED", "De servermailconfiguratie is nog niet ingericht.", 503),
  getSettings: async () => ({
    configured: false,
    enabled: false,
    status: "unconfigured",
  }),
  updateSettings: async () =>
    fail(
      "MAIL_NOT_CONFIGURED",
      "De servermailconfiguratie is nog niet ingericht.",
      503,
    ),
  sendTest: async () =>
    fail(
      "MAIL_NOT_CONFIGURED",
      "De servermailconfiguratie is nog niet ingericht.",
      503,
    ),
  sendNotification: async () =>
    fail(
      "MAIL_NOT_CONFIGURED",
      "De servermailconfiguratie is nog niet ingericht.",
      503,
    ),
};
export async function createApplication({
  config = readConfig(),
  store,
  auth,
  mailService,
  supabaseClient,
  logger = console,
} = {}) {
  store ||= await createStore(config, { supabaseClient });
  auth ||= createAuth({ config, store, supabaseClient });
  mailService ||= unconfiguredMail;
  const distRoot = resolve(config.root, "dist");
  async function bootstrap(req, state) {
    const snapshot = state || (await store.read()),
      actor = await auth.resolve(req, snapshot);
    return { actor, body: projectBootstrap(snapshot, actor, config) };
  }
  async function processOutbox(ids) {
    const snapshot = await store.read(),
      rows = (snapshot.mailOutbox || []).filter(
        (r) => r.status === "pending" && (!ids || ids.includes(r.id)),
      );
    let accepted = 0,
      pending = 0;
    for (const row of rows) {
      const statuses = [];
      for (const userId of row.recipientUserIds) {
        const previous = row.recipients?.find(
          (r) => r.userId === userId && r.status === "accepted",
        );
        if (previous) {
          statuses.push(previous);
          continue;
        }
        try {
          const to = await auth.resolveEmail(userId);
          if (!to || to.endsWith(".invalid")) {
            statuses.push({
              userId,
              status: "pending",
              code: "NO_VERIFIED_ADDRESS",
            });
            continue;
          }
          const receipt = await mailService.sendNotification({
            id: row.id + "-" + userId,
            to,
            subject: row.subject,
            text: row.text,
            templateId: row.templateId,
            values: row.templateValues,
          });
          statuses.push({
            userId,
            status: receipt.status === "accepted" ? "accepted" : "pending",
            providerId: receipt.id || null,
          });
        } catch (error) {
          statuses.push({
            userId,
            status: "pending",
            code: error.code || "MAIL_UNAVAILABLE",
          });
        }
      }
      const status =
        statuses.length && statuses.every((s) => s.status === "accepted")
          ? "accepted"
          : "pending";
      if (status === "accepted") accepted++;
      else pending++;
      try {
        await store.finishNotification?.(row.id, {
          status,
          recipients: statuses,
          attemptedAt: new Date().toISOString(),
        });
      } catch {
        logger.error?.("Mailstatus kon nog niet worden opgeslagen", {
          id: row.id,
        });
      }
    }
    return { accepted, pending };
  }
  const application = async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader("X-Frame-Options", "DENY");
    try {
      const url = new URL(req.url, "http://server.invalid"),
        api = url.pathname.startsWith("/api/"),
        origin = req.headers.origin;
      if (api) {
        if (origin && origin !== config.origin)
          fail(
            "ORIGIN_NOT_ALLOWED",
            "Deze app-origin is niet toegestaan.",
            403,
          );
        if (origin === config.origin) {
          res.setHeader("Access-Control-Allow-Origin", config.origin);
          res.setHeader("Access-Control-Allow-Credentials", "true");
          res.setHeader("Vary", "Origin");
        }
        if (req.method === "OPTIONS") {
          res.setHeader(
            "Access-Control-Allow-Methods",
            "GET, POST, PUT, DELETE, OPTIONS",
          );
          res.setHeader(
            "Access-Control-Allow-Headers",
            "Authorization, Content-Type, X-Haagv-Membership",
          );
          res.statusCode = 204;
          return res.end();
        }
        if (
          !["GET", "HEAD"].includes(req.method) &&
          !origin &&
          !req.headers.authorization
        )
          fail("ORIGIN_REQUIRED", "Een geldige app-origin is vereist.", 403);
        if (url.pathname === "/api/health" && req.method === "GET")
          return send(res, 200, {
            ok: true,
            service: "haagv",
            environment:
              config.environment ||
              (config.production ? "production" : "local"),
            sha: config.releaseSha || "development",
          });
        if (url.pathname === "/api/ready" && req.method === "GET") {
          await store.ready();
          let mail;
          try {
            mail = await mailService.getSettings();
          } catch {
            mail = { configured: false };
          }
          return send(res, 200, {
            ok: true,
            service: "haagv",
            dataMode: config.dataMode,
            mail: mail.configured ? "configured" : "unconfigured",
          });
        }
        if (url.pathname === "/api/v1/local-session" && req.method === "POST") {
          await body(req, config.bodyLimit);
          const user = await auth.startLocal(req, res);
          const state = await store.read(),
            actor = actorFor(state, user);
          return send(res, 200, {
            ok: true,
            bootstrap: projectBootstrap(state, actor, config),
          });
        }
        if (
          url.pathname === "/api/v1/local-session" &&
          req.method === "DELETE"
        ) {
          if (!auth.localAllowed(req))
            fail(
              "LOCAL_SESSION_DISABLED",
              "De lokale ontwikkelsessie is hier niet beschikbaar.",
              403,
            );
          auth.endLocal(req, res);
          return send(res, 200, { ok: true });
        }
        if (url.pathname === "/api/v1/bootstrap" && req.method === "GET")
          return send(res, 200, (await bootstrap(req)).body);
        const { actor } = await bootstrap(req);
        if (url.pathname === "/api/v1/commands" && req.method === "POST") {
          if (!actor.user) fail("UNAUTHENTICATED", "Log eerst in.", 401);
          const command = await body(req, config.bodyLimit),
            before = await store.read(),
            response = await store.commit(command, actor),
            after = await store.read();
          const created = (after.mailOutbox || []).filter(
            (r) => !(before.mailOutbox || []).some((b) => b.id === r.id),
          );
          let notification = { accepted: 0, pending: created.length };
          if (created.length)
            try {
              notification = await processOutbox(created.map((r) => r.id));
            } catch {
              logger.error?.("Uitgaande meldingen wachten op verwerking");
            }
          const latest = await bootstrap(req);
          return send(res, 200, {
            ...response,
            notifications: notification,
            bootstrap: latest.body,
          });
        }
        if (
          url.pathname === "/api/v1/admin/memberships" &&
          req.method === "GET"
        ) {
          requireLeader(actor);
          return send(res, 200, {
            ok: true,
            items: (await store.read()).memberships,
          });
        }
        if (url.pathname === "/api/v1/admin/mail-settings") {
          requireLeader(actor);
          if (req.method === "GET")
            return send(res, 200, {
              ok: true,
              settings: await mailService.getSettings(),
            });
          if (req.method === "PUT")
            return send(res, 200, {
              ok: true,
              settings: await mailService.updateSettings(
                await body(req, config.bodyLimit),
              ),
            });
        }
        if (url.pathname === "/api/v1/admin/mail-templates" && req.method === "GET") {
          requireLeader(actor);
          return send(res, 200, { ok: true, items: await mailService.getTemplates() });
        }
        if (url.pathname === "/api/v1/admin/mail-templates/audit" && req.method === "GET") {
          requireLeader(actor);
          return send(res, 200, { ok: true, items: await mailService.getTemplateAudit() });
        }
        const templateRoute = /^\/api\/v1\/admin\/mail-templates\/([a-z.]+)(?:\/(reset|render|test|export))?$/.exec(url.pathname);
        if (templateRoute) {
          requireLeader(actor);
          const [, id, action] = templateRoute;
          if (!action && req.method === "GET")
            return send(res, 200, { ok: true, item: await mailService.getTemplate(id) });
          if (!action && req.method === "PUT")
            return send(res, 200, { ok: true, item: await mailService.updateTemplate(id, await body(req, config.bodyLimit), { user: actor.user }) });
          if (action === "reset" && req.method === "POST")
            return send(res, 200, { ok: true, item: await mailService.resetTemplate(id, await body(req, config.bodyLimit), { user: actor.user }) });
          if (action === "render" && req.method === "POST")
            return send(res, 200, { ok: true, preview: await mailService.renderTemplate(id, await body(req, config.bodyLimit)) });
          if (action === "export" && req.method === "GET")
            return send(res, 200, { ok: true, ...await mailService.exportTemplate(id) });
          if (action === "test" && req.method === "POST") {
            const input = await body(req, config.bodyLimit);
            if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some((key) => !["to", "requestId"].includes(key)))
              fail("VALIDATION", "Mailtest bevat onbekende velden.");
            return send(res, 200, { ok: true, ...await mailService.testTemplate(id, { ...input, user: actor.user }) });
          }
          fail("METHOD_NOT_ALLOWED", "Deze methode is niet beschikbaar voor de e-mailtemplate.", 405);
        }
        if (
          url.pathname === "/api/v1/admin/mail-test" &&
          req.method === "POST"
        ) {
          requireLeader(actor);
          const input = await body(req, config.bodyLimit);
          if (
            !input ||
            Object.keys(input).some((k) => !["to", "requestId"].includes(k))
          )
            fail("VALIDATION", "Mailtest bevat onbekende velden.");
          const result = await mailService.sendTest({
            to: input.to,
            user: actor.user,
            requestId: input.requestId,
          });
          return send(res, 200, { ok: true, ...result });
        }
        if (
          url.pathname === "/api/v1/admin/mail-outbox/process" &&
          req.method === "POST"
        ) {
          requireLeader(actor);
          await body(req, config.bodyLimit);
          const result = await processOutbox();
          return send(res, 200, { ok: true, ...result });
        }
        if (
          url.pathname === "/api/v1/admin/mail-outbox" &&
          req.method === "GET"
        ) {
          requireLeader(actor);
          return send(res, 200, {
            ok: true,
            items: (await store.read()).mailOutbox || [],
          });
        }
        return send(res, 404, {
          ok: false,
          error: { code: "NOT_FOUND", message: "Dit API-pad bestaat niet." },
        });
      }
      if (!["GET", "HEAD"].includes(req.method))
        fail("METHOD_NOT_ALLOWED", "Gebruik GET of HEAD.", 405);
      let pathname;
      try {
        pathname = decodeURIComponent(url.pathname);
      } catch {
        fail("INVALID_PATH", "Dit pad is ongeldig.", 400);
      }
      if (
        pathname.includes("\0") ||
        pathname.split("/").some((part) => part.startsWith("."))
      )
        fail("NOT_FOUND", "Dit bestand is niet beschikbaar.", 404);
      const target = resolve(
        distRoot,
        "." + (pathname === "/" ? "/index.html" : pathname),
      );
      const rel = relative(distRoot, target);
      if (rel.startsWith("..") || isAbsolute(rel))
        fail("NOT_FOUND", "Dit bestand is niet beschikbaar.", 404);
      let real;
      try {
        real = await realpath(target);
        const realRel = relative(await realpath(distRoot), real);
        if (realRel.startsWith("..") || isAbsolute(realRel))
          fail("NOT_FOUND", "Dit bestand is niet beschikbaar.", 404);
        if (!(await stat(real)).isFile())
          fail("NOT_FOUND", "Dit bestand is niet beschikbaar.", 404);
      } catch (error) {
        if (error instanceof PlatformError) throw error;
        fail("NOT_FOUND", "Dit bestand is niet gevonden.", 404);
      }
      const contentType = mime[extname(real)];
      if (!contentType)
        fail("NOT_FOUND", "Dit bestandstype is niet beschikbaar.", 404);
      const content = await readFile(real);
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Length", content.length);
      res.setHeader("Cache-Control", "no-cache");
      res.statusCode = 200;
      return res.end(req.method === "HEAD" ? undefined : content);
    } catch (error) {
      const status =
        error.statusCode || error.httpStatus || error.status || 500;
      if (status >= 500)
        logger.error?.("Platform request failed", {
          code: error.code || "INTERNAL_ERROR",
          status,
        });
      if (!res.headersSent)
        return send(res, status, {
          ok: false,
          error: {
            code: error.code || "INTERNAL_ERROR",
            message:
              status === 500
                ? "De handeling kon niet worden verwerkt."
                : error.message,
            ...(error.details ? { details: error.details } : {}),
          },
        });
      res.destroy();
    }
  };
  Object.assign(application, {
    config,
    store,
    auth,
    mailService,
    processOutbox,
  });
  return application;
}
export async function createServer(options = {}) {
  const application = await createApplication(options);
  const server = httpServer(application);
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.application = application;
  return server;
}
export async function start(options = {}) {
  const config = options.config || readConfig();
  let mailService = options.mailService;
  if (!mailService) {
    const { createMailService } = await import("./mail.mjs");
    mailService = createMailService({
      file:
        process.env.HAAGV_MAIL_SETTINGS_FILE ||
        resolve(config.root, ".local/mail-settings.json"),
      encryptionKey: process.env.HAAGV_MAIL_ENCRYPTION_KEY,
      appOrigin: config.origin,
      enabled: config.dataMode === "supabase",
    });
  }
  const server = await createServer({ ...options, config, mailService });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, config.hostname, resolve);
  });
  console.log("Haaglanden Voetbal beschikbaar op " + config.origin);
  return server;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  await start();
