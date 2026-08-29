import Image from "next/image";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Check, Clock3, Radio, ShieldAlert } from "lucide-react";
import type { Club, Match, SeedData, Team } from "@/lib/types";

export type AppData = SeedData & { runtime: NonNullable<SeedData["runtime"]> };
export type ActionHandler = (
  action: string,
  payload?: Record<string, unknown>,
  successMessage?: string,
) => Promise<void>;

export function ClubCrest({ club, size = "md" }: { club?: Club; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      className={`club-crest club-crest--${size}`}
      title={club ? `${club.name} — demo fallback` : "Clublogo niet beschikbaar"}
    >
      <Image
        src="/brand/club-placeholder.svg"
        width={96}
        height={96}
        alt="Generiek clublogo; officieel clublogo niet beschikbaar"
      />
    </span>
  );
}

export function PlayerPhoto({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  return (
    <span className={`player-photo player-photo--${size}`}>
      <Image
        src="/brand/player-placeholder.svg"
        width={72}
        height={88}
        alt={`Neutrale demo-placeholder voor ${name}`}
      />
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone = /officieel|goedgekeurd|gereed|akkoord|finished|allowed|bevestigd|opgelost/.test(
    normalized,
  )
    ? "success"
    : /live/.test(normalized)
      ? "live"
      : /gestaakt|afgekeurd|incident|cancelled|denied|geweigerd|uitgesloten|stopped/.test(
            normalized,
          )
        ? "danger"
        : /wacht|incompleet|afwijking|actie|voorlopig|postponed/.test(normalized)
          ? "warning"
          : "neutral";
  const Icon =
    tone === "success" ? Check : tone === "live" ? Radio : tone === "danger" ? ShieldAlert : Clock3;
  return (
    <span className={`status status--${tone}`}>
      <Icon aria-hidden="true" size={13} /> {status.replaceAll("_", " ")}
    </span>
  );
}

export function MatchScore({ match, compact = false }: { match: Match; compact?: boolean }) {
  const score = match.score ? `${match.score.home} – ${match.score.away}` : "–";
  return (
    <span
      className={`match-score${compact ? " match-score--compact" : ""}`}
      aria-label={`Stand ${score}`}
    >
      {score}
    </span>
  );
}

export function MatchRow({ match, data }: { match: Match; data: AppData }) {
  const homeTeam = data.teams.find((team) => team.id === match.homeTeamId);
  const awayTeam = data.teams.find((team) => team.id === match.awayTeamId);
  const homeClub = data.clubs.find((club) => club.id === homeTeam?.clubId);
  const awayClub = data.clubs.find((club) => club.id === awayTeam?.clubId);
  return (
    <Link
      className="match-row"
      href={match.id === "match_qf_1" ? "/wedstrijden/quick-duindorp-sv" : "/wedstrijden"}
    >
      <span className="match-row__time">
        {new Intl.DateTimeFormat("nl-NL", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Amsterdam",
        }).format(new Date(match.kickoff))}
      </span>
      <span className="match-row__team">
        <ClubCrest club={homeClub} size="sm" /> {homeTeam?.name ?? "Nog te bepalen"}
      </span>
      <MatchScore match={match} compact />
      <span className="match-row__team match-row__team--away">
        {awayTeam?.name ?? "Nog te bepalen"} <ClubCrest club={awayClub} size="sm" />
      </span>
      <StatusBadge
        status={
          match.official && (match.status === "WALKOVER" || match.status === "BYE")
            ? `${match.status} · OFFICIEEL`
            : match.official
              ? "OFFICIEEL"
              : match.status
        }
      />
    </Link>
  );
}

export function Card({
  children,
  className = "",
  title,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`card ${className}`}>
      {title ? (
        <header className="card__header">
          <h2>{title}</h2>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Button({
  className = "",
  children,
  busy,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button
      className={`button ${className}`}
      {...props}
      disabled={busy || props.disabled}
      aria-busy={busy || undefined}
    >
      {busy ? <span className="spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function PageHeader({
  eyebrow,
  title,
  intro,
  actions,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {intro ? <p className="lede">{intro}</p> : null}
      </div>
      {actions ? <div className="page-heading__actions">{actions}</div> : null}
    </header>
  );
}

export function teamDetails(data: AppData, teamId: string | null) {
  const team = data.teams.find((item) => item.id === teamId) as Team | undefined;
  return { team, club: data.clubs.find((club) => club.id === team?.clubId) };
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty-state">
      <span aria-hidden="true">◇</span>
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  );
}
