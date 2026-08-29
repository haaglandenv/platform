"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  House,
  Menu,
  Newspaper,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { canAccessRoute, roleLabels } from "@/lib/domain";
import type { Role } from "@/lib/types";
import { OperationsView } from "@/components/OperationsViews";
import { PublicView } from "@/components/PublicViews";
import type { ActionHandler, AppData } from "@/components/ui";

const publicNav = [
  ["/nieuws", "Nieuws"],
  ["/wedstrijden", "Wedstrijden"],
  ["/toernooien", "Toernooien"],
  ["/clubs", "Clubs"],
  ["/media", "Media"],
] as const;

const knownExact = new Set([
  "/",
  "/nieuws",
  "/toernooien",
  "/toernooien/sir-winston-cup",
  "/toernooien/sir-winston-cup/programma",
  "/toernooien/sir-winston-cup/bracket",
  "/toernooien/sir-winston-cup/teams",
  "/toernooien/sir-winston-cup/statistieken",
  "/toernooien/sir-winston-cup/nieuws",
  "/toernooien/sir-winston-cup/reglement",
  "/wedstrijden",
  "/wedstrijden/quick-duindorp-sv",
  "/clubs",
  "/clubs/duindorp-sv",
  "/media",
  "/historie",
  "/finaledag",
  "/zoeken",
  "/account",
  "/meldingen",
  "/inloggen",
  "/next",
  "/next/favorieten",
  "/next/meldingen",
  "/next/instellingen",
  "/beheer",
  "/beheer/toernooileiding",
  "/beheer/toernooileiding/toernooien",
  "/beheer/toernooileiding/wedstrijden",
  "/beheer/toernooileiding/bracket",
  "/beheer/toernooileiding/spelerscontrole",
  "/beheer/toernooileiding/uitslagen",
  "/beheer/toernooileiding/tucht",
  "/beheer/toernooileiding/audit",
  "/beheer/toernooileiding/privacy",
  "/beheer/wedstrijdleiding",
  "/beheer/wedstrijdleiding/wedstrijden",
  "/beheer/wedstrijdleiding/incidenten",
  "/beheer/vereniging",
  "/beheer/vereniging/teams",
  "/beheer/vereniging/spelerslijsten",
  "/beheer/vereniging/profiel",
  "/beheer/team",
  "/beheer/team/spelerslijst",
  "/beheer/scheidsrechter",
  "/beheer/pers",
  "/beheer/fotograaf",
  "/beheer/berichten",
  "/beheer/media",
]);

function isKnownPath(path: string) {
  return (
    knownExact.has(path) ||
    path.startsWith("/nieuws/") ||
    path.startsWith("/spelers/") ||
    path.startsWith("/media/") ||
    path.startsWith("/beheer/team/wedstrijden/") ||
    path.startsWith("/beheer/scheidsrechter/wedstrijden/")
  );
}

export function TournamentOS({ path }: { path: string }) {
  const [data, setData] = useState<AppData | null>(null);
  const [role, setRole] = useState<Role>("supporter");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tone: "ok" | "error"; message: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  const operations = path.startsWith("/beheer");
  const load = async () => {
    const response = await fetch(`/api/state?surface=${operations ? "operations" : "public"}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("De demostaat kon niet worden geladen.");
    const json = (await response.json()) as { role: Role; data: AppData };
    setRole(json.role);
    setData(json.data);
  };

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch(`/api/state?surface=${operations ? "operations" : "public"}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("De demostaat kon niet worden geladen.");
        return (await response.json()) as { role: Role; data: AppData };
      })
      .then((json) => {
        if (active) {
          setLoadError("");
          setRole(json.role);
          setData(json.data);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(error instanceof Error ? error.message : "Laden mislukt.");
          setToast({
            tone: "error",
            message: error instanceof Error ? error.message : "Laden mislukt.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [operations, path]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const action: ActionHandler = async (name, payload = {}, successMessage) => {
    setBusy(name);
    try {
      const response = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: name, payload }),
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error ?? "Actie mislukt.");
      setToast({ tone: "ok", message: successMessage ?? result.message ?? "Actie opgeslagen." });
      await load();
    } catch (error) {
      setToast({
        tone: "error",
        message: error instanceof Error ? error.message : "Actie mislukt.",
      });
    } finally {
      setBusy(null);
    }
  };

  const switchRole = async (nextRole: Role, destination?: string) => {
    setBusy("switch-role");
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      if (!response.ok) throw new Error("Rol wisselen is niet gelukt.");
      window.location.assign(destination ?? "/beheer");
    } catch (error) {
      setToast({
        tone: "error",
        message: error instanceof Error ? error.message : "Rol wisselen is niet gelukt.",
      });
      setBusy(null);
    }
  };

  const unread = useMemo(
    () => data?.runtime.notifications.filter((item) => !item.read).length ?? 0,
    [data],
  );

  if (!data) {
    if (loadError)
      return (
        <main className="loading-screen permission-state" role="alert">
          <ShieldCheck size={44} />
          <h1>Toernooidata niet beschikbaar</h1>
          <p>{loadError}</p>
          <button className="button" onClick={() => window.location.reload()}>
            Probeer opnieuw
          </button>
        </main>
      );
    return (
      <main className="loading-screen" aria-live="polite">
        <Image
          src="/brand/haaglanden-voetbal-logo.jpg"
          alt="Haaglanden Voetbal"
          width={180}
          height={85}
          loading="eager"
        />
        <span className="spinner spinner--large" />
        <p>Toernooidata laden…</p>
      </main>
    );
  }

  const tickerMatches = ["match_live_1", "match_qf_2", "match_qf_4"]
    .map((id) => data.matches.find((match) => match.id === id))
    .filter((match) => match !== undefined);
  const tickerTeamName = (teamId: string | null) =>
    data.teams
      .find((team) => team.id === teamId)
      ?.name.replace(/^SVV /, "")
      .replace(/ 1$/, "") ?? "N.t.b.";

  return (
    <div className={operations ? "product product--operations" : "product"}>
      <a className="skip-link" href="#main-content">
        Ga naar hoofdinhoud
      </a>
      <header className="global-header">
        <div className="global-header__inner">
          <Link className="brand" href="/" aria-label="Haaglanden Voetbal — home">
            <Image
              src="/brand/haaglanden-voetbal-logo.jpg"
              alt="Haaglanden Voetbal"
              width={174}
              height={82}
              loading="eager"
            />
            <span className="brand__product">TournamentOS</span>
          </Link>
          <nav className="desktop-nav" aria-label="Hoofdnavigatie">
            {publicNav.map(([href, label]) => (
              <Link key={href} className={path.startsWith(href) ? "active" : ""} href={href}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <Link className="icon-button" href="/zoeken" aria-label="Zoeken">
              <Search size={20} />
            </Link>
            <Link
              className="icon-button icon-button--badge"
              href="/meldingen"
              aria-label={`${unread} ongelezen meldingen`}
            >
              <Bell size={20} />
              {unread ? <span>{unread}</span> : null}
            </Link>
            <Link
              className="button button--compact button--outline"
              href={operations ? "/" : "/next"}
            >
              {operations ? "Publieke site" : "HV Next"}
            </Link>
            <button
              className="mobile-menu-button"
              onClick={() => setMenuOpen(true)}
              aria-label="Menu openen"
              aria-expanded={menuOpen}
            >
              <Menu />
            </button>
          </div>
        </div>
      </header>

      {!online ? (
        <div className="offline-banner" role="status">
          Offline · getoonde informatie kan verouderd zijn. Mutaties worden niet als geslaagd
          weergegeven.
        </div>
      ) : null}

      <div className="live-strip" aria-label="Live score ticker">
        <div className="container live-strip__inner">
          <span className="live-strip__label">
            <span className="live-dot" /> LIVE
          </span>
          {tickerMatches.map((match) => (
            <Link className="live-strip__match" href="/wedstrijden" key={match.id}>
              <small>{match.status === "LIVE" ? `${match.minute ?? 0}′` : "AFG"}</small>
              <span>{tickerTeamName(match.homeTeamId)}</span>
              <strong>{match.score ? `${match.score.home}–${match.score.away}` : "–"}</strong>
              <span>{tickerTeamName(match.awayTeamId)}</span>
            </Link>
          ))}
        </div>
      </div>

      {menuOpen ? (
        <div className="mobile-drawer" role="dialog" aria-modal="true" aria-label="Navigatiemenu">
          <button
            className="icon-button mobile-drawer__close"
            onClick={() => setMenuOpen(false)}
            aria-label="Menu sluiten"
          >
            <X />
          </button>
          <nav>
            <Link href="/" onClick={() => setMenuOpen(false)}>
              Home
            </Link>
            {publicNav.map(([href, label]) => (
              <Link key={href} href={href} onClick={() => setMenuOpen(false)}>
                {label}
              </Link>
            ))}
            <Link href="/historie" onClick={() => setMenuOpen(false)}>
              Historie
            </Link>
            <Link href="/finaledag" onClick={() => setMenuOpen(false)}>
              Finaledag
            </Link>
            <Link href="/inloggen" onClick={() => setMenuOpen(false)}>
              Demo-rollen
            </Link>
          </nav>
        </div>
      ) : null}

      <main id="main-content">
        {!isKnownPath(path) ? (
          <div className="container not-found">
            <span>404</span>
            <h1>Deze route speelt niet mee</h1>
            <p>De pagina bestaat niet of is verplaatst.</p>
            <Link className="button" href="/">
              Terug naar home
            </Link>
          </div>
        ) : operations && !canAccessRoute(role, path) ? (
          <div className="container permission-state">
            <ShieldCheck size={44} />
            <p className="eyebrow">Rechten gecontroleerd</p>
            <h1>Geen toegang voor {roleLabels[role]}</h1>
            <p>Deze directe route valt buiten de gekozen demo-rol en recordscope.</p>
            <Link className="button" href="/beheer">
              Kies een passende rol
            </Link>
          </div>
        ) : operations ? (
          <OperationsView
            path={path}
            data={data}
            role={role}
            action={action}
            busy={busy}
            switchRole={switchRole}
          />
        ) : (
          <PublicView
            path={path}
            data={data}
            role={role}
            action={action}
            busy={busy}
            switchRole={switchRole}
          />
        )}
      </main>

      {!operations ? (
        <footer className="global-footer">
          <div className="container footer-grid">
            <div>
              <Image
                src="/brand/haaglanden-voetbal-logo.jpg"
                alt="Haaglanden Voetbal"
                width={160}
                height={76}
              />
              <p>Alle toernooien. Alle wedstrijden. Eén Haaglanden.</p>
            </div>
            <nav aria-label="Voetbal">
              <strong>Voetbal</strong>
              <Link href="/wedstrijden">Wedstrijden</Link>
              <Link href="/toernooien">Toernooien</Link>
              <Link href="/clubs">Clubs</Link>
            </nav>
            <nav aria-label="Platform">
              <strong>Platform</strong>
              <Link href="/account">Privacy & voorkeuren</Link>
              <Link href="/inloggen">Demo-toegang</Link>
              <Link href="/beheer">Operations</Link>
            </nav>
            <div>
              <strong>Demo</strong>
              <p>
                Uitsluitend synthetische persoonsgegevens. Geen inzet op productie-identiteiten.
              </p>
            </div>
          </div>
        </footer>
      ) : null}

      <nav className="bottom-nav" aria-label="Mobiele navigatie">
        <Link className={path === "/" ? "active" : ""} href="/">
          <House size={21} />
          Home
        </Link>
        <Link className={path.startsWith("/wedstrijden") ? "active" : ""} href="/wedstrijden">
          <Radio size={21} />
          Live
        </Link>
        <Link className={path.startsWith("/toernooien") ? "active" : ""} href="/toernooien">
          <Trophy size={21} />
          Cups
        </Link>
        <Link className={path.startsWith("/nieuws") ? "active" : ""} href="/nieuws">
          <Newspaper size={21} />
          Nieuws
        </Link>
        <Link
          className={
            path === "/account" || path.startsWith("/next") || path === "/meldingen" ? "active" : ""
          }
          href="/account"
        >
          <Sparkles size={21} />
          Mijn
        </Link>
      </nav>

      {toast ? (
        <div
          className={`toast toast--${toast.tone}`}
          role={toast.tone === "error" ? "alert" : "status"}
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
