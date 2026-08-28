"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronRight,
  CircleUserRound,
  Menu,
  Search,
  ShieldCheck,
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
  "/beheer/vereniging",
  "/beheer/vereniging/teams",
  "/beheer/vereniging/spelerslijsten",
  "/beheer/vereniging/profiel",
  "/beheer/team",
  "/beheer/team/spelerslijst",
  "/beheer/scheidsrechter",
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
    let active = true;
    fetch(`/api/state?surface=${operations ? "operations" : "public"}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("De demostaat kon niet worden geladen.");
        return (await response.json()) as { role: Role; data: AppData };
      })
      .then((json) => {
        if (active) {
          setRole(json.role);
          setData(json.data);
        }
      })
      .catch((error: unknown) => {
        if (active)
          setToast({
            tone: "error",
            message: error instanceof Error ? error.message : "Laden mislukt.",
          });
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
    return (
      <main className="loading-screen" aria-live="polite">
        <Image
          src="/brand/haaglanden-voetbal-logo.jpg"
          alt="Haaglanden Voetbal"
          width={180}
          height={85}
          priority
        />
        <span className="spinner spinner--large" />
        <p>Toernooidata laden…</p>
      </main>
    );
  }

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
              priority
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

      <div className="live-strip" aria-label="Live score ticker">
        <div className="container live-strip__inner">
          <span>
            <span className="live-dot" /> LIVE
          </span>
          <strong>HBS 2–2 Scheveningen</strong>
          <span>78′</span>
          <Link href="/wedstrijden">
            Alle wedstrijden <ChevronRight size={15} />
          </Link>
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
        <Link href="/">
          <Trophy size={19} />
          Home
        </Link>
        <Link href="/wedstrijden">
          <span aria-hidden="true">●</span>Live
        </Link>
        <Link href="/toernooien">
          <Trophy size={19} />
          Cups
        </Link>
        <Link href="/meldingen">
          <Bell size={19} />
          Meldingen
        </Link>
        <Link href="/account">
          <CircleUserRound size={19} />
          Meer
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
