import { createClient } from "@supabase/supabase-js";
import { routes } from "./routes.js";

const app = document.querySelector("[data-app]");
const dialog = document.querySelector("[data-editor]");
const editor = document.querySelector("[data-editor-form]");
const collections = [
  "editions",
  "clubs",
  "teams",
  "players",
  "officials",
  "cups",
  "matches",
  "news",
  "kits",
  "media",
  "registrations",
  "rosters",
  "lineups",
  "events",
  "objections",
  "volunteers",
  "shifts",
  "messages",
  "favorites",
];
const state = {
  snapshot: null,
  adminMemberships: [],
  token: null,
  auth: null,
  authUserId: null,
  contextEpoch: 0,
  route: "home",
  detail: "",
  filter: "",
  cup: "",
  view: "list",
  date: new Date().toISOString().slice(0, 10),
  editor: null,
  email: "",
  otpSent: false,
  resendAt: 0,
  authBusy: false,
  initialized: false,
};
const labels = {
  leadership: "Toernooileiding",
  club: "Clubleiding",
  team: "Teamleiding",
  official: "Scheidsrechter",
  player: "Speler",
  supporter: "Supporter",
  editor: "Redactie",
  photographer: "Fotograaf",
  press: "Pers",
  volunteer: "Vrijwilliger",
  draft: "Concept",
  preparation: "Voorbereiding",
  active: "Actief",
  closed: "Afgesloten",
  pending: "Te beoordelen",
  submitted: "Ingediend",
  approved: "Goedgekeurd",
  returned: "Aanvulling nodig",
  rejected: "Afgewezen",
  excluded: "Uitgesloten",
  published: "Gepubliceerd",
  scheduled: "Gepland",
  live: "Bezig",
  finished: "Afgelopen",
  bye: "Vrijloting",
  confirmed: "Bevestigd",
  accepted: "Bevestigd",
  open: "Open",
  corrected: "Gecorrigeerd",
};
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const data = (type) => state.snapshot?.data?.[type] || [];
const byId = (type, id) => data(type).find((row) => row.id === id);
const label = (type, id) => {
  const row = byId(type, id);
  return row?.name || row?.title || row?.email || id || "Nog te bepalen";
};
const scopedTeams = () => {
  const member = state.snapshot?.activeMembership;
  if (!member || member.role === "leadership") return data("teams");
  if (member.teamId) return data("teams").filter((t) => t.id === member.teamId);
  if (member.clubId)
    return data("teams").filter((t) => t.clubId === member.clubId);
  return data("teams");
};
const canEdit = (type, row) => {
  if (!can(type + ".upsert")) return false;
  const m = state.snapshot.activeMembership;
  if (m?.role === "leadership") return true;
  if (type === "club") return row.id === m?.clubId;
  if (type === "team") return row.clubId === m?.clubId;
  if (type === "player") return scopedTeams().some((t) => t.id === row.teamId);
  return true;
};
const can = (type) =>
  !!state.snapshot?.user && (state.snapshot.capabilities || []).includes(type);
const status = (value) =>
  `<span class="status status-${esc(value)}">${esc(labels[value] || value || "Concept")}</span>`;
const button = (text, action, attrs = "") =>
  `<button type="button" class="hv-button hv-button-outline" data-action="${esc(action)}" ${attrs}>${esc(text)}</button>`;
const empty = (title, text, action = "") =>
  `<div class="empty-state"><h3>${esc(title)}</h3><p>${esc(text)}</p>${action}</div>`;
const heading = (title, description = "", actions = "") =>
  `<header class="section-heading"><div><h2>${esc(title)}</h2>${description ? `<p>${esc(description)}</p>` : ""}</div>${actions ? `<div class="section-actions">${actions}</div>` : ""}</header>`;
const panel = (html) => `<section class="hv-panel">${html}</section>`;
const entityButton = (type, text) =>
  can(type + ".upsert") ? button(text, "edit", `data-entity="${type}"`) : "";
const formatDate = (date) =>
  date
    ? new Intl.DateTimeFormat("nl-NL", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/Amsterdam",
      }).format(new Date(date.length === 10 ? date + "T12:00:00Z" : date))
    : "Datum volgt";
const matchName = (match) =>
  `${label("teams", match.homeTeamId)} – ${match.awayTeamId ? label("teams", match.awayTeamId) : match.status === "bye" ? "Vrijloting" : "Deelnemer volgt"}`;
const options = (type, value, blank = "Kies…", filter = () => true) =>
  `<option value="">${esc(blank)}</option>` +
  data(type)
    .filter(filter)
    .map(
      (row) =>
        `<option value="${esc(row.id)}"${String(value) === String(row.id) ? " selected" : ""}>${esc(row.name || row.title || row.email || (type === "matches" ? matchName(row) : row.id))}</option>`,
    )
    .join("");
function toast(message) {
  const el = document.querySelector("[data-toast]");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (el.hidden = true), 5500);
}
function errorMessage(error) {
  if (error?.code === "SESSION_CHANGED")
    return "Je werkcontext is gewijzigd. Controleer je actuele account voordat je verdergaat.";
  if (error?.code === "VERSION_CONFLICT")
    return "De gegevens zijn intussen gewijzigd. De nieuwste versie is opgehaald. Controleer je invoer en probeer opnieuw.";
  return (
    error?.message ||
    "De verbinding is onderbroken. Je wijziging is niet opgeslagen. Probeer opnieuw."
  );
}
async function request(path, { method = "GET", body, signal } = {}) {
  const epoch = state.contextEpoch,
    headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (state.token) headers.Authorization = "Bearer " + state.token;
  const membership = sessionStorage.getItem("haagv.membership");
  if (membership) headers["X-Haagv-Membership"] = membership;
  let response;
  try {
    response = await fetch("/api/v1/" + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
      signal,
      cache: "no-store",
    });
  } catch {
    throw {
      code: "NETWORK",
      message:
        "Geen verbinding met het platform. Je wijziging is niet opgeslagen. Je invoer blijft staan.",
    };
  }
  let value;
  try {
    value = await response.json();
  } catch {
    throw {
      code: "API_UNAVAILABLE",
      message:
        "De platform-API is niet bereikbaar. Start de applicatieserver en controleer de verbinding.",
    };
  }
  if (epoch !== state.contextEpoch) throw { code: "SESSION_CHANGED" };
  if (!response.ok || value.ok === false) {
    const error = value.error || {
      code: "API_ERROR",
      message: "De aanvraag kon niet worden verwerkt.",
    };
    if (
      (response.status === 401 ||
        ["INVALID_TOKEN", "UNAUTHENTICATED", "ANONYMOUS_ACCOUNT"].includes(
          error.code,
        )) &&
      (state.token || state.snapshot?.user)
    ) {
      state.token = null;
      state.authUserId = null;
      sessionStorage.removeItem("haagv.membership");
      clearPrivateContext();
      queueMicrotask(async () => {
        try {
          await state.auth?.auth.signOut({ scope: "local" });
        } catch {}
        try {
          await refresh();
        } catch {}
      });
    }
    throw error;
  }
  return value;
}
function clearPrivateContext() {
  state.contextEpoch++;
  state.adminMemberships = [];
  state.email = "";
  state.otpSent = false;
  state.filter = "";
  state.cup = "";
  state.editor = null;
  if (dialog.open) dialog.close();
  editor.replaceChildren();
  const previous = state.snapshot;
  state.snapshot = {
    apiVersion: "1",
    version: 0,
    mode: previous?.mode || "supabase",
    user: null,
    memberships: [],
    activeMembership: null,
    capabilities: [],
    data: Object.fromEntries(collections.map((name) => [name, []])),
    config: previous?.config || {
      auth: { supabaseUrl: "", publishableKey: "" },
      localSessionEnabled: false,
    },
  };
  const notice = document.querySelector("[data-toast]");
  notice.hidden = true;
  notice.textContent = "";
  clearTimeout(toast.timer);
  renderContext();
  if (state.initialized) render();
  document.querySelector("[data-connection]").textContent =
    "Werkcontext opnieuw verbinden…";
}
function acceptSnapshot(snapshot) {
  if (!snapshot?.data) return;
  if (state.snapshot?.user && state.snapshot.user.id !== snapshot.user?.id) {
    clearPrivateContext();
  }
  state.snapshot = snapshot;
  for (const name of collections)
    if (!Array.isArray(snapshot.data[name])) snapshot.data[name] = [];
  renderContext();
  document.querySelector("[data-connection]").textContent =
    `${snapshot.mode === "local" ? "Lokale ontwikkelomgeving" : "Gedeeld platform"} · Gegevens bijgewerkt · versie ${snapshot.version ?? 0}`;
}
async function refresh({ renderPage = true } = {}) {
  let result;
  try {
    result = await request("bootstrap");
  } catch (error) {
    if (
      error.code !== "FORBIDDEN" ||
      !sessionStorage.getItem("haagv.membership")
    )
      throw error;
    sessionStorage.removeItem("haagv.membership");
    clearPrivateContext();
    result = await request("bootstrap");
  }
  acceptSnapshot(result.bootstrap || result);
  if (renderPage) render();
  return state.snapshot;
}
async function command(type, payload, requestId = crypto.randomUUID()) {
  try {
    const response = await request("commands", {
      method: "POST",
      body: {
        type,
        payload,
        requestId,
        expectedVersion: state.snapshot?.version,
      },
    });
    if (response.bootstrap) acceptSnapshot(response.bootstrap);
    else await refresh({ renderPage: false });
    return response;
  } catch (error) {
    if (error.code === "VERSION_CONFLICT")
      await refresh({ renderPage: false }).catch(() => {});
    throw error;
  }
}
async function initializeAuth() {
  const config = state.snapshot?.config?.auth;
  if (!config?.supabaseUrl || !config?.publishableKey) return;
  if (state.auth) return;
  state.auth = createClient(config.supabaseUrl, config.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  const { data: session } = await state.auth.auth.getSession();
  state.token = session.session?.access_token || null;
  state.authUserId = session.session?.user?.id || null;
  state.auth.auth.onAuthStateChange((event, session) => {
    const userId = session?.user?.id || null,
      changed = userId !== state.authUserId;
    state.token = session?.access_token || null;
    state.authUserId = userId;
    if (event === "SIGNED_OUT" || changed) {
      sessionStorage.removeItem("haagv.membership");
      clearPrivateContext();
    }
    if (state.initialized)
      queueMicrotask(() =>
        refresh().catch((error) => {
          if (error.code !== "SESSION_CHANGED") toast(errorMessage(error));
        }),
      );
  });
  if (state.token) await refresh({ renderPage: false });
}
function renderContext() {
  const root = document.querySelector("[data-context]"),
    snapshot = state.snapshot,
    user = snapshot?.user;
  document.querySelector("[data-account-link]").textContent = user
    ? "Mijn account"
    : "Inloggen";
  root.hidden = !user && !snapshot?.config?.localSessionEnabled;
  if (root.hidden) {
    root.replaceChildren();
    return;
  }
  const memberships = snapshot.memberships || [];
  root.innerHTML = `<div><span class="context-tag">${snapshot.mode === "local" ? "Lokale ontwikkeling" : "Haaglanden Voetbal"}</span>${user ? ` <strong>${esc(user.name || user.email)}</strong>` : ""}</div><div class="context-actions">${user && memberships.length > 1 ? `<label class="sr-only" for="active-membership">Jouw lidmaatschap</label><select id="active-membership" data-membership>${memberships.map((m) => `<option value="${esc(m.id)}"${(snapshot.activeMembership?.id || sessionStorage.getItem("haagv.membership")) === m.id ? " selected" : ""}>${esc(labels[m.role] || m.role)}${m.teamId ? " · " + esc(label("teams", m.teamId)) : m.clubId ? " · " + esc(label("clubs", m.clubId)) : ""}</option>`).join("")}</select>` : user ? `<span class="muted">${esc(labels[snapshot.activeMembership?.role] || "Account")}</span>` : ""}${user ? '<a class="hv-button hv-button-outline" href="#start">Mijn werkruimte</a>' : snapshot.config.localSessionEnabled ? button("Lokale werkruimte openen", "local-session") : ""}</div>`;
}
const workRoutes = [
  "start",
  "werkvoorraad",
  "seizoen",
  "planning",
  "toernooibeheer",
  "spelersbeheer",
  "club",
  "team",
  "official",
  "arbitrage",
  "dossiers",
  "berichten",
  "nieuwsbeheer",
  "vrijwilligers",
  "instellingen",
];
function workspaceBar() {
  const privateRoutes = workRoutes.filter(
    (id) =>
      id === "start" ||
      id === "berichten" ||
      (id === "instellingen" && can("settings.manage")) ||
      ({
        werkvoorraad: "registration.review",
        seizoen: "cup.upsert",
        planning: "match.upsert",
        toernooibeheer: "cup.upsert",
        spelersbeheer: "player.upsert",
        club: "team.upsert",
        team: "lineup.submit",
        official: "assignment.accept",
        arbitrage: "assignment.set",
        dossiers: "objection.submit",
        nieuwsbeheer: "news.upsert",
        vrijwilligers: "shift.signup",
      }[id] &&
        can(
          {
            werkvoorraad: "registration.review",
            seizoen: "cup.upsert",
            planning: "match.upsert",
            toernooibeheer: "cup.upsert",
            spelersbeheer: "player.upsert",
            club: "team.upsert",
            team: "lineup.submit",
            official: "assignment.accept",
            arbitrage: "assignment.set",
            dossiers: "objection.submit",
            nieuwsbeheer: "news.upsert",
            vrijwilligers: "shift.signup",
          }[id],
        )),
  );
  return `<div class="workspace-bar"><div class="workspace-menu"><label for="route-picker">Ontdek HV Control</label><select id="route-picker" data-route-picker>${[...routes, { id: "instellingen", title: "Instellingen" }].map((r) => `<option value="${r.id}"${state.route === r.id ? " selected" : ""}>${esc(r.title)}</option>`).join("")}</select></div>${state.snapshot?.user ? `<nav aria-label="Mijn werkruimte">${privateRoutes.map((id) => `<a href="#${id}"${state.route === id ? ' aria-current="page"' : ""}>${esc(routes.find((r) => r.id === id)?.title || "Instellingen")}</a>`).join("")}</nav>` : ""}</div>`;
}
function routeInfo() {
  let original;
  try {
    original = decodeURIComponent(location.hash.slice(1) || "home");
  } catch {
    original = location.hash.slice(1);
  }
  const raw = { app: "start", bezoekers: "supporters" }[original] || original;
  const exact =
    routes.find((r) => r.id === raw) ||
    (raw === "instellingen" && {
      id: "instellingen",
      title: "Instellingen",
      headline: "De basis op orde",
      description:
        "Beheer je platforminstellingen en de verzending van berichten.",
      asset: "club.webp",
    });
  if (exact) return { ...exact, detail: "" };
  const candidate = [...routes]
    .sort((a, b) => b.id.length - a.id.length)
    .find((r) => raw.startsWith(r.id + "-"));
  return candidate
    ? { ...candidate, detail: raw.slice(candidate.id.length + 1) }
    : {
        id: "onbekend",
        title: "Pagina niet gevonden",
        headline: "Even de juiste route vinden",
        description:
          "Deze pagina is niet gevonden. Zoek een club, team of wedstrijd om verder te gaan.",
        asset: "velden.webp",
        detail: raw,
      };
}
function hero(info) {
  let title = info.headline,
    description = info.description;
  const dynamic =
    info.id === "wedstrijd"
      ? byId("matches", info.detail)
      : info.id === "vereniging"
        ? byId("clubs", info.detail)
        : info.id === "elftal"
          ? byId("teams", info.detail)
          : info.id === "artikel"
            ? byId("news", info.detail)
            : info.id === "speler"
              ? byId("players", info.detail)
              : null;
  if (dynamic) {
    title =
      info.id === "wedstrijd"
        ? matchName(dynamic)
        : dynamic.name || dynamic.title;
    description =
      info.id === "wedstrijd"
        ? `${label("cups", dynamic.cupId)} · ${formatDate(dynamic.date)}${dynamic.time ? " · " + dynamic.time : ""}`
        : info.description;
  }
  if (info.id === "wedstrijd" && !dynamic) {
    title = "Iedere wedstrijd in beeld";
    description =
      "De stand, het wedstrijdverloop en de praktische afspraken bij jouw duel.";
  }
  if (info.id === "home") {
    title = "Jouw club. Jouw bekeravond";
    description =
      "De clubs, wedstrijden en verhalen van het Haaglanden Voetbaltoernooi. Samen op weg naar de beker.";
  }
  const season =
    data("editions").find((e) => e.status === "active") || data("editions")[0];
  return `<header class="hv-hero platform-hero${info.id === "home" ? " home-hero" : ""}"><div class="hv-hero__copy"><p class="hv-hero__eyebrow">${esc(season?.season || season?.name || "Haaglanden Voetbal")}</p><h1 tabindex="-1">${esc(title)}<span>.</span></h1><p>${esc(description.replace(/Demo|Prototype|Demostatistieken/g, "").replace(/Seizoen 2026\/27/g, "Het toernooi"))}</p>${info.id === "home" ? '<div class="hero-actions"><a class="hv-button hv-button-primary" href="#programma">Bekijk het programma</a><a class="hv-button hv-button-quiet" href="#toernooien">Ontdek de bekers</a></div>' : ""}</div><div class="hv-hero__picture" aria-hidden="true"><img src="assets/${esc(info.asset)}" alt="" width="900" height="600" ${info.id === "home" ? 'fetchpriority="high"' : 'loading="lazy"'}><div class="hv-hero__field-line"></div></div></header>`;
}
function loginGate(title = "Log in voor jouw werkruimte") {
  return panel(
    empty(
      title,
      "Gebruik de eenmalige code uit je e-mail. Je ziet daarna de gegevens en handelingen die bij jouw beheerde lidmaatschap horen.",
      '<a class="hv-button hv-button-dark" href="#account">Inloggen</a>',
    ),
  );
}
function accessGate(capability, title) {
  if (!state.snapshot.user) return loginGate();
  if (capability && !can(capability))
    return panel(
      empty(
        title || "Deze werkruimte is niet beschikbaar",
        "Je huidige lidmaatschap heeft geen toegang tot deze handeling. Kies eventueel een ander eigen lidmaatschap bovenaan de pagina.",
      ),
    );
  return null;
}
function recordRow(title, description, actions = "", badge = "") {
  return `<article class="record-row"><div class="record-copy"><strong>${esc(title)}</strong>${description ? `<p>${description}</p>` : ""}</div><div class="record-actions">${badge}${actions}</div></article>`;
}
function matchesList(list, { edit = false } = {}) {
  return list.length
    ? `<div class="record-list">${list.map((m) => recordRow(matchName(m), `${esc(label("cups", m.cupId))} · ${esc(formatDate(m.date))}${m.time ? " · " + esc(m.time) : ""}<br>${esc([m.venue, m.field].filter(Boolean).join(" · "))}`, `<a class="hv-button hv-button-outline" href="#wedstrijd-${esc(m.id)}">Bekijk wedstrijd</a>${edit && can("match.upsert") ? button("Bewerken", "edit", `data-entity="match" data-id="${esc(m.id)}"`) : ""}`, status(m.status))).join("")}</div>`
    : empty(
        "De aftrap komt nog",
        "Er staan nog geen wedstrijden in deze selectie. Zodra de planning is gepubliceerd, vind je die hier.",
      );
}
function homePage() {
  const matches = data("matches")
    .filter((m) => m.status !== "bye")
    .slice()
    .sort((a, b) =>
      ((a.date || "9999") + (a.time || "")).localeCompare(
        (b.date || "9999") + (b.time || ""),
      ),
    )
    .slice(0, 4);
  return `<div class="platform-grid">${panel(heading("De volgende bekeravond", "Bekijk de actuele wedstrijden.", '<a href="#programma" class="hv-button hv-button-outline">Het hele programma</a>') + matchesList(matches))}${panel(
    heading("Nieuws uit Haaglanden") +
      newsList(
        data("news")
          .filter((n) => n.status === "published")
          .slice(0, 2),
      ),
  )}</div><div class="platform-grid three">${[
    ["toernooien", "De route naar de beker", "finale.webp"],
    ["vereniging", "Onze verenigingen", "club.webp"],
    ["finaledag", "Samen naar Houtrust", "crowd.webp"],
  ]
    .map(
      ([id, title, img]) =>
        `<a class="platform-card" href="#${id}"><img src="assets/${img}" alt="" loading="lazy"><div class="platform-card-copy"><h2>${title}</h2><p>Ontdek de wedstrijden en verhalen van onze regio.</p></div></a>`,
    )
    .join("")}</div>`;
}
function matchFilters() {
  return `<div class="filterbar"><label>Toernooi<select data-filter-cup>${options("cups", state.cup, "Alle bekers")}</select></label><label>Zoek een team<input type="search" data-search value="${esc(state.filter)}" placeholder="Team of vereniging"></label><div class="view-tabs" role="group" aria-label="Kalenderweergave">${[
    ["list", "Lijst"],
    ["week", "Week"],
    ["month", "Maand"],
  ]
    .map(
      ([v, t]) =>
        `<button type="button" class="hv-button hv-button-outline" data-action="calendar-view" data-view="${v}" aria-pressed="${state.view === v}">${t}</button>`,
    )
    .join("")}</div></div>`;
}
function filteredMatches() {
  return data("matches")
    .filter(
      (m) =>
        m.status !== "bye" &&
        (!state.cup || m.cupId === state.cup) &&
        (!state.filter ||
          matchName(m)
            .toLocaleLowerCase("nl")
            .includes(state.filter.toLocaleLowerCase("nl"))),
    )
    .sort((a, b) =>
      ((a.date || "9999") + (a.time || "")).localeCompare(
        (b.date || "9999") + (b.time || ""),
      ),
    );
}
function calendarPage(edit = false, live = false) {
  let list = filteredMatches();
  if (live) list = list.filter((m) => m.status === "live");
  let body = matchesList(list, { edit });
  if (!live && state.view !== "list") {
    const month = state.date.slice(0, 7);
    const first = new Date(month + "-01T12:00:00Z"),
      days = new Date(
        first.getUTCFullYear(),
        first.getUTCMonth() + 1,
        0,
      ).getUTCDate();
    const range = state.view === "week" ? 7 : days;
    const start = state.view === "week" ? Number(state.date.slice(-2)) : 1;
    body = `<div class="filterbar"><label>${state.view === "week" ? "Vanaf datum" : "Maand"}<input type="${state.view === "week" ? "date" : "month"}" data-calendar-date value="${state.view === "week" ? esc(state.date) : month}"></label></div><div class="calendar-month">${Array.from(
      { length: range },
      (_, i) => {
        const d = new Date(first);
        d.setUTCDate(start + i);
        const day = d.toISOString().slice(0, 10),
          games = list.filter((m) => m.date === day);
        return `<div class="calendar-day${!games.length ? " is-empty" : ""}"><span>${esc(new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "short" }).format(d))}</span>${games.map((m) => `<a href="#wedstrijd-${esc(m.id)}"><strong>${esc(m.time || "Tijd volgt")}</strong> ${esc(matchName(m))}</a>`).join("")}</div>`;
      },
    ).join("")}</div>`;
  }
  return panel(
    heading(
      live
        ? "Nu op de velden"
        : edit
          ? "Iedere aftrap op zijn plek"
          : "De wedstrijdkalender",
      edit
        ? "Bewerk de planning; de server controleert conflicten en bevoegdheid."
        : "Wedstrijden en uitslagen uit de actuele toernooiadministratie.",
      edit ? entityButton("match", "Wedstrijd toevoegen") : "",
    ) +
      matchFilters() +
      body,
  );
}
function newsList(list) {
  return list.length
    ? `<div class="record-list">${list.map((n) => recordRow(n.title, `${esc(n.publishedAt ? formatDate(n.publishedAt) : "Nog niet gepubliceerd")} · ${esc(String(n.body || "").slice(0, 130))}`, `<a class="hv-button hv-button-outline" href="#artikel-${esc(n.id)}">Lees het verhaal</a>`)).join("")}</div>`
    : empty(
        "De verhalen volgen",
        "Er zijn nog geen gepubliceerde nieuwsberichten.",
      );
}
function teamsCards(list) {
  return list.length
    ? `<div class="record-list">${list.map((t) => recordRow(t.name, `${esc(label("clubs", t.clubId))} · ${esc(t.category || "Categorie volgt")}`, `<a class="hv-button hv-button-outline" href="#elftal-${esc(t.id)}">Bekijk team</a>${can("team.upsert") ? button("Bewerken", "edit", `data-entity="team" data-id="${esc(t.id)}"`) : ""}`)).join("")}</div>`
    : empty(
        "Nog geen teams",
        "Geregistreerde teams verschijnen hier zodra ze zijn toegevoegd.",
      );
}
function cupsPage() {
  return panel(
    heading(
      "Kies jouw beker",
      "Van de eerste ronde tot de finale.",
      entityButton("cup", "Beker toevoegen"),
    ) +
      (data("cups").length
        ? `<div class="platform-grid three">${data("cups")
            .map(
              (c) =>
                `<article class="platform-card"><div class="platform-card-copy"><p class="hv-eyebrow">${esc(c.category || "Toernooi")}</p><h2>${esc(c.name)}</h2>${status(c.status)}<p>${esc(label("editions", c.editionId))}</p><a class="hv-button hv-button-dark" href="#schema-${esc(c.id)}">Bekijk het bekerschema</a>${can("cup.upsert") ? button("Beker beheren", "edit", `data-entity="cup" data-id="${esc(c.id)}"`) : ""}</div></article>`,
            )
            .join("")}</div>`
        : empty(
            "De bekers worden voorbereid",
            "Zodra de organisatie een beker publiceert, vind je die hier.",
          )),
  );
}
function bracketPage(manage = false) {
  const cup =
    byId("cups", state.detail) || byId("cups", state.cup) || data("cups")[0];
  if (!cup)
    return panel(
      heading("De route naar de beker") +
        empty(
          "Nog geen bekerindeling",
          "Voeg een beker en goedgekeurde deelnemers toe om een loting voor te bereiden.",
          entityButton("cup", "Beker toevoegen"),
        ),
    );
  const list = data("matches").filter((m) => m.cupId === cup.id),
    rounds = [
      ...new Set(list.map((m) => m.roundKey || m.round || "Wedstrijden")),
    ];
  const action = can("bracket.draw")
    ? button(
        "Loting voorbereiden",
        "command",
        `data-command="bracket.draw" data-cup="${esc(cup.id)}"`,
      )
    : "";
  const publish = can("bracket.publish")
    ? button(
        "Indeling publiceren",
        "command",
        `data-command="bracket.publish" data-cup="${esc(cup.id)}"`,
      )
    : "";
  return panel(
    heading(
      cup.name,
      "Een vrijloting is een vrije plek; er wordt geen gespeelde uitslag voor ingevuld.",
      manage ? action + publish : "",
    ) +
      `<div class="filterbar"><label>Toernooi<select data-filter-cup>${options("cups", cup.id, "Kies een beker")}</select></label></div>` +
      (rounds.length
        ? `<div class="bracket-grid">${rounds
            .map(
              (round) =>
                `<section class="bracket-round"><h3>${esc(round)}</h3>${list
                  .filter(
                    (m) => (m.roundKey || m.round || "Wedstrijden") === round,
                  )
                  .map(
                    (m) =>
                      `<a class="bracket-match" href="#wedstrijd-${esc(m.id)}"><p><strong>${esc(label("teams", m.homeTeamId))}</strong></p><p>${esc(m.awayTeamId ? label("teams", m.awayTeamId) : "Vrijloting")}</p>${status(m.status)}<p class="muted">${esc(formatDate(m.date))}</p></a>`,
                  )
                  .join("")}</section>`,
            )
            .join("")}</div>`
        : empty(
            "De indeling volgt",
            "Er zijn nog geen gepubliceerde wedstrijden voor deze beker.",
          )),
  );
}
function schemaField(name, labelText, type = "text", extra = {}) {
  return { name, label: labelText, type, ...extra };
}
const selectField = (name, text, source, extra = {}) =>
  schemaField(name, text, "select", { source, ...extra });
const types = {
  official: {
    collection: "officials",
    label: "Scheidsrechter",
    fields: [
      schemaField("name", "Naam", "text", { required: true }),
      schemaField("level", "Niveau"),
      schemaField("userId", "Gekoppeld gebruikers-ID"),
    ],
  },
  edition: {
    collection: "editions",
    label: "Editie",
    fields: [
      schemaField("name", "Naam", "text", { required: true }),
      schemaField("season", "Seizoen", "text", { placeholder: "2026/27" }),
      selectField("status", "Status", [
        ["preparation", "Voorbereiding"],
        ["active", "Actief"],
        ["closed", "Afgesloten"],
      ]),
      schemaField("finalDate", "Finaledatum", "date"),
      schemaField("venue", "Finalelocatie"),
    ],
  },
  club: {
    collection: "clubs",
    label: "Vereniging",
    fields: [
      schemaField("name", "Verenigingsnaam", "text", { required: true }),
      schemaField("city", "Vestigingsplaats"),
      schemaField("venue", "Sportpark / thuislocatie"),
      schemaField("contactName", "Besloten contactpersoon"),
      schemaField("contactEmail", "E-mailadres clubcontact", "email"),
      schemaField("contactPhone", "Telefoonnummer clubcontact", "tel"),
    ],
  },
  team: {
    collection: "teams",
    label: "Team",
    fields: [
      schemaField("name", "Teamnaam", "text", { required: true }),
      selectField("clubId", "Vereniging", "clubs", { required: true }),
      schemaField("category", "Categorie", "text", {
        required: true,
        placeholder: "Bijvoorbeeld JO19 of Senioren",
      }),
    ],
  },
  player: {
    collection: "players",
    label: "Speler",
    fields: [
      schemaField("name", "Naam", "text", { required: true }),
      selectField("teamId", "Team", "teams", { required: true }),
      schemaField("birthDate", "Geboortedatum", "date", { required: true }),
      schemaField("relationCode", "KNVB-relatiecode", "text", {
        required: true,
      }),
      schemaField("number", "Rugnummer", "number", { min: 1, max: 99 }),
      schemaField("identityPhoto", "Besloten controlefoto", "file", {
        help: "JPG, PNG of WebP, maximaal 200 kB. Alleen zichtbaar binnen de toegestane wedstrijdcontrole.",
      }),
      schemaField("publicName", "Naam openbaar vrijgeven", "checkbox"),
      schemaField("publicPhoto", "Foto openbaar vrijgeven", "checkbox"),
    ],
  },
  cup: {
    collection: "cups",
    label: "Beker",
    fields: [
      schemaField("name", "Naam van de beker", "text", { required: true }),
      selectField("editionId", "Editie", "editions", { required: true }),
      schemaField("category", "Categorie", "text", { required: true }),
      selectField("status", "Status", [
        ["preparation", "Voorbereiding"],
        ["active", "Actief"],
        ["closed", "Afgesloten"],
      ]),
      schemaField("rules.halfMinutes", "Minuten per helft", "number", {
        required: true,
        min: 10,
        max: 60,
        default: 45,
      }),
      schemaField("rules.minimumPlayers", "Minimaal spelers", "number", {
        min: 1,
        max: 11,
        default: 7,
      }),
      schemaField("rules.starterCount", "Basisspelers", "number", {
        min: 1,
        max: 11,
        default: 11,
      }),
      schemaField("rules.maxSquadSize", "Maximale selectie", "number", {
        min: 1,
        max: 40,
        default: 18,
      }),
      schemaField("rules.minAge", "Minimumleeftijd", "number", {
        min: 0,
        max: 99,
      }),
      schemaField("rules.maxAge", "Maximumleeftijd", "number", {
        min: 0,
        max: 99,
      }),
      schemaField("rules.referenceDate", "Leeftijdspeildatum", "date", {
        required: true,
        default: "2027-01-01",
      }),
      schemaField("rules.maxDispensations", "Maximaal dispensaties", "number", {
        min: 0,
        max: 30,
        default: 3,
      }),
      schemaField("rules.maxSubstitutions", "Maximaal wissels", "number", {
        min: 0,
        max: 20,
        default: 5,
      }),
      schemaField("rules.extraTime", "Verlenging bij gelijkspel", "checkbox"),
      schemaField(
        "rules.penalties",
        "Strafschoppen bij gelijkspel",
        "checkbox",
        { default: true },
      ),
    ],
  },
  match: {
    collection: "matches",
    label: "Wedstrijd",
    fields: [
      selectField("cupId", "Beker", "cups", { required: true }),
      selectField("homeTeamId", "Thuisteam", "teams", { required: true }),
      selectField("awayTeamId", "Uitteam", "teams", {
        blank: "Vrijloting / nog te bepalen",
      }),
      schemaField("date", "Datum", "date", { required: true }),
      schemaField("time", "Aftrap", "time", { required: true }),
      schemaField("venue", "Speellocatie", "text", { required: true }),
      schemaField("field", "Veld", "text", { required: true }),
      selectField("roundKey", "Ronde", [
        ["first", "Eerste ronde"],
        ["last16", "Achtste finale"],
        ["quarter", "Kwartfinale"],
        ["semi", "Halve finale"],
        ["final", "Finale"],
      ]),
    ],
  },
  news: {
    collection: "news",
    label: "Nieuwsbericht",
    fields: [
      schemaField("title", "Titel", "text", { required: true }),
      schemaField("body", "Artikeltekst", "textarea", {
        required: true,
        wide: true,
      }),
      selectField("status", "Publicatie", [
        ["draft", "Concept"],
        ["published", "Publiceren"],
      ]),
      schemaField("publishedAt", "Publicatiemoment", "datetime-local"),
      schemaField("cupIds", "Gekoppelde bekers", "multiselect", {
        source: "cups",
      }),
      schemaField("teamIds", "Gekoppelde teams", "multiselect", {
        source: "teams",
      }),
      schemaField("clubIds", "Gekoppelde verenigingen", "multiselect", {
        source: "clubs",
      }),
    ],
  },
  volunteer: {
    collection: "volunteers",
    label: "Vrijwilliger",
    fields: [
      schemaField("name", "Naam", "text", { required: true }),
      schemaField("email", "E-mailadres", "email", { required: true }),
      schemaField("phone", "Telefoonnummer", "tel"),
      schemaField("userId", "Gekoppeld gebruikers-ID"),
    ],
  },
  shift: {
    collection: "shifts",
    label: "Vrijwilligersdienst",
    fields: [
      schemaField("name", "Naam van de dienst", "text", { required: true }),
      schemaField("date", "Datum", "date", { required: true }),
      schemaField("from", "Begintijd", "time", { required: true }),
      schemaField("until", "Eindtijd", "time", { required: true }),
      schemaField("venue", "Locatie"),
      schemaField("capacity", "Aantal plekken", "number", {
        min: 1,
        max: 100,
        required: true,
      }),
    ],
  },
  membership: {
    collection: "memberships",
    label: "Lidmaatschap",
    fields: [
      schemaField("userId", "Supabase-gebruikers-ID", "text", {
        required: true,
      }),
      selectField(
        "role",
        "Rol",
        Object.entries(labels).filter(([k]) =>
          [
            "leadership",
            "club",
            "team",
            "official",
            "player",
            "supporter",
            "editor",
            "photographer",
            "press",
            "volunteer",
          ].includes(k),
        ),
      ),
      selectField("clubId", "Verenigingsscope", "clubs"),
      selectField("teamId", "Teamscope", "teams"),
      selectField("officialId", "Scheidsrechter", "officials"),
      selectField("playerId", "Spelersscope", "players"),
      selectField("volunteerId", "Vrijwilligersscope", "volunteers"),
      selectField(
        "status",
        "Status",
        [
          ["active", "Actief"],
          ["revoked", "Ingetrokken"],
        ],
        { required: true },
      ),
      schemaField("reason", "Motivering", "textarea", {
        required: true,
        wide: true,
        minlength: 10,
      }),
    ],
  },
};
// The initial route catalogue provides titles and images, never business records.
function valueAt(row, name) {
  return name.split(".").reduce((v, key) => v?.[key], row);
}
function fieldMarkup(field, row = {}) {
  const value = valueAt(row, field.name) ?? field.default ?? "",
    attrs = `name="${esc(field.name)}" ${field.required ? "required" : ""} ${field.min !== undefined ? 'min="' + field.min + '"' : ""} ${field.max !== undefined ? 'max="' + field.max + '"' : ""} ${field.minlength ? 'minlength="' + field.minlength + '"' : ""} ${field.placeholder ? 'placeholder="' + esc(field.placeholder) + '"' : ""}`;
  if (field.type === "checkbox")
    return `<label class="check-field${field.wide ? " wide" : ""}"><input type="checkbox" ${attrs}${value ? " checked" : ""}><span>${esc(field.label)}${field.help ? `<small>${esc(field.help)}</small>` : ""}</span></label>`;
  if (field.type === "multiselect") {
    const records = data(field.source).filter(field.filter || (() => true));
    return `<fieldset class="wide"><legend>${esc(field.label)}</legend>${records.length ? records.map((item) => `<label class="check-field"><input type="checkbox" name="${esc(field.name)}" value="${esc(item.id)}"${Array.isArray(value) && value.includes(item.id) ? " checked" : ""}><span>${esc(item.name || item.title || item.id)}</span></label>`).join("") : '<p class="muted">Er zijn nog geen beschikbare records.</p>'}</fieldset>`;
  }
  const input =
    field.type === "select"
      ? `<select ${attrs}>${typeof field.source === "string" ? options(field.source, value, field.blank || "Kies…", field.filter) : `<option value="">${esc(field.blank || "Kies…")}</option>` + field.source.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(value) ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>`
      : field.type === "textarea"
        ? `<textarea ${attrs} rows="4">${esc(value)}</textarea>`
        : `<input type="${esc(field.type === "recipients" ? "text" : field.type)}" ${attrs} ${field.type === "file" ? 'accept="image/png,image/jpeg,image/webp"' : 'value="' + esc(value) + '"'} ${field.type === "password" ? 'autocomplete="new-password"' : ""}>`;
  return `<label class="field${field.wide ? " wide" : ""}">${esc(field.label)}${input}${field.help ? `<small>${esc(field.help)}</small>` : ""}</label>`;
}
function collectFields(form, fields) {
  const payload = {},
    fd = new FormData(form);
  for (const field of fields) {
    let value;
    if (field.type === "checkbox")
      value = form.elements.namedItem(field.name)?.checked === true;
    else if (field.type === "multiselect") value = fd.getAll(field.name);
    else {
      if (field.type === "file") {
        if (state.editor?.photoData)
          payload[field.name] = state.editor.photoData;
        continue;
      }
      value = String(fd.get(field.name) ?? "").trim();
      if (value === "") {
        if (field.type === "select" && field.name === "awayTeamId")
          value = null;
        else if (
          !field.required &&
          ["number", "date", "time", "datetime-local", "select"].includes(
            field.type,
          )
        )
          continue;
      }
      if (field.type === "number") value = Number(value);
      if (field.type === "recipients")
        value = value
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
      if (field.type === "datetime-local" && value)
        value = new Date(value).toISOString();
    }
    const parts = field.name.split(".");
    let target = payload;
    while (parts.length > 1) {
      const key = parts.shift();
      target[key] ??= {};
      target = target[key];
    }
    target[parts[0]] = value;
  }
  return payload;
}
function entityList(type, { filter = () => true, title } = {}) {
  const schema = types[type],
    records = data(schema.collection).filter(filter);
  const descriptions = {
    edition: (r) =>
      `${esc(r.season || "")} · ${esc(r.finalDate ? formatDate(r.finalDate) : "Finaledatum volgt")}`,
    club: (r) => esc([r.city, r.venue].filter(Boolean).join(" · ")),
    team: (r) => `${esc(label("clubs", r.clubId))} · ${esc(r.category || "")}`,
    player: (r) =>
      `${esc(label("teams", r.teamId))} · ${esc(r.relationCode || "")}`,
    cup: (r) =>
      `${esc(r.category || "")} · ${esc(label("editions", r.editionId))}`,
    news: (r) => esc(String(r.body || "").slice(0, 110)),
    match: (r) =>
      `${esc(formatDate(r.date))} · ${esc(r.time || "")} · ${esc(r.venue || "")}`,
  };
  return panel(
    heading(
      title || schema.label,
      "",
      entityButton(type, schema.label + " toevoegen"),
    ) +
      (records.length
        ? `<div class="record-list">${records.map((row) => recordRow(row.name || row.title || (type === "match" ? matchName(row) : row.id), descriptions[type]?.(row) || "", canEdit(type, row) ? button("Bewerken", "edit", `data-entity="${type}" data-id="${esc(row.id)}"`) : "", row.status ? status(row.status) : "")).join("")}</div>`
        : empty(
            "Nog geen " + schema.label.toLocaleLowerCase("nl"),
            "Nieuwe records worden centraal bewaard en zijn daarna in de bijbehorende werkruimtes beschikbaar.",
          )),
  );
}
function openEditor({
  entity,
  commandType,
  fields,
  row = {},
  title,
  help = "",
  fixed = {},
}) {
  if (dialog.open) {
    toast("Rond eerst de geopende wijziging af.");
    return;
  }
  const schema = entity ? types[entity] : null;
  state.editor = {
    entity,
    commandType: commandType || entity + ".upsert",
    fields: fields || schema.fields,
    row,
    fixed,
    dirty: false,
    busy: false,
    requestId: crypto.randomUUID(),
  };
  editor.innerHTML = `<header class="dialog-head"><div><p class="hv-eyebrow">Zorgvuldig vastleggen</p><h2 id="editor-title">${esc(title || (row.id ? schema.label + " bewerken" : schema.label + " toevoegen"))}</h2></div><button type="button" class="close-button" data-action="editor-close" aria-label="Sluiten">×</button></header><div class="dialog-body"><div class="error-summary" data-editor-error role="alert" tabindex="-1"></div>${help ? `<p class="muted">${esc(help)}</p>` : ""}<div class="form-grid">${state.editor.fields.map((f) => fieldMarkup(f, row)).join("")}</div></div><section class="dialog-discard" data-editor-discard hidden><p>Je wijziging is nog niet opgeslagen. Wil je verdergaan of sluiten?</p><div class="section-actions">${button("Verdergaan", "editor-keep")}${button("Sluiten zonder opslaan", "editor-discard")}</div></section><footer class="dialog-footer"><p>Je gegevens worden na bevestiging gecontroleerd en opgeslagen.</p><div class="form-actions">${button("Annuleren", "editor-close")}<button type="submit" class="hv-button hv-button-dark">${row.id ? "Wijziging opslaan" : "Bevestigen en opslaan"}</button></div></footer>`;
  dialog.showModal();
  editor.querySelector("input,select,textarea")?.focus();
}
function closeEditor(force = false) {
  if (state.editor?.busy) return;
  if (state.editor?.dirty && !force) {
    editor.querySelector("[data-editor-discard]").hidden = false;
    editor.querySelector("[data-action=editor-keep]").focus();
    return;
  }
  dialog.close();
  state.editor = null;
}
async function submitEditor() {
  if (!state.editor || state.editor.busy) return;
  if (!editor.reportValidity()) return;
  const item = state.editor,
    payload = { ...collectFields(editor, item.fields), ...item.fixed };
  if (item.row.id && item.entity) payload.id = item.row.id;
  if (item.custom === "lineup-submit") {
    const fd = new FormData(editor);
    payload.players = data("players")
      .filter((p) => p.teamId === payload.teamId && fd.has("include:" + p.id))
      .map((p) => ({
        playerId: p.id,
        number: Number(fd.get("number:" + p.id)),
        position: String(fd.get("position:" + p.id)),
        captain: fd.has("captain:" + p.id),
        goalkeeper: fd.has("goalkeeper:" + p.id),
      }));
  }
  if (item.custom === "lineup-review") {
    const fd = new FormData(editor);
    payload.checks = Object.fromEntries(
      item.lineup.players.map((p) => [
        p.playerId,
        String(fd.get("check:" + p.playerId) || ""),
      ]),
    );
  }
  item.busy = true;
  editor
    .querySelectorAll("button[type=submit]")
    .forEach((b) => (b.disabled = true));
  const feedback = editor.querySelector("[data-editor-error]");
  feedback.textContent = "";
  try {
    await command(item.commandType, payload, item.requestId);
    item.busy = false;
    closeEditor(true);
    render();
    app.querySelector("h1")?.focus({ preventScroll: true });
    toast("Je wijziging is opgeslagen.");
  } catch (error) {
    feedback.textContent = errorMessage(error);
    feedback.focus();
  } finally {
    item.busy = false;
    editor
      .querySelectorAll("button[type=submit]")
      .forEach((b) => (b.disabled = false));
  }
}
function authPage() {
  const snapshot = state.snapshot,
    config = snapshot.config?.auth;
  if (snapshot.user)
    return `<div class="platform-grid">${panel(heading("Je bent ingelogd") + `<p><strong>${esc(snapshot.user.name || snapshot.user.email)}</strong></p><p>${esc(snapshot.user.email)}</p><p class="muted">Rollen en toegang worden centraal beheerd. Bovenaan kun je alleen tussen je eigen lidmaatschappen wisselen.</p><div class="section-actions"><a class="hv-button hv-button-dark" href="#start">Open mijn overzicht</a>${button("Uitloggen", "logout")}</div>`)}${panel(heading("Jouw lidmaatschappen") + ((snapshot.memberships || []).map((m) => recordRow(labels[m.role] || m.role, esc(m.teamId ? label("teams", m.teamId) : m.clubId ? label("clubs", m.clubId) : "Organisatiebrede werkruimte"))).join("") || empty("Nog geen lidmaatschap", "Vraag de organisatie om je account aan de juiste vereniging of rol te koppelen.")))}</div>`;
  const configured = !!(config?.supabaseUrl && config?.publishableKey);
  return `<div class="auth-layout">${panel(heading("Inloggen met een code", "Geen wachtwoord nodig. Je code blijft privé.") + (configured ? `<form class="auth-form" data-auth-form><label class="field">E-mailadres<input type="email" name="email" value="${esc(state.email)}" autocomplete="email" required${state.otpSent ? " readonly" : ""}></label>${state.otpSent ? '<label class="field">Je eenmalige code<input class="otp-input" type="text" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" placeholder="000000" required><small>Vul de zes cijfers uit je e-mail in.</small></label>' : ""}<div class="error-summary" data-auth-feedback role="alert"></div><button class="hv-button hv-button-dark" type="submit"${state.authBusy ? " disabled" : ""}>${state.authBusy ? "Even wachten…" : state.otpSent ? "Code bevestigen" : "Stuur mij een code"}</button>${state.otpSent ? `<div class="section-actions">${button("Nieuwe code sturen", "otp-resend", "data-resend")}${button("Ander e-mailadres", "otp-reset")}</div><p class="muted">Geen bericht ontvangen? Kijk ook bij ongewenste e-mail. Een nieuwe code kun je na één minuut aanvragen.</p>` : ""}</form>` : `<div class="notice warning"><strong>De e-mailaanmelding wordt nog aangesloten.</strong><p>De beheerder moet de Supabase-projectconfiguratie, Resend SMTP en de e-mailsjabloon met een zescijferige code instellen. Er wordt nu geen code verstuurd.</p></div>`) + (snapshot.config?.localSessionEnabled ? `<div class="notice"><strong>Lokale ontwikkeling</strong><p>Open de afgeschermde lokale werkruimte om de gedeelde API te controleren. Deze ingang is alleen op deze lokale ontwikkelserver beschikbaar.</p><div class="form-actions">${button("Lokale werkruimte openen", "local-session")}</div></div>` : ""))}<aside class="auth-aside"><p class="hv-eyebrow">Jouw club. Jouw werkruimte.</p><h2>Alles klaar voor jouw bekeravond.</h2><p>Gebruik het e-mailadres waarmee de organisatie je account heeft gekoppeld. Je ontvangt een eenmalige code van zes cijfers.</p><p>Na inloggen zijn alleen de gegevens en handelingen van je eigen lidmaatschap beschikbaar.</p><a class="hv-button hv-button-outline" href="#programma">Bekijk het openbare programma</a></aside></div>`;
}
function dashboardPage() {
  if (!state.snapshot.user) return loginGate();
  const role = state.snapshot.activeMembership?.role;
  const available = [
    ["seizoen", "Deelnemers en bekers", "cup.upsert"],
    ["planning", "Wedstrijden plannen", "match.upsert"],
    ["spelersbeheer", "Spelers en goedkeuring", "player.upsert"],
    ["team", "Spelerslijst en opgave", "lineup.submit"],
    ["official", "Mijn aanstellingen", "assignment.accept"],
    ["arbitrage", "Scheidsrechter aanstellen", "assignment.set"],
    ["dossiers", "Bezwaren en besluiten", "objection.submit"],
    ["nieuwsbeheer", "Nieuws publiceren", "news.upsert"],
    ["vrijwilligers", "Mijn vrijwilligersdiensten", "shift.signup"],
    ["instellingen", "Platforminstellingen", "settings.manage"],
  ].filter(([, , cap]) => can(cap));
  return panel(
    heading(
      "Goed voorbereid op de aftrap",
      `${labels[role] || "Mijn account"} · ${state.snapshot.user.name || state.snapshot.user.email}`,
    ) +
      (available.length
        ? `<div class="platform-grid three">${available.map(([id, title]) => `<a class="platform-card" href="#${id}"><div class="platform-card-copy"><h3>${title}</h3><p>Open je actuele gegevens en de volgende handeling.</p></div></a>`).join("")}</div>`
        : empty(
            "Je overzicht staat klaar",
            "Volg je favoriete club of team, bekijk het programma of neem contact op met de organisatie als je een extra werkruimte nodig hebt.",
            '<a class="hv-button hv-button-dark" href="#programma">Naar het programma</a>',
          )),
  );
}
function seasonPage() {
  const gate = accessGate("cup.upsert");
  if (gate) return gate;
  return `<div class="subnav"><a href="#seizoen">Deelnemers</a><a href="#toernooibeheer">Bekers en reglement</a><a href="#loting">Loting en indeling</a><a href="#planning">Wedstrijdplanning</a></div>${registrationPage()}${entityList("edition", { title: "Edities" })}${entityList("club", { title: "Verenigingen" })}${entityList("team", { title: "Teams" })}`;
}
function registrationPage() {
  const actions = can("registration.submit")
    ? button(
        "Team inschrijven",
        "command",
        'data-command="registration.submit"',
      )
    : "";
  const entries = data("registrations");
  return panel(
    heading(
      "Deelnemende teams",
      "Een bekerinschrijving en een spelerslijst worden afzonderlijk beoordeeld.",
      actions,
    ) +
      (entries.length
        ? `<div class="record-list">${entries.map((r) => recordRow(label("teams", r.teamId), `${esc(label("cups", r.cupId))}${r.reason ? "<br>" + esc(r.reason) : ""}`, can("registration.review") ? button("Beoordelen", "command", `data-command="registration.review" data-id="${esc(r.id)}" data-team="${esc(r.teamId)}" data-cup="${esc(r.cupId)}"`) : "", status(r.status))).join("")}</div>`
        : empty(
            "Nog geen inschrijvingen",
            "Schrijf een bestaand team in voor een passende beker. De server controleert categorie, dubbele deelname en beschikbare plekken.",
          )),
  );
}
const reviewFields = [
  selectField(
    "decision",
    "Besluit",
    [
      ["approved", "Goedkeuren"],
      ["returned", "Aanvulling vragen"],
      ["rejected", "Afwijzen"],
    ],
    { required: true },
  ),
  schemaField("reason", "Motivering", "textarea", {
    required: true,
    minlength: 10,
    wide: true,
  }),
];
function flowDefinition(type, context = {}) {
  const selectedMatch = byId("matches", context.match),
    selectedTeam = byId("teams", context.team),
    selectedCup = byId("cups", context.cup);
  const fixed = {},
    prefill = {};
  let fields = [],
    title = type,
    help = "";
  const reason = schemaField("reason", "Motivering", "textarea", {
    required: true,
    minlength: 10,
    wide: true,
  });
  const cup = selectField("cupId", "Beker", "cups", { required: true }),
    team = selectField("teamId", "Team", "teams", { required: true }),
    match = selectField("matchId", "Wedstrijd", "matches", { required: true });
  const flow = {
    "registration.submit": () => {
      title = "Team voor een beker inschrijven";
      fields = [cup, team];
      help =
        "Het bestaande team behoudt zijn HV-ID. De inschrijving blijft te beoordelen totdat de leiding een besluit vastlegt.";
    },
    "registration.review": () => {
      title = "Bekerinschrijving beoordelen";
      fixed.registrationId = context.id;
      fields = reviewFields;
    },
    "roster.submit": () => {
      title = "Toernooispelerslijst indienen";
      fields = [
        cup,
        team,
        {
          ...schemaField("playerIds", "Spelers voor deze beker", "multiselect"),
          source: "players",
        },
      ];
      help =
        "Selecteer alleen spelers van het gekozen team. De server controleert identiteit, leeftijd en dispensatie. Een bekerinschrijving keurt de lijst niet automatisch goed.";
    },
    "roster.review": () => {
      title = "Spelerslijst beoordelen";
      fixed.rosterId = context.id;
      fields = reviewFields;
    },
    "dispensation.decide": () => {
      title = "Persoonsdispensatie vastleggen";
      fields = [
        cup,
        selectField("playerId", "Speler", "players", { required: true }),
        schemaField("allowed", "Dispensatie toestaan", "checkbox"),
        reason,
      ];
    },
    "assignment.set": () => {
      title = "Scheidsrechter aanstellen";
      fields = [
        match,
        selectField("officialId", "Scheidsrechter", "officials", {
          required: true,
        }),
        reason,
      ];
    },
    "assignment.accept": () => {
      title = "Aanstelling beantwoorden";
      fixed.matchId = context.match;
      fields = [
        schemaField("accepted", "Ik bevestig mijn aanstelling", "checkbox", {
          default: true,
        }),
        schemaField("reason", "Toelichting", "textarea", { wide: true }),
      ];
      help = "Bij weigeren is een duidelijke toelichting nodig.";
    },
    "match.start": () => {
      title = "Aftrap registreren";
      fixed.matchId = context.match;
      fields = [];
      help =
        "Bevestig de aftrap. De server controleert de aanstelling, beide opgaven en de fysieke spelerscontrole vóór de wedstrijd begint.";
    },
    "match.event": () => {
      if (context.event) {
        title = "Wedstrijdgebeurtenis beoordelen";
        fixed.matchId = context.match;
        fixed.eventId = context.event;
        fields = [
          selectField(
            "decision",
            "Besluit",
            [
              ["confirmed", "Bevestigen"],
              ["rejected", "Afwijzen"],
            ],
            { required: true },
          ),
          reason,
        ];
      } else {
        title = "Wedstrijdmoment vastleggen";
        fields = [
          ...(context.match ? [] : [match]),
          selectField(
            "type",
            "Gebeurtenis",
            [
              ["goal", "Doelpunt"],
              ["penalty-goal", "Strafschopdoelpunt"],
              ["own-goal", "Eigen doelpunt"],
              ["yellow", "Gele kaart"],
              ["second-yellow", "Tweede gele kaart"],
              ["red", "Rode kaart"],
              ["substitution", "Wissel"],
              ["incident", "Bijzonderheid"],
            ],
            { required: true },
          ),
          {
            ...team,
            filter: (r) =>
              !selectedMatch ||
              [selectedMatch.homeTeamId, selectedMatch.awayTeamId].includes(
                r.id,
              ),
          },
          selectField("playerId", "Speler", "players"),
          selectField(
            "relatedPlayerId",
            "Inkomende speler bij wissel",
            "players",
          ),
          schemaField("minute", "Minuut", "number", {
            required: true,
            min: 0,
            max: 180,
          }),
          schemaField("note", "Toelichting", "textarea", { wide: true }),
        ];
        if (context.match) fixed.matchId = context.match;
        help =
          "Een melding van de teamleiding blijft voorlopig. De scheidsrechter bevestigt het officiële wedstrijdbeeld.";
      }
    },
    "match.finalize": () => {
      title = "Officiële uitslag vaststellen";
      fixed.matchId = context.match;
      fields = [
        schemaField("homeScore", "Doelpunten thuis", "number", {
          required: true,
          min: 0,
          max: 99,
        }),
        schemaField("awayScore", "Doelpunten uit", "number", {
          required: true,
          min: 0,
          max: 99,
        }),
        schemaField("penHome", "Strafschoppen thuis", "number", {
          min: 0,
          max: 99,
        }),
        schemaField("penAway", "Strafschoppen uit", "number", {
          min: 0,
          max: 99,
        }),
        schemaField(
          "eventsComplete",
          "Ik heb alle wedstrijdgebeurtenissen gecontroleerd",
          "checkbox",
        ),
        reason,
      ];
      help =
        "De scheidsrechter stelt de officiële uitslag vast. Een teambezwaar wijzigt deze niet automatisch.";
    },
    "objection.submit": () => {
      title = "Gemotiveerd bezwaar indienen";
      fields = [
        match,
        team,
        schemaField("subject", "Onderwerp", "text", { required: true }),
        reason,
      ];
    },
    "objection.decide": () => {
      title = "Organisatiebesluit vastleggen";
      fixed.objectionId = context.id;
      fields = [
        selectField(
          "decision",
          "Besluit",
          [
            ["rejected", "Ongegrond"],
            ["upheld", "Gegrond, uitslag behouden"],
            ["corrected", "Gegrond, uitslag corrigeren"],
          ],
          { required: true },
        ),
        schemaField("homeScore", "Gecorrigeerde doelpunten thuis", "number", {
          min: 0,
          max: 99,
        }),
        schemaField("awayScore", "Gecorrigeerde doelpunten uit", "number", {
          min: 0,
          max: 99,
        }),
        selectField("winnerTeamId", "Winnaar bij correctie", "teams"),
        reason,
      ];
      help =
        "Een expliciete correctie bewaart de oorspronkelijke bronuitslag. Alleen het gemotiveerde organisatiebesluit kan de geldige publieke uitslag wijzigen.";
    },
    "publication.update": () => {
      title = "Publicatievoorkeur vastleggen";
      fields = [
        selectField("playerId", "Speler", "players", { required: true }),
        schemaField("publicName", "Naam openbaar tonen", "checkbox"),
        schemaField("publicPhoto", "Foto openbaar tonen", "checkbox"),
        reason,
      ];
    },
    "player.availability": () => {
      title = "Beschikbaarheid doorgeven";
      fields = [
        selectField("playerId", "Speler", "players", { required: true }),
        match,
        selectField(
          "availability",
          "Beschikbaarheid",
          [
            ["available", "Beschikbaar"],
            ["unavailable", "Niet beschikbaar"],
            ["discuss", "Even overleggen"],
          ],
          { required: true },
        ),
      ];
    },
    "shift.signup": () => {
      title = context.cancel
        ? "Afmelden voor deze dienst"
        : "Inschrijven voor deze dienst";
      fixed.shiftId = context.id;
      if (context.cancel) fixed.cancel = true;
      fields = [
        selectField("volunteerId", "Vrijwilliger", "volunteers", {
          required: true,
        }),
      ];
    },
    "message.send": () => {
      title = "Bericht versturen";
      fields = [
        schemaField(
          "recipientUserIds",
          "Gebruikers-ID van ontvanger",
          "recipients",
          {
            required: true,
            help: "Gebruik één of meer actieve gebruikers-ID’s, gescheiden door een komma.",
          },
        ),
        schemaField("subject", "Onderwerp", "text", { required: true }),
        schemaField("body", "Bericht", "textarea", {
          required: true,
          wide: true,
        }),
        match,
      ];
      fields[3].required = false;
    },
    "bracket.draw": () => {
      title = "Controleerbare loting voorbereiden";
      fixed.cupId = context.cup;
      fields = [
        selectField(
          "bracketSize",
          "Startbracket",
          [
            [8, "8 plekken"],
            [16, "16 plekken"],
            [32, "32 plekken"],
          ],
          { required: true },
        ),
        schemaField("seed", "Lotingssleutel", "text", {
          required: true,
          default: crypto.randomUUID(),
          help: "Deze sleutel maakt dezelfde trekking controleerbaar herhaalbaar.",
        }),
        schemaField("teamIds", "Goedgekeurde deelnemers", "multiselect", {
          source: "teams",
          filter: (r) =>
            data("registrations").some(
              (e) =>
                e.cupId === context.cup &&
                e.teamId === r.id &&
                e.status === "approved",
            ),
        }),
      ];
      help =
        "De trekking is eerst een concept. Kies daarna afzonderlijk Indeling publiceren. Minimaal de helft van de bekerplekken moet een goedgekeurde deelnemer hebben.";
    },
    "bracket.publish": () => {
      title = "Bekerindeling publiceren";
      fixed.cupId = context.cup;
      fields = [];
      help =
        "Publiceer de voorbereide trekking. De indeling krijgt eigen wedstrijd-ID’s en eventuele vrijlotingen. Controleer daarna locaties, data en aftraptijden in Planning.";
    },
  };
  if (type === "kit.update") {
    title = "Wedstrijdtenue vastleggen";
    fields = [
      selectField("clubId", "Vereniging", "clubs", { required: true }),
      selectField(
        "variant",
        "Tenue",
        [
          ["home", "Thuistenue"],
          ["away", "Uittenue"],
        ],
        { required: true },
      ),
      schemaField("shirtColor", "Shirtkleur", "color", { default: "#005016" }),
      schemaField("shortsColor", "Broekkleur", "color", { default: "#ffffff" }),
      schemaField("socksColor", "Sokkenkleur", "color", { default: "#005016" }),
      schemaField("note", "Aanvullende afspraak", "textarea", { wide: true }),
    ];
    return {
      commandType: type,
      fields,
      row: context.id
        ? byId("kits", context.id) || {}
        : { clubId: state.snapshot.activeMembership?.clubId || "" },
      title,
      help: "Leg de herkenbare kleuren van het thuis- of uittenue vast. Deze gegevens blijven aan de vereniging gekoppeld.",
    };
  }
  if (type === "media.submit") {
    title = "Beeld ter beoordeling inzenden";
    fields = [
      selectField("matchId", "Wedstrijd", "matches", { required: true }),
      schemaField("title", "Titel", "text", { required: true }),
      schemaField("credit", "Fotograaf / credit", "text", { required: true }),
      schemaField("dataUrl", "Afbeelding", "file", {
        required: true,
        wide: true,
        help: "JPG, PNG of WebP van maximaal 200 kB.",
      }),
      schemaField(
        "rights.website",
        "Gebruik op de website toestaan",
        "checkbox",
      ),
      schemaField(
        "rights.articles",
        "Gebruik bij artikelen toestaan",
        "checkbox",
      ),
      schemaField("rights.press", "Gebruik door de pers toestaan", "checkbox"),
      schemaField(
        "rights.social",
        "Gebruik op sociale kanalen toestaan",
        "checkbox",
      ),
      schemaField(
        "consent",
        "Ik heb de benodigde toestemming en rechten voor deze inzending",
        "checkbox",
      ),
    ];
    return {
      commandType: type,
      fields,
      title,
      help: "Je beeld blijft besloten totdat de organisatie het heeft goedgekeurd voor het toegestane gebruik.",
    };
  }
  if (type === "media.review") {
    return {
      commandType: type,
      title: "Beeldrechten en publicatie beoordelen",
      fixed: { mediaId: context.id },
      fields: [
        selectField(
          "decision",
          "Besluit",
          [
            ["approved", "Goedkeuren"],
            ["rejected", "Afwijzen"],
            ["revoked", "Toestemming intrekken"],
          ],
          { required: true },
        ),
        reason,
      ],
      help: "Controleer credit, toestemming en gebruiksrechten. Alleen goedgekeurd beeld met toestemming voor websitegebruik is openbaar.",
    };
  }
  if (!flow[type]) {
    toast("Deze handeling is nog niet beschikbaar.");
    return null;
  }
  flow[type]();
  if (selectedCup) prefill.cupId = selectedCup.id;
  if (selectedTeam) prefill.teamId = selectedTeam.id;
  if (selectedMatch) prefill.matchId = selectedMatch.id;
  return { commandType: type, fields, row: prefill, title, help, fixed };
}
function teamPage() {
  const gate = accessGate();
  if (gate) return gate;
  return `${panel(heading("Jouw teams", "Beheer de teamidentiteit en bereid de bekerdeelname voor.", entityButton("team", "Team toevoegen")) + teamsCards(scopedTeams()))}${registrationPage()}${panel(heading("Toernooispelerslijsten", "Elke beker heeft een afzonderlijk ingediende en beoordeelde lijst.", can("roster.submit") ? button("Spelerslijst indienen", "command", 'data-command="roster.submit"') : "") + rosterList())}${panel(heading("Wedstrijdopgaven", "Dien een opgave met basis, bank, aanvoerder en doelverdediger in.", can("lineup.submit") ? button("Wedstrijdopgave indienen", "lineup-open") : "") + lineupList())}`;
}
function rosterList() {
  const records = data("rosters");
  return records.length
    ? `<div class="record-list">${records.map((r) => recordRow(label("teams", r.teamId), `${esc(label("cups", r.cupId))} · ${(r.playerIds || r.players || []).length} spelers`, can("roster.review") ? button("Beoordelen", "command", `data-command="roster.review" data-id="${esc(r.id)}"`) : "", status(r.status))).join("")}</div>`
    : empty(
        "Nog geen ingediende spelerslijsten",
        "Een speler registreren en een spelerslijst indienen zijn afzonderlijke handelingen.",
      );
}
function lineupList(matchId) {
  const records = data("lineups").filter(
    (l) => !matchId || l.matchId === matchId,
  );
  return records.length
    ? `<div class="record-list">${records.map((l) => recordRow(label("teams", l.teamId), `${esc(byId("matches", l.matchId) ? matchName(byId("matches", l.matchId)) : l.matchId)} · ${(l.players || []).length} spelers`, can("lineup.review") ? button("Identiteit en aanwezigheid controleren", "lineup-review", `data-id="${esc(l.id)}"`) : "", status(l.status))).join("")}</div>`
    : empty(
        "Nog geen wedstrijdopgaven",
        "De teamleiding dient voor de wedstrijd een gecontroleerde opgave in.",
      );
}
function playersPage() {
  const gate = accessGate();
  if (gate) return gate;
  return `${entityList("player", { title: "Spelersregister" })}${panel(heading("Leeftijd en dispensatie", "Een persoonsbesluit blijft gekoppeld aan de speler en de beker.", can("dispensation.decide") ? button("Dispensatiebesluit", "command", 'data-command="dispensation.decide"') : "") + `<p class="muted">De server controleert de leeftijdspeildatum en het dispensatiemaximum bij indiening en beoordeling.</p>`)}${panel(heading("Ingediende spelerslijsten") + rosterList())}`;
}
function officialPage() {
  const gate = accessGate();
  if (gate) return gate;
  const list = data("matches").filter(
    (m) =>
      m.status !== "bye" &&
      (state.snapshot.activeMembership?.role === "leadership" ||
        m.officialId === state.snapshot.activeMembership?.officialId),
  );
  return panel(
    heading(
      "Mijn aanstellingen",
      "Open een wedstrijd voor bevestiging, spelerscontrole, aftrap en uitslag.",
    ) +
      (list.length
        ? list
            .map(
              (m) =>
                `<section class="hv-panel">${heading(matchName(m), `${formatDate(m.date)} · ${m.time || "Tijd volgt"}`, can("assignment.accept") ? button("Aanstelling beantwoorden", "command", `data-command="assignment.accept" data-match="${esc(m.id)}"`) : "")}<div class="section-actions"><a class="hv-button hv-button-dark" href="#wedstrijd-${esc(m.id)}">Open wedstrijd</a>${status(m.assignmentStatus || "open")}</div></section>`,
            )
            .join("")
        : empty(
            "Nog geen aanstellingen",
            "Je eigen toegewezen wedstrijden verschijnen hier zodra de organisatie je heeft aangesteld.",
          )),
  );
}
function matchPage() {
  const match =
    byId("matches", state.detail) ||
    (!state.detail ? data("matches")[0] : null);
  if (!match)
    return panel(
      empty(
        "Wedstrijd niet gevonden",
        "Deze wedstrijd is niet beschikbaar of nog niet gepubliceerd.",
        '<a class="hv-button hv-button-dark" href="#programma">Naar het programma</a>',
      ),
    );
  const events = data("events").filter((e) => e.matchId === match.id);
  const officialActions = [
    ["assignment.accept", "Aanstelling beantwoorden"],
    ["match.start", "Aftrap registreren"],
    ["match.event", "Moment vastleggen"],
    ["match.finalize", "Uitslag vaststellen"],
  ]
    .filter(([type]) => can(type))
    .map(([type, title]) =>
      button(
        title,
        "command",
        `data-command="${type}" data-match="${esc(match.id)}"`,
      ),
    )
    .join("");
  return `<div class="score-panel"><div class="team-name">${esc(label("teams", match.homeTeamId))}</div><div class="score">${match.homeScore == null ? "–" : esc(match.homeScore)}<span> : </span>${match.awayScore == null ? "–" : esc(match.awayScore)}</div><div class="team-name">${esc(match.awayTeamId ? label("teams", match.awayTeamId) : match.status === "bye" ? "Vrijloting" : "Deelnemer volgt")}</div></div>${panel(status(match.status) + `<dl class="fact-grid"><div><dt>Beker</dt><dd>${esc(label("cups", match.cupId))}</dd></div><div><dt>Aftrap</dt><dd>${esc(formatDate(match.date))} · ${esc(match.time || "Tijd volgt")}</dd></div><div><dt>Locatie</dt><dd>${esc([match.venue, match.field].filter(Boolean).join(" · ") || "Locatie volgt")}</dd></div></dl>` + (match.corrected || match.correctedAt ? `<p class="notice">De officiële uitslag is gecorrigeerd na een organisatiebesluit. Gepubliceerd op ${esc(formatDate(match.publishedAt || match.correctedAt))}.</p>` : ""))}${officialActions ? panel(heading("Wedstrijdhandelingen", "Alle definitieve wijzigingen worden op de server gecontroleerd.") + `<div class="section-actions">${officialActions}</div>`) : ""}${panel(heading("Wedstrijdverloop") + (events.length ? events.map((e) => recordRow(`${e.minute}′ · ${e.type}`, `${esc(e.playerId ? label("players", e.playerId) : label("teams", e.teamId))}${e.note ? " · " + esc(e.note) : ""}`, e.status === "pending" && can("match.event") ? button("Beoordelen", "command", `data-command="match.event" data-match="${esc(match.id)}" data-event="${esc(e.id)}"`) : "", status(e.status))).join("") : empty("Het wedstrijdverhaal begint hier", "Zodra momenten zijn vastgelegd, verschijnen de bevestigde gebeurtenissen in dit overzicht.")))}${state.snapshot.user ? panel(heading("Wedstrijdopgaven") + lineupList(match.id)) : ""}${can("objection.submit") ? panel(heading("Uitslag of bezwaar", "Een bezwaar laat de officiële stand geldig totdat een gemotiveerd besluit volgt.", button("Bezwaar indienen", "command", `data-command="objection.submit" data-match="${esc(match.id)}"`))) : ""}`;
}
function objectionsPage() {
  const gate = accessGate();
  if (gate) return gate;
  return panel(
    heading(
      "Wedstrijddossiers",
      "Bezwaren worden met reden beoordeeld en blijven aan de bronuitslag verbonden.",
      can("objection.submit")
        ? button(
            "Bezwaar indienen",
            "command",
            'data-command="objection.submit"',
          )
        : "",
    ) +
      (data("objections").length
        ? data("objections")
            .map((o) =>
              recordRow(
                o.subject,
                `${esc(byId("matches", o.matchId) ? matchName(byId("matches", o.matchId)) : o.matchId)}<br>${esc(o.reason || "")}`,
                can("objection.decide") && o.status === "open"
                  ? button(
                      "Gemotiveerd besluit",
                      "command",
                      `data-command="objection.decide" data-id="${esc(o.id)}"`,
                    )
                  : "",
                status(o.status),
              ),
            )
            .join("")
        : empty(
            "Geen open dossiers",
            "Nieuwe bezwaren verschijnen hier na indiening door de bevoegde teamleiding.",
          )),
  );
}
function volunteerPage() {
  const gate = accessGate();
  if (gate) return gate;
  return `${can("volunteer.upsert") ? entityList("volunteer", { title: "Vrijwilligers" }) : ""}${panel(
    heading(
      "Samen maken we de finaledag",
      "Kies een beschikbare dienst. De server controleert capaciteit en overlap.",
      entityButton("shift", "Dienst toevoegen"),
    ) +
      (data("shifts").length
        ? data("shifts")
            .map((s) =>
              recordRow(
                s.name,
                `${esc(formatDate(s.date))} · ${esc(s.from || "")}–${esc(s.until || "")} · ${esc(s.venue || "Locatie volgt")}<br>${esc(s.placesLeft ?? Math.max(0, s.capacity - (s.volunteerIds || []).length))} plekken beschikbaar`,
                `${can("shift.upsert") ? button("Bewerken", "edit", `data-entity="shift" data-id="${esc(s.id)}"`) : ""}${can("shift.signup") ? button(s.signedUp || (s.volunteerIds || []).includes(state.snapshot.activeMembership?.volunteerId) ? "Afmelden" : "Inschrijven", "command", `data-command="shift.signup" data-id="${esc(s.id)}"${s.signedUp || (s.volunteerIds || []).includes(state.snapshot.activeMembership?.volunteerId) ? ' data-cancel="true"' : ""}`) : ""}`,
              ),
            )
            .join("")
        : empty(
            "De diensten volgen",
            "Zodra de organisatie diensten klaarzet, kun je je hier inschrijven.",
          )),
  )}`;
}
function messagesPage() {
  const gate = accessGate();
  if (gate) return gate;
  return panel(
    heading(
      "Berichten",
      "Afspraken en wijzigingen bij elkaar.",
      can("message.send")
        ? button("Nieuw bericht", "command", 'data-command="message.send"')
        : "",
    ) +
      (data("messages").length
        ? data("messages")
            .map((m) =>
              recordRow(
                m.subject,
                `${esc(m.body)}<br><small>${esc(formatDate(m.createdAt))}</small>`,
                can("message.read") &&
                  !(m.readBy || []).includes(state.snapshot.user.id) &&
                  m.recipientUserIds?.includes(state.snapshot.user.id)
                  ? button(
                      "Markeer als gelezen",
                      "message-read",
                      `data-id="${esc(m.id)}"`,
                    )
                  : "",
                status(
                  (m.readBy || []).includes(state.snapshot.user.id)
                    ? "confirmed"
                    : "open",
                ),
              ),
            )
            .join("")
        : empty(
            "Je bent helemaal bij",
            "Er staan nog geen berichten in je eigen werkcontext.",
          )),
  );
}
function directoryPage(type, detail) {
  const row = byId(type, detail),
    isClub = type === "clubs";
  if (detail && !row)
    return panel(
      empty(
        isClub ? "Vereniging niet gevonden" : "Team niet gevonden",
        "Deze registratie is niet beschikbaar.",
        '<a class="hv-button hv-button-outline" href="#zoeken">Zoeken</a>',
      ),
    );
  if (row)
    return `${panel(heading(row.name, isClub ? [row.city, row.venue].filter(Boolean).join(" · ") : `${label("clubs", row.clubId)} · ${row.category || ""}`, can("favorite.toggle") ? button("Volgen / niet meer volgen", "favorite", `data-type="${type}" data-id="${esc(row.id)}"`) : ""))}${isClub ? panel(heading("Teams van deze vereniging") + teamsCards(data("teams").filter((t) => t.clubId === row.id))) : panel(heading("Wedstrijden van dit team") + matchesList(data("matches").filter((m) => [m.homeTeamId, m.awayTeamId].includes(row.id))))}`;
  const rows = data(type).filter(
    (r) =>
      !state.filter ||
      r.name
        .toLocaleLowerCase("nl")
        .includes(state.filter.toLocaleLowerCase("nl")),
  );
  return panel(
    heading(isClub ? "Onze verenigingen" : "De teams") +
      `<div class="filterbar"><label>Zoeken<input data-search type="search" value="${esc(state.filter)}" placeholder="Naam van ${isClub ? "de vereniging" : "het team"}"></label></div>` +
      (isClub
        ? rows
            .map((c) =>
              recordRow(
                c.name,
                esc([c.city, c.venue].filter(Boolean).join(" · ")),
                `<a class="hv-button hv-button-outline" href="#vereniging-${esc(c.id)}">Bekijk vereniging</a>`,
              ),
            )
            .join("") ||
          empty(
            "Geen verenigingen gevonden",
            "Pas je zoekopdracht aan of kom later terug.",
          )
        : teamsCards(rows)),
  );
}
function searchPage() {
  const query = state.filter.toLocaleLowerCase("nl");
  const groups = [
    ["clubs", "Verenigingen", "vereniging"],
    ["teams", "Teams", "elftal"],
    ["cups", "Bekers", "schema"],
    ["matches", "Wedstrijden", "wedstrijd"],
    ["news", "Nieuws", "artikel"],
  ];
  return panel(
    heading("Vind jouw bekerverhaal") +
      `<div class="filterbar"><label>Zoeken<input data-search type="search" value="${esc(state.filter)}" placeholder="Vereniging, team, beker of wedstrijd"></label></div>` +
      groups
        .map(([key, title, route]) => {
          const records = data(key).filter(
            (r) =>
              !query ||
              String(r.name || r.title || matchName(r))
                .toLocaleLowerCase("nl")
                .includes(query),
          );
          return `<h3>${title}</h3>${
            records.length
              ? records
                  .slice(0, 20)
                  .map((r) =>
                    recordRow(
                      r.name || r.title || matchName(r),
                      "",
                      `<a class="hv-button hv-button-outline" href="#${route}-${esc(r.id)}">Bekijken</a>`,
                    ),
                  )
                  .join("")
              : empty(
                  "Geen resultaten",
                  "Er zijn geen passende gepubliceerde records.",
                )
          }`;
        })
        .join(""),
  );
}
function favoritesPage() {
  const gate = accessGate();
  if (gate) return gate;
  return panel(
    heading(
      "Jouw club. Jouw verhaal",
      "Je favorieten worden bij je account bewaard.",
    ) +
      (data("favorites").length
        ? data("favorites")
            .map((f) =>
              recordRow(
                label(f.entityType, f.entityId),
                "",
                button(
                  "Niet meer volgen",
                  "favorite",
                  `data-type="${esc(f.entityType)}" data-id="${esc(f.entityId)}"`,
                ),
              ),
            )
            .join("")
        : empty(
            "Volg jouw club of team",
            "Open een vereniging, team of beker en kies Volgen.",
            '<a class="hv-button hv-button-dark" href="#vereniging">Ontdek de verenigingen</a>',
          )),
  );
}
function privacyPage() {
  return panel(
    heading(
      "Zichtbaar met een reden",
      "Een besloten controlefoto is niet automatisch een openbare profielfoto.",
    ) +
      `<div class="document-copy"><p>Openbare pagina’s tonen alleen door de server vrijgegeven spelersgegevens. E-mailadressen, geboortedata en identiteitsfoto’s horen bij de besloten werkruimte.</p><p>Je publicatievoorkeur verandert de verplichte wedstrijdcontrole niet. De organisatie beoordeelt welk gebruik bij het toernooi past.</p></div>${can("publication.update") ? button("Publicatievoorkeur aanpassen", "command", 'data-command="publication.update"') : ""}`,
  );
}
function statisticsPage() {
  const list = data("matches"),
    finished = list.filter((m) => m.status === "finished"),
    goals = data("events").filter(
      (e) =>
        ["goal", "penalty-goal", "own-goal"].includes(e.type) &&
        e.status === "confirmed",
    ).length;
  return `<div class="metrics">${[
    [data("clubs").length, "Verenigingen"],
    [data("teams").length, "Teams"],
    [finished.length, "Afgeronde wedstrijden"],
    [goals, "Bevestigde doelpunten"],
  ]
    .map(
      ([v, t]) =>
        `<div class="metric"><strong>${v}</strong><span>${t}</span></div>`,
    )
    .join(
      "",
    )}</div>${panel(heading("Cijfers met een verhaal") + '<p class="muted">Deze cijfers komen uit geregistreerde teams, wedstrijden en bevestigde gebeurtenissen. Er worden geen schoten of balbezit zonder bron ingevuld.</p>')}`;
}
function finalDayPage(manage = false) {
  const edition =
      data("editions").find((e) => e.status === "active") ||
      data("editions")[0],
    matches = data("matches").filter(
      (m) =>
        m.roundKey === "final" ||
        (edition?.finalDate && m.date === edition.finalDate),
    );
  return `${panel(heading("Samen op de finaledag", edition?.finalDate ? `${formatDate(edition.finalDate)} · ${edition.venue || "Locatie volgt"}` : "Datum en definitieve locatie worden door de organisatie gepubliceerd.", manage ? entityButton("edition", "Editie beheren") : "") + matchesList(matches, { edit: manage }))}${panel(heading("Iedereen heeft een plek") + '<p>Bekijk de gepubliceerde aftraptijd en het veld bij je wedstrijd. De organisatie werkt praktische afspraken bij zodra deze vaststaan.</p><div class="section-actions"><a class="hv-button hv-button-outline" href="#locaties">Sportparken</a><a class="hv-button hv-button-outline" href="#vrijwilligers">Vrijwilligersdiensten</a></div>')}`;
}
function readinessPage() {
  if (!state.snapshot.user) return loginGate();
  return panel(
    heading("Samen klaar voor de aftrap") +
      data("matches")
        .filter((m) => m.status !== "bye")
        .map((m) => {
          const lineups = data("lineups").filter((l) => l.matchId === m.id);
          return recordRow(
            matchName(m),
            `${esc(formatDate(m.date))} · ${lineups.filter((l) => l.status === "approved").length}/2 opgaven goedgekeurd · ${esc(labels[m.assignmentStatus] || "Aanstelling open")}`,
            `<a class="hv-button hv-button-outline" href="#wedstrijd-${esc(m.id)}">Bekijk voorbereiding</a>`,
          );
        })
        .join(""),
  );
}
function manualPage() {
  return panel(
    `<div class="document-copy">${heading("Van inschrijving naar aftrap")}<h3>Je eigen werkruimte</h3><p>Log in met de eenmalige code uit je e-mail. Jouw beheerde lidmaatschap bepaalt welke clubs, teams en handelingen je kunt gebruiken. Je kunt bovenaan alleen tussen je eigen lidmaatschappen wisselen.</p><h3>Verenigingen, teams en bekers</h3><p>De organisatie legt verenigingen en teams vast. Ieder team behoudt zijn identiteit. Een team kan voor passende bekers worden ingeschreven; de leiding beoordeelt elke inschrijving afzonderlijk.</p><h3>Spelerslijst en wedstrijdopgave</h3><p>Registreer de spelers, dien de lijst per beker in en wacht de beoordeling af. Dien daarna de wedstrijdopgave in met basis, bank, aanvoerder en doelverdediger. Leeftijd en dispensatie worden bij iedere relevante stap gecontroleerd.</p><h3>Loting en planning</h3><p>De leiding bereidt een controleerbare concepttrekking voor. Na afzonderlijke publicatie ontstaan wedstrijden en vrijlotingen. Data, tijden en velden worden in Planning vastgelegd.</p><h3>De officiële uitslag</h3><p>De toegewezen scheidsrechter bevestigt de aanstelling en controleert de spelers. De aftrap is pas mogelijk als aan de voorwaarden is voldaan. Teamgebeurtenissen zijn voorlopig totdat de scheidsrechter ze bevestigt. De scheidsrechter stelt de uitslag vast; een bezwaar verandert die niet vanzelf.</p><h3>Als de verbinding wegvalt</h3><p>Een wijziging is pas opgeslagen nadat het platform deze heeft bevestigd. Bij een verbindingsfout blijft je invoer in het geopende formulier staan. Controleer de verbinding en probeer opnieuw.</p></div>`,
  );
}
function settingsPage() {
  const gate = accessGate("settings.manage", "Alleen platformbeheer");
  if (gate) return gate;
  return `${panel(heading("Aanmelding en verbinding") + `<dl class="fact-grid"><div><dt>Gegevensmodus</dt><dd>${esc(state.snapshot.mode)}</dd></div><div><dt>Supabase-aanmelding</dt><dd>${state.snapshot.config?.auth?.supabaseUrl && state.snapshot.config?.auth?.publishableKey ? "Publieke configuratie aanwezig" : "Nog aan te sluiten"}</dd></div><div><dt>Lokale sessie</dt><dd>${state.snapshot.config?.localSessionEnabled ? "Alleen lokale ontwikkeling" : "Uitgeschakeld"}</dd></div></dl><p class="muted">OTP-mail loopt via Supabase Auth met Resend SMTP. Overige platformmail gebruikt de serverinstellingen hieronder.</p>`)}${panel(heading("Platformmail via Resend", "De API-sleutel wordt alleen naar de server geschreven. Een opgeslagen sleutel is nooit terug te lezen.") + `<div data-mail-settings role="status">Instellingen ophalen…</div>`)}${panel(heading("Uitgaande meldingen", "Meldingen wachten totdat de geverifieerde ontvanger en mailconfiguratie beschikbaar zijn.", button("Wachtende meldingen verwerken", "mail-outbox-process")) + `<div data-mail-outbox role="status">Uitgaande meldingen ophalen…</div>`)}${panel(heading("Beheerde lidmaatschappen", "Koppel uitsluitend geverifieerde gebruikers-ID’s en de juiste werkcontext.", entityButton("membership", "Lidmaatschap toevoegen")) + `<p class="muted">Een gebruikersrol wordt centraal beheerd. Een zelfgekozen profielwaarde geeft geen extra toegang.</p><div data-admin-memberships role="status">Lidmaatschappen ophalen…</div>`)}`;
}
async function loadMailSettings() {
  const root = document.querySelector("[data-mail-settings]");
  if (!root) return;
  try {
    const response = await request("admin/mail-settings"),
      config = response.settings || response;
    if (!root.isConnected) return;
    root.innerHTML = `<p>${config.configured ? `Er is een sleutel opgeslagen (eindigt op ${esc(config.last4 || "••••")}).` : "Er is nog geen API-sleutel opgeslagen."} ${config.enabled ? "Verzending staat aan." : "Verzending staat uit."}</p>${config.available === false ? '<div class="notice warning">De server mist de beveiligde opslagconfiguratie voor mailcredentials. Laat de beheerder deze eerst aansluiten.</div>' : ""}${config.configured ? `<details class="mail-revoke"><summary>Opgeslagen API-sleutel verwijderen</summary><p>Hiermee verwijder je de sleutel en schakel je de platformmail uit. Openstaande meldingen blijven bewaard.</p>${button("Verwijder sleutel en schakel mail uit", "mail-key-revoke")}</details>` : ""}<form data-mail-form><div class="form-grid">${fieldMarkup(schemaField("apiKey", "Nieuwe Resend API-sleutel", "password", { help: "Laat leeg om de bestaande sleutel te behouden." }))}${fieldMarkup(schemaField("from", "Afzender", "text", { required: true, placeholder: "Haaglanden Voetbal <noreply@jouwdomein.nl>" }), config)}${fieldMarkup(schemaField("replyTo", "Antwoordadres", "email"), config)}${fieldMarkup(schemaField("enabled", "Platformmail inschakelen", "checkbox"), config)}</div><div class="error-summary" data-mail-feedback role="alert"></div><div class="form-actions"><button class="hv-button hv-button-dark" type="submit">Mailinstellingen opslaan</button></div></form><hr><form data-mail-test><label class="field">Testbericht aan<input type="email" name="to" required autocomplete="email" placeholder="jouw@e-mailadres.nl"></label><div class="error-summary" data-mail-test-feedback role="alert"></div><div class="form-actions"><button class="hv-button hv-button-outline" type="submit">Testmail aanbieden</button></div><p class="muted">Deze handeling biedt één echt bericht aan Resend aan. Een geaccepteerde aanvraag bewijst niet dat het bericht is bezorgd.</p></form>`;
  } catch (error) {
    root.innerHTML = `<div class="notice error">${esc(errorMessage(error))}</div>`;
  }
}
function render() {
  if (!state.snapshot) return;
  const info = routeInfo();
  state.route = info.id;
  state.detail = info.detail;
  document.title = info.title + " · Haaglanden Voetbal";
  document
    .querySelectorAll(".hv-nav a")
    .forEach((a) =>
      a.setAttribute(
        "aria-current",
        a.hash === "#" + info.id ? "page" : "false",
      ),
    );
  let content;
  switch (info.id) {
    case "home":
      content = homePage();
      break;
    case "account":
      content = authPage();
      break;
    case "start":
      content = dashboardPage();
      break;
    case "programma":
      content = calendarPage();
      break;
    case "planning":
      content = accessGate("match.upsert") || calendarPage(true);
      break;
    case "live":
      content = calendarPage(false, true);
      break;
    case "wedstrijd":
      content = matchPage();
      break;
    case "toernooien":
      content = cupsPage();
      break;
    case "schema":
      content = bracketPage();
      break;
    case "loting":
      content = accessGate("bracket.draw") || bracketPage(true);
      break;
    case "toernooibeheer":
      content =
        accessGate("cup.upsert") ||
        entityList("cup", { title: "Bekers en reglementen" });
      break;
    case "seizoen":
      content = seasonPage();
      break;
    case "club":
      content =
        accessGate() ||
        entityList("club", { title: "Verenigingsgegevens" }) +
          entityList("team", { title: "Teams" });
      break;
    case "team":
    case "teamlive":
      content = teamPage();
      break;
    case "spelersbeheer":
      content = playersPage();
      break;
    case "official":
      content = officialPage();
      break;
    case "arbitrage":
      content =
        accessGate("assignment.set") ||
        panel(
          heading(
            "Aanstellingen",
            "Koppel de bevoegde scheidsrechter aan de wedstrijd.",
            button(
              "Scheidsrechter aanstellen",
              "command",
              'data-command="assignment.set"',
            ),
          ) + matchesList(data("matches")),
        ) + entityList("official", { title: "Scheidsrechters" });
      break;
    case "dossiers":
      content = objectionsPage();
      break;
    case "berichten":
      content = messagesPage();
      break;
    case "vrijwilligers":
      content = volunteerPage();
      break;
    case "nieuwsbeheer":
      content =
        accessGate("news.upsert") ||
        entityList("news", { title: "Nieuwsbeheer" });
      break;
    case "nieuws":
      content = panel(
        heading("Nieuws uit Haaglanden") +
          newsList(data("news").filter((n) => n.status === "published")),
      );
      break;
    case "artikel": {
      const news = byId("news", info.detail);
      content = panel(
        news
          ? `${heading(news.title, news.publishedAt ? formatDate(news.publishedAt) : "Concept")}<div class="article-body">${esc(news.body)}</div>`
          : empty(
              "Verhaal niet gevonden",
              "Dit artikel is nog niet beschikbaar.",
              '<a class="hv-button hv-button-outline" href="#nieuws">Naar alle verhalen</a>',
            ),
      );
      break;
    }
    case "vereniging":
      content = directoryPage("clubs", info.detail);
      break;
    case "elftal":
      content = directoryPage("teams", info.detail);
      break;
    case "zoeken":
      content = searchPage();
      break;
    case "volgen":
    case "supporters":
      content = favoritesPage();
      break;
    case "privacy":
      content = privacyPage();
      break;
    case "statistieken":
      content = statisticsPage();
      break;
    case "finaledag":
    case "finaleregie":
    case "regie":
      content = finalDayPage(info.id !== "finaledag");
      break;
    case "gereed":
    case "briefing":
      content = readinessPage();
      break;
    case "instellingen":
      content = settingsPage();
      break;
    case "handleiding":
      content = manualPage();
      break;
    case "werkvoorraad":
      content =
        accessGate("registration.review") ||
        registrationPage() +
          panel(heading("Spelerslijsten") + rosterList()) +
          panel(heading("Wedstrijdopgaven") + lineupList());
      break;
    case "reglement":
      content = panel(
        heading("De afspraken voor de aftrap") +
          (data("cups")
            .map(
              (c) =>
                `<section class="hv-panel">${heading(c.name, c.category)}<dl class="fact-grid"><div><dt>Speelduur</dt><dd>2 × ${esc(c.rules?.halfMinutes || 45)} minuten</dd></div><div><dt>Dispensatiemaximum</dt><dd>${esc(c.rules?.maxDispensations ?? 0)}</dd></div><div><dt>Gelijkspel</dt><dd>${c.rules?.extraTime ? "Verlenging" : "Geen verlenging"}${c.rules?.penalties ? ", strafschoppen" : ""}</dd></div></dl></section>`,
            )
            .join("") ||
            empty(
              "Reglementen volgen",
              "De reglementen worden per beker gepubliceerd.",
            )),
      );
      break;
    case "locaties":
      content = panel(
        heading("Sportparken in Haaglanden") +
          (data("clubs")
            .map((c) =>
              recordRow(
                c.venue || "Locatie volgt",
                esc(c.name + " · " + (c.city || "")),
                `<a class="hv-button hv-button-outline" href="#vereniging-${esc(c.id)}">Bekijk vereniging</a>`,
              ),
            )
            .join("") ||
            empty(
              "Locaties volgen",
              "Geregistreerde sportparken verschijnen hier.",
            )),
      );
      break;
    case "speler": {
      const player = byId("players", info.detail);
      content = panel(
        player
          ? heading(player.name, label("teams", player.teamId)) +
              `<p>Rugnummer ${esc(player.number || "volgt")}</p>`
          : empty(
              "Spelersprofiel niet beschikbaar",
              "Dit profiel is niet openbaar vrijgegeven of is niet gevonden.",
            ),
      );
      break;
    }
    case "spelersportaal":
      content =
        accessGate() ||
        panel(
          heading("Jouw wedstrijddag") +
            `<div class="section-actions">${can("player.availability") ? button("Beschikbaarheid doorgeven", "command", 'data-command="player.availability"') : ""}${can("publication.update") ? button("Publicatievoorkeur", "command", 'data-command="publication.update"') : ""}</div>`,
        ) + readinessPage();
      break;
    case "historie":
    case "bekerkast":
      content = panel(
        heading("De bekerhistorie") +
          (data("editions")
            .filter((e) => e.status === "closed")
            .map((e) => recordRow(e.name, esc(e.season || "")))
            .join("") ||
            empty(
              "De historie groeit met het toernooi",
              "Afgesloten edities en vastgestelde winnaars verschijnen hier.",
            )),
      );
      break;
    case "road":
      content = bracketPage();
      break;
    case "beheerlog":
    case "datakwaliteit":
      content =
        accessGate() ||
        panel(
          heading(info.title) +
            `<div class="metrics">${[
              [data("clubs").length, "Verenigingen"],
              [data("teams").length, "Teams"],
              [
                data("registrations").filter((r) => r.status === "pending")
                  .length,
                "Te beoordelen inschrijvingen",
              ],
              [
                data("objections").filter((o) => o.status === "open").length,
                "Open bezwaren",
              ],
            ]
              .map(
                ([v, t]) =>
                  `<div class="metric"><strong>${v}</strong><span>${t}</span></div>`,
              )
              .join(
                "",
              )}</div><p class="muted">Besluiten en versiecontrole worden op de server vastgelegd.</p>`,
        );
      break;
    case "werkzekerheid":
      content = panel(
        heading("Je verbinding met het platform") +
          `<div class="notice"><strong>${navigator.onLine ? "Je browser is online." : "Je browser heeft geen netwerkverbinding."}</strong><p>Een wijziging is pas bewaard na bevestiging van de server. Bij een verbindingsfout blijft je formulier open. Er wordt geen lokale schijnbevestiging gegeven.</p></div><div class="form-actions">${button("Gegevens opnieuw ophalen", "refresh")}</div>`,
      );
      break;
    case "pers":
      content = panel(
        heading("Officiële informatie voor de pers") +
          newsList(data("news").filter((n) => n.status === "published")) +
          `<div class="section-actions"><a class="hv-button hv-button-outline" href="#programma">Wedstrijden en uitslagen</a><a class="hv-button hv-button-outline" href="#privacy">Publicatiebeleid</a></div>`,
      );
      break;
    case "tenues":
      content = kitsPage();
      break;
    case "fotograaf":
    case "media":
      content = mediaPage(info.id === "fotograaf");
      break;
    case "moment":
      content = panel(
        heading("Momenten van de wedstrijd") +
          (data("events")
            .filter((e) => e.status === "confirmed")
            .map((e) =>
              recordRow(
                `${e.minute}′ · ${e.type}`,
                esc(label("teams", e.teamId)),
                `<a class="hv-button hv-button-outline" href="#wedstrijd-${esc(e.matchId)}">Bekijk wedstrijd</a>`,
              ),
            )
            .join("") ||
            empty(
              "De momenten volgen",
              "Bevestigde gebeurtenissen verschijnen hier zodra er gespeeld wordt.",
            )),
      );
      break;
    default:
      content = panel(
        empty(
          "Pagina niet gevonden",
          "Gebruik het menu of zoek een club, team of wedstrijd.",
          '<a class="hv-button hv-button-dark" href="#zoeken">Zoeken</a>',
        ),
      );
  }
  app.innerHTML = `${workspaceBar()}<section id="${esc(info.id)}" data-page data-title="${esc(info.title)}">${hero(info)}<div class="platform-content">${content}</div></section>`;
  if (info.id === "instellingen" && can("settings.manage")) {
    loadMailSettings();
    loadMailOutbox();
    loadAdminMemberships();
  }
  updateResend();
}
function lineupRows(teamId) {
  const players = data("players").filter((p) => p.teamId === teamId);
  return players.length
    ? players
        .map(
          (p, index) =>
            `<fieldset class="lineup-player"><legend>${esc(p.name)}</legend><label class="check-field"><input type="checkbox" name="include:${esc(p.id)}"><span>Opnemen in deze opgave</span></label><div class="form-grid"><label class="field">Rugnummer<input type="number" min="1" max="99" name="number:${esc(p.id)}" value="${esc(p.number || index + 1)}"></label><label class="field">Positie<select name="position:${esc(p.id)}"><option value="starter">Basis</option><option value="sub">Bank</option></select></label><label class="check-field"><input type="checkbox" name="captain:${esc(p.id)}"><span>Aanvoerder</span></label><label class="check-field"><input type="checkbox" name="goalkeeper:${esc(p.id)}"><span>Doelverdediger</span></label></div></fieldset>`,
        )
        .join("")
    : empty(
        "Nog geen geregistreerde spelers",
        "Registreer spelers en dien eerst de toernooispelerslijst in.",
      );
}
function openLineup() {
  if (!can("lineup.submit")) return;
  const own = state.snapshot.activeMembership,
    team = own?.teamId || data("teams")[0]?.id;
  openEditor({
    commandType: "lineup.submit",
    title: "Wedstrijdopgave indienen",
    fields: [
      selectField("matchId", "Wedstrijd", "matches", { required: true }),
      selectField("teamId", "Team", "teams", { required: true }),
      schemaField(
        "attested",
        "Ik heb de identiteit en speelgerechtigdheid van deze selectie gecontroleerd",
        "checkbox",
      ),
      schemaField(
        "reason",
        "Toelichting / reden van nieuwe versie",
        "textarea",
        { required: true, minlength: 10, wide: true },
      ),
    ],
    row: { teamId: team },
    help: "Een opgave bevat basis, bank, één aanvoerder en de vereiste doelverdediger. Alleen spelers uit een goedgekeurde bekerlijst zijn toegestaan.",
  });
  if (!state.editor) return;
  state.editor.custom = "lineup-submit";
  editor
    .querySelector(".form-grid")
    .insertAdjacentHTML(
      "afterend",
      `<div class="record-list" data-lineup-players>${lineupRows(team)}</div>`,
    );
}
function openLineupReview(id) {
  const lineup = byId("lineups", id);
  if (!lineup || !can("lineup.review")) return;
  const fields = [
    selectField(
      "decision",
      "Besluit",
      [
        ["approved", "Goedkeuren"],
        ["returned", "Teruggeven voor aanvulling"],
      ],
      { required: true },
    ),
    schemaField("reason", "Motivering", "textarea", {
      required: true,
      minlength: 10,
      wide: true,
    }),
  ];
  openEditor({
    commandType: "lineup.review",
    title: "Identiteit en aanwezigheid controleren",
    fields,
    fixed: { lineupId: id },
    help: "Controleer iedere speler aan de hand van de besloten foto en identiteitsgegevens. Bij een ontbrekende controle of onvoldoende bezetting wordt de aftrap geweigerd.",
  });
  if (!state.editor) return;
  state.editor.custom = "lineup-review";
  state.editor.lineup = lineup;
  editor.querySelector(".form-grid").insertAdjacentHTML(
    "beforebegin",
    `<div class="record-list">${lineup.players
      .map((entry) => {
        const p = byId("players", entry.playerId);
        return `<fieldset><legend>${esc(p?.name || "Speler " + entry.number)}</legend>${p?.identityPhoto ? `<img class="identity-photo" src="${esc(p.identityPhoto)}" alt="Besloten controlefoto van ${esc(p.name)}">` : '<p class="notice warning">Geen controlefoto beschikbaar in je huidige werkcontext.</p>'}<p>${esc(p?.birthDate ? formatDate(p.birthDate) : "Geboortedatum niet beschikbaar")} · Rugnummer ${esc(entry.number)} · ${entry.position === "starter" ? "Basis" : "Bank"}</p><label class="field">Fysieke controle<select name="check:${esc(entry.playerId)}" required><option value="">Controleer deze speler</option><option value="seen">Gezien en identiteit klopt</option><option value="absent">Afwezig</option><option value="issue">Afwijking / niet akkoord</option></select></label></fieldset>`;
      })
      .join("")}</div>`,
  );
}
async function submitAuth(form) {
  const feedback = form.querySelector("[data-auth-feedback]");
  feedback.textContent = "";
  if (!form.reportValidity() || state.authBusy) return;
  if (!state.auth) {
    feedback.textContent = "De e-mailaanmelding is nog niet aangesloten.";
    return;
  }
  state.email = String(new FormData(form).get("email") || "").trim();
  state.authBusy = true;
  form.querySelector("[type=submit]").disabled = true;
  try {
    if (state.otpSent) {
      const token = String(new FormData(form).get("code") || "");
      const { data: session, error } = await state.auth.auth.verifyOtp({
        email: state.email,
        token,
        type: "email",
      });
      if (error) throw error;
      state.token = session.session?.access_token || null;
      state.otpSent = false;
      await refresh({ renderPage: false });
      location.hash = "start";
      render();
      toast("Je bent ingelogd.");
    } else {
      const { error } = await state.auth.auth.signInWithOtp({
        email: state.email,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      state.otpSent = true;
      state.resendAt = Date.now() + 60000;
      render();
      toast("Controleer je e-mail voor de eenmalige code.");
    }
  } catch (error) {
    feedback.textContent =
      error.message ||
      "De code is ongeldig of verlopen. Vraag een nieuwe code aan en probeer opnieuw.";
  } finally {
    state.authBusy = false;
    const current = document.querySelector("[data-auth-form] [type=submit]");
    if (current) current.disabled = false;
  }
}
function updateResend() {
  const button = document.querySelector("[data-resend]");
  if (!button) return;
  const seconds = Math.max(0, Math.ceil((state.resendAt - Date.now()) / 1000));
  button.disabled = seconds > 0 || state.authBusy;
  button.textContent = seconds
    ? `Nieuwe code over ${seconds} s`
    : "Nieuwe code sturen";
}
async function onAction(button) {
  const action = button.dataset.action,
    context = { ...button.dataset };
  if (action === "editor-close") return closeEditor();
  if (action === "editor-discard") return closeEditor(true);
  if (action === "editor-keep") {
    editor.querySelector("[data-editor-discard]").hidden = true;
    return editor.querySelector("input,select,textarea")?.focus();
  }
  if (action === "edit") {
    const entity = button.dataset.entity,
      schema = types[entity];
    if (!schema || !can(entity + ".upsert")) return;
    const row = button.dataset.id
      ? (entity === "membership"
          ? state.adminMemberships
          : data(schema.collection)
        ).find((r) => r.id === button.dataset.id)
      : {};
    return openEditor({ entity, row: row || {} });
  }
  if (action === "command") {
    if (!can(context.command)) return;
    const definition = flowDefinition(context.command, context);
    if (definition) openEditor(definition);
    return;
  }
  if (action === "lineup-open") return openLineup();
  if (action === "lineup-review") return openLineupReview(context.id);
  if (action === "calendar-view") {
    state.view = context.view;
    render();
    return;
  }
  if (action === "otp-reset") {
    state.otpSent = false;
    state.email = "";
    render();
    return;
  }
  if (action === "otp-resend") {
    if (state.resendAt > Date.now() || !state.auth) return;
    state.authBusy = true;
    updateResend();
    try {
      const { error } = await state.auth.auth.signInWithOtp({
        email: state.email,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      state.resendAt = Date.now() + 60000;
      toast("Er is een nieuwe code aangevraagd.");
    } catch (error) {
      const el = document.querySelector("[data-auth-feedback]");
      if (el) el.textContent = error.message;
    } finally {
      state.authBusy = false;
      updateResend();
    }
    return;
  }
  button.disabled = true;
  try {
    if (action === "local-session") {
      const result = await request("local-session", {
        method: "POST",
        body: {},
      });
      if (result.bootstrap) acceptSnapshot(result.bootstrap);
      else await refresh({ renderPage: false });
      location.hash = "start";
      render();
      toast("De lokale werkruimte is geopend.");
    } else if (action === "logout") {
      const local = state.snapshot.mode === "local";
      state.token = null;
      state.authUserId = null;
      sessionStorage.removeItem("haagv.membership");
      clearPrivateContext();
      if (state.auth) {
        const { error } = await state.auth.auth.signOut({ scope: "local" });
        if (error)
          toast(
            "Je bent op dit apparaat uitgelogd. De serverbevestiging is nog niet beschikbaar.",
          );
      }
      if (local) await request("local-session", { method: "DELETE" });
      await refresh({ renderPage: false });
      location.hash = "account";
      render();
      toast("Je bent op dit apparaat uitgelogd.");
    } else if (action === "refresh") {
      await refresh();
      toast("De nieuwste gegevens zijn opgehaald.");
    } else if (action === "favorite") {
      await command("favorite.toggle", {
        entityType: context.type,
        entityId: context.id,
      });
      render();
      toast("Je favorieten zijn bijgewerkt.");
    } else if (action === "mail-key-revoke") {
      await request("admin/mail-settings", {
        method: "PUT",
        body: { clearApiKey: true },
      });
      await loadMailSettings();
      toast("De API-sleutel is verwijderd. Platformmail staat uit.");
    } else if (action === "mail-outbox-process") {
      const response = await request("admin/mail-outbox/process", {
        method: "POST",
        body: {},
      });
      await refresh({ renderPage: false });
      await loadMailOutbox();
      toast(
        `${response.accepted || 0} meldingen aangeboden aan de e-maildienst; ${response.pending || 0} blijven wachten.`,
      );
    } else if (action === "message-read") {
      await command("message.read", { messageId: context.id });
      render();
      toast("Het bericht is als gelezen gemarkeerd.");
    }
  } catch (error) {
    toast(errorMessage(error));
  } finally {
    if (button.isConnected) button.disabled = false;
  }
}
document.addEventListener("click", (event) => {
  if (event.target.closest(".skip-link")) {
    event.preventDefault();
    document.getElementById("main-content").focus();
    document.getElementById("main-content").scrollIntoView();
    return;
  }
  const button = event.target.closest("[data-action]");
  if (button) {
    event.preventDefault();
    onAction(button).catch((error) => toast(errorMessage(error)));
  }
});
document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (form === editor) {
    event.preventDefault();
    await submitEditor();
    return;
  }
  if (form.matches("[data-auth-form]")) {
    event.preventDefault();
    await submitAuth(form);
    return;
  }
  if (form.matches("[data-mail-form],[data-mail-test]")) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const test = form.matches("[data-mail-test]"),
      feedback = form.querySelector(
        test ? "[data-mail-test-feedback]" : "[data-mail-feedback]",
      ),
      submit = form.querySelector("[type=submit]");
    feedback.textContent = "";
    submit.disabled = true;
    try {
      const fd = new FormData(form);
      if (test) {
        await request("admin/mail-test", {
          method: "POST",
          body: { to: String(fd.get("to")) },
        });
        toast("Het testbericht is aangeboden aan Resend.");
      } else {
        const body = {
          from: String(fd.get("from")),
          replyTo: String(fd.get("replyTo")),
          enabled: form.elements.namedItem("enabled").checked,
        };
        const key = String(fd.get("apiKey") || "");
        if (key) body.apiKey = key;
        await request("admin/mail-settings", { method: "PUT", body });
        form.elements.namedItem("apiKey").value = "";
        toast("De mailinstellingen zijn opgeslagen.");
        await loadMailSettings();
      }
    } catch (error) {
      feedback.textContent = errorMessage(error);
    } finally {
      if (submit.isConnected) submit.disabled = false;
    }
  }
});
editor.addEventListener("input", (event) => {
  if (state.editor) {
    state.editor.dirty = true;
    if (!state.editor.busy) state.editor.requestId = crypto.randomUUID();
  }
  if (event.target.type === "file") {
    const file = event.target.files[0];
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 200000
    ) {
      event.target.setCustomValidity(
        "Gebruik een JPG-, PNG- of WebP-afbeelding van maximaal 200 kB.",
      );
      event.target.reportValidity();
      return;
    }
    event.target.setCustomValidity("");
    const target = state.editor,
      epoch = state.contextEpoch,
      reader = new FileReader();
    reader.onload = () => {
      if (state.editor === target && state.contextEpoch === epoch)
        target.photoData = reader.result;
    };
    reader.readAsDataURL(file);
  }
});
editor.addEventListener("change", (event) => {
  if (
    state.editor?.custom === "lineup-submit" &&
    event.target.name === "teamId"
  )
    editor.querySelector("[data-lineup-players]").innerHTML = lineupRows(
      event.target.value,
    );
  if (
    state.editor?.commandType === "roster.submit" &&
    event.target.name === "teamId"
  ) {
    for (const input of editor.querySelectorAll("[name=playerIds]")) {
      const player = byId("players", input.value);
      const valid = player?.teamId === event.target.value;
      input.closest("label").hidden = !valid;
      if (!valid) input.checked = false;
    }
  }
});
dialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeEditor();
});
dialog.addEventListener("keydown", (event) => {
  if (event.key !== "Tab") return;
  const controls = [
    ...dialog.querySelectorAll(
      'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])',
    ),
  ].filter(
    (e) =>
      e.getClientRects().length && getComputedStyle(e).visibility !== "hidden",
  );
  const first = controls[0],
    last = controls.at(-1);
  if (!first) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});
document.addEventListener("change", async (event) => {
  const el = event.target;
  if (el.matches("[data-route-picker]")) location.hash = el.value;
  if (el.matches("[data-filter-cup]")) {
    state.cup = el.value;
    state.detail = "";
    if (state.route === "schema" || state.route === "loting")
      location.hash = state.route + (el.value ? "-" + el.value : "");
    else render();
  }
  if (el.matches("[data-calendar-date]")) {
    state.date = el.value.length === 7 ? el.value + "-01" : el.value;
    render();
  }
  if (el.matches("[data-membership]")) {
    sessionStorage.setItem("haagv.membership", el.value);
    clearPrivateContext();
    try {
      await refresh();
    } catch (error) {
      if (error.code !== "SESSION_CHANGED") toast(errorMessage(error));
    }
  }
});
let searchTimer;
document.addEventListener("input", (event) => {
  if (!event.target.matches("[data-search]")) return;
  const text = event.target.value,
    selection = event.target.selectionStart;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.filter = text;
    render();
    const input = document.querySelector("[data-search]");
    input?.focus({ preventScroll: true });
    input?.setSelectionRange(selection, selection);
  }, 140);
});
window.addEventListener("hashchange", () => {
  state.filter = "";
  if (dialog.open) closeEditor(true);
  render();
  app.querySelector("h1")?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "instant" });
});
window.addEventListener("online", () =>
  toast(
    "Je browser is weer online. Haal de nieuwste gegevens op voordat je verdergaat.",
  ),
);
window.addEventListener("offline", () =>
  toast(
    "Geen netwerkverbinding. Wijzigingen hebben bevestiging van de server nodig.",
  ),
);
setInterval(updateResend, 1000);
async function retireLegacyWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const base = new URL(".", location.href),
      target = new URL("sw.js", base);
    const registrations = await navigator.serviceWorker.getRegistrations();
    if (
      registrations.some(
        (r) =>
          r.scope === base.href &&
          [r.active, r.waiting, r.installing].some(
            (w) => w?.scriptURL === target.href,
          ),
      )
    ) {
      const registration = await navigator.serviceWorker.register(target.href, {
        scope: base.href,
        updateViaCache: "none",
      });
      await registration.update();
    }
  } catch {
    /* A failed migration cannot become an offline success indication. */
  }
}
async function start() {
  try {
    await refresh({ renderPage: false });
    await initializeAuth();
    state.initialized = true;
    render();
  } catch (error) {
    app.innerHTML = `<section class="hv-panel shell-error"><p class="hv-eyebrow">Haaglanden Voetbal</p><h1>Het platform is nog niet bereikbaar.</h1><div class="notice error"><p>${esc(errorMessage(error))}</p></div><p>Gebruik de applicatieserver voor deze werkruimte. Alleen de statische bestanden openen geeft geen toegang tot de gedeelde API.</p><div class="section-actions">${button("Opnieuw verbinden", "retry-start")}<a class="hv-button hv-button-outline" href="#account">Mijn account</a></div></section>`;
    document.querySelector("[data-connection]").textContent =
      "Geen bevestigde verbinding met de platform-API.";
  }
}
document.addEventListener("click", (event) => {
  if (event.target.closest("[data-action=retry-start]")) start();
});
retireLegacyWorker();
start();
function kitsPage() {
  const member = state.snapshot.activeMembership,
    rows = data("kits");
  return panel(
    heading(
      "Herkenbaar op het veld",
      "De afgesproken kleuren van shirt, broek en sokken.",
      can("kit.update")
        ? button("Tenue vastleggen", "command", 'data-command="kit.update"')
        : "",
    ) +
      (rows.length
        ? `<div class="platform-grid">${rows
            .map((k) => {
              const color = (v) =>
                /^#[0-9a-f]{6}$/i.test(v || "") ? v : "#dde8d8";
              return `<article class="platform-card"><div class="kit-preview" aria-label="${esc(label("clubs", k.clubId))} ${k.variant === "away" ? "uittenue" : "thuistenue"}"><span style="background:${color(k.shirtColor)}">Shirt</span><span style="background:${color(k.shortsColor)}">Broek</span><span style="background:${color(k.socksColor)}">Sokken</span></div><div class="platform-card-copy"><h3>${esc(label("clubs", k.clubId))}</h3><p>${k.variant === "away" ? "Uittenue" : "Thuistenue"}${k.note ? " · " + esc(k.note) : ""}</p>${can("kit.update") && (member?.role === "leadership" || member?.clubId === k.clubId) ? button("Tenue bewerken", "command", `data-command="kit.update" data-id="${esc(k.id)}"`) : ""}</div></article>`;
            })
            .join("")}</div>`
        : empty(
            "De kleuren volgen",
            "Clubleiding en organisatie leggen hier de eigen tenues vast.",
          )),
  );
}
function mediaPage(manage) {
  const records = data("media").filter(
    (m) =>
      manage ||
      can("media.review") ||
      (m.status === "approved" && m.rights?.website && m.consent),
  );
  return panel(
    heading(
      manage ? "Jouw beelden langs de lijn" : "De beker in beeld",
      "Goedgekeurde beelden met een credit en duidelijke gebruiksrechten.",
      can("media.submit")
        ? button("Beeld inzenden", "command", 'data-command="media.submit"')
        : "",
    ) +
      (records.length
        ? `<div class="platform-grid three">${records
            .map(
              (m) =>
                `<article class="platform-card">${m.dataUrl ? `<img src="${esc(m.dataUrl)}" alt="${esc(m.title)}" loading="lazy">` : ""}<div class="platform-card-copy"><h3>${esc(m.title)}</h3><p>Foto: ${esc(m.credit)}</p>${status(m.status)}<p>${esc(byId("matches", m.matchId) ? matchName(byId("matches", m.matchId)) : m.matchId)}</p><p class="muted">Gebruik: ${
                  Object.entries(m.rights || {})
                    .filter(([, allowed]) => allowed)
                    .map(
                      ([key]) =>
                        ({
                          website: "Website",
                          articles: "Artikelen",
                          press: "Pers",
                          social: "Sociale kanalen",
                        })[key] || key,
                    )
                    .join(", ") || "Geen vrijgave"
                }</p>${can("media.review") ? button("Beeld beoordelen", "command", `data-command="media.review" data-id="${esc(m.id)}"`) : ""}</div></article>`,
            )
            .join("")}</div>`
        : empty(
            manage ? "Nog geen inzendingen" : "De beelden volgen",
            manage
              ? "Stuur een eigen beeld in met credit, toestemming en gebruiksrechten."
              : "Hier verschijnen beelden die voor publicatie zijn goedgekeurd.",
          )),
  );
}
async function loadAdminMemberships() {
  const root = document.querySelector("[data-admin-memberships]");
  if (!root) return;
  try {
    const response = await request("admin/memberships");
    if (!root.isConnected) return;
    state.adminMemberships = Array.isArray(response.items)
      ? response.items
      : [];
    root.innerHTML = state.adminMemberships.length
      ? `<div class="record-list">${state.adminMemberships.map((m) => recordRow(labels[m.role] || m.role, `<span class="membership-user">${esc(m.userId)}</span>${m.teamId ? "<br>Team: " + esc(label("teams", m.teamId)) : m.clubId ? "<br>Vereniging: " + esc(label("clubs", m.clubId)) : m.officialId ? "<br>Scheidsrechter: " + esc(label("officials", m.officialId)) : m.playerId ? "<br>Speler: " + esc(label("players", m.playerId)) : m.volunteerId ? "<br>Vrijwilliger: " + esc(label("volunteers", m.volunteerId)) : ""}`, button("Bewerken / intrekken", "edit", `data-entity="membership" data-id="${esc(m.id)}"`), status(m.status))).join("")}</div>`
      : empty(
          "Nog geen lidmaatschappen",
          "Koppel een geverifieerde gebruiker aan een beheerde rol.",
        );
  } catch (error) {
    root.innerHTML = `<div class="notice error">${esc(errorMessage(error))}</div>`;
  }
}
async function loadMailOutbox() {
  const root = document.querySelector("[data-mail-outbox]");
  if (!root) return;
  try {
    const response = await request("admin/mail-outbox");
    if (!root.isConnected) return;
    const items = Array.isArray(response.items) ? response.items : [];
    root.innerHTML = items.length
      ? `<div class="record-list">${items.map((row) => recordRow(row.subject || "Platformmelding", `${esc(formatDate(row.createdAt))} · ${(row.recipientUserIds || []).length} ontvangers${row.recipients?.some((r) => r.code) ? "<br>" + esc([...new Set(row.recipients.filter((r) => r.code).map((r) => r.code))].join(", ")) : ""}`, "", `<span class="status">${row.status === "accepted" ? "Aangeboden aan de e-maildienst" : "Wacht op verwerking"}</span>`)).join("")}</div>`
      : empty(
          "Geen uitgaande meldingen",
          "Nieuwe platformmeldingen verschijnen hier met hun verwerkingsstatus.",
        );
  } catch (error) {
    root.innerHTML = `<div class="notice error">${esc(errorMessage(error))}</div>`;
  }
}
