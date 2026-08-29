"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  matchops: "/beheer/wedstrijdleiding",
  association: "/beheer/vereniging",
  team: "/beheer/team",
  referee: "/beheer/scheidsrechter",
  press: "/beheer/pers",
  photographer: "/beheer/fotograaf",
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
    ["/beheer/toernooileiding/privacy", "Privacy & security"],
  ],
  matchops: [
    ["/beheer/wedstrijdleiding", "Wedstrijdleiding"],
    ["/beheer/wedstrijdleiding/wedstrijden", "Programma & live"],
    ["/beheer/wedstrijdleiding/incidenten", "Stakingen & incidenten"],
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
  press: [["/beheer/pers", "Perscentrum"]],
  photographer: [["/beheer/fotograaf", "Fotografenportaal"]],
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
            <option value="matchops">Wedstrijdleiding</option>
            <option value="association">Verenigingsmanager</option>
            <option value="team">Teammanager</option>
            <option value="referee">Scheidsrechter</option>
            <option value="press">Pers / Redactie</option>
            <option value="photographer">Fotograaf</option>
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
        ) : path.startsWith("/beheer/wedstrijdleiding") ? (
          <MatchOpsView {...props} />
        ) : path.startsWith("/beheer/vereniging") ? (
          <AssociationView {...props} />
        ) : path.startsWith("/beheer/team") ? (
          <TeamView {...props} />
        ) : path.startsWith("/beheer/scheidsrechter") ? (
          <RefereeView {...props} />
        ) : path.startsWith("/beheer/pers") ? (
          <PressView {...props} />
        ) : path.startsWith("/beheer/fotograaf") ? (
          <PhotographerView {...props} />
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
    { role: "matchops", detail: "Programma, readiness, livegang en stakingen" },
    { role: "association", detail: "Teams, managers, profiel en deadlines" },
    { role: "team", detail: "Spelerslijst, opstelling en wedstrijddag" },
    { role: "referee", detail: "Aanstelling, T-60 en rapport" },
    { role: "press", detail: "Officiële data, nieuws en mediamoderatie" },
    { role: "photographer", detail: "Wedstrijdgebonden upload en rechten" },
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

function MatchOpsView(props: Props) {
  const { path, data, action, busy } = props;
  if (path.endsWith("/incidenten")) return <MatchOpsIncident {...props} />;
  const match = data.matches.find((item) => item.id === "match_qf_1")!;
  const pendingChange = data.runtime.fixtureChangeRequests.find(
    (item) => item.status === "REQUESTED",
  );
  return (
    <div className="operations-page">
      <PageHeader
        eyebrow="Match Operations Center"
        title={path.endsWith("/wedstrijden") ? "Programma & livegang" : "Wedstrijdleiding"}
        intro="Aftrap, veld, officials, readiness en incidenten voor de wedstrijddag."
      />
      <div className="ops-grid">
        <Card className="span-8" title="Wedstrijd vanavond">
          <MatchRow match={match} data={data} />
          <div className="readiness">
            <strong>{data.runtime.lineupStatus === "AKKOORD" ? "100%" : "84%"} GEREED</strong>
            <div className="progress">
              <i style={{ width: data.runtime.lineupStatus === "AKKOORD" ? "100%" : "84%" }} />
            </div>
          </div>
          <ul className="mini-list">
            <li>
              <Check /> Locatie en veld bevestigd
            </li>
            <li>
              <Check /> Scheidsrechter aangesteld
            </li>
            <li>
              {data.runtime.lineupStatus === "AKKOORD" ? <Check /> : <Clock3 />} Selecties
              gecontroleerd
            </li>
          </ul>
          <div className="button-row">
            <Button
              busy={busy === "start-match"}
              disabled={data.runtime.lineupStatus !== "AKKOORD" || match.status === "LIVE"}
              title={
                data.runtime.lineupStatus !== "AKKOORD"
                  ? "Beide teams moeten eerst gecontroleerd zijn"
                  : undefined
              }
              onClick={() => action("start-match", {}, "Wedstrijd staat live.")}
            >
              Start wedstrijd
            </Button>
            <Link className="button button--outline" href="/beheer/wedstrijdleiding/incidenten">
              Staking registreren
            </Link>
          </div>
        </Card>
        <Card className="span-4" title="Officials & check-in">
          <strong className="health-score">
            3<small>/3</small>
          </strong>
          <p>Scheidsrechter en twee assistenten bevestigd.</p>
          <StatusBadge status="OFFICIALS GEREED" />
        </Card>
        <Card className="span-7" title="Wijzigingsverzoeken">
          {pendingChange ? (
            <div className="record-row">
              <span>
                <strong>{pendingChange.proposedKickoff}</strong>
                <small>
                  {pendingChange.proposedVenue} · {pendingChange.reason}
                </small>
              </span>
              <Button
                busy={busy === "approve-fixture-change-opponent"}
                onClick={() =>
                  action(
                    "approve-fixture-change-opponent",
                    { requestId: pendingChange.id },
                    "Akkoord tegenstander vastgelegd.",
                  )
                }
              >
                Akkoord tegenstander
              </Button>
            </div>
          ) : (
            <EmptyState
              title="Geen open wijziging"
              detail="Nieuwe verzoeken verschijnen met twee afzonderlijke akkoorden."
            />
          )}
        </Card>
        <Card className="span-5" title="Uitslagbevestiging Quick">
          {match.status === "FINISHED_PROVISIONAL" && !data.runtime.resultConfirmations.home ? (
            <Button
              busy={busy === "confirm-home-result"}
              onClick={() => action("confirm-home-result", {}, "Bevestiging van Quick vastgelegd.")}
            >
              Bevestig namens Quick-contact
            </Button>
          ) : (
            <StatusBadge
              status={data.runtime.resultConfirmations.home ? "BEVESTIGD" : "NIET BESCHIKBAAR"}
            />
          )}
        </Card>
      </div>
    </div>
  );
}

function MatchOpsIncident({ data, action, busy }: Props) {
  const match = data.matches.find((item) => item.id === "match_qf_1")!;
  const [type, setType] = useState("TEMPORARY");
  const [reason, setReason] = useState("Onweer en bliksem boven het veld");
  const [minute, setMinute] = useState(match.minute ?? 71);
  const [possession, setPossession] = useState("Quick");
  const [lastRestart, setLastRestart] = useState("Inworp ter hoogte van de middenlijn");
  const [report, setReport] = useState("Spel stilgelegd en teams naar de kleedkamers gestuurd.");
  const snapshot = data.runtime.interruptionSnapshots.at(-1);
  return (
    <div className="operations-page">
      <PageHeader
        eyebrow="Incidentregistratie"
        title="Onderbreken of staken"
        intro="De actuele wedstrijdstaat wordt als onveranderlijk snapshot bewaard."
      />
      <div className="ops-grid">
        <Card className="span-7" title="Stakingssnapshot">
          <form
            className="stack-form"
            onSubmit={(event) => {
              event.preventDefault();
              void action(
                "interrupt-match",
                {
                  type,
                  reason,
                  minute,
                  possession,
                  lastRestart,
                  lastKickoff: "Quick nam de laatste aftrap",
                  playersOnField: [
                    ...data.runtime.homeSelectedPlayerIds.slice(0, 11),
                    ...data.runtime.selectedPlayerIds.slice(0, 11),
                  ],
                  cards: data.runtime.matchEvents
                    .filter((item) => item.type === "YELLOW" || item.type === "RED")
                    .map((item) => item.id),
                  substitutions: data.runtime.matchEvents
                    .filter((item) => item.type === "SUBSTITUTION")
                    .map((item) => item.id),
                  comments: "Teams en officials zijn geïnformeerd.",
                  refereeReport: report,
                },
                "Stakingssnapshot en incidentdossier opgeslagen.",
              );
            }}
          >
            <label>
              <span>Type</span>
              <select value={type} onChange={(event) => setType(event.target.value)}>
                <option value="TEMPORARY">Tijdelijk onderbroken</option>
                <option value="FINAL">Definitief gestaakt</option>
              </select>
            </label>
            <label>
              <span>Reden</span>
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                required
                minLength={4}
              />
            </label>
            <label>
              <span>Minuut</span>
              <input
                type="number"
                min="0"
                max="130"
                value={minute}
                onChange={(event) => setMinute(Number(event.target.value))}
              />
            </label>
            <label>
              <span>Balbezit</span>
              <input value={possession} onChange={(event) => setPossession(event.target.value)} />
            </label>
            <label>
              <span>Laatste spelhervatting</span>
              <input value={lastRestart} onChange={(event) => setLastRestart(event.target.value)} />
            </label>
            <label>
              <span>Scheidsrechterrapport</span>
              <textarea
                value={report}
                onChange={(event) => setReport(event.target.value)}
                required
                minLength={4}
              />
            </label>
            <Button busy={busy === "interrupt-match"} className="button--danger-outline">
              Sla snapshot op
            </Button>
          </form>
        </Card>
        <Card className="span-5" title="Laatste dossier">
          {snapshot ? (
            <dl className="info-list">
              <div>
                <dt>Status</dt>
                <dd>
                  <StatusBadge status={snapshot.decision ?? snapshot.type} />
                </dd>
              </div>
              <div>
                <dt>Minuut / stand</dt>
                <dd>
                  {snapshot.minute}′ · {snapshot.score.home}–{snapshot.score.away}
                </dd>
              </div>
              <div>
                <dt>Reden</dt>
                <dd>{snapshot.reason}</dd>
              </div>
              <div>
                <dt>Spelhervatting</dt>
                <dd>{snapshot.lastRestart}</dd>
              </div>
            </dl>
          ) : (
            <EmptyState
              title="Nog geen dossier"
              detail="Een volledige snapshot verschijnt na registratie."
            />
          )}
        </Card>
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
  if (path.endsWith("/privacy")) return <PrivacySecurityView {...props} />;
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
  const [playerId, setPlayerId] = useState(data.players[0]?.id ?? "");
  const [reviewStatus, setReviewStatus] = useState("GOEDGEKEURD");
  const [reasonCode, setReasonCode] = useState("ALL_VALID");
  const [reviewNote, setReviewNote] = useState("");
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
                status={
                  data.runtime.playerApprovals[player.id]?.status ??
                  (player.reference && player.photo ? "SPEELGERECHTIG" : "AANVULLING NODIG")
                }
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
        <Card className="span-12" title="Individuele beoordeling & reason codes">
          {data.runtime.rosterStatus === "INGEDIEND" ? (
            <form
              className="review-form"
              onSubmit={(event) => {
                event.preventDefault();
                void action(
                  "review-player",
                  { playerId, status: reviewStatus, reasonCode, note: reviewNote },
                  "Spelerbeoordeling gelogd.",
                );
              }}
            >
              <label>
                <span>Speler</span>
                <select value={playerId} onChange={(event) => setPlayerId(event.target.value)}>
                  {data.players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name} · #{player.shirtNumber}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Besluit</span>
                <select
                  value={reviewStatus}
                  onChange={(event) => setReviewStatus(event.target.value)}
                >
                  <option value="GOEDGEKEURD">Goedkeuren</option>
                  <option value="AANVULLING_NODIG">Aanvulling vragen</option>
                  <option value="AFGEKEURD">Afkeuren</option>
                </select>
              </label>
              <label>
                <span>Reason code</span>
                <select value={reasonCode} onChange={(event) => setReasonCode(event.target.value)}>
                  <option value="ALL_VALID">Alles geldig</option>
                  <option value="PHOTO_INSUFFICIENT">Foto onvoldoende</option>
                  <option value="REFERENCE_MISMATCH">Referentie wijkt af</option>
                  <option value="AGE_EXCEPTION">Leeftijdsuitzondering</option>
                  <option value="DISPENSATION_LIMIT">Dispensatielimiet</option>
                  <option value="SUSPENSION">Actieve schorsing</option>
                  <option value="OTHER">Anders</option>
                </select>
              </label>
              <label>
                <span>
                  Toelichting {reviewStatus === "GOEDGEKEURD" ? "(optioneel)" : "(verplicht)"}
                </span>
                <input
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  required={reviewStatus !== "GOEDGEKEURD"}
                  minLength={reviewStatus === "GOEDGEKEURD" ? undefined : 4}
                />
              </label>
              <Button busy={busy === "review-player"}>Leg besluit vast</Button>
            </form>
          ) : (
            <EmptyState
              title="Geen ingediende versie"
              detail="Individuele beoordeling opent zodra de teammanager indient."
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
  const [resolution, setResolution] = useState(
    "Scheidsrechterrapport en beide wedstrijdnotities zijn vergeleken; geregistreerde uitslag blijft staan.",
  );
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
            {confirmations.referee ? <Check /> : <Clock3 />} Scheidsrechterrapport ontvangen
          </span>
          <span>{confirmations.home ? <Check /> : <Clock3 />} Quick bevestigd</span>
          <span>{confirmations.away ? <Check /> : <Clock3 />} Duindorp SV bevestigd</span>
        </div>
        {data.runtime.resultDispute.open ? (
          <div className="notice notice--warning">
            <AlertTriangle />
            <div>
              <strong>Open uitslagconflict</strong>
              <p>{data.runtime.resultDispute.note}</p>
            </div>
          </div>
        ) : null}
        {data.runtime.resultDispute.open ? (
          <form
            className="stack-form"
            onSubmit={(event) => {
              event.preventDefault();
              void action("resolve-result-dispute", { resolution }, "Uitslagconflict opgelost.");
            }}
          >
            <label>
              <span>Gemotiveerde oplossing</span>
              <textarea
                value={resolution}
                onChange={(event) => setResolution(event.target.value)}
                required
                minLength={8}
              />
            </label>
            <Button busy={busy === "resolve-result-dispute"}>Los conflict op</Button>
          </form>
        ) : null}
        {match.status === "FINISHED_PROVISIONAL" ? (
          <Button
            busy={busy === "confirm-result"}
            disabled={!confirmations.home || !confirmations.away || data.runtime.resultDispute.open}
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
  const [overrideReason, setOverrideReason] = useState(
    "Operationele noodwijziging door toernooileiding",
  );
  const pendingApproval = data.runtime.fixtureChangeRequests.find(
    (item) => item.status === "OPPONENT_APPROVED",
  );
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
        <p className="form-help">
          Normale route: aanvrager → tegenstander → toernooileiding. Onderstaand formulier is een
          gelogde organisatie-override.
        </p>
        <form
          className="stack-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (window.confirm("Directe organisatie-override uitvoeren en loggen?"))
              void action(
                "update-fixture",
                { kickoff: `${kickoff}:00+02:00`, venue, reason: overrideReason },
                "Aftrap en locatie met override bijgewerkt.",
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
          <label>
            <span>Verplichte override-reden</span>
            <input
              value={overrideReason}
              onChange={(event) => setOverrideReason(event.target.value)}
              required
              minLength={8}
            />
          </label>
          <Button busy={busy === "update-fixture"}>Voer override uit</Button>
        </form>
      </Card>
      <Card title="Twee-akkoorden workflow">
        {pendingApproval ? (
          <div className="record-row">
            <span>
              <strong>{pendingApproval.proposedKickoff}</strong>
              <small>
                {pendingApproval.proposedVenue} · tegenstander akkoord · {pendingApproval.reason}
              </small>
            </span>
            <Button
              busy={busy === "approve-fixture-change-leadership"}
              onClick={() => {
                if (window.confirm("Wijziging definitief goedkeuren en programma bijwerken?"))
                  action(
                    "approve-fixture-change-leadership",
                    { requestId: pendingApproval.id },
                    "Wijziging definitief goedgekeurd.",
                  );
              }}
            >
              Toernooileiding akkoord
            </Button>
          </div>
        ) : (
          <EmptyState
            title="Geen verzoek klaar voor besluit"
            detail="De tegenstander moet een open verzoek eerst bevestigen."
          />
        )}
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
  const [tournamentName, setTournamentName] = useState("Haaglanden Wintercup 2027");
  const [format, setFormat] = useState("KNOCKOUT");
  const [manager, setManager] = useState(data.runtime.teamAssignment);
  const [ruleDraft, setRuleDraft] = useState(data.runtime.rules);
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
        <Card className="span-7" title={`Reglementversie ${data.runtime.rules.version}`}>
          <form
            className="stack-form"
            onSubmit={(event) => {
              event.preventDefault();
              void action(
                "save-rules",
                { ...ruleDraft },
                `Reglementversie ${ruleDraft.version + 1} opgeslagen.`,
              );
            }}
          >
            <div className="form-grid-2">
              <label>
                <span>Ingangsdatum</span>
                <input
                  type="date"
                  value={ruleDraft.effectiveFrom}
                  onChange={(event) =>
                    setRuleDraft({ ...ruleDraft, effectiveFrom: event.target.value })
                  }
                />
              </label>
              <label>
                <span>Categorie</span>
                <select
                  value={ruleDraft.category}
                  onChange={(event) =>
                    setRuleDraft({ ...ruleDraft, category: event.target.value as "A" | "B" })
                  }
                >
                  <option value="A">Categorie A</option>
                  <option value="B">Categorie B</option>
                </select>
              </label>
              <label>
                <span>Spelvorm</span>
                <select
                  value={ruleDraft.format}
                  onChange={(event) =>
                    setRuleDraft({
                      ...ruleDraft,
                      format: event.target.value as "6X6" | "8X8" | "11X11",
                    })
                  }
                >
                  <option value="6X6">6 × 6</option>
                  <option value="8X8">8 × 8</option>
                  <option value="11X11">11 × 11</option>
                </select>
              </label>
              <label>
                <span>Minimumleeftijd</span>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={ruleDraft.minimumAge}
                  onChange={(event) =>
                    setRuleDraft({ ...ruleDraft, minimumAge: Number(event.target.value) })
                  }
                />
              </label>
              <label>
                <span>Geboortejaar vanaf</span>
                <input
                  type="number"
                  value={ruleDraft.birthYearFrom}
                  onChange={(event) =>
                    setRuleDraft({ ...ruleDraft, birthYearFrom: Number(event.target.value) })
                  }
                />
              </label>
              <label>
                <span>Geboortejaar t/m</span>
                <input
                  type="number"
                  value={ruleDraft.birthYearTo}
                  onChange={(event) =>
                    setRuleDraft({ ...ruleDraft, birthYearTo: Number(event.target.value) })
                  }
                />
              </label>
              <label>
                <span>Max. dispensaties</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={ruleDraft.maxDispensations}
                  onChange={(event) =>
                    setRuleDraft({ ...ruleDraft, maxDispensations: Number(event.target.value) })
                  }
                />
              </label>
              <label>
                <span>Helften × minuten</span>
                <span className="compound-input">
                  <input
                    aria-label="Aantal helften"
                    type="number"
                    min="1"
                    max="4"
                    value={ruleDraft.halves}
                    onChange={(event) =>
                      setRuleDraft({ ...ruleDraft, halves: Number(event.target.value) })
                    }
                  />
                  <input
                    aria-label="Minuten per helft"
                    type="number"
                    min="10"
                    max="60"
                    value={ruleDraft.halfDurationMinutes}
                    onChange={(event) =>
                      setRuleDraft({
                        ...ruleDraft,
                        halfDurationMinutes: Number(event.target.value),
                      })
                    }
                  />
                </span>
              </label>
              <label>
                <span>Time-outs per team</span>
                <input
                  type="number"
                  min="0"
                  max="3"
                  value={ruleDraft.timeoutsPerTeam}
                  onChange={(event) =>
                    setRuleDraft({ ...ruleDraft, timeoutsPerTeam: Number(event.target.value) })
                  }
                />
              </label>
              <label>
                <span>Basis / max. selectie</span>
                <span className="compound-input">
                  <input
                    aria-label="Basisspelers"
                    type="number"
                    min="6"
                    max="11"
                    value={ruleDraft.starterCount}
                    onChange={(event) =>
                      setRuleDraft({ ...ruleDraft, starterCount: Number(event.target.value) })
                    }
                  />
                  <input
                    aria-label="Maximale selectie"
                    type="number"
                    min="6"
                    max="30"
                    value={ruleDraft.maxSquadSize}
                    onChange={(event) =>
                      setRuleDraft({ ...ruleDraft, maxSquadSize: Number(event.target.value) })
                    }
                  />
                </span>
              </label>
              <label>
                <span>Wissels</span>
                <select
                  value={ruleDraft.substitutions}
                  onChange={(event) =>
                    setRuleDraft({
                      ...ruleDraft,
                      substitutions: event.target.value as "DOORLOPEND" | "MAX_5",
                    })
                  }
                >
                  <option value="MAX_5">Maximaal 5</option>
                  <option value="DOORLOPEND">Doorlopend</option>
                </select>
              </label>
              <label>
                <span>Geel voor schorsing</span>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={ruleDraft.yellowCardsForSuspension}
                  onChange={(event) =>
                    setRuleDraft({
                      ...ruleDraft,
                      yellowCardsForSuspension: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label>
                <span>Arbitrage</span>
                <select
                  value={ruleDraft.refereeType}
                  onChange={(event) =>
                    setRuleDraft({
                      ...ruleDraft,
                      refereeType: event.target.value as "NEUTRAL" | "CLUB",
                    })
                  }
                >
                  <option value="NEUTRAL">Neutraal</option>
                  <option value="CLUB">Clubscheidsrechter</option>
                </select>
              </label>
              <label>
                <span>Assistenten</span>
                <input
                  type="number"
                  min="0"
                  max="4"
                  value={ruleDraft.assistantsRequired}
                  onChange={(event) =>
                    setRuleDraft({ ...ruleDraft, assistantsRequired: Number(event.target.value) })
                  }
                />
              </label>
              <label>
                <span>Standaard speeldag</span>
                <input
                  value={ruleDraft.standardMatchDay}
                  onChange={(event) =>
                    setRuleDraft({ ...ruleDraft, standardMatchDay: event.target.value })
                  }
                />
              </label>
              <label>
                <span>Standaard aftrap</span>
                <input
                  type="time"
                  value={ruleDraft.standardKickoff}
                  onChange={(event) =>
                    setRuleDraft({ ...ruleDraft, standardKickoff: event.target.value })
                  }
                />
              </label>
              <label>
                <span>Finale-verlenging</span>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={ruleDraft.finalExtraTimeMinutes}
                  onChange={(event) =>
                    setRuleDraft({
                      ...ruleDraft,
                      finalExtraTimeMinutes: Number(event.target.value),
                      extraTimeRounds: Number(event.target.value) ? ["FINAL"] : [],
                    })
                  }
                />
              </label>
              <label className="check-control">
                <input
                  type="checkbox"
                  checked={ruleDraft.penaltiesAfterDraw}
                  onChange={(event) =>
                    setRuleDraft({ ...ruleDraft, penaltiesAfterDraw: event.target.checked })
                  }
                />
                <span>Strafschoppen na gelijke stand</span>
              </label>
            </div>
            <Button busy={busy === "save-rules"}>Publiceer nieuwe versie</Button>
          </form>
          <p className="form-help">
            Vorige versies blijven bewaard:{" "}
            {data.runtime.regulationHistory.map((item) => `v${item.version}`).join(", ")}.
          </p>
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

function DisciplineView({ data, action, busy }: Props) {
  const snapshot = data.runtime.interruptionSnapshots.at(-1);
  const [decision, setDecision] = useState("REMAINING_TIME_LATER");
  const [reason, setReason] = useState(
    "De resterende speeltijd wordt op een veilige nieuwe datum uitgespeeld.",
  );
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
          title={snapshot ? `Open dossier · ${snapshot.id}` : "Incidentdossier"}
          action={
            <StatusBadge
              status={snapshot?.decision ?? (snapshot ? "IN BEHANDELING" : "GEEN OPEN DOSSIER")}
            />
          }
        >
          {snapshot ? (
            <>
              <div className="decision-row">
                <ShieldAlert />
                <div>
                  <h2>
                    {snapshot.type === "FINAL" ? "Definitief gestaakt" : "Tijdelijk onderbroken"} ·{" "}
                    {snapshot.minute}′
                  </h2>
                  <p>
                    {snapshot.score.home}–{snapshot.score.away} · {snapshot.reason} · balbezit{" "}
                    {snapshot.possession}
                  </p>
                </div>
              </div>
              <dl className="info-list">
                <div>
                  <dt>Laatste spelhervatting</dt>
                  <dd>{snapshot.lastRestart}</dd>
                </div>
                <div>
                  <dt>Spelers op veld</dt>
                  <dd>{snapshot.playersOnField.length} snapshot-ID’s</dd>
                </div>
                <div>
                  <dt>Kaarten / wissels</dt>
                  <dd>
                    {snapshot.cards.length} / {snapshot.substitutions.length}
                  </dd>
                </div>
                <div>
                  <dt>Scheidsrechterrapport</dt>
                  <dd>{snapshot.refereeReport}</dd>
                </div>
              </dl>
              {!snapshot.decision ? (
                <form
                  className="stack-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void action(
                      "decide-incident",
                      { decision, reason },
                      "Commissiebesluit en historie opgeslagen.",
                    );
                  }}
                >
                  <label>
                    <span>Besluit</span>
                    <select value={decision} onChange={(event) => setDecision(event.target.value)}>
                      <option value="RESUME_NOW">Nu hervatten</option>
                      <option value="REMAINING_TIME_LATER">Resterende tijd later spelen</option>
                      <option value="REPLAY">Volledig overspelen</option>
                      <option value="KEEP_RESULT">Uitslag handhaven</option>
                      <option value="REGULATORY_RESULT">Reglementaire uitslag</option>
                      <option value="EXCLUDE_TEAM">Team uitsluiten</option>
                      <option value="OTHER">Ander besluit</option>
                    </select>
                  </label>
                  <label>
                    <span>Motivering</span>
                    <textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      required
                      minLength={8}
                    />
                  </label>
                  <Button busy={busy === "decide-incident"}>Leg commissiebesluit vast</Button>
                </form>
              ) : (
                <div className="notice notice--success">
                  <Check /> {snapshot.decision}: {snapshot.decisionReason}
                </div>
              )}
            </>
          ) : (
            <EmptyState
              title="Geen stakingssnapshot"
              detail="Wedstrijdleiding of scheidsrechter legt eerst de volledige wedstrijdstaat vast."
            />
          )}
        </Card>
        <Card className="span-5" title="Tuchtzaken & schorsingen">
          {data.runtime.disciplinaryCases.length ? (
            data.runtime.disciplinaryCases.map((item) => (
              <div className="record-row" key={item.id}>
                <span>
                  <strong>
                    {item.type} · {item.summary}
                  </strong>
                  <small>{item.decision ?? "Besluit vereist"}</small>
                </span>
                {item.status === "OPEN" && item.type !== "INCIDENT" ? (
                  <Button
                    busy={busy === "decide-discipline"}
                    onClick={() =>
                      action(
                        "decide-discipline",
                        {
                          caseId: item.id,
                          decision:
                            item.type === "RED"
                              ? "Eén wedstrijd uitsluiting volgens reglementversie"
                              : "Kaart geregistreerd voor cumulatie",
                          suspend: item.type === "RED",
                        },
                        "Tuchtbesluit opgeslagen.",
                      )
                    }
                  >
                    Beslis
                  </Button>
                ) : (
                  <StatusBadge status={item.status} />
                )}
              </div>
            ))
          ) : (
            <EmptyState
              title="Geen kaartdossiers"
              detail="Gele en rode kaarten vullen deze queue automatisch."
            />
          )}
          <p className="form-help">
            Schorsingsgrens: {data.runtime.rules.yellowCardsForSuspension} gele kaarten. Actieve
            schorsingen blokkeren volgende selecties.
          </p>
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

function PrivacySecurityView({ data, action, busy }: Props) {
  const [permissions, setPermissions] = useState(data.runtime.pressPermissions);
  return (
    <div className="operations-page">
      <PageHeader
        eyebrow="AVG & platform security"
        title="Privacy- en securitycenter"
        intro="Doelbinding, publicatierechten en geweigerde serveracties zijn controleerbaar."
      />
      <div className="ops-grid">
        <Card className="span-7" title="Persrechten per datacategorie">
          <form
            className="stack-form"
            onSubmit={(event) => {
              event.preventDefault();
              void action(
                "set-press-permissions",
                permissions,
                "Persrechten bijgewerkt en gelogd.",
              );
            }}
          >
            {(["names", "shirtNumbers", "lineups", "media"] as const).map((key) => (
              <label className="check-control" key={key}>
                <input
                  type="checkbox"
                  checked={permissions[key]}
                  onChange={(event) =>
                    setPermissions({ ...permissions, [key]: event.target.checked })
                  }
                />
                <span>
                  {key === "names"
                    ? "Goedgekeurde spelersnamen"
                    : key === "shirtNumbers"
                      ? "Rugnummers"
                      : key === "lineups"
                        ? "Vrijgegeven opstellingen"
                        : "Goedgekeurde media"}
                </span>
              </label>
            ))}
            <Button busy={busy === "set-press-permissions"}>Sla doelgerichte rechten op</Button>
          </form>
          <p className="form-help">
            Geboortedatum, KNVB-referentie, identiteitsfoto, interne notitie en jeugdid blijven
            altijd uitgesloten.
          </p>
        </Card>
        <Card className="span-5" title="Bewaar- en toestemmingsbeleid">
          <dl className="info-list">
            <div>
              <dt>Spelersidentiteit</dt>
              <dd>Alleen toernooidoel · verwijderen na vastgestelde termijn</dd>
            </div>
            <div>
              <dt>Communitymedia</dt>
              <dd>Afzonderlijke rechten voor website, artikelen en socials</dd>
            </div>
            <div>
              <dt>Contacten</dt>
              <dd>Niet publiek · alleen betrokken operationele rollen</dd>
            </div>
            <div>
              <dt>DEV-opslag</dt>
              <dd>Niet geschikt als productie-identiteitsopslag</dd>
            </div>
          </dl>
        </Card>
        <Card className="span-12" title="Security event log">
          {data.runtime.securityEvents.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tijd</th>
                    <th>Rol</th>
                    <th>Actie</th>
                    <th>Uitkomst</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {data.runtime.securityEvents.map((event) => (
                    <tr key={event.id}>
                      <td>
                        {new Intl.DateTimeFormat("nl-NL", {
                          dateStyle: "short",
                          timeStyle: "short",
                          timeZone: "Europe/Amsterdam",
                        }).format(new Date(event.timestamp))}
                      </td>
                      <td>{roleLabels[event.role]}</td>
                      <td>{event.action}</td>
                      <td>
                        <StatusBadge status={event.outcome} />
                      </td>
                      <td>{event.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Nog geen security-events"
              detail="Toegestane gevoelige acties en geweigerde pogingen verschijnen hier."
            />
          )}
        </Card>
      </div>
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
  const match = data.matches.find((item) => item.id === "match_qf_1")!;
  const [changeKickoff, setChangeKickoff] = useState(match.kickoff.slice(0, 16));
  const [changeVenue, setChangeVenue] = useState(match.venue);
  const [changeReason, setChangeReason] = useState(
    "Team heeft een onvermijdelijk programma-conflict",
  );
  const [resultNote, setResultNote] = useState(
    "De geregistreerde uitslag wijkt af van onze wedstrijdnotitie.",
  );
  if (path.endsWith("/spelerslijst")) return <RosterEditor {...props} />;
  if (path.endsWith("/opstelling")) return <LineupEditor {...props} />;
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
        <Card className="span-12" title="Wedstrijdwijziging aanvragen">
          <form
            className="review-form"
            onSubmit={(event) => {
              event.preventDefault();
              void action(
                "request-fixture-change",
                { kickoff: `${changeKickoff}:00+02:00`, venue: changeVenue, reason: changeReason },
                "Wijzigingsverzoek naar tegenstander en toernooileiding gestuurd.",
              );
            }}
          >
            <label>
              <span>Voorgestelde aftrap</span>
              <input
                type="datetime-local"
                value={changeKickoff}
                onChange={(event) => setChangeKickoff(event.target.value)}
              />
            </label>
            <label>
              <span>Locatie</span>
              <input value={changeVenue} onChange={(event) => setChangeVenue(event.target.value)} />
            </label>
            <label>
              <span>Reden</span>
              <input
                value={changeReason}
                onChange={(event) => setChangeReason(event.target.value)}
                required
                minLength={8}
              />
            </label>
            <Button
              busy={busy === "request-fixture-change"}
              disabled={data.runtime.fixtureChangeRequests.some(
                (item) => item.status !== "APPROVED" && item.status !== "REJECTED",
              )}
            >
              Dien verzoek in
            </Button>
          </form>
          {data.runtime.fixtureChangeRequests.at(-1) ? (
            <StatusBadge status={data.runtime.fixtureChangeRequests.at(-1)!.status} />
          ) : null}
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
            <label className="full-label">
              <span>Opmerking bij niet akkoord</span>
              <textarea
                value={resultNote}
                onChange={(event) => setResultNote(event.target.value)}
              />
            </label>
            <Button
              className="button--danger-outline"
              busy={busy === "dispute-result"}
              disabled={data.runtime.resultDispute.open || data.runtime.resultConfirmations.away}
              onClick={() => {
                if (window.confirm("Uitslag als afwijkend melden bij de toernooileiding?"))
                  action("dispute-result", { note: resultNote }, "Uitslagconflict geregistreerd.");
              }}
            >
              Niet akkoord · meld afwijking
            </Button>
            {data.runtime.resultDispute.open ? (
              <div className="notice notice--warning">
                <AlertTriangle /> Conflict in behandeling: {data.runtime.resultDispute.note}
              </div>
            ) : null}
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function RosterEditor({ data, action, busy }: Props) {
  const initialPlayer = data.players.find((player) => player.id === "p_ds_18") ?? data.players[0];
  const [editingId, setEditingId] = useState(initialPlayer?.id ?? "");
  const [draft, setDraft] = useState({
    name: initialPlayer?.name ?? "",
    reference: initialPlayer?.reference ?? "",
    dateOfBirth: initialPlayer?.dateOfBirth ?? "2000-01-01",
    shirtNumber: initialPlayer?.shirtNumber ?? 19,
    position: initialPlayer?.position ?? "Aanvaller",
    dispensation: initialPlayer?.dispensation ?? false,
    consent: initialPlayer?.consent ?? true,
  });
  const [preview, setPreview] = useState(Boolean(initialPlayer?.photo));
  const [dirty, setDirty] = useState(false);
  const complete = data.players.filter((player) => player.reference && player.photo).length;
  const editable =
    data.runtime.rosterStatus === "INCOMPLEET" || data.runtime.rosterStatus === "CONCEPT";
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  const editPlayer = (id: string) => {
    const player = data.players.find((item) => item.id === id);
    if (!player) return;
    setEditingId(player.id);
    setDraft({
      name: player.name,
      reference: player.reference ?? "",
      dateOfBirth: player.dateOfBirth,
      shirtNumber: player.shirtNumber,
      position: player.position,
      dispensation: player.dispensation ?? false,
      consent: player.consent ?? true,
    });
    setPreview(Boolean(player.photo));
    setDirty(false);
  };
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
            {editable ? (
              <div className="button-row">
                <Button
                  type="button"
                  className="button--outline"
                  onClick={() => editPlayer(player.id)}
                >
                  Bewerk
                </Button>
                <Button
                  type="button"
                  className="button--danger-outline"
                  busy={busy === "remove-player"}
                  onClick={() => {
                    if (window.confirm(`${player.name} uit de conceptversie verwijderen?`))
                      action(
                        "remove-player",
                        { id: player.id, reason: "ROSTER_CORRECTION" },
                        "Speler uit concept verwijderd.",
                      );
                  }}
                >
                  Verwijder
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </Card>
      {editable ? (
        <Card title={editingId ? "Speler bewerken" : "Speler toevoegen"}>
          <div className="button-row">
            <Button
              type="button"
              className="button--outline"
              onClick={() => {
                setEditingId("");
                setDraft({
                  name: "",
                  reference: "",
                  dateOfBirth: "2000-01-01",
                  shirtNumber: Math.max(0, ...data.players.map((player) => player.shirtNumber)) + 1,
                  position: "Aanvaller",
                  dispensation: false,
                  consent: false,
                });
                setPreview(false);
                setDirty(false);
              }}
            >
              Nieuwe speler
            </Button>
          </div>
          <form
            className="roster-fix-form"
            onSubmit={(event) => {
              event.preventDefault();
              void action(
                "save-player",
                { id: editingId || undefined, ...draft, photoProvided: preview },
                editingId ? "Speler en concept opgeslagen." : "Speler aan concept toegevoegd.",
              ).then(() => setDirty(false));
            }}
          >
            <div className="photo-preview">
              {preview ? <PlayerPhoto name="Niels Kramer" /> : <Upload />}
              <label className="button button--outline">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    setPreview(Boolean(event.target.files?.length));
                    setDirty(true);
                  }}
                  required={!preview}
                />
                {preview ? "Foto vervangen" : "Kies lokale pasfoto"}
              </label>
              {preview ? (
                <Button
                  type="button"
                  className="button--text"
                  onClick={() => {
                    setPreview(false);
                    setDirty(true);
                  }}
                >
                  Verwijder preview
                </Button>
              ) : null}
            </div>
            <label>
              <span>Volledige naam</span>
              <input
                value={draft.name}
                onChange={(event) => {
                  setDraft({ ...draft, name: event.target.value });
                  setDirty(true);
                }}
                required
                minLength={2}
              />
            </label>
            <label>
              <span>Geboortedatum</span>
              <input
                type="date"
                value={draft.dateOfBirth}
                onChange={(event) => {
                  setDraft({ ...draft, dateOfBirth: event.target.value });
                  setDirty(true);
                }}
                required
              />
            </label>
            <label>
              <span>KNVB-/referentienummer</span>
              <input
                value={draft.reference}
                onChange={(event) => {
                  setDraft({ ...draft, reference: event.target.value });
                  setDirty(true);
                }}
                placeholder="HV-D1018"
                required
                minLength={4}
              />
            </label>
            <label>
              <span>Rugnummer</span>
              <input
                type="number"
                min="1"
                max="99"
                value={draft.shirtNumber}
                onChange={(event) => {
                  setDraft({ ...draft, shirtNumber: Number(event.target.value) });
                  setDirty(true);
                }}
                required
              />
            </label>
            <label>
              <span>Positie</span>
              <select
                value={draft.position}
                onChange={(event) => {
                  setDraft({ ...draft, position: event.target.value });
                  setDirty(true);
                }}
              >
                <option>Keeper</option>
                <option>Verdediger</option>
                <option>Middenvelder</option>
                <option>Aanvaller</option>
              </select>
            </label>
            <label className="check-control">
              <input
                type="checkbox"
                checked={draft.dispensation}
                onChange={(event) => {
                  setDraft({ ...draft, dispensation: event.target.checked });
                  setDirty(true);
                }}
              />
              <span>Dispensatiespeler</span>
            </label>
            <label className="check-control">
              <input
                type="checkbox"
                checked={draft.consent}
                onChange={(event) => {
                  setDraft({ ...draft, consent: event.target.checked });
                  setDirty(true);
                }}
                required
              />
              <span>Toestemming en privacygrondslag bevestigd</span>
            </label>
            <Button busy={busy === "save-player"} disabled={!preview || !draft.consent}>
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
  const [captainId, setCaptainId] = useState(
    data.runtime.lineupSnapshot.captainId ?? initial[3] ?? "",
  );
  const [goalkeeperId, setGoalkeeperId] = useState(
    data.runtime.lineupSnapshot.goalkeeperId ??
      data.players.find((player) => player.position === "Keeper")?.id ??
      "",
  );
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
          <strong>{Math.min(selected.length, data.runtime.rules.starterCount)}</strong> basis
        </span>
        <span>
          <strong>{Math.max(0, selected.length - data.runtime.rules.starterCount)}</strong> wissels
        </span>
        <span>
          <strong>{selected.length}</strong> totaal
        </span>
      </div>
      <Card>
        {data.players.map((player) => (
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
            {player.id === goalkeeperId ? (
              <StatusBadge status="KEEPER" />
            ) : player.id === captainId ? (
              <StatusBadge status="AANVOERDER" />
            ) : (
              <StatusBadge status="SPEELGERECHTIG" />
            )}
          </label>
        ))}
      </Card>
      <Card title="Rollen & wedstrijdregels">
        <div className="form-grid-2">
          <label>
            <span>Keeper</span>
            <select
              value={goalkeeperId}
              disabled={locked}
              onChange={(event) => setGoalkeeperId(event.target.value)}
            >
              {data.players
                .filter((player) => selected.includes(player.id) && player.position === "Keeper")
                .map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name} · #{player.shirtNumber}
                  </option>
                ))}
            </select>
          </label>
          <label>
            <span>Aanvoerder</span>
            <select
              value={captainId}
              disabled={locked}
              onChange={(event) => setCaptainId(event.target.value)}
            >
              {data.players
                .filter((player) => selected.includes(player.id))
                .map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name} · #{player.shirtNumber}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <p className="form-help">
          {data.runtime.rules.format} · {data.runtime.rules.starterCount} basisspelers · maximaal{" "}
          {data.runtime.rules.maxSquadSize} totaal ·{" "}
          {data.runtime.rules.substitutions === "MAX_5"
            ? "maximaal vijf wisselmomenten"
            : "doorlopend wisselen"}
          .
        </p>
      </Card>
      <div className="sticky-action">
        <div>
          <strong>
            {selected.length >= data.runtime.rules.starterCount &&
            selected.length <= data.runtime.rules.maxSquadSize
              ? "Selectie voldoet"
              : `Selecteer ${data.runtime.rules.starterCount}–${data.runtime.rules.maxSquadSize} spelers`}
          </strong>
          <small>Unieke rugnummers en team-scope worden ook server-side gecontroleerd.</small>
        </div>
        <Button
          busy={busy === "submit-lineup"}
          disabled={
            locked ||
            selected.length < data.runtime.rules.starterCount ||
            selected.length > data.runtime.rules.maxSquadSize ||
            !captainId ||
            !goalkeeperId
          }
          onClick={() => {
            if (window.confirm("Opstelling indienen en vergrendelen?"))
              action(
                "submit-lineup",
                { playerIds: selected, captainId, goalkeeperId },
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
  const allSelected = [...data.runtime.homeSelectedPlayerIds, ...data.runtime.selectedPlayerIds];
  const [notes, setNotes] = useState<Record<string, string>>(data.runtime.checkNotes);
  const checked = Object.values(data.runtime.checks).filter(
    (status) => status === "AKKOORD",
  ).length;
  const total = allSelected.length;
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
          <div className="team-check-summary">
            <Card title="Quick">
              <strong>
                {
                  data.runtime.homeSelectedPlayerIds.filter(
                    (id) => data.runtime.checks[id] === "AKKOORD",
                  ).length
                }
                /{data.runtime.homeSelectedPlayerIds.length} gecontroleerd
              </strong>
              <StatusBadge status="INGEDIEND SNAPSHOT" />
            </Card>
            <Card title="Duindorp SV">
              <strong>
                {
                  data.runtime.selectedPlayerIds.filter(
                    (id) => data.runtime.checks[id] === "AKKOORD",
                  ).length
                }
                /{data.runtime.selectedPlayerIds.length} gecontroleerd
              </strong>
              <StatusBadge status="INGEDIEND SNAPSHOT" />
            </Card>
          </div>
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
          {allSelected.map((id) => {
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
                    {player.teamId === "team_quick_1" ? "Quick" : "Duindorp SV"} · #
                    {player.shirtNumber} · {player.position}
                  </small>
                </span>
                <StatusBadge status={status ?? "OPEN"} />
                {data.runtime.lineupStatus !== "AKKOORD" &&
                data.runtime.lineupStatus !== "OFFICIEEL" ? (
                  <div className="referee-actions">
                    <label className="referee-note">
                      <span>Private notitie</span>
                      <input
                        value={notes[id] ?? ""}
                        onChange={(event) => setNotes({ ...notes, [id]: event.target.value })}
                        placeholder="Alleen bij afwijking nodig"
                      />
                    </label>
                    <Button
                      className="button--outline"
                      busy={busy === "check-player"}
                      onClick={() =>
                        action("check-player", {
                          playerId: id,
                          status: "AKKOORD",
                          note: notes[id] ?? "",
                        })
                      }
                    >
                      Akkoord
                    </Button>
                    <Button
                      className="button--outline"
                      busy={busy === "check-player"}
                      onClick={() =>
                        action("check-player", {
                          playerId: id,
                          status: "NIET_AANWEZIG",
                          note: notes[id] ?? "Niet aanwezig bij controle",
                        })
                      }
                    >
                      Niet aanwezig
                    </Button>
                    <Button
                      className="button--outline"
                      busy={busy === "check-player"}
                      onClick={() =>
                        action("check-player", {
                          playerId: id,
                          status: "IDENTITEIT",
                          note: notes[id] ?? "Identiteitscontrole vereist",
                        })
                      }
                    >
                      Identiteit controleren
                    </Button>
                    <Button
                      className="button--danger-outline"
                      busy={busy === "check-player"}
                      onClick={() =>
                        action("check-player", {
                          playerId: id,
                          status: "AFWIJKING",
                          note: notes[id] ?? "Gegevens wijken af",
                        })
                      }
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
  const [eventType, setEventType] = useState("GOAL");
  const [eventTeam, setEventTeam] = useState("team_quick_1");
  const [eventMinute, setEventMinute] = useState(match.minute ?? 1);
  const selectablePlayers = data.players.filter((player) => player.teamId === eventTeam);
  const [eventPlayerId, setEventPlayerId] = useState("");
  return (
    <div className="operations-page referee-page">
      <PageHeader
        eyebrow="Na de wedstrijd"
        title="Digitaal wedstrijdrapport"
        intro="Uitslag, gebeurtenissen en incidenten vormen één voorlopig rapport."
      />
      <Card title="Live wedstrijdregistratie">
        <form
          className="event-form"
          onSubmit={(event) => {
            event.preventDefault();
            void action(
              "add-match-event",
              {
                type: eventType,
                teamId: eventTeam,
                minute: eventMinute,
                playerId: eventPlayerId || undefined,
                note: `${eventType} geregistreerd door scheidsrechter`,
              },
              "Wedstrijdgebeurtenis opgeslagen.",
            );
          }}
        >
          <label>
            <span>Minuut</span>
            <input
              type="number"
              min="0"
              max="130"
              value={eventMinute}
              onChange={(event) => setEventMinute(Number(event.target.value))}
            />
          </label>
          <label>
            <span>Gebeurtenis</span>
            <select value={eventType} onChange={(event) => setEventType(event.target.value)}>
              <option value="GOAL">Doelpunt</option>
              <option value="YELLOW">Gele kaart</option>
              <option value="RED">Rode kaart</option>
              <option value="SUBSTITUTION">Wissel</option>
              <option value="HALF_TIME">Rust</option>
              <option value="RESUMED">Hervat</option>
            </select>
          </label>
          <label>
            <span>Team</span>
            <select
              value={eventTeam}
              onChange={(event) => {
                setEventTeam(event.target.value);
                setEventPlayerId("");
              }}
            >
              <option value="team_quick_1">Quick</option>
              <option value="team_duindorp_1">Duindorp SV</option>
            </select>
          </label>
          <label>
            <span>Speler</span>
            <select
              value={eventPlayerId}
              onChange={(event) => setEventPlayerId(event.target.value)}
            >
              <option value="">Niet van toepassing</option>
              {selectablePlayers.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name} · #{player.shirtNumber}
                </option>
              ))}
            </select>
          </label>
          <Button
            busy={busy === "add-match-event"}
            disabled={match.status !== "LIVE" && match.status !== "HALF_TIME"}
          >
            Registreer
          </Button>
        </form>
        {data.runtime.matchEvents.length ? (
          <ol className="timeline-list compact-timeline">
            {data.runtime.matchEvents.map((item) => (
              <li key={item.id}>
                <time>{item.minute}′</time>
                <span>
                  {item.type === "GOAL"
                    ? "⚽"
                    : item.type === "YELLOW"
                      ? "🟨"
                      : item.type === "RED"
                        ? "🟥"
                        : "↔"}
                </span>
                <p>
                  {item.type.replaceAll("_", " ")} ·{" "}
                  {item.teamId === "team_quick_1" ? "Quick" : "Duindorp SV"}
                </p>
                {!item.corrected && !match.official ? (
                  <Button
                    className="button--text"
                    busy={busy === "correct-match-event"}
                    onClick={() =>
                      action(
                        "correct-match-event",
                        { eventId: item.id, reason: "REGISTRATION_ERROR" },
                        "Gebeurtenis gecorrigeerd.",
                      )
                    }
                  >
                    Corrigeer
                  </Button>
                ) : (
                  <StatusBadge status="GECORRIGEERD" />
                )}
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState
            title="Nog geen gebeurtenissen"
            detail="Start de wedstrijd en registreer goals, kaarten, wissels en rust."
          />
        )}
      </Card>
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

function PressView({ data, action, busy }: Props) {
  const match = data.matches.find((item) => item.id === "match_qf_1")!;
  return (
    <div className="operations-page">
      <PageHeader
        eyebrow="Perscentrum"
        title="Officiële wedstrijdinformatie"
        intro="Alleen toegestane namen, rugnummers, opstellingen, gebeurtenissen en goedgekeurde media."
      />
      <div className="ops-grid">
        <Card className="span-8" title="Quick – Duindorp SV">
          <MatchRow match={match} data={data} />
          <div className="stats-grid">
            <span>
              <b>{data.runtime.matchEvents.filter((item) => item.type === "GOAL").length}</b>
              Doelpunten
            </span>
            <span>
              <b>{data.runtime.matchEvents.filter((item) => item.type === "YELLOW").length}</b>Gele
              kaarten
            </span>
            <span>
              <b>{data.runtime.matchEvents.filter((item) => item.type === "RED").length}</b>Rode
              kaarten
            </span>
          </div>
          {data.runtime.matchReport.publicSummary ? (
            <p>{data.runtime.matchReport.publicSummary}</p>
          ) : null}
        </Card>
        <Card className="span-4" title="Publicatierechten">
          <ul className="mini-list">
            <li>{data.runtime.pressPermissions.names ? <Check /> : <Lock />} Spelersnamen</li>
            <li>{data.runtime.pressPermissions.shirtNumbers ? <Check /> : <Lock />} Rugnummers</li>
            <li>{data.runtime.pressPermissions.lineups ? <Check /> : <Lock />} Opstellingen</li>
            <li>{data.runtime.pressPermissions.media ? <Check /> : <Lock />} Goedgekeurde media</li>
          </ul>
          <p className="form-help">
            Geboortedata, referentienummers, controlefoto’s en interne notities zijn uitgesloten.
          </p>
        </Card>
        <Card className="span-7" title="Toegestane spelersdata">
          {data.players.length ? (
            data.players.slice(0, 12).map((player) => (
              <div className="player-review-row" key={player.id}>
                <PlayerPhoto name={player.name} size="sm" />
                <span>
                  <strong>{player.name}</strong>
                  <small>
                    #{player.shirtNumber || "—"} · {player.position}
                  </small>
                </span>
                <StatusBadge status="PUBLICATIE TOEGESTAAN" />
              </div>
            ))
          ) : (
            <EmptyState
              title="Namen afgeschermd"
              detail="De toernooileiding heeft publicatie niet toegestaan."
            />
          )}
        </Card>
        <Card className="span-5" title="Mediamoderatie">
          {data.runtime.mediaSubmissions.length ? (
            data.runtime.mediaSubmissions.map((item) => (
              <div className="record-row" key={item.id}>
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    {item.credit ?? "Geen credit"} · {item.status}
                  </small>
                </span>
                {item.status === "IN_MODERATIE" ? (
                  <div className="button-row">
                    <Button
                      busy={busy === "moderate-media"}
                      onClick={() =>
                        action(
                          "moderate-media",
                          {
                            id: item.id,
                            status: "GOEDGEKEURD",
                            reason: "RECHTEN_EN_INHOUD_GECONTROLEERD",
                          },
                          "Media goedgekeurd.",
                        )
                      }
                    >
                      Goedkeuren
                    </Button>
                    <Button
                      className="button--danger-outline"
                      busy={busy === "moderate-media"}
                      onClick={() =>
                        action(
                          "moderate-media",
                          {
                            id: item.id,
                            status: "AFGEKEURD",
                            reason: "NIET_GESCHIKT_VOOR_PUBLICATIE",
                          },
                          "Media afgekeurd.",
                        )
                      }
                    >
                      Afwijzen
                    </Button>
                  </div>
                ) : (
                  <StatusBadge status={item.status} />
                )}
              </div>
            ))
          ) : (
            <EmptyState
              title="Geen media in moderatie"
              detail="Nieuwe bijdragen verschijnen met rechtenmetadata."
            />
          )}
        </Card>
      </div>
    </div>
  );
}

function PhotographerView({ data, action, busy }: Props) {
  const [name, setName] = useState("");
  const [credit, setCredit] = useState("Demo Fotograaf");
  const [website, setWebsite] = useState(true);
  const [articles, setArticles] = useState(true);
  const [social, setSocial] = useState(false);
  return (
    <div className="operations-page">
      <PageHeader
        eyebrow="Fotografenportaal"
        title="Wedstrijdbeeld aanleveren"
        intro="Koppel ieder bestand aan wedstrijd, credit en afzonderlijke gebruiksrechten."
      />
      <div className="ops-grid">
        <Card className="span-7" title="Nieuwe upload">
          <form
            className="stack-form"
            onSubmit={(event) => {
              event.preventDefault();
              void action(
                "submit-media",
                {
                  name,
                  consent: true,
                  matchId: "match_qf_1",
                  clubId: "club_duindorp",
                  credit,
                  website,
                  articles,
                  social,
                },
                "Upload staat in moderatie.",
              ).then(() => setName(""));
            }}
          >
            <label>
              <span>Bestand</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4"
                required
                onChange={(event) => setName(event.target.files?.[0]?.name ?? "")}
              />
            </label>
            <label>
              <span>Fotocredit</span>
              <input
                value={credit}
                onChange={(event) => setCredit(event.target.value)}
                required
                minLength={2}
              />
            </label>
            <label>
              <span>Wedstrijd</span>
              <select defaultValue="match_qf_1">
                <option value="match_qf_1">Quick – Duindorp SV</option>
              </select>
            </label>
            <fieldset className="rights-fieldset">
              <legend>Toestemming voor gebruik</legend>
              <label className="check-control">
                <input
                  type="checkbox"
                  checked={website}
                  onChange={(event) => setWebsite(event.target.checked)}
                />
                <span>Website</span>
              </label>
              <label className="check-control">
                <input
                  type="checkbox"
                  checked={articles}
                  onChange={(event) => setArticles(event.target.checked)}
                />
                <span>Nieuwsartikelen</span>
              </label>
              <label className="check-control">
                <input
                  type="checkbox"
                  checked={social}
                  onChange={(event) => setSocial(event.target.checked)}
                />
                <span>Social media</span>
              </label>
            </fieldset>
            <Button
              busy={busy === "submit-media"}
              disabled={!name || (!website && !articles && !social)}
            >
              <Upload /> Verstuur voor moderatie
            </Button>
          </form>
        </Card>
        <Card className="span-5" title="Mijn bijdragen">
          {data.runtime.mediaSubmissions.length ? (
            data.runtime.mediaSubmissions.map((item) => (
              <div className="record-row" key={item.id}>
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.credit ?? credit}</small>
                </span>
                <StatusBadge status={item.status} />
              </div>
            ))
          ) : (
            <EmptyState
              title="Nog niets aangeleverd"
              detail="Uploads blijven privé totdat de redactie ze goedkeurt."
            />
          )}
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
