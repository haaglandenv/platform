// Mail templates are server-owned documents. Only the declared data slots can
// be substituted; templates are never executed as JavaScript or Go templates.
export class MailTemplateError extends Error {
  constructor(code, message, status = 422) {
    super(message);
    this.name = "MailTemplateError";
    Object.assign(this, { code, status, statusCode: status, httpStatus: status });
  }
}
const invalid = (message) => {
  throw new MailTemplateError("MAIL_TEMPLATE_INVALID", message);
};
const slot = (key, label, example, type = "text") => ({ key, label, example, type });
const common = [
  slot("platform_name", "Platformnaam", "Haaglanden Voetbal"),
  slot("app_url", "Platformadres", "https://example.invalid", "url"),
];
const html = (title, content) => `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;background-color:#eef2ec;color:#173a2b;font-family:Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:24px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background-color:#ffffff"><tr><td style="padding:24px;border-top:6px solid #bad532">
<p style="font-size:14px;font-weight:bold">{{ platform_name }}</p><h1 style="font-size:24px">${title}</h1>
${content}
<p style="font-size:12px;color:#53665a">Dit is een automatisch bericht van {{ platform_name }}.</p>
</td></tr></table></td></tr></table></body></html>`;
const notification = (id, name, subject, text, content, fields) => ({
  id, type: "resend-api", name,
  description: "Platformmelding via de beheerde Resend API-configuratie.",
  subject, text, html: html(name, content), shortcodes: [...common, ...fields],
});
export const MAIL_TEMPLATE_CATALOG = [
  ...["otp", "confirmation"].map((kind) => ({
    id: "auth." + kind,
    type: "supabase-auth",
    name: kind === "otp" ? "Inlogcode" : "Accountbevestiging",
    description: "Supabase Auth verstuurt deze zescijferige code via SMTP. Opslaan wijzigt alleen de platformcatalogus; export moet afzonderlijk bij de provider worden gepubliceerd.",
    subject: kind === "otp" ? "Je inlogcode voor {{ platform_name }}" : "Bevestig je account bij {{ platform_name }}",
    text: "Je zescijferige code voor {{ platform_name }} is: {{ .Token }}\n\nVul deze code in het inlogscherm in. Deel de code met niemand. Heb je deze niet aangevraagd? Negeer dit bericht.",
    html: html(kind === "otp" ? "Je inlogcode" : "Bevestig je account", '<p>Vul deze zescijferige code in het inlogscherm in:</p><p style="font-size:32px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p><p>Deel de code met niemand. Heb je deze niet aangevraagd? Negeer dit bericht.</p>'),
    shortcodes: [common[0], slot(".Token", "Zescijferige Supabase-code", "123456", "otp"), slot(".SiteURL", "Supabase Site URL", "https://example.invalid", "url"), slot(".Email", "E-mailadres van het account", "speler@example.invalid")],
    providerFields: kind === "otp"
      ? { subject: "mailer_subjects_magic_link", content: "mailer_templates_magic_link_content" }
      : { subject: "mailer_subjects_confirmation", content: "mailer_templates_confirmation_content" },
  })),
  notification("system.test", "Testmail", "{{ platform_name }} · Testmail",
    "Dit is de aangevraagde testmail van {{ platform_name }}. De OTP-inlogcodes worden afzonderlijk door Supabase Auth via SMTP verzonden.\n\nOpen het platform: {{ app_url }}",
    '<p>Dit is de aangevraagde testmail. De OTP-inlogcodes worden afzonderlijk door Supabase Auth via SMTP verzonden.</p><p><a href="{{ app_url }}">Open het platform</a></p>', []),
  notification("notification.message", "Nieuw bericht", "{{ message_subject }}",
    "{{ message_subject }}\n\n{{ message_body }}\n\nOpen je werkruimte: {{ app_url }}",
    '<h2>{{ message_subject }}</h2><p style="white-space:pre-wrap">{{ message_body }}</p><p><a href="{{ app_url }}">Open je werkruimte</a></p>',
    [slot("message_subject", "Berichtonderwerp", "Bericht van de organisatie"), slot("message_body", "Berichttekst", "Er staat een nieuw bericht voor je klaar.")]),
  notification("notification.assignment", "Scheidsrechtersaanstelling", "Nieuwe aanstelling: {{ match_label }}",
    "Je hebt een aanstelling voor {{ match_label }}. Open je werkruimte om deze te bekijken en te accepteren: {{ app_url }}",
    '<p>Je hebt een aanstelling voor <strong>{{ match_label }}</strong>.</p><p><a href="{{ app_url }}">Bekijk en accepteer de aanstelling</a></p>',
    [slot("match_label", "Wedstrijd", "Voorbeeldteam · wedstrijd")]),
  notification("notification.registration", "Beoordeling teaminschrijving", "Teaminschrijving {{ team_name }}: {{ review_status }}",
    "De inschrijving van {{ team_name }} is beoordeeld: {{ review_status }}.\n\n{{ review_reason }}\n\nBekijk de volledige beoordeling: {{ app_url }}",
    '<p>De inschrijving van <strong>{{ team_name }}</strong> is beoordeeld: {{ review_status }}.</p><p style="white-space:pre-wrap">{{ review_reason }}</p><p><a href="{{ app_url }}">Bekijk de beoordeling</a></p>',
    [slot("team_name", "Team", "Voorbeeldteam"), slot("review_status", "Beoordeling", "Goedgekeurd"), slot("review_reason", "Motivering", "De inschrijving is gecontroleerd.")]),
  notification("notification.match", "Wedstrijdplanning bijgewerkt", "Wedstrijdplanning: {{ match_label }}",
    "De planning van {{ match_label }} is bijgewerkt.\nDatum: {{ match_date }}\nTijd: {{ match_time }}\nLocatie: {{ venue }}\n\nBekijk de actuele gegevens: {{ app_url }}",
    '<p>De planning van <strong>{{ match_label }}</strong> is bijgewerkt.</p><p>{{ match_date }} · {{ match_time }}<br>{{ venue }}</p><p><a href="{{ app_url }}">Bekijk de actuele wedstrijdgegevens</a></p>',
    [slot("match_label", "Wedstrijd", "Voorbeeldteam · wedstrijd"), slot("match_date", "Wedstrijddatum", "Nog te bepalen"), slot("match_time", "Aftraptijd", "Nog te bepalen"), slot("venue", "Locatie", "Nog te bepalen")]),
  notification("notification.objection", "Besluit op bezwaar", "Besluit op bezwaar: {{ match_label }}",
    "Er is een besluit genomen over je bezwaar bij {{ match_label }}: {{ decision }}.\n\nMotivering: {{ reason }}\n\nBekijk het volledige besluit en de uitslag: {{ app_url }}",
    '<p>Er is een besluit genomen over je bezwaar bij <strong>{{ match_label }}</strong>: {{ decision }}.</p><p style="white-space:pre-wrap">{{ reason }}</p><p><a href="{{ app_url }}">Bekijk het volledige besluit en de uitslag</a></p>',
    [slot("match_label", "Wedstrijd", "Voorbeeldteam · wedstrijd"), slot("decision", "Besluit", "Afgewezen"), slot("reason", "Motivering", "De organisatie heeft het bezwaar beoordeeld.")]),
];
const byId = new Map(MAIL_TEMPLATE_CATALOG.map((entry) => [entry.id, entry]));
export const NOTIFICATION_TEMPLATE_IDS = Object.freeze({
  "message.send": "notification.message", "assignment.set": "notification.assignment",
  "registration.review": "notification.registration", "match.upsert": "notification.match",
  "objection.decide": "notification.objection",
});
export function templateDefinition(id) {
  const entry = byId.get(id);
  if (!entry) throw new MailTemplateError("MAIL_TEMPLATE_NOT_FOUND", "Deze e-mailtemplate bestaat niet.", 404);
  return structuredClone(entry);
}
const placeholder = /{{\s*([A-Za-z_][A-Za-z0-9_]*|\.[A-Za-z][A-Za-z0-9]*)\s*}}/g;
function tokens(value) {
  const result = [...value.matchAll(placeholder)].map((match) => match[1]);
  if (/{{|}}/.test(value.replace(placeholder, ""))) invalid("Gebruik alleen geldige shortcodes uit de lijst.");
  return result;
}
const escapeHtml = (value) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function safeUrl(value) {
  if (/[\u0000-\u0020\u007f<>"'\\]/.test(value)) return false;
  try {
    const url = new URL(value);
    return !url.username && !url.password && (url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)));
  } catch { return false; }
}
const tags = new Set("html head meta title body table thead tbody tfoot tr td th div span p br strong b em i u h1 h2 h3 h4 ul ol li a hr img".split(" "));
const voidTags = new Set(["meta", "br", "hr", "img"]);
const attributes = new Set("style role align valign dir lang width height cellpadding cellspacing border colspan rowspan alt title".split(" "));
const cssProperties = new Set("color background-color font-family font-size font-weight font-style line-height letter-spacing text-align text-decoration white-space margin margin-top margin-bottom margin-left margin-right padding padding-top padding-bottom padding-left padding-right border border-top border-bottom border-left border-right border-collapse border-radius width max-width height vertical-align".split(" "));
function validateStyle(value) {
  if (/[{}<>\\@]|\/\*|url\s*\(|expression\s*\(/i.test(value)) invalid("De HTML bevat niet-toegestane opmaak.");
  for (const declaration of value.split(";").filter((s) => s.trim())) {
    const match = /^\s*([a-z-]+)\s*:\s*([a-zA-Z0-9#.,%()\s+'"-]+)\s*$/.exec(declaration);
    if (!match || !cssProperties.has(match[1]) || /[()]/.test(match[2]) && !/^rgba?\([0-9.,%\s]+\)$/.test(match[2].trim())) invalid("Gebruik alleen ondersteunde eenvoudige inline-opmaak.");
  }
}
// Deliberately small HTML grammar: quoted attributes, balanced known elements,
// no executable elements, event handlers, arbitrary CSS, or dynamic attributes.
function validateHtml(value, definition) {
  const stack = [], allowedSlots = new Map(definition.shortcodes.map((s) => [s.key, s]));
  let cursor = 0;
  while (cursor < value.length) {
    const start = value.indexOf("<", cursor);
    if (start < 0) break;
    const end = value.indexOf(">", start);
    if (end < 0) invalid("De HTML bevat een onafgesloten tag.");
    const raw = value.slice(start, end + 1);
    cursor = end + 1;
    if (/^<!doctype html>$/i.test(raw)) {
      if (start !== 0) invalid("De HTML-doctype moet vooraan staan.");
      continue;
    }
    const closing = /^<\/([a-z][a-z0-9]*)\s*>$/i.exec(raw);
    if (closing) {
      if (stack.pop() !== closing[1].toLowerCase()) invalid("Sluit HTML-tags in de juiste volgorde.");
      continue;
    }
    const opening = /^<([a-z][a-z0-9]*)([\s\S]*?)\s*(\/?)>$/i.exec(raw);
    if (!opening || !tags.has(opening[1].toLowerCase())) invalid("De HTML bevat een niet-toegestane tag.");
    const tag = opening[1].toLowerCase(), tail = opening[2];
    let rest = tail, seen = new Set();
    while (rest.trim()) {
      const attr = /^\s+([a-z][a-z0-9-]*)\s*=\s*(?:"([^"<>]*)"|'([^'<>]*)')/i.exec(rest);
      if (!attr) invalid("HTML-attributen moeten bekende namen en aanhalingstekens gebruiken.");
      const name = attr[1].toLowerCase(), val = attr[2] ?? attr[3];
      rest = rest.slice(attr[0].length);
      if (seen.has(name)) invalid("Een HTML-attribuut mag niet dubbel voorkomen.");
      seen.add(name);
      if (name === "href" && tag === "a" || name === "src" && tag === "img") {
        const keys = tokens(val);
        if (keys.length) {
          const fullSlot = /^{{\s*([A-Za-z_][A-Za-z0-9_]*|\.[A-Za-z][A-Za-z0-9]*)\s*}}$/.exec(val);
          if (keys.length !== 1 || !fullSlot || allowedSlots.get(fullSlot[1])?.type !== "url") invalid("Gebruik in links alleen een volledige adres-shortcode.");
        } else if (!safeUrl(val.replaceAll("&amp;", "&"))) invalid("Gebruik een veilig volledig HTTPS-adres in links en afbeeldingen.");
      } else {
        if (!attributes.has(name) && !(tag === "meta" && name === "charset")) invalid("Dit HTML-attribuut is niet toegestaan.");
        if (tokens(val).length) invalid("Shortcodes mogen niet in opmaak of overige attributen staan.");
        if (name === "style") validateStyle(val);
        if (name === "charset" && val.toLowerCase() !== "utf-8") invalid("Gebruik UTF-8 voor e-mail.");
      }
    }
    if (!voidTags.has(tag)) {
      if (opening[3]) invalid("Sluit deze HTML-tag met een aparte eindtag.");
      stack.push(tag);
    }
  }
  if (stack.length) invalid("De HTML bevat niet-afgesloten tags.");
}
export function validateTemplate(id, input) {
  const definition = templateDefinition(id);
  if (!input || typeof input !== "object" || Array.isArray(input)) invalid("Gebruik een geldige e-mailtemplate.");
  const allowed = new Set(definition.shortcodes.map((s) => s.key));
  const result = {};
  for (const [field, max] of [["subject", 200], ["text", 20000], ["html", 60000]]) {
    const value = input[field];
    if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) || field === "subject" && /[\r\n\t]/.test(value)) invalid("Vul onderwerp, tekst en HTML binnen de toegestane lengte in.");
    if (tokens(value).some((key) => !allowed.has(key))) invalid("Deze template bevat een onbekende shortcode.");
    result[field] = value;
  }
  validateHtml(result.html, definition);
  if (definition.type === "supabase-auth" && (!tokens(result.text).includes(".Token") || !tokens(result.html).includes(".Token"))) invalid("Een inlogmail moet in tekst én HTML de zescijferige shortcode {{ .Token }} bevatten.");
  return result;
}
export function templateItem(id, stored = {}) {
  const definition = templateDefinition(id), override = stored[id];
  return {
    ...definition, ...validateTemplate(id, override || definition), editable: true,
    revision: override?.revision || 0, updatedAt: override?.updatedAt || null,
    status: override?.status || "default",
    providerStatus: definition.type === "supabase-auth" ? "not-published" : "platform-ready",
  };
}
export function renderTemplate(id, source, supplied = {}, { appOrigin = "https://example.invalid", preserveProvider = false } = {}) {
  const definition = templateDefinition(id), template = validateTemplate(id, source);
  if (!supplied || typeof supplied !== "object" || Array.isArray(supplied)) invalid("Gebruik geldige voorbeeldwaarden.");
  const specs = new Map(definition.shortcodes.map((s) => [s.key, s]));
  if (Object.keys(supplied).some((key) => !specs.has(key))) invalid("De voorbeeldwaarden bevatten een onbekende shortcode.");
  const values = Object.fromEntries(definition.shortcodes.map((s) => [s.key, s.example]));
  if (specs.has("app_url")) values.app_url = appOrigin;
  if (specs.has(".SiteURL")) values[".SiteURL"] = appOrigin;
  Object.assign(values, supplied);
  for (const [key, value] of Object.entries(values)) {
    const spec = specs.get(key);
    if (typeof value !== "string" || value.length > 10000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) invalid("Een shortcodewaarde is ongeldig of te lang.");
    if (spec.type === "url" && !safeUrl(value)) invalid("De adres-shortcode bevat geen veilig platformadres.");
    if (spec.type === "otp" && !/^\d{6}$/.test(value)) invalid("Een voorbeeldcode bestaat uit precies zes cijfers.");
  }
  const replace = (field) => template[field].replace(placeholder, (_, key) => preserveProvider && key.startsWith(".") ? "{{ " + key + " }}" : field === "html" ? escapeHtml(values[key]) : values[key]);
  const result = { subject: replace("subject"), text: replace("text"), html: replace("html") };
  if (result.subject.length > 200 || /[\r\n]/.test(result.subject)) invalid("Het gerenderde onderwerp is ongeldig.");
  if (result.text.length > 20000 || result.html.length > 80000) invalid("De gerenderde e-mail is te lang.");
  return result;
}
export function exportAuthTemplate(id, source, options) {
  const definition = templateDefinition(id);
  if (definition.type !== "supabase-auth") throw new MailTemplateError("MAIL_TEMPLATE_PROVIDER", "Alleen inlogtemplates hebben een Supabase-export.");
  const rendered = renderTemplate(id, source, {}, { ...options, preserveProvider: true });
  return { provider: "supabase", status: "not-published", template: { subject: rendered.subject, content: rendered.html, text: rendered.text, fieldNames: definition.providerFields }, config: { mailer_otp_length: 6, [definition.providerFields.subject]: rendered.subject, [definition.providerFields.content]: rendered.html } };
}
