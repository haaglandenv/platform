"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleUserRound,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  LayoutDashboard,
  Lock,
  MessageSquare,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trophy,
  Upload,
  Users,
} from "lucide-react";
import { roleLabels } from "@/lib/domain";
import type { Role } from "@/lib/types";
import {
  Button,
  Card,
  ClubCrest,
  EmptyState,
  MatchRow,
  PageHeader,
  PlayerPhoto,
  StatusBadge,
  type ActionHandler,
  type AppData,
} from "@/components/ui";

interface Props {
  path: string;
  data: AppData;
  role: Role;
  action: ActionHandler;
  busy: string | null;
  switchRole: (role: Role, destination?: string) => Promise<void>;
}

const roleDestinations: Record<Role, string> = {
  leadership: "/beheer/toernooileiding",
  association: "/beheer/vereniging",
  team: "/beheer/team",
  referee: "/beheer/scheidsrechter",
  supporter: "/next",
};

const navByRole: Record<Exclude<Role, "supporter">, Array<[string, string]>> = {
  leadership: [
    ["/beheer/toernooileiding", "Command Center"],
    ["/beheer/toernooileiding/toernooien", "Toernooien & regels"],
    ["/beheer/toernooileiding/wedstrijden", "Wedstrijden"],
    ["/beheer/toernooileiding/bracket", "Bracket"],
    ["/beheer/toernooileiding/spelerscontrole", "Spelerscontrole"],
    ["/beheer/toernooileiding/uitslagen", "Uitslagen"],
    ["/beheer/toernooileiding/tucht", "Tucht & incidenten"],
    ["/beheer/toernooileiding/audit", "Audit log"],
  ],
  association: [
    ["/beheer/vereniging", "Cluboverzicht"],
    ["/beheer/vereniging/teams", "Teams"],
    ["/beheer/vereniging/spelerslijsten", "Spelerslijsten"],
    ["/beheer/vereniging/profiel", "Profiel & privacy"],
  ],
  team: [
    ["/beheer/team", "Teamoverzicht"],
    ["/beheer/team/spelerslijst", "Spelerslijst"],
    ["/beheer/team/wedstrijden/match_qf_1/opstelling", "Opstelling"],
  ],
  referee: [
    ["/beheer/scheidsrechter", "Aanstellingen"],
    ["/beheer/scheidsrechter/wedstrijden/match_qf_1/controle", "T-60 controle"],
    ["/beheer/scheidsrechter/wedstrijden/match_qf_1/rapport", "Wedstrijdrapport"],
  ],
};

export function OperationsView(props: Props) {
  const { path, role, switchRole, busy } = props;
  if (path === "/beheer") return <RoleHub {...props} />;
  const operationalRole = role === "supporter" ? "team" : role;
  return (
    <div className="operations-shell">
      <aside className="operations-sidebar">
        <div className="operations-role">
          <span>
            <ShieldCheck />
          </span>
          <div>
            <small>Actieve rol</small>
            <strong>{roleLabels[role]}</strong>
          </div>
        </div>
        <nav aria-label="Operations-navigatie">
          {navByRole[operationalRole].map(([href, label], index) => (
            <Link key={href} className={path === href ? "active" : ""} href={href}>
              {index === 0 ? (
                <LayoutDashboard />
              ) : index === 1 ? (
                <Users />
              ) : index === 2 ? (
                <CalendarDays />
              ) : (
                <ClipboardCheck />
              )}
              {label}
            </Link>
          ))}
          <Link className={path === "/beheer/berichten" ? "active" : ""} href="/beheer/berichten">
            <MessageSquare />
            Berichten
          </Link>
          <Link className={path === "/beheer/media" ? "active" : ""} href="/beheer/media">
            <Upload />
            Media
          </Link>
        </nav>
        <label className="role-switch">
          <span>Demo: wissel rol</span>
          <select
            value={role}
            disabled={busy === "switch-role"}
            onChange={(event) => {
              const next = event.target.value as Role;
              void switchRole(next, roleDestinations[next]);
            }}
          >
            <option value="leadership">Toernooileiding</option>
            <option value="association">Verenigingsmanager</option>
            <option value="team">Teammanager</option>
            <option value="referee">Scheidsrechter</option>
            <option value="supporter">Supporter</option>
          </select>
        </label>
      </aside>
      <div className="operations-main">
        <div className="operations-context">
          <span>
            <Trophy size={18} /> Sir Winston Cup · 2026–2027
          </span>
          <StatusBadge status="DEV DEMO" />
        </div>
        {path.startsWith("/beheer/toernooileiding") ? (
          <LeadershipView {...props} />
        ) : path.startsWith("/beheer/vereniging") ? (
          <AssociationView {...props} />
        ) : path.startsWith("/beheer/team") ? (
          <TeamView {...props} />
        ) : path.startsWith("/beheer/scheidsrechter") ? (
          <RefereeView {...props} />
        ) : path === "/beheer/berichten" ? (
          <MessagesView {...props} />
        ) : (
          <OperationsMediaView {...props} />
        )}
      </div>
    </div>
  );
}

function RoleHub({ role, switchRole, busy }: Props) {
  const roles: Array<{ role: Role; detail: string }> = [
    { role: "leadership", detail: "Uitzonderingen, uitslagen, regels en audit" },
    { role: "association", detail: "Teams, managers, profiel en deadlines" },
    { role: "team", detail: "Spelerslijst, opstelling en wedstrijddag" },
    { role: "referee", detail: "Aanstelling, T-60 en rapport" },
  ];
  return (
    <div className="container page-space">
      <PageHeader
        eyebrow="TournamentOS Operations"
        title="Wie neemt de volgende beslissing?"
        intro="De demo-rol verandert de server-side scope. Directe URL’s buiten die scope worden geweigerd."
      />
      <div className="role-hub-grid">
        {roles.map((item) => (
          <button
            className={role === item.role ? "role-hub-card active" : "role-hub-card"}
            disabled={busy === "switch-role"}
            onClick={() => switchRole(item.role, roleDestinations[item.role])}
            key={item.role}
          >
            <ShieldCheck />
            <span>
              <strong>{roleLabels[item.role]}</strong>
              <small>{item.detail}</small>
            </span>
            <ChevronRight />
          </button>
        ))}
      </div>
    </div>
  );
}

function LeadershipView(props: Props) {
  const { path, data, action, busy } = props;
  if (path.endsWith("/spelerscontrole")) return <LeadershipRoster {...props} />;
  if (path.endsWith("/uitslagen")) return <LeadershipResults {...props} />;
  if (path.endsWith("/wedstrijden")) return <MatchOperations {...props} />;
  if (path.endsWith("/toernooien")) return <TournamentRules {...props} />;
  if (path.endsWith("/bracket")) return <OperationsBracket {...props} />;
  if (path.endsWith("/tucht")) return <DisciplineView {...props} />;
  if (path.endsWith("/audit")) return <AuditView {...props} />;
  const match = data.matches.find((item) => item.id === "match_qf_1")!;
  const urgent = data.runtime.discrepancy === "OPEN" || match.status === "FINISHED_PROVISIONAL";
  return (
    <div className="operations-page">
      <PageHeader
        eyebrow="Toernooi Command Center"
        title="Goedenavond, wedstrijdleiding"
        intro="Beslissingen en uitzonderingen staan vóór de statistiek."
        actions={
          <Button
            className="button--outline"
            busy={busy === "reset-demo"}
            onClick={() => {
              if (window.confirm("Volledige demostaat herstellen?"))
                action("reset-demo", {}, "Demo hersteld.");
            }}
          >
            <RotateCcw size={16} /> Reset demo
          </Button>
        }
      />
      <div className="ops-grid">
        <Card
          className="span-8 urgent-panel"
          title={urgent ? "Directe beslissing vereist" : "Operationele kern is stabiel"}
          action={<StatusBadge status={urgent ? "ACTIE VEREIST" : "GEREED"} />}
        >
          {data.runtime.discrepancy === "OPEN" ? (
            <>
              <div className="decision-row">
                <AlertTriangle />
                <div>
                  <h2>Rugnummerafwijking · Mees Hofman</h2>
                  <p>
                    Ingediend als 10, waargenomen als 20. De scheidsrechter kan nog niet goedkeuren.
                  </p>
                </div>
              </div>
              <Link className="button" href="/beheer/toernooileiding/spelerscontrole">
                Neem besluit
              </Link>
            </>
          ) : match.status === "FINISHED_PROVISIONAL" ? (
            <>
              <div className="decision-row">
                <FileCheck2 />
                <div>
                  <h2>Quick 2–1 Duindorp SV</h2>
                  <p>De voorlopige uitslag wacht op officiële bevestiging.</p>
                </div>
              </div>
              <Link className="button" href="/beheer/toernooileiding/uitslagen">
                Bevestig uitslag
              </Link>
            </>
          ) : (
            <>
              <div className="decision-row">
                <ShieldCheck />
                <div>
                  <h2>Geen blokkerende incidenten</h2>
                  <p>Volg de gouden journey via spelerscontrole, livegang en uitslag.</p>
                </div>
              </div>
              <Link
                className="button button--outline"
                href="/beheer/toernooileiding/spelerscontrole"
              >
                Open spelerscontrole
              </Link>
            </>
          )}
        </Card>
        <Card className="span-4" title="Tournament health">
          <strong className="health-score">
            {urgent ? "86" : "96"}
            <small>%</small>
          </strong>
          <div className="progress">
            <i style={{ width: urgent ? "86%" : "96%" }} />
          </div>
          <ul className="mini-list">
            <li>
              <Check /> Teams geregistreerd
            </li>
            <li>
              <Check /> Officials gekoppeld
            </li>
            <li>
              {data.runtime.rosterStatus === "GOEDGEKEURD" ||
              data.runtime.rosterStatus === "VERGRENDELD" ? (
                <Check />
              ) : (
                <Clock3 />
              )}{" "}
              Spelerslijst {data.runtime.rosterStatus.toLowerCase()}
            </li>
          </ul>
        </Card>
        <Card className="span-7" title="Wedstrijden">
          <MatchRow match={match} data={data} />
          {data.matches.slice(1, 4).map((item) => (
            <MatchRow key={item.id} match={item} data={data} />
          ))}
        </Card>
        <Card className="span-5" title="Open taken">
          <ul className="task-list">
            <li>
              <span>01</span>
              <div>
                <strong>Spelerslijst Duindorp SV</strong>
                <small>{data.runtime.rosterStatus}</small>
              </div>
              <Link href="/beheer/toernooileiding/spelerscontrole">Open</Link>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Uitslag Quick – Duindorp SV</strong>
                <small>{match.official ? "OFFICIEEL" : match.status}</small>
              </div>
              <Link href="/beheer/toernooileiding/uitslagen">Open</Link>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Seizoenslock</strong>
                <small>{data.runtime.seasonLocked ? "VERGRENDELD" : "NOG OPEN"}</small>
              </div>
              <Link href="/beheer/toernooileiding/toernooien">Open</Link>
            </li>
          </ul>
        </Card>
        <Card className="span-12" title="Laatste auditactiviteit">
          <AuditTable data={data} limit={5} />
        </Card>
      </div>
    </div>
  );
}

function LeadershipRoster({ data, action, busy }: Props) {
  const version = Math.max(...data.rosters.map((roster) => roster.version));
  return (
    <div className="operations-page">
      <PageHeader
        eyebrow="Speelgerechtigheid"
        title="Spelerscontrole"
        intro="Versies blijven onveranderlijk; uitzonderingen vragen een actor en reden."
      />
      <div className="ops-grid">
        <Card
          className="span-8"
          title={`Duindorp SV 1 · versie ${version}`}
          action={<StatusBadge status={data.runtime.rosterStatus} />}
        >
          <div className="roster-review-summary">
            <ClubCrest club={data.clubs.find((club) => club.id === "club_duindorp")} />
            <div>
              <strong>{data.players.length} spelers</strong>
              <p>
                {data.players.filter((player) => player.reference && player.photo).length} volledig
                · {data.players.filter((player) => !player.reference || !player.photo).length}{" "}
                aandacht
              </p>
              <small>Regels: 18+ op 12 september · registratie geldig · geen schorsing</small>
            </div>
          </div>
          {data.players.slice(-4).map((player) => (
            <div className="player-review-row" key={player.id}>
              <PlayerPhoto name={player.name} size="sm" />
              <span>
                <strong>{player.name}</strong>
                <small>
                  #{player.shirtNumber} · {player.position}
                </small>
              </span>
              <StatusBadge
                status={player.reference && player.photo ? "SPEELGERECHTIG" : "AANVULLING NODIG"}
              />
            </div>
          ))}
          {data.runtime.rosterStatus === "INGEDIEND" ? (
            <div className="button-row">
              <Button
                busy={busy === "approve-roster"}
                onClick={() =>
                  action("approve-roster", {}, "Spelerslijst en alle geldige spelers goedgekeurd.")
                }
              >
                <Check /> Alles goedkeuren
              </Button>
              <Button
                className="button--outline"
                onClick={() =>
                  action("request-correction", {
                    reason: "Controleer de aangeleverde spelersgegevens.",
                  })
                }
              >
                Correctie vragen
              </Button>
            </div>
          ) : null}
        </Card>
        <Card
          className="span-4"
          title="Wedstrijdafwijking"
          action={<StatusBadge status={data.runtime.discrepancy} />}
        >
          {data.runtime.discrepancy === "OPEN" ? (
            <>
              <AlertTriangle size={30} />
              <h2>Nummer 10 / 20</h2>
              <p>De waarneming op locatie wijkt af van het vergrendelde snapshot.</p>
              <Button
                busy={busy === "resolve-discrepancy"}
                onClick={() =>
                  action(
                    "resolve-discrepancy",
                    { reason: "NUMBER_CONFIRMED_AT_VENUE" },
                    "Afwijking met reden opgelost.",
                  )
                }
              >
                Bevestig nummer 20
              </Button>
            </>
          ) : (
            <EmptyState
              title={
                data.runtime.discrepancy === "RESOLVED"
                  ? "Afwijking opgelost"
                  : "Geen open afwijking"
              }
              detail="Een beslissing verschijnt hier zodra de scheidsrechter iets markeert."
            />
          )}
        </Card>
        <Card className="span-12" title="Versiehistorie">
          <table className="data-table">
            <thead>
              <tr>
                <th>Versie</th>
                <th>Status</th>
                <th>Ingediend</th>
                <th>Issues</th>
              </tr>
            </thead>
            <tbody>
              {data.rosters.map((roster) => (
                <tr key={roster.id}>
                  <td>v{roster.version}</td>
                  <td>
                    <StatusBadge status={roster.status} />
                  </td>
                  <td>{roster.submittedAt ? "12 sep 2026" : "Baseline"}</td>
                  <td>{roster.issues.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function LeadershipResults({ data, action, busy }: Props) {
  const match = data.matches.find((item) => item.id === "match_qf_1")!;
  const confirmations = data.runtime.resultConfirmations;
  return (
    <div className="operations-page">
      <PageHeader
        eyebrow="Resultaten"
        title="Uitslagen bevestigen"
        intro="Alleen de officiële status laat een winnaar doorgaan."
      />
      <Card className="result-decision">
        <MatchRow match={match} data={data} />
        <div className="result-decision__checks">
          <span>
            <Check /> Scheidsrechterrapport ontvangen
          </span>
          <span>{confirmations.home ? <Check /> : <Clock3 />} Quick bevestigd</span>
          <span>{confirmations.away ? <Check /> : <Clock3 />} Duindorp SV bevestigd</span>
        </div>
        {match.status === "FINISHED_PROVISIONAL" ? (
          <Button
            busy={busy === "confirm-result"}
            disabled={!confirmations.home || !confirmations.away}
            title={
              !confirmations.home || !confirmations.away
                ? "Wacht op bevestiging van beide teams"
                : undefined
            }
            onClick={() => {
              if (window.confirm("Quick 2–1 Duindorp SV officieel maken en de bracket bijwerken?"))
                action("confirm-result", {}, "Uitslag officieel; Quick is doorgeschoven.");
            }}
          >
            Maak uitslag officieel
          </Button>
        ) : match.official ? (
          <div className="notice notice--success">
            <ShieldCheck />
            Uitslag is officieel en Quick staat in de halve finale.
          </div>
        ) : (
          <EmptyState
            title="Nog geen voorlopige uitslag"
            detail="De scheidsrechter dient eerst het wedstrijdrapport in."
          />
        )}
      </Card>
    </div>
  );
}

function MatchOperations({ data, action, busy }: Props) {
  const match = data.matches.find((item) => item.id === "match_qf_1")!;
  const [kickoff, setKickoff] = useState(match.kickoff.slice(0, 16));
  const [venue, setVenue] = useState(match.venue);
  return (
    <div className="operations-page">
      <PageHeader
        eyebrow="Match Operations"
        title="Wedstrijdprogramma"
        intro="Wijzigingen, staking en hervatting worden gelogd en overal doorgezet."
      />
      <Card>
        <MatchRow match={match} data={data} />
        <div className="button-row">
          <Button
            busy={busy === "start-match"}
            disabled={data.runtime.lineupStatus !== "AKKOORD" || match.status === "LIVE"}
            title={
              data.runtime.lineupStatus !== "AKKOORD"
                ? "Beide opstellingen moeten akkoord zijn"
                : undefined
            }
            onClick={() => action("start-match", {}, "Wedstrijd staat live.")}
          >
            Start live
          </Button>
          <Button
            className="button--outline"
            busy={busy === "match-state"}
            onClick={() =>
              action(
                "match-state",
                { status: "POSTPONED", reason: "FIELD_UNPLAYABLE" },
                "Wedstrijd afgelast en meldingen verstuurd.",
              )
            }
          >
            Afgelasten
          </Button>
          <Button
            className="button--outline"
            busy={busy === "match-state"}
            onClick={() => {
              if (window.confirm("Wedstrijd definitief annuleren?"))
                action(
                  "match-state",
                  { status: "CANCELLED", reason: "ORGANISATIONAL" },
                  "Wedstrijd geannuleerd; betrokkenen zijn geïnformeerd.",
                );
            }}
          >
            Annuleren
          </Button>
          <Button
            className="button--danger-outline"
            busy={busy === "match-state"}
            onClick={() =>
              action(
                "match-state",
                { status: "STOPPED", reason: "PUBLIC_ORDER" },
                "Stakingssnapshot opgeslagen.",
              )
            }
          >
            Wedstrijd staken
          </Button>
          <Button
            className="button--outline"
            busy={busy === "match-state"}
            disabled={match.status !== "STOPPED"}
            onClick={() =>
              action(
                "match-state",
                { status: "SCHEDULED", reason: "SAFE_TO_RESUME" },
                "Hervatting gepland.",
              )
            }
          >
            Hervatting plannen
          </Button>
        </div>
        <p className="form-help">
          Een blokkerende status toont publiek uitsluitend een veilige, beperkte boodschap.
        </p>
      </Card>
      <Card title="Programma wijzigen">
        <form
          className="stack-form"
          onSubmit={(event) => {
            event.preventDefault();
            void action(
              "update-fixture",
              { kickoff: `${kickoff}:00+02:00`, venue },
              "Aftrap en locatie bijgewerkt.",
            );
          }}
        >
          <label>
            <span>Aftrap</span>
            <input
              type="datetime-local"
              value={kickoff}
              onChange={(event) => setKickoff(event.target.value)}
              required
            />
          </label>
          <label>
            <span>Locatie</span>
            <input value={venue} onChange={(event) => setVenue(event.target.value)} required />
          </label>
          <Button busy={busy === "update-fixture"}>Wijzig programma</Button>
        </form>
      </Card>
      <Card title="Reglementair besluit">
        <p>
          Leg een walkover zonder fictieve score vast. De reden wordt in de auditlog opgeslagen.
        </p>
        <Button
          className="button--danger-outline"
          busy={busy === "regulatory-result"}
          disabled={match.official}
          onClick={() => {
            if (window.confirm("Quick als officiële winnaar wegens niet-opkomen vastleggen?"))
              action(
                "regulatory-result",
                { reason: "TEAM_NO_SHOW" },
                "Reglementaire walkover zonder score vastgelegd.",
              );
          }}
        >
          Walkover wegens niet-opkomen
        </Button>
      </Card>
      <Card title="Digitale wedstrijdmap">
        <dl className="info-list">
          <div>
            <dt>Locatie</dt>
            <dd>
              {match.venue} · {match.field}
            </dd>
          </div>
          <div>
            <dt>Reglement</dt>
            <dd>Versie 2.1 · direct strafschoppen</dd>
          </div>
          <div>
            <dt>Scheidsrechter</dt>
            <dd>Demo Scheidsrechter · bevestigd</dd>
          </div>
          <div>
            <dt>Opstellingen</dt>
            <dd>{data.runtime.lineupStatus}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}

function TournamentRules({ data, action, busy }: Props) {
  const [duration, setDuration] = useState("2 × 45 minuten");
  const [tournamentName, setTournamentName] = useState("Haaglanden Wintercup 2027");
  const [format, setFormat] = useState("KNOCKOUT");
  const [manager, setManager] = useState(data.runtime.teamAssignment);
  return (
    <div className="operations-page">
      <PageHeader
        eyebrow="Regels & governance"
        title="Sir Winston Cup configureren"
        intro="Regels hebben een versie en ingangsdatum."
      />
      <div className="ops-grid">
        <Card className="span-7" title="Nieuw toernooi">
          <form
            className="stack-form"
            onSubmit={(event) => {
              event.preventDefault();
              void action(
                "create-tournament",
                { name: tournamentName, format },
                "Toernooi als concept aangemaakt.",
              );
            }}
          >
            <label>
              <span>Naam</span>
              <input
                value={tournamentName}
                onChange={(event) => setTournamentName(event.target.value)}
                required
              />
            </label>
            <label>
              <span>Opzet</span>
              <select value={format} onChange={(event) => setFormat(event.target.value)}>
                <option value="KNOCKOUT">Knock-out</option>
                <option value="GROUP_KNOCKOUT">Poule + knock-out</option>
              </select>
            </label>
            <Button busy={busy === "create-tournament"}>Maak concepttoernooi</Button>
          </form>
          {data.runtime.draftTournaments.map((tournament) => (
            <p className="form-help" key={tournament.id}>
              {tournament.name} · {tournament.format} · {tournament.status}
            </p>
          ))}
        </Card>
        <Card className="span-5" title="Teamverantwoordelijke">
          <form
            className="stack-form"
            onSubmit={(event) => {
              event.preventDefault();
              void action("assign-team", { manager }, "Teamverantwoordelijke toegewezen.");
            }}
          >
            <label>
              <span>Duindorp SV 1</span>
              <input
                value={manager}
                onChange={(event) => setManager(event.target.value)}
                required
              />
            </label>
            <Button busy={busy === "assign-team"}>Wijs toe</Button>
          </form>
          <p className="form-help">Huidige toewijzing: {data.runtime.teamAssignment}</p>
        </Card>
        <Card className="span-7" title="Reglementversie 2.1">
          <form
            className="stack-form"
            onSubmit={(event) => {
              event.preventDefault();
              void action(
                "send-message",
                { body: `Regelconcept opgeslagen: ${duration}` },
                "Regelconcept opgeslagen in de lokale demo.",
              );
            }}
          >
            <label>
              <span>Wedstrijdduur</span>
              <select value={duration} onChange={(event) => setDuration(event.target.value)}>
                <option>2 × 45 minuten</option>
                <option>2 × 30 minuten</option>
              </select>
            </label>
            <label>
              <span>Gelijke stand</span>
              <select>
                <option>Direct strafschoppen</option>
                <option>Verlenging en strafschoppen</option>
              </select>
            </label>
            <label>
              <span>Ingangsdatum</span>
              <input type="date" defaultValue="2026-08-01" />
            </label>
            <Button busy={busy === "send-message"}>Sla conceptversie op</Button>
          </form>
        </Card>
        <Card className="span-5" title="Finalisatie & lock">
          <p>De seizoenslock blokkeert alle mutaties en vraagt een apart bevestigingsmoment.</p>
          <Button
            busy={busy === "finalize-tournament"}
            disabled={data.runtime.tournamentFinalized}
            onClick={() => action("finalize-tournament", {}, "Toernooi gefinaliseerd.")}
          >
            {data.runtime.tournamentFinalized ? "Gefinaliseerd" : "Finaliseer toernooi"}
          </Button>
          <Button
            className="button--outline"
            busy={busy === "lock-season"}
            disabled={!data.runtime.tournamentFinalized || data.runtime.seasonLocked}
            onClick={() => {
              if (window.confirm("Seizoen definitief vergrendelen?"))
                action("lock-season", { reason: "SEASON_COMPLETE" }, "Seizoen vergrendeld.");
            }}
          >
            <Lock />
            {data.runtime.seasonLocked ? "Seizoen vergrendeld" : "Vergrendel seizoen"}
          </Button>
        </Card>
      </div>
    </div>
  );
}

function OperationsBracket({ data }: Props) {
  const qf = data.matches.find((match) => match.id === "match_qf_1")!;
  const sf = data.matches.find((match) => match.id === "match_sf_1")!;
  return (
    <div className="operations-page">
      <PageHeader
        eyebrow="Bracket integrity"
        title="Loting & doorgang"
        intro="De volgende positie leest uitsluitend de officiële winnaar."
      />
      <div className="integrity-flow">
        <Card>
          <h2>Kwartfinale 1</h2>
          <MatchRow match={qf} data={data} />
        </Card>
        <ArrowRight />
        <Card>
          <h2>Halve finale 1</h2>
          <MatchRow match={sf} data={data} />
        </Card>
      </div>
      <Card title="Integriteitscontrole">
        <ul className="mini-list">
          <li>
            <Check /> Officiële status vereist
          </li>
          <li>
            <Check /> Strafschoppen apart opgeslagen
          </li>
          <li>
            <Check /> Walkover en bye hebben eigen status
          </li>
          <li>
            <ShieldAlert /> Handmatige override vraagt reden en audit
          </li>
        </ul>
      </Card>
    </div>
  );
}

function DisciplineView({ action, busy }: Props) {
  const [reason, setReason] = useState("Onrust langs het veld");
  return (
    <div className="operations-page">
      <PageHeader
        eyebrow="Incident Center"
        title="Tucht & dossiers"
        intro="Publieke samenvattingen blijven gescheiden van interne notities."
      />
      <div className="ops-grid">
        <Card
          className="span-7"
          title="Open dossier · INC-2026-014"
          action={<StatusBadge status="IN BEHANDELING" />}
        >
          <div className="decision-row">
            <ShieldAlert />
            <div>
              <h2>Wedstrijd tijdelijk gestaakt</h2>
              <p>Intern dossier met actor, minuut, stand en hervattingscontext.</p>
            </div>
          </div>
          <label className="full-label">
            <span>Interne reden</span>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          <Button
            busy={busy === "send-message"}
            onClick={() =>
              action(
                "send-message",
                { body: `Dossiernotitie: ${reason}` },
                "Dossiernotitie opgeslagen.",
              )
            }
          >
            Sla dossiernotitie op
          </Button>
        </Card>
        <Card className="span-5" title="Reglementaire uitslag">
          <p>Een 3–0-besluit vereist een reason code en publiceert geen private dossierdetails.</p>
          <StatusBadge status="GEEN BESLUIT" />
        </Card>
      </div>
    </div>
  );
}

function AuditView({ data }: Props) {
  return (
    <div className="operations-page">
      <PageHeader
        eyebrow="Platform governance"
        title="Audit log"
        intro="Consequente handelingen zijn herleidbaar tot actor, scope en state-overgang."
      />
      <Card>
        <AuditTable data={data} />
      </Card>
    </div>
  );
}
function AuditTable({ data, limit }: { data: AppData; limit?: number }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Tijd</th>
            <th>Actor</th>
            <th>Actie</th>
            <th>Entiteit</th>
            <th>Overgang</th>
            <th>Reden</th>
          </tr>
        </thead>
        <tbody>
          {data.runtime.audit.slice(0, limit).map((event) => (
            <tr key={event.id}>
              <td>
                {new Intl.DateTimeFormat("nl-NL", {
                  dateStyle: "short",
                  timeStyle: "short",
                  timeZone: "Europe/Amsterdam",
                }).format(new Date(event.timestamp))}
              </td>
              <td>{roleLabels[event.actor]}</td>
              <td>{event.action}</td>
              <td>{event.entity}</td>
              <td>
                {event.before} → {event.after}
              </td>
              <td>{event.reason ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AssociationView(props: Props) {
  const { path, data } = props;
  if (path.endsWith("/profiel")) return <AssociationProfile {...props} />;
  if (path.endsWith("/teams")) return <AssociationTeams {...props} />;
  if (path.endsWith("/spelerslijsten")) return <AssociationRosters {...props} />;
  return (
    <div className="operations-page">
      <PageHeader
        eyebrow="Club Tournament Hub"
        title="Duindorp SV"
        intro="Teams, managers en deadlines in één clubscope."
      />
      <div className="ops-grid">
        <Card
          className="span-8 next-action"
          title="Eerstvolgende clubactie"
          action={<StatusBadge status={data.runtime.rosterStatus} />}
        >
          <h2>
            {data.runtime.rosterStatus === "INCOMPLEET"
              ? "Spelerslijst bevat een ontbrekende foto"
              : "Volg de voortgang van Duindorp SV 1"}
          </h2>
          <p>
            De verenigingsmanager ziet volledigheid en versies, maar herschrijft geen ingediende
            speleridentiteit.
          </p>
          <Link className="button" href="/beheer/vereniging/spelerslijsten">
            Open spelerslijsten
          </Link>
        </Card>
        <Card className="span-4" title="Clubcompliance">
          <strong className="health-score">
            94<small>%</small>
          </strong>
          <div className="progress">
            <i style={{ width: "94%" }} />
          </div>
          <p>
            Contactprivacy staat op{" "}
            <b>{data.runtime.clubProfile.contactVisible ? "zichtbaar" : "afgeschermd"}</b>.
          </p>
        </Card>
        <Card className="span-6" title="Geregistreerde teams">
          <div className="team-record">
            <ClubCrest club={data.clubs.find((club) => club.id === "club_duindorp")} />
            <span>
              <strong>Duindorp SV 1</strong>
              <small>Sir Winston Cup · manager toegewezen</small>
            </span>
            <StatusBadge status="INGESCHREVEN" />
          </div>
        </Card>
        <Card className="span-6" title="Komende wedstrijd">
          <MatchRow match={data.matches.find((match) => match.id === "match_qf_1")!} data={data} />
        </Card>
      </div>
    </div>
  );
}

function AssociationRosters({ data, action, busy }: Props) {
  return (
    <div className="operations-page">
      <PageHeader
        eyebrow="Versie-overzicht"
        title="Spelerslijsten"
        intro="Controleer status, deadline en correctieverzoeken binnen de eigen club."
      />
      <Card>
        <div className="record-row">
          <span>
            <strong>Duindorp SV 1</strong>
            <small>
              Laatste versie: {Math.max(...data.rosters.map((roster) => roster.version))}
            </small>
          </span>
          <StatusBadge status={data.runtime.rosterStatus} />
          <Link href="/beheer/team/spelerslijst">Bekijk als teammanager</Link>
        </div>
        {data.runtime.rosterStatus === "INGEDIEND" ? (
          <Button
            className="button--outline"
            busy={busy === "request-correction"}
            onClick={() =>
              action(
                "request-correction",
                { reason: "Vereniging vraagt controle van de pasfoto." },
                "Correctieverzoek verstuurd.",
              )
            }
          >
            Vraag correctie
          </Button>
        ) : null}
      </Card>
    </div>
  );
}

function AssociationTeams({ data, action, busy }: Props) {
  return (
    <div className="operations-page">
      <PageHeader eyebrow="Teamregistratie" title="Teams & managers" />
      <Card>
        <div className="team-record">
          <ClubCrest club={data.clubs.find((club) => club.id === "club_duindorp")} />
          <span>
            <strong>Duindorp SV 1</strong>
            <small>Demo Teammanager · Sir Winston Cup</small>
          </span>
          <StatusBadge status={data.runtime.clubProfile.excluded ? "UITGESLOTEN" : "ACTIEF"} />
        </div>
        <Button
          className="button--danger-outline"
          busy={busy === "toggle-exclusion"}
          onClick={() => {
            if (window.confirm("Status van clubdeelname wijzigen en loggen?"))
              action("toggle-exclusion", {}, "Clubdeelname bijgewerkt.");
          }}
        >
          {data.runtime.clubProfile.excluded ? "Herstel deelname" : "Sluit deelname uit"}
        </Button>
      </Card>
    </div>
  );
}

function AssociationProfile({ data, action, busy }: Props) {
  const [note, setNote] = useState(data.runtime.clubProfile.venueNote);
  const [visible, setVisible] = useState(data.runtime.clubProfile.contactVisible);
  return (
    <div className="operations-page">
      <PageHeader eyebrow="Clubdata" title="Profiel, locatie & privacy" />
      <Card>
        <form
          className="stack-form"
          onSubmit={(event) => {
            event.preventDefault();
            void action(
              "save-club-profile",
              { venueNote: note, contactVisible: visible },
              "Clubprofiel opgeslagen.",
            );
          }}
        >
          <label>
            <span>Locatie-instructie</span>
            <input value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          <label className="check-control">
            <input
              type="checkbox"
              checked={visible}
              onChange={(event) => setVisible(event.target.checked)}
            />
            <span>Toon operationeel clubcontact aan geautoriseerde toernooirollen</span>
          </label>
          <Button busy={busy === "save-club-profile"}>Profiel opslaan</Button>
        </form>
      </Card>
      <Card title="Contactprivacy">
        <p>
          Contactgegevens verschijnen nooit op publieke clubroutes. Deze instelling regelt
          uitsluitend doelgerichte operationele toegang.
        </p>
        <StatusBadge status={visible ? "DOELGERICHT ZICHTBAAR" : "AFGESCHERMD"} />
      </Card>
    </div>
  );
}

function TeamView(props: Props) {
  const { path, data, action, busy } = props;
  if (path.endsWith("/spelerslijst")) return <RosterEditor {...props} />;
  if (path.endsWith("/opstelling")) return <LineupEditor {...props} />;
  const match = data.matches.find((item) => item.id === "match_qf_1")!;
  return (
    <div className="operations-page">
      <PageHeader
        eyebrow="Matchday Team Hub"
        title="Duindorp SV 1"
        intro="De eerstvolgende verplichte actie staat vooraan."
      />
      <div className="ops-grid">
        <Card
          className="span-8 next-action"
          title="Volgende actie"
          action={<StatusBadge status={data.runtime.rosterStatus} />}
        >
          <span className="task-number">01</span>
          <h2>
            {data.runtime.rosterStatus === "INCOMPLEET"
              ? "Maak de spelerslijst compleet"
              : data.runtime.rosterStatus === "GOEDGEKEURD"
                ? "Stel de wedstrijdselectie samen"
                : "Volg de ingediende lijst"}
          </h2>
          <p>
            {data.runtime.rosterStatus === "INCOMPLEET"
              ? "Niels Kramer mist een pasfoto en referentienummer."
              : "Quick – Duindorp SV · zaterdag 20:00"}
          </p>
          <Link
            className="button"
            href={
              data.runtime.rosterStatus === "GOEDGEKEURD"
                ? "/beheer/team/wedstrijden/match_qf_1/opstelling"
                : "/beheer/team/spelerslijst"
            }
          >
            Open taak
          </Link>
        </Card>
        <Card className="span-4" title="Gereedheid">
          <strong className="health-score">
            {data.runtime.rosterStatus === "INCOMPLEET"
              ? "72"
              : data.runtime.lineupStatus === "AKKOORD"
                ? "100"
                : "92"}
            <small>%</small>
          </strong>
          <div className="progress">
            <i style={{ width: data.runtime.rosterStatus === "INCOMPLEET" ? "72%" : "92%" }} />
          </div>
        </Card>
        <Card className="span-7" title="Volgende wedstrijd">
          <MatchRow match={match} data={data} />
        </Card>
        <Card className="span-5" title="Voor deze wedstrijd">
          <ul className="mini-list">
            <li>
              <Check /> 2 × 45 minuten
            </li>
            <li>
              <Check /> Direct strafschoppen
            </li>
            <li>
              <Check /> Neutrale scheidsrechter
            </li>
            <li>
              <Check /> Maximaal 18 spelers
            </li>
          </ul>
        </Card>
        {match.status === "FINISHED_PROVISIONAL" ? (
          <Card className="span-12 next-action" title="Voorlopige uitslag bevestigen">
            <p>
              De scheidsrechter rapporteerde Quick 2–1 Duindorp SV. Bevestig namens Duindorp SV
              voordat de toernooileiding de uitslag officieel maakt.
            </p>
            <Button
              busy={busy === "confirm-team-result"}
              disabled={data.runtime.resultConfirmations.away}
              onClick={() => {
                if (window.confirm("Quick 2–1 Duindorp SV namens het team bevestigen?"))
                  action("confirm-team-result", {}, "Uitslag namens Duindorp SV bevestigd.");
              }}
            >
              {data.runtime.resultConfirmations.away
                ? "Uitslag bevestigd"
                : "Bevestig voorlopige uitslag"}
            </Button>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function RosterEditor({ data, action, busy }: Props) {
  const [reference, setReference] = useState(
    data.players.find((player) => player.id === "p_ds_18")?.reference ?? "",
  );
  const [preview, setPreview] = useState(false);
  const complete = data.players.filter((player) => player.reference && player.photo).length;
  return (
    <div className="operations-page">
      <PageHeader
        eyebrow="Spelersregistratie"
        title="Officiële spelerslijst"
        intro="Synthetische volwassenen · DEV-opslag is geen veilige productie-identiteitsopslag."
        actions={<StatusBadge status={data.runtime.rosterStatus} />}
      />
      <Card className="roster-progress">
        <div>
          <strong>
            {complete} van {data.players.length} compleet
          </strong>
          <p>Versie {Math.max(...data.rosters.map((roster) => roster.version))}</p>
        </div>
        <div className="progress">
          <i style={{ width: `${(complete / data.players.length) * 100}%` }} />
        </div>
      </Card>
      <Card>
        {data.players.map((player) => (
          <div
            className={
              player.id === "p_ds_18" ? "roster-player roster-player--attention" : "roster-player"
            }
            key={player.id}
          >
            <PlayerPhoto name={player.name} />
            <span className="roster-player__identity">
              <strong>{player.name}</strong>
              <small>
                {player.position} · #{player.shirtNumber}
              </small>
            </span>
            <span>
              <small>Referentie</small>
              <strong>{player.reference ?? "Ontbreekt"}</strong>
            </span>
            <StatusBadge status={player.reference && player.photo ? "COMPLEET" : "AANVULLEN"} />
          </div>
        ))}
      </Card>
      {data.runtime.rosterStatus === "INCOMPLEET" || data.runtime.rosterStatus === "CONCEPT" ? (
        <Card title="Niels Kramer aanvullen">
          <form
            className="roster-fix-form"
            onSubmit={(event) => {
              event.preventDefault();
              void action("fix-player", { reference }, "Speler compleet; concept opgeslagen.");
            }}
          >
            <div className="photo-preview">
              {preview ? <PlayerPhoto name="Niels Kramer" /> : <Upload />}
              <label className="button button--outline">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => setPreview(Boolean(event.target.files?.length))}
                  required={!preview}
                />
                {preview ? "Foto vervangen" : "Kies lokale pasfoto"}
              </label>
              {preview ? (
                <Button type="button" className="button--text" onClick={() => setPreview(false)}>
                  Verwijder preview
                </Button>
              ) : null}
            </div>
            <label>
              <span>KNVB-/referentienummer</span>
              <input
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="HV-D1018"
                required
                minLength={4}
              />
            </label>
            <Button busy={busy === "fix-player"} disabled={!preview}>
              Speler opslaan
            </Button>
          </form>
        </Card>
      ) : null}
      {data.runtime.rosterStatus === "CONCEPT" ? (
        <div className="sticky-action">
          <div>
            <strong>Alle verplichte gegevens zijn compleet</strong>
            <small>Indienen maakt versie 2 onveranderlijk.</small>
          </div>
          <Button
            busy={busy === "submit-roster"}
            onClick={() => {
              if (window.confirm("Spelerslijst als nieuwe versie indienen?"))
                action("submit-roster", {}, "Spelerslijst versie 2 ingediend.");
            }}
          >
            Dien spelerslijst in
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function LineupEditor({ data, action, busy }: Props) {
  const initial = data.runtime.selectedPlayerIds.length
    ? data.runtime.selectedPlayerIds
    : data.players.slice(0, 18).map((player) => player.id);
  const [selected, setSelected] = useState<string[]>(initial);
  const toggle = (id: string) =>
    setSelected((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id],
    );
  const locked =
    data.runtime.lineupStatus !== "NIET_GESTART" && data.runtime.lineupStatus !== "CONCEPT";
  return (
    <div className="operations-page">
      <PageHeader
        eyebrow="Quick – Duindorp SV"
        title="Wedstrijdopstelling"
        intro="Selecteer maximaal 18 speelgerechtigde spelers."
        actions={<StatusBadge status={data.runtime.lineupStatus} />}
      />
      <div className="lineup-summary">
        <span>
          <strong>{Math.min(selected.length, 11)}</strong> basis
        </span>
        <span>
          <strong>{Math.max(0, selected.length - 11)}</strong> wissels
        </span>
        <span>
          <strong>{selected.length}</strong> totaal
        </span>
      </div>
      <Card>
        {data.players.map((player, index) => (
          <label className="selection-player" key={player.id}>
            <input
              type="checkbox"
              checked={selected.includes(player.id)}
              disabled={locked}
              onChange={() => toggle(player.id)}
            />
            <PlayerPhoto name={player.name} size="sm" />
            <span>
              <strong>{player.name}</strong>
              <small>
                #{player.shirtNumber} · {player.position}
              </small>
            </span>
            {index === 0 ? (
              <StatusBadge status="KEEPER" />
            ) : index === 3 ? (
              <StatusBadge status="AANVOERDER" />
            ) : (
              <StatusBadge status="SPEELGERECHTIG" />
            )}
          </label>
        ))}
      </Card>
      <div className="sticky-action">
        <div>
          <strong>
            {selected.length === 18
              ? "Selectie voldoet"
              : "Selecteer 18 spelers voor de seeded journey"}
          </strong>
          <small>Unieke rugnummers en team-scope worden ook server-side gecontroleerd.</small>
        </div>
        <Button
          busy={busy === "submit-lineup"}
          disabled={locked || selected.length !== 18}
          onClick={() => {
            if (window.confirm("Opstelling indienen en vergrendelen?"))
              action(
                "submit-lineup",
                { playerIds: selected },
                "Opstelling ingediend en vergrendeld.",
              );
          }}
        >
          {locked ? "Opstelling vergrendeld" : "Indienen & vergrendelen"}
        </Button>
      </div>
    </div>
  );
}

function RefereeView(props: Props) {
  const { path, data, action, busy } = props;
  if (path.endsWith("/controle")) return <RefereeControl {...props} />;
  if (path.endsWith("/rapport")) return <RefereeReport {...props} />;
  const match = data.matches.find((item) => item.id === "match_qf_1")!;
  const t60Open = data.runtime.clockPreset !== "preT60";
  return (
    <div className="operations-page referee-page">
      <PageHeader
        eyebrow="Referee Match Center"
        title="Mijn volgende aanstelling"
        intro="Alleen de toegewezen wedstrijd en het exacte selectiesnapshot zijn beschikbaar."
      />
      <Card className="referee-assignment">
        <p className="eyebrow">Sir Winston Cup · kwartfinale</p>
        <MatchRow match={match} data={data} />
        <div className="readiness">
          <strong>{data.runtime.lineupStatus === "AKKOORD" ? "100%" : "84%"} MATCH READY</strong>
          <div className="progress">
            <i style={{ width: data.runtime.lineupStatus === "AKKOORD" ? "100%" : "84%" }} />
          </div>
        </div>
        <ul className="mini-list">
          <li>
            <Check /> Locatie bevestigd
          </li>
          <li>
            <Check /> Reglement beschikbaar
          </li>
          <li>
            {data.runtime.lineupStatus === "NIET_GESTART" ? <Clock3 /> : <Check />} Opstelling
            Duindorp SV
          </li>
        </ul>
        <Link
          className={
            t60Open && data.runtime.lineupStatus !== "NIET_GESTART"
              ? "button"
              : "button button--disabled"
          }
          aria-disabled={!t60Open || data.runtime.lineupStatus === "NIET_GESTART"}
          href={
            t60Open && data.runtime.lineupStatus !== "NIET_GESTART"
              ? "/beheer/scheidsrechter/wedstrijden/match_qf_1/controle"
              : "/beheer/scheidsrechter"
          }
        >
          {t60Open ? "Open T-60 controle" : "Controle opent om 19:00"}
        </Link>
      </Card>
      <Card title="Demo-klok">
        <div className="segmented">
          {["preT60", "t60", "live78", "postMatch"].map((preset) => (
            <Button
              className={data.runtime.clockPreset === preset ? "active" : ""}
              busy={busy === "set-clock"}
              key={preset}
              onClick={() => action("set-clock", { preset }, `Demoklok: ${preset}`)}
            >
              {preset}
            </Button>
          ))}
        </div>
        <p className="form-help">
          Europe/Amsterdam · expliciete reviewbesturing, nooit vertrouwd als productieklok.
        </p>
      </Card>
    </div>
  );
}

function RefereeControl({ data, action, busy }: Props) {
  const checked = Object.values(data.runtime.checks).filter(
    (status) => status === "AKKOORD",
  ).length;
  const total = data.runtime.selectedPlayerIds.length;
  const canApprove =
    total > 0 &&
    checked === total &&
    data.runtime.discrepancy !== "OPEN" &&
    data.runtime.lineupStatus === "T60_CONTROLE";
  return (
    <div className="operations-page referee-page">
      <PageHeader
        eyebrow="T-60 · exact snapshot"
        title="Spelerscontrole"
        intro="De scheidsrechter controleert, maar wijzigt nooit identiteit of registratie."
        actions={<StatusBadge status={data.runtime.lineupStatus} />}
      />
      {data.runtime.lineupStatus === "INGEDIEND" ? (
        <Card className="gate-card">
          <Clock3 size={34} />
          <h2>Controle is beschikbaar</h2>
          <p>De demo staat op of na T-60.</p>
          <Button
            busy={busy === "open-t60"}
            onClick={() => action("open-t60", {}, "T-60 controle geopend.")}
          >
            Open vergrendeld snapshot
          </Button>
        </Card>
      ) : null}
      {["T60_CONTROLE", "AFWIJKING", "AKKOORD", "OFFICIEEL"].includes(data.runtime.lineupStatus) ? (
        <>
          <Card className="check-progress">
            <div>
              <strong>
                {checked} van {total} spelers akkoord
              </strong>
              <p>
                {data.runtime.discrepancy === "OPEN"
                  ? "1 afwijking vereist actie"
                  : "Exacte ingediende versie"}
              </p>
            </div>
            <div className="progress">
              <i style={{ width: total ? `${(checked / total) * 100}%` : "0%" }} />
            </div>
          </Card>
          {data.runtime.selectedPlayerIds.map((id) => {
            const player = data.players.find((item) => item.id === id);
            if (!player) return null;
            const status = data.runtime.checks[id];
            return (
              <div
                className={
                  status === "AFWIJKING" ? "referee-player referee-player--flag" : "referee-player"
                }
                key={id}
              >
                <PlayerPhoto name={player.name} />
                <span>
                  <strong>{player.name}</strong>
                  <small>
                    #{player.shirtNumber} · {player.position}
                  </small>
                </span>
                <StatusBadge status={status ?? "OPEN"} />
                {data.runtime.lineupStatus !== "AKKOORD" &&
                data.runtime.lineupStatus !== "OFFICIEEL" ? (
                  <div className="referee-actions">
                    <Button
                      className="button--outline"
                      busy={busy === "check-player"}
                      onClick={() => action("check-player", { playerId: id, status: "AKKOORD" })}
                    >
                      Akkoord
                    </Button>
                    <Button
                      className="button--outline"
                      busy={busy === "check-player"}
                      onClick={() =>
                        action("check-player", { playerId: id, status: "NIET_AANWEZIG" })
                      }
                    >
                      Niet aanwezig
                    </Button>
                    <Button
                      className="button--danger-outline"
                      busy={busy === "check-player"}
                      onClick={() => action("check-player", { playerId: id, status: "AFWIJKING" })}
                    >
                      Wijkt af
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
          <div className="sticky-action">
            <div>
              <strong>
                {canApprove ? "Alle controles zijn opgelost" : "Goedkeuring nog geblokkeerd"}
              </strong>
              <small>
                {data.runtime.discrepancy === "OPEN"
                  ? "Toernooileiding moet de afwijking besluiten."
                  : `${checked}/${total} akkoord`}
              </small>
            </div>
            {total > 0 && checked === 0 ? (
              <Button
                className="button--outline"
                busy={busy === "check-all"}
                onClick={() =>
                  action(
                    "check-all",
                    {},
                    "Alle spelers gecontroleerd; één seeded afwijking gemarkeerd.",
                  )
                }
              >
                Voer seeded controle uit
              </Button>
            ) : null}
            <Button
              busy={busy === "approve-lineups"}
              disabled={!canApprove}
              onClick={() => {
                if (window.confirm("Beide opstellingen definitief goedkeuren?"))
                  action("approve-lineups", {}, "Opstellingen definitief goedgekeurd.");
              }}
            >
              Definitief goedkeuren
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function RefereeReport({ data, action, busy }: Props) {
  const match = data.matches.find((item) => item.id === "match_qf_1")!;
  const [publicSummary, setPublicSummary] = useState(
    data.runtime.matchReport.publicSummary || "Quick wint de kwartfinale met 2–1.",
  );
  const [internalNote, setInternalNote] = useState(data.runtime.matchReport.internalNote);
  return (
    <div className="operations-page referee-page">
      <PageHeader
        eyebrow="Na de wedstrijd"
        title="Digitaal wedstrijdrapport"
        intro="Uitslag, gebeurtenissen en incidenten vormen één voorlopig rapport."
      />
      <Card>
        <MatchRow match={match} data={data} />
        <div className="report-score">
          <span>Quick</span>
          <strong>2 – 1</strong>
          <span>Duindorp SV</span>
        </div>
        <label className="full-label">
          <span>Publieke samenvatting</span>
          <textarea
            value={publicSummary}
            onChange={(event) => setPublicSummary(event.target.value)}
          />
        </label>
        <label className="full-label">
          <span>Interne notitie (niet publiek)</span>
          <textarea
            value={internalNote}
            onChange={(event) => setInternalNote(event.target.value)}
            placeholder="Alleen indien nodig"
          />
        </label>
        {match.status !== "FINISHED_PROVISIONAL" && !match.official ? (
          <Button
            busy={busy === "submit-result"}
            disabled={data.runtime.lineupStatus !== "AKKOORD"}
            onClick={() => {
              if (window.confirm("Quick 2–1 als voorlopige uitslag indienen?"))
                action(
                  "submit-result",
                  { publicSummary, internalNote },
                  "Voorlopige uitslag en wedstrijdrapport ingediend.",
                );
            }}
          >
            Dien voorlopige uitslag in
          </Button>
        ) : (
          <StatusBadge status={match.official ? "OFFICIEEL" : "VOORLOPIG"} />
        )}
      </Card>
    </div>
  );
}

function MessagesView({ data, action, busy }: Props) {
  const [body, setBody] = useState("");
  return (
    <div className="operations-page">
      <PageHeader
        eyebrow="Scoped inbox"
        title="Berichten"
        intro="Alleen synthetische, betrokken ontvangers binnen de gekozen rol-scope."
      />
      <div className="messages-layout">
        <Card title="Gesprek · Toernooicommissie">
          {data.runtime.messages.map((message) => (
            <div className="message" key={message.id}>
              <strong>{message.from}</strong>
              <p>{message.body}</p>
              <small>
                {new Intl.DateTimeFormat("nl-NL", {
                  dateStyle: "short",
                  timeStyle: "short",
                  timeZone: "Europe/Amsterdam",
                }).format(new Date(message.at))}
              </small>
            </div>
          ))}
          <form
            className="message-compose"
            onSubmit={(event) => {
              event.preventDefault();
              void action("send-message", { body }, "Bericht verzonden.").then(() => setBody(""));
            }}
          >
            <label>
              <span>Nieuw bericht</span>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                required
                minLength={2}
                maxLength={500}
              />
            </label>
            <Button busy={busy === "send-message"}>
              <Send />
              Verstuur
            </Button>
          </form>
        </Card>
        <Card title="Ontvangers">
          <ul className="mini-list">
            <li>
              <CircleUserRound /> Toernooicommissie
            </li>
            <li>
              <CircleUserRound /> Betrokken teammanager
            </li>
            <li>
              <CircleUserRound /> Toegewezen scheidsrechter
            </li>
          </ul>
          <p className="form-help">Geen open groepschat of willekeurige roster-toegang.</p>
        </Card>
      </div>
    </div>
  );
}

function OperationsMediaView({ data, action, busy }: Props) {
  const [name, setName] = useState("");
  return (
    <div className="operations-page">
      <PageHeader
        eyebrow="Rechten & moderatie"
        title="Media inbox"
        intro="Uploadmetadata blijft gekoppeld aan wedstrijd, club, toestemming en status."
      />
      <Card>
        <form
          className="stack-form"
          onSubmit={(event) => {
            event.preventDefault();
            void action(
              "submit-media",
              { name, consent: true },
              "Beeld toegevoegd aan moderatie.",
            ).then(() => setName(""));
          }}
        >
          <label>
            <span>Bestandsnaam</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
            />
          </label>
          <label>
            <span>Koppeling</span>
            <select>
              <option>Quick – Duindorp SV</option>
            </select>
          </label>
          <label className="check-control">
            <input type="checkbox" defaultChecked required />
            <span>Rechten en toestemming gecontroleerd</span>
          </label>
          <Button busy={busy === "submit-media"}>
            <Upload /> Upload naar private DEV-inbox
          </Button>
        </form>
      </Card>
      <Card title="Moderatiequeue">
        {data.runtime.mediaSubmissions.length ? (
          data.runtime.mediaSubmissions.map((item) => (
            <div className="record-row" key={item.id}>
              <span>
                <strong>{item.name}</strong>
                <small>Quick – Duindorp SV</small>
              </span>
              <StatusBadge status={item.status} />
            </div>
          ))
        ) : (
          <EmptyState title="Queue is leeg" detail="Nieuwe communitybijdragen verschijnen hier." />
        )}
      </Card>
    </div>
  );
}
