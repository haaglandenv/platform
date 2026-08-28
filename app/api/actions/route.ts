import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizeAction,
  canApproveLineupChecks,
  recalculateBracket,
  setResult,
  validateEligibility,
  validateLineup,
  validateRoster,
} from "@/lib/domain";
import { mutateState, resetState } from "@/lib/store";
import type { AuditEvent, MatchStatus, Role, SeedData } from "@/lib/types";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  action: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
});

function audit(
  state: SeedData & { runtime: NonNullable<SeedData["runtime"]> },
  actor: Role,
  action: string,
  entity: string,
  before: string,
  after: string,
  reason?: string,
) {
  const event: AuditEvent = {
    id: `audit-${Date.now()}-${state.runtime.audit.length + 1}`,
    timestamp: new Date().toISOString(),
    actor,
    action,
    entity,
    before,
    after,
    reason,
  };
  state.runtime.audit.unshift(event);
}

function notify(
  state: SeedData & { runtime: NonNullable<SeedData["runtime"]> },
  role: Role | "all",
  title: string,
  detail: string,
  href: string,
) {
  state.runtime.notifications.unshift({
    id: `notification-${Date.now()}-${state.runtime.notifications.length + 1}`,
    role,
    title,
    detail,
    href,
    read: false,
  });
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige actie." }, { status: 400 });
  const { action, payload } = parsed.data;
  if (action === "reset-demo") {
    await resetState();
    return NextResponse.json({ ok: true, message: "De gouden demostaat is hersteld." });
  }

  const jar = await cookies();
  const role = (jar.get("hv-demo-role")?.value ?? "supporter") as Role;
  if (!authorizeAction(role, action)) {
    return NextResponse.json(
      { error: "Je huidige demo-rol heeft geen toegang tot deze actie." },
      { status: 403 },
    );
  }

  try {
    const state = await mutateState((draft) => {
      const runtime = draft.runtime;
      const scenarioMatch = draft.matches.find((match) => match.id === draft.scenario.matchId);
      if (!scenarioMatch) throw new Error("Scenario-wedstrijd ontbreekt.");
      switch (action) {
        case "set-clock": {
          const preset = z.enum(["preT60", "t60", "live78", "postMatch"]).parse(payload.preset);
          runtime.clockPreset = preset;
          audit(draft, role, "DEMO_CLOCK_CHANGED", "demo-clock", "preset", preset);
          break;
        }
        case "fix-player": {
          if (!(["INCOMPLEET", "CONCEPT"] as string[]).includes(runtime.rosterStatus))
            throw new Error("Een ingediende of goedgekeurde spelerslijst is onveranderlijk.");
          const player = draft.players.find((item) => item.id === "p_ds_18");
          if (!player) throw new Error("Speler niet gevonden.");
          if (!payload.reference || String(payload.reference).trim().length < 4) {
            throw new Error("Vul een geldig referentienummer in.");
          }
          player.reference = String(payload.reference).trim();
          player.photo = "/brand/player-placeholder.svg";
          runtime.rosterStatus = "CONCEPT";
          audit(draft, role, "PLAYER_COMPLETED", player.id, "INCOMPLEET", "COMPLEET");
          break;
        }
        case "submit-roster": {
          if (!(["INCOMPLEET", "CONCEPT"] as string[]).includes(runtime.rosterStatus))
            throw new Error("Deze spelerslijstversie is al ingediend.");
          const rosterPlayers = draft.players.filter(
            (player) => player.teamId === "team_duindorp_1",
          );
          const result = validateRoster(rosterPlayers);
          if (!result.valid) throw new Error(result.errors[0]);
          const previous = runtime.rosterStatus;
          const version = Math.max(...draft.rosters.map((roster) => roster.version)) + 1;
          draft.rosters.push({
            id: `roster_duindorp_v${version}`,
            teamId: "team_duindorp_1",
            version,
            status: "INGEDIEND",
            playerIds: rosterPlayers.map((player) => player.id),
            issues: [],
            submittedAt: new Date().toISOString(),
          });
          runtime.rosterStatus = "INGEDIEND";
          audit(draft, role, "ROSTER_SUBMITTED", "team_duindorp_1", previous, "INGEDIEND");
          notify(
            draft,
            "leadership",
            "Spelerslijst klaar voor controle",
            `Duindorp SV 1 · versie ${version}`,
            "/beheer/toernooileiding/spelerscontrole",
          );
          break;
        }
        case "approve-roster": {
          if (runtime.rosterStatus !== "INGEDIEND")
            throw new Error("Alleen een ingediende spelerslijst kan worden goedgekeurd.");
          const rosterPlayers = draft.players.filter(
            (player) => player.teamId === "team_duindorp_1",
          );
          const rosterValidation = validateRoster(rosterPlayers);
          if (!rosterValidation.valid) throw new Error(rosterValidation.errors[0]);
          const eligibility = validateEligibility(rosterPlayers);
          if (!eligibility.valid) throw new Error(eligibility.errors[0]);
          runtime.rosterStatus = "GOEDGEKEURD";
          const latest = draft.rosters.at(-1);
          if (latest) {
            latest.status = "GOEDGEKEURD";
            latest.approvedAt = new Date().toISOString();
          }
          audit(
            draft,
            role,
            "ROSTER_APPROVED",
            "team_duindorp_1",
            "INGEDIEND",
            "GOEDGEKEURD",
            "ALL_VALID",
          );
          notify(
            draft,
            "team",
            "Spelerslijst goedgekeurd",
            "Versie 2 is geaccepteerd voor de Sir Winston Cup.",
            "/beheer/team",
          );
          break;
        }
        case "request-correction": {
          runtime.rosterStatus = "CONCEPT";
          audit(
            draft,
            role,
            "ROSTER_CORRECTION_REQUESTED",
            "team_duindorp_1",
            "INGEDIEND",
            "WIJZIGING_GEVRAAGD",
            String(payload.reason ?? "Aanvulling nodig"),
          );
          notify(
            draft,
            "team",
            "Correctie spelerslijst gevraagd",
            String(payload.reason ?? "Controleer de gegevens."),
            "/beheer/team/spelerslijst",
          );
          break;
        }
        case "submit-lineup": {
          if (runtime.rosterStatus !== "GOEDGEKEURD")
            throw new Error("De spelerslijst moet eerst zijn goedgekeurd.");
          const selected = Array.isArray(payload.playerIds)
            ? payload.playerIds.map(String)
            : draft.players.slice(0, 18).map((player) => player.id);
          const result = validateLineup(selected, draft.players);
          if (!result.valid) throw new Error(result.errors[0]);
          runtime.selectedPlayerIds = selected;
          runtime.lineupStatus = "INGEDIEND";
          runtime.checks = {};
          audit(draft, role, "LINEUP_SUBMITTED", scenarioMatch.id, "CONCEPT", "INGEDIEND");
          notify(
            draft,
            "referee",
            "Opstelling ingediend",
            "De T-60-controle kan vanaf 19:00 worden geopend.",
            "/beheer/scheidsrechter/wedstrijden/match_qf_1/controle",
          );
          break;
        }
        case "open-t60": {
          if (runtime.clockPreset === "preT60") throw new Error("De controle opent om 19:00.");
          if (runtime.lineupStatus !== "INGEDIEND")
            throw new Error("Beide opstellingen moeten zijn ingediend.");
          runtime.lineupStatus = "T60_CONTROLE";
          audit(draft, role, "T60_OPENED", scenarioMatch.id, "INGEDIEND", "T60_CONTROLE");
          break;
        }
        case "check-player": {
          if (!runtime.selectedPlayerIds.includes(String(payload.playerId)))
            throw new Error("Deze speler staat niet in het vergrendelde wedstrijdsnapshot.");
          const status = z
            .enum(["AKKOORD", "NIET_AANWEZIG", "IDENTITEIT", "AFWIJKING"])
            .parse(payload.status);
          runtime.checks[String(payload.playerId)] = status;
          if (status === "AFWIJKING") {
            runtime.discrepancy = "OPEN";
            runtime.lineupStatus = "AFWIJKING";
            notify(
              draft,
              "leadership",
              "Rugnummerafwijking vereist besluit",
              "Mees Hofman draagt op locatie nummer 20.",
              "/beheer/toernooileiding/spelerscontrole",
            );
          }
          audit(draft, role, "PLAYER_CHECKED", String(payload.playerId), "OPEN", status);
          break;
        }
        case "check-all": {
          if (runtime.lineupStatus !== "T60_CONTROLE")
            throw new Error("Open eerst de T-60-controle.");
          for (const id of runtime.selectedPlayerIds) runtime.checks[id] = "AKKOORD";
          runtime.checks[draft.scenario.discrepancy.playerId] = "AFWIJKING";
          runtime.discrepancy = "OPEN";
          runtime.lineupStatus = "AFWIJKING";
          audit(
            draft,
            role,
            "LINEUP_CHECK_COMPLETED",
            scenarioMatch.id,
            "T60_CONTROLE",
            "AFWIJKING",
          );
          notify(
            draft,
            "leadership",
            "Afwijking wacht op besluit",
            "Rugnummer 10/20 moet met reden worden afgehandeld.",
            "/beheer/toernooileiding/spelerscontrole",
          );
          break;
        }
        case "resolve-discrepancy": {
          if (runtime.discrepancy !== "OPEN") throw new Error("Er is geen open afwijking.");
          const reason = z.string().min(4).parse(payload.reason);
          runtime.discrepancy = "RESOLVED";
          runtime.checks[draft.scenario.discrepancy.playerId] = "AKKOORD";
          runtime.lineupStatus = "T60_CONTROLE";
          audit(
            draft,
            role,
            "DISCREPANCY_RESOLVED",
            draft.scenario.discrepancy.playerId,
            "OPEN",
            "RESOLVED",
            reason,
          );
          notify(
            draft,
            "referee",
            "Rugnummerafwijking opgelost",
            "De controle kan definitief worden goedgekeurd.",
            "/beheer/scheidsrechter/wedstrijden/match_qf_1/controle",
          );
          break;
        }
        case "approve-lineups": {
          if (
            !canApproveLineupChecks(runtime.selectedPlayerIds, runtime.checks, runtime.discrepancy)
          ) {
            throw new Error(
              runtime.discrepancy === "OPEN"
                ? "Los eerst de open afwijking op."
                : "Controleer eerst alle geselecteerde spelers.",
            );
          }
          runtime.lineupStatus = "AKKOORD";
          runtime.rosterStatus = "VERGRENDELD";
          audit(draft, role, "LINEUPS_APPROVED", scenarioMatch.id, "T60_CONTROLE", "AKKOORD");
          break;
        }
        case "start-match": {
          if (runtime.lineupStatus !== "AKKOORD")
            throw new Error("Beide opstellingen moeten eerst akkoord zijn.");
          scenarioMatch.status = "LIVE";
          scenarioMatch.minute = 1;
          scenarioMatch.score = { home: 0, away: 0 };
          audit(draft, role, "MATCH_STARTED", scenarioMatch.id, "PRE_MATCH", "LIVE");
          break;
        }
        case "submit-result": {
          if (runtime.lineupStatus !== "AKKOORD")
            throw new Error("De wedstrijd is nog niet officieel vrijgegeven.");
          runtime.matchReport = {
            publicSummary: z
              .string()
              .min(8)
              .max(500)
              .parse(payload.publicSummary ?? "Quick wint de kwartfinale met 2–1."),
            internalNote: z
              .string()
              .max(500)
              .parse(payload.internalNote ?? ""),
          };
          runtime.resultConfirmations = { home: true, away: false };
          const updated = setResult(draft, { home: 2, away: 1 }, false);
          Object.assign(draft, updated);
          audit(draft, role, "RESULT_SUBMITTED", scenarioMatch.id, "LIVE", "FINISHED_PROVISIONAL");
          notify(
            draft,
            "leadership",
            "Uitslag wacht op bevestiging",
            "Quick 2–1 Duindorp SV is voorlopig.",
            "/beheer/toernooileiding/uitslagen",
          );
          break;
        }
        case "confirm-team-result": {
          if (scenarioMatch.status !== "FINISHED_PROVISIONAL")
            throw new Error("Er is geen voorlopige uitslag om te bevestigen.");
          runtime.resultConfirmations.away = true;
          audit(
            draft,
            role,
            "TEAM_RESULT_CONFIRMED",
            scenarioMatch.id,
            "AWAITING_AWAY",
            "BOTH_CONFIRMED",
          );
          notify(
            draft,
            "leadership",
            "Beide teams bevestigden de uitslag",
            "Quick 2–1 Duindorp SV kan officieel worden gemaakt.",
            "/beheer/toernooileiding/uitslagen",
          );
          break;
        }
        case "confirm-result": {
          if (scenarioMatch.status !== "FINISHED_PROVISIONAL")
            throw new Error("Er is geen voorlopige uitslag om te bevestigen.");
          if (!runtime.resultConfirmations.home || !runtime.resultConfirmations.away)
            throw new Error("Wacht op bevestiging van beide teams.");
          const updated = setResult(draft, { home: 2, away: 1 }, true);
          Object.assign(draft, updated);
          runtime.lineupStatus = "OFFICIEEL";
          audit(
            draft,
            role,
            "RESULT_CONFIRMED",
            scenarioMatch.id,
            "FINISHED_PROVISIONAL",
            "OFFICIAL",
            "TEAMS_CONFIRMED",
          );
          notify(
            draft,
            "all",
            "Quick bereikt de halve finale",
            "De officiële uitslag is 2–1 tegen Duindorp SV.",
            "/wedstrijden/quick-duindorp-sv",
          );
          break;
        }
        case "create-tournament": {
          const name = z.string().min(4).max(80).parse(payload.name);
          const format = z.enum(["KNOCKOUT", "GROUP_KNOCKOUT"]).parse(payload.format);
          runtime.draftTournaments.push({
            id: `draft-${Date.now()}`,
            name,
            format,
            status: "CONCEPT",
          });
          audit(draft, role, "TOURNAMENT_CREATED", "draft-tournament", "NONE", "CONCEPT");
          break;
        }
        case "assign-team": {
          const manager = z.string().min(3).max(80).parse(payload.manager);
          const previous = runtime.teamAssignment;
          runtime.teamAssignment = manager;
          audit(draft, role, "TEAM_MANAGER_ASSIGNED", "team_duindorp_1", previous, manager);
          break;
        }
        case "update-fixture": {
          if (scenarioMatch.official)
            throw new Error("Een officiële wedstrijd is vergrendeld voor programmawijzigingen.");
          const kickoff = z.string().datetime({ offset: true }).parse(payload.kickoff);
          const venue = z.string().min(4).max(120).parse(payload.venue);
          const previous = `${scenarioMatch.kickoff} · ${scenarioMatch.venue}`;
          scenarioMatch.kickoff = kickoff;
          scenarioMatch.venue = venue;
          audit(
            draft,
            role,
            "FIXTURE_UPDATED",
            scenarioMatch.id,
            previous,
            `${kickoff} · ${venue}`,
            "SCHEDULE_CHANGE",
          );
          notify(
            draft,
            "all",
            "Wedstrijdgegevens bijgewerkt",
            "Bekijk de actuele aftrap en locatie.",
            "/wedstrijden/quick-duindorp-sv",
          );
          break;
        }
        case "regulatory-result": {
          if (scenarioMatch.official)
            throw new Error("De officiële uitslag is vergrendeld en kan niet worden vervangen.");
          const reason = z
            .enum(["TEAM_NO_SHOW", "INELIGIBLE_PLAYERS", "DISCIPLINARY_DECISION"])
            .parse(payload.reason);
          scenarioMatch.status = "WALKOVER";
          scenarioMatch.score = null;
          scenarioMatch.official = true;
          scenarioMatch.winnerTeamId = scenarioMatch.homeTeamId ?? undefined;
          Object.assign(draft, recalculateBracket(draft));
          audit(
            draft,
            role,
            "REGULATORY_RESULT_SET",
            scenarioMatch.id,
            "MATCH_RESULT",
            "WALKOVER_HOME",
            reason,
          );
          notify(
            draft,
            "all",
            "Reglementaire uitslag vastgesteld",
            "Quick gaat door na een gemotiveerd reglementair besluit.",
            "/wedstrijden/quick-duindorp-sv",
          );
          break;
        }
        case "match-state": {
          if (scenarioMatch.official)
            throw new Error("Een officiële wedstrijdstatus is vergrendeld.");
          const next = z
            .enum(["POSTPONED", "CANCELLED", "STOPPED", "SCHEDULED"])
            .parse(payload.status) as MatchStatus;
          const previous = scenarioMatch.status;
          scenarioMatch.status = next;
          if (next === "STOPPED") scenarioMatch.minute = 71;
          audit(
            draft,
            role,
            "MATCH_STATE_CHANGED",
            scenarioMatch.id,
            previous,
            next,
            String(payload.reason ?? "WEATHER"),
          );
          notify(
            draft,
            "all",
            `Wedstrijdstatus: ${next}`,
            "Bekijk het Match Centre voor de actuele publieke status.",
            "/wedstrijden/quick-duindorp-sv",
          );
          break;
        }
        case "save-club-profile": {
          runtime.clubProfile.venueNote = String(payload.venueNote ?? "").slice(0, 140);
          runtime.clubProfile.contactVisible = Boolean(payload.contactVisible);
          audit(draft, role, "CLUB_PROFILE_UPDATED", "club_duindorp", "previous", "saved");
          break;
        }
        case "toggle-exclusion": {
          const previous = String(runtime.clubProfile.excluded);
          runtime.clubProfile.excluded = !runtime.clubProfile.excluded;
          audit(
            draft,
            role,
            "CLUB_EXCLUSION_CHANGED",
            "club_duindorp",
            previous,
            String(runtime.clubProfile.excluded),
            "ASSOCIATION_DECISION",
          );
          break;
        }
        case "finalize-tournament": {
          if (!scenarioMatch.official) throw new Error("Nog niet alle uitslagen zijn officieel.");
          runtime.tournamentFinalized = true;
          audit(draft, role, "TOURNAMENT_FINALIZED", "tournament_swc_2026", "OPEN", "FINALIZED");
          break;
        }
        case "lock-season": {
          if (!runtime.tournamentFinalized) throw new Error("Finaliseer eerst het toernooi.");
          runtime.seasonLocked = true;
          audit(
            draft,
            role,
            "SEASON_LOCKED",
            "season_2026",
            "OPEN",
            "LOCKED",
            String(payload.reason ?? "SEASON_COMPLETE"),
          );
          break;
        }
        case "send-message": {
          const body = z.string().min(2).max(500).parse(payload.body);
          runtime.messages.unshift({
            id: `message-${Date.now()}`,
            from: `Demo ${role}`,
            body,
            at: new Date().toISOString(),
          });
          audit(draft, role, "MESSAGE_SENT", "scoped-thread", "draft", "sent");
          break;
        }
        case "submit-media": {
          const name = z.string().min(2).max(120).parse(payload.name);
          if (payload.consent !== true)
            throw new Error("Toestemming voor redactionele beoordeling is verplicht.");
          runtime.mediaSubmissions.unshift({
            id: `media-${Date.now()}`,
            name,
            consent: true,
            status: "IN_MODERATIE",
          });
          audit(draft, role, "MEDIA_SUBMITTED", "community-media", "draft", "IN_MODERATIE");
          break;
        }
        case "follow": {
          const id = z.string().min(2).parse(payload.id);
          runtime.favorites = runtime.favorites.includes(id)
            ? runtime.favorites.filter((item) => item !== id)
            : [...runtime.favorites, id];
          break;
        }
        case "vote": {
          const id = z.string().min(2).parse(payload.id);
          if (!runtime.votes.includes(id)) runtime.votes.push(id);
          break;
        }
        case "mark-read": {
          const id = z.string().min(1).parse(payload.id);
          const item = runtime.notifications.find((notification) => notification.id === id);
          if (item) item.read = true;
          break;
        }
        case "preference": {
          const key = z.enum(["match", "news", "club"]).parse(payload.key);
          runtime.notificationSettings[key] = Boolean(payload.value);
          break;
        }
        default:
          throw new Error("Onbekende actie.");
      }
      Object.assign(draft, recalculateBracket(draft));
    });
    return NextResponse.json({
      ok: true,
      message: "Actie opgeslagen.",
      stateVersion: state.runtime.audit[0]?.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Actie kon niet worden opgeslagen.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
