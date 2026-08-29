import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizeAction,
  canApproveLineupChecks,
  evaluateRules,
  recalculateBracket,
  setResult,
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

const roleSchema = z.enum([
  "leadership",
  "matchops",
  "association",
  "team",
  "referee",
  "press",
  "photographer",
  "supporter",
]);

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
    version: Math.max(
      state.runtime.lineupSnapshot.version,
      ...state.rosters.map((roster) => roster.version),
    ),
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
  const origin = request.headers.get("origin");
  const requestHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin && requestHost) {
    try {
      if (new URL(origin).host !== requestHost)
        return NextResponse.json({ error: "Ongeldige aanvraagbron." }, { status: 403 });
    } catch {
      return NextResponse.json({ error: "Ongeldige aanvraagbron." }, { status: 403 });
    }
  }
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige actie." }, { status: 400 });
  const { action, payload } = parsed.data;
  if (action === "reset-demo") {
    await resetState();
    return NextResponse.json({ ok: true, message: "De gouden demostaat is hersteld." });
  }

  const jar = await cookies();
  const role = roleSchema.catch("supporter").parse(jar.get("hv-demo-role")?.value) as Role;
  if (!authorizeAction(role, action)) {
    await mutateState((draft) => {
      draft.runtime.securityEvents.unshift({
        id: `security-${Date.now()}-${draft.runtime.securityEvents.length + 1}`,
        timestamp: new Date().toISOString(),
        role,
        action,
        outcome: "DENIED",
        detail: "Actie buiten de server-side rolpolicy geweigerd.",
      });
    });
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
      if (
        runtime.seasonLocked &&
        ![
          "follow",
          "vote",
          "mark-read",
          "preference",
          "set-push",
          "send-message",
          "submit-media",
          "moderate-media",
        ].includes(action)
      )
        throw new Error("Het seizoen is vergrendeld; sportieve mutaties zijn geblokkeerd.");
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
          player.consent = true;
          runtime.rosterStatus = "CONCEPT";
          runtime.playerApprovals[player.id] = { status: "CONCEPT" };
          audit(draft, role, "PLAYER_COMPLETED", player.id, "INCOMPLEET", "COMPLEET");
          break;
        }
        case "save-player": {
          if (!(["INCOMPLEET", "CONCEPT"] as string[]).includes(runtime.rosterStatus))
            throw new Error("Een ingediende of goedgekeurde spelerslijst is onveranderlijk.");
          const id = payload.id ? String(payload.id) : `p_ds_${Date.now()}`;
          const existing = draft.players.find((player) => player.id === id);
          if (existing && existing.teamId !== "team_duindorp_1")
            throw new Error("Deze speler valt buiten de teamscope.");
          const parsedPlayer = {
            id,
            teamId: "team_duindorp_1",
            name: z.string().min(2).max(100).parse(payload.name),
            reference: z.string().min(4).max(40).parse(payload.reference),
            dateOfBirth: z
              .string()
              .regex(/^\d{4}-\d{2}-\d{2}$/)
              .parse(payload.dateOfBirth),
            shirtNumber: z.coerce.number().int().min(1).max(99).parse(payload.shirtNumber),
            position: z
              .enum(["Keeper", "Verdediger", "Middenvelder", "Aanvaller"])
              .parse(payload.position),
            photo:
              payload.photoProvided === true
                ? "/brand/player-placeholder.svg"
                : (existing?.photo ?? null),
            consent: z.literal(true).parse(payload.consent),
            dispensation: Boolean(payload.dispensation),
          };
          if (!parsedPlayer.photo) throw new Error("Een actuele pasfoto is verplicht.");
          const duplicate = draft.players.find(
            (player) =>
              player.id !== id &&
              player.teamId === "team_duindorp_1" &&
              (player.reference === parsedPlayer.reference ||
                player.shirtNumber === parsedPlayer.shirtNumber),
          );
          if (duplicate)
            throw new Error(`Dubbele identiteit of rugnummer gedetecteerd bij ${duplicate.name}.`);
          if (existing) Object.assign(existing, parsedPlayer);
          else draft.players.push(parsedPlayer);
          runtime.rosterStatus = "CONCEPT";
          runtime.playerApprovals[id] = { status: "CONCEPT" };
          audit(
            draft,
            role,
            existing ? "PLAYER_UPDATED" : "PLAYER_ADDED",
            id,
            existing ? "DRAFT" : "NONE",
            "CONCEPT",
          );
          break;
        }
        case "remove-player": {
          if (!(["INCOMPLEET", "CONCEPT"] as string[]).includes(runtime.rosterStatus))
            throw new Error("Een ingediende of goedgekeurde spelerslijst is onveranderlijk.");
          const id = z.string().min(2).parse(payload.id);
          const player = draft.players.find(
            (item) => item.id === id && item.teamId === "team_duindorp_1",
          );
          if (!player) throw new Error("Speler niet gevonden binnen de teamscope.");
          draft.players = draft.players.filter((item) => item.id !== id);
          delete runtime.playerApprovals[id];
          audit(
            draft,
            role,
            "PLAYER_REMOVED",
            id,
            "CONCEPT",
            "REMOVED",
            String(payload.reason ?? "ROSTER_CORRECTION"),
          );
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
          for (const player of rosterPlayers)
            runtime.playerApprovals[player.id] = { status: "WACHT_OP_GOEDKEURING" };
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
          const eligibility = evaluateRules(rosterPlayers, runtime.rules, {
            suspendedPlayerIds: runtime.suspendedPlayerIds,
          });
          if (!eligibility.valid) throw new Error(eligibility.errors[0]);
          runtime.rosterStatus = "GOEDGEKEURD";
          const latest = draft.rosters.at(-1);
          if (latest) {
            latest.status = "GOEDGEKEURD";
            latest.approvedAt = new Date().toISOString();
          }
          for (const player of rosterPlayers)
            runtime.playerApprovals[player.id] = {
              status: "GOEDGEKEURD",
              reasonCode: "ALL_VALID",
            };
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
        case "review-player": {
          if (runtime.rosterStatus !== "INGEDIEND")
            throw new Error("Spelers kunnen alleen in een ingediende versie worden beoordeeld.");
          const playerId = z.string().min(2).parse(payload.playerId);
          const player = draft.players.find(
            (item) => item.id === playerId && item.teamId === "team_duindorp_1",
          );
          if (!player) throw new Error("Speler niet gevonden binnen de toernooiscope.");
          const status = z
            .enum(["GOEDGEKEURD", "AANVULLING_NODIG", "AFGEKEURD"])
            .parse(payload.status);
          const reasonCode = z
            .enum([
              "ALL_VALID",
              "PHOTO_INSUFFICIENT",
              "REFERENCE_MISMATCH",
              "AGE_EXCEPTION",
              "DISPENSATION_LIMIT",
              "SUSPENSION",
              "OTHER",
            ])
            .parse(payload.reasonCode);
          const note = z
            .string()
            .max(300)
            .parse(payload.note ?? "");
          if (status !== "GOEDGEKEURD" && note.trim().length < 4)
            throw new Error("Een toelichting is verplicht bij aanvulling of afwijzing.");
          runtime.playerApprovals[playerId] = { status, reasonCode, note };
          audit(
            draft,
            role,
            "PLAYER_REVIEWED",
            playerId,
            "WACHT_OP_GOEDKEURING",
            status,
            reasonCode,
          );
          break;
        }
        case "request-correction": {
          if (runtime.rosterStatus !== "INGEDIEND")
            throw new Error("Alleen een ingediende spelerslijst kan worden teruggestuurd.");
          runtime.rosterStatus = "CONCEPT";
          const latest = draft.rosters.at(-1);
          if (latest) latest.status = "WIJZIGING_GEVRAAGD";
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
          const approvedPlayers = draft.players.filter(
            (player) =>
              player.teamId === "team_duindorp_1" &&
              runtime.playerApprovals[player.id]?.status === "GOEDGEKEURD",
          );
          const result = validateLineup(selected, approvedPlayers, runtime.rules);
          if (!result.valid) throw new Error(result.errors[0]);
          const captainId = z
            .string()
            .min(2)
            .parse(payload.captainId ?? selected[3]);
          const goalkeeperId = z
            .string()
            .min(2)
            .parse(payload.goalkeeperId ?? selected[0]);
          if (!selected.includes(captainId) || !selected.includes(goalkeeperId))
            throw new Error("Keeper en aanvoerder moeten in de wedstrijdselectie staan.");
          const goalkeeper = approvedPlayers.find((player) => player.id === goalkeeperId);
          if (goalkeeper?.position !== "Keeper")
            throw new Error("De aangewezen keeper moet de positie Keeper hebben.");
          runtime.selectedPlayerIds = selected;
          runtime.lineupSnapshot = {
            version: runtime.lineupSnapshot.version + 1,
            starters: selected.slice(0, runtime.rules.starterCount),
            substitutes: selected.slice(runtime.rules.starterCount),
            captainId,
            goalkeeperId,
            submittedAt: new Date().toISOString(),
          };
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
          if (
            ![...runtime.homeSelectedPlayerIds, ...runtime.selectedPlayerIds].includes(
              String(payload.playerId),
            )
          )
            throw new Error("Deze speler staat niet in het vergrendelde wedstrijdsnapshot.");
          const status = z
            .enum(["AKKOORD", "NIET_AANWEZIG", "IDENTITEIT", "AFWIJKING"])
            .parse(payload.status);
          runtime.checks[String(payload.playerId)] = status;
          runtime.checkNotes[String(payload.playerId)] = z
            .string()
            .max(240)
            .parse(payload.note ?? "");
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
          for (const id of [...runtime.homeSelectedPlayerIds, ...runtime.selectedPlayerIds])
            runtime.checks[id] = "AKKOORD";
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
          const allSelected = [...runtime.homeSelectedPlayerIds, ...runtime.selectedPlayerIds];
          if (!canApproveLineupChecks(allSelected, runtime.checks, runtime.discrepancy)) {
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
        case "add-match-event": {
          if (!(["LIVE", "HALF_TIME"] as string[]).includes(scenarioMatch.status))
            throw new Error(
              "Gebeurtenissen kunnen alleen tijdens een live wedstrijd worden vastgelegd.",
            );
          const type = z
            .enum(["GOAL", "YELLOW", "RED", "SUBSTITUTION", "HALF_TIME", "RESUMED"])
            .parse(payload.type);
          const minute = z.coerce.number().int().min(0).max(130).parse(payload.minute);
          const teamId = payload.teamId ? String(payload.teamId) : undefined;
          if (teamId && ![scenarioMatch.homeTeamId, scenarioMatch.awayTeamId].includes(teamId))
            throw new Error("Het team hoort niet bij deze wedstrijd.");
          const playerId = payload.playerId ? String(payload.playerId) : undefined;
          const relatedPlayerId = payload.relatedPlayerId
            ? String(payload.relatedPlayerId)
            : undefined;
          const allowedPlayerIds = new Set([
            ...runtime.homeSelectedPlayerIds,
            ...runtime.selectedPlayerIds,
          ]);
          if (playerId && !allowedPlayerIds.has(playerId))
            throw new Error("De speler staat niet in het vergrendelde wedstrijdsnapshot.");
          if (relatedPlayerId && !allowedPlayerIds.has(relatedPlayerId))
            throw new Error("De wisselspeler staat niet in het vergrendelde wedstrijdsnapshot.");
          const player = playerId ? draft.players.find((item) => item.id === playerId) : undefined;
          if (teamId && player && player.teamId !== teamId)
            throw new Error("Speler en team komen niet overeen.");
          const event = {
            id: `match-event-${Date.now()}-${runtime.matchEvents.length + 1}`,
            matchId: scenarioMatch.id,
            minute,
            type,
            teamId,
            playerId,
            relatedPlayerId,
            note: z
              .string()
              .max(240)
              .parse(payload.note ?? ""),
          } as const;
          runtime.matchEvents.push(event);
          scenarioMatch.minute = minute;
          if (type === "GOAL") {
            const goals = runtime.matchEvents.filter(
              (item) => item.type === "GOAL" && !item.corrected,
            );
            scenarioMatch.score = {
              home: goals.filter((item) => item.teamId === scenarioMatch.homeTeamId).length,
              away: goals.filter((item) => item.teamId === scenarioMatch.awayTeamId).length,
            };
          }
          if (type === "HALF_TIME") scenarioMatch.status = "HALF_TIME";
          if (type === "RESUMED") scenarioMatch.status = "LIVE";
          if (type === "YELLOW" || type === "RED") {
            runtime.disciplinaryCases.push({
              id: `discipline-${Date.now()}`,
              matchId: scenarioMatch.id,
              playerId: event.playerId,
              type,
              status: "OPEN",
              summary: `${type === "YELLOW" ? "Gele" : "Rode"} kaart in minuut ${minute}`,
            });
            if (
              type === "RED" &&
              event.playerId &&
              !runtime.suspendedPlayerIds.includes(event.playerId)
            )
              runtime.suspendedPlayerIds.push(event.playerId);
          }
          audit(draft, role, "MATCH_EVENT_ADDED", event.id, "NONE", type);
          break;
        }
        case "correct-match-event": {
          const eventId = z.string().min(3).parse(payload.eventId);
          const event = runtime.matchEvents.find((item) => item.id === eventId);
          if (!event || event.matchId !== scenarioMatch.id)
            throw new Error("Wedstrijdgebeurtenis niet gevonden binnen de wedstrijdscope.");
          if (scenarioMatch.official) throw new Error("Een officiële wedstrijd is vergrendeld.");
          event.corrected = true;
          const goals = runtime.matchEvents.filter(
            (item) => item.type === "GOAL" && !item.corrected,
          );
          scenarioMatch.score = {
            home: goals.filter((item) => item.teamId === scenarioMatch.homeTeamId).length,
            away: goals.filter((item) => item.teamId === scenarioMatch.awayTeamId).length,
          };
          audit(
            draft,
            role,
            "MATCH_EVENT_CORRECTED",
            eventId,
            event.type,
            "CORRECTED",
            String(payload.reason ?? "REGISTRATION_ERROR"),
          );
          break;
        }
        case "interrupt-match": {
          if (scenarioMatch.official) throw new Error("Een officiële wedstrijd is vergrendeld.");
          if (!scenarioMatch.score) scenarioMatch.score = { home: 0, away: 0 };
          const snapshot = {
            id: `interruption-${Date.now()}`,
            matchId: scenarioMatch.id,
            type: z.enum(["TEMPORARY", "FINAL"]).parse(payload.type),
            reason: z.string().min(4).max(240).parse(payload.reason),
            minute: z.coerce.number().int().min(0).max(130).parse(payload.minute),
            score: { ...scenarioMatch.score },
            possession: z.string().min(2).max(80).parse(payload.possession),
            lastRestart: z.string().min(2).max(120).parse(payload.lastRestart),
            lastKickoff: z.string().min(2).max(120).parse(payload.lastKickoff),
            playersOnField: Array.isArray(payload.playersOnField)
              ? payload.playersOnField.map(String)
              : [],
            cards: Array.isArray(payload.cards) ? payload.cards.map(String) : [],
            substitutions: Array.isArray(payload.substitutions)
              ? payload.substitutions.map(String)
              : [],
            comments: z
              .string()
              .max(500)
              .parse(payload.comments ?? ""),
            refereeReport: z.string().min(4).max(1000).parse(payload.refereeReport),
            createdAt: new Date().toISOString(),
          } as const;
          runtime.interruptionSnapshots.push(snapshot);
          scenarioMatch.status = "STOPPED";
          scenarioMatch.minute = snapshot.minute;
          runtime.disciplinaryCases.push({
            id: `incident-${Date.now()}`,
            matchId: scenarioMatch.id,
            type: "INCIDENT",
            status: "OPEN",
            summary: snapshot.reason,
          });
          audit(
            draft,
            role,
            "MATCH_INTERRUPTED",
            scenarioMatch.id,
            "LIVE",
            snapshot.type,
            snapshot.reason,
          );
          notify(
            draft,
            "leadership",
            "Stakingsdossier vereist besluit",
            `${snapshot.minute}′ · ${snapshot.reason}`,
            "/beheer/toernooileiding/tucht",
          );
          break;
        }
        case "decide-incident": {
          const snapshot = runtime.interruptionSnapshots.at(-1);
          if (!snapshot) throw new Error("Er is geen stakingssnapshot om te besluiten.");
          const decision = z
            .enum([
              "RESUME_NOW",
              "REMAINING_TIME_LATER",
              "REPLAY",
              "KEEP_RESULT",
              "REGULATORY_RESULT",
              "EXCLUDE_TEAM",
              "OTHER",
            ])
            .parse(payload.decision);
          const reason = z.string().min(8).max(500).parse(payload.reason);
          snapshot.decision = decision;
          snapshot.decisionReason = reason;
          const incident = runtime.disciplinaryCases.find(
            (item) =>
              item.matchId === scenarioMatch.id &&
              item.type === "INCIDENT" &&
              item.status === "OPEN",
          );
          if (incident) {
            incident.status = "DECIDED";
            incident.decision = `${decision}: ${reason}`;
          }
          if (decision === "RESUME_NOW") scenarioMatch.status = "LIVE";
          if (decision === "REMAINING_TIME_LATER" || decision === "REPLAY")
            scenarioMatch.status = "SCHEDULED";
          audit(draft, role, "INCIDENT_DECIDED", snapshot.id, "OPEN", decision, reason);
          notify(
            draft,
            "all",
            "Besluit gestaakte wedstrijd",
            "Het verdere verloop is door de toernooicommissie vastgesteld.",
            "/wedstrijden/quick-duindorp-sv",
          );
          break;
        }
        case "decide-discipline": {
          const disciplinaryCase = runtime.disciplinaryCases.find(
            (item) => item.id === String(payload.caseId),
          );
          if (!disciplinaryCase || disciplinaryCase.status !== "OPEN")
            throw new Error("Open tuchtzaak niet gevonden.");
          const decision = z.string().min(8).max(500).parse(payload.decision);
          disciplinaryCase.status = "DECIDED";
          disciplinaryCase.decision = decision;
          if (
            Boolean(payload.suspend) &&
            disciplinaryCase.playerId &&
            !runtime.suspendedPlayerIds.includes(disciplinaryCase.playerId)
          )
            runtime.suspendedPlayerIds.push(disciplinaryCase.playerId);
          audit(
            draft,
            role,
            "DISCIPLINARY_CASE_DECIDED",
            disciplinaryCase.id,
            "OPEN",
            "DECIDED",
            decision,
          );
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
          runtime.resultConfirmations = { referee: true, home: false, away: false };
          runtime.resultDispute = { open: false, note: "" };
          if (!runtime.matchEvents.some((event) => event.type === "GOAL" && !event.corrected)) {
            runtime.matchEvents.push(
              {
                id: "seeded-goal-quick-18",
                matchId: scenarioMatch.id,
                minute: 18,
                type: "GOAL",
                teamId: scenarioMatch.homeTeamId ?? undefined,
              },
              {
                id: "seeded-goal-duindorp-55",
                matchId: scenarioMatch.id,
                minute: 55,
                type: "GOAL",
                teamId: scenarioMatch.awayTeamId ?? undefined,
              },
              {
                id: "seeded-goal-quick-82",
                matchId: scenarioMatch.id,
                minute: 82,
                type: "GOAL",
                teamId: scenarioMatch.homeTeamId ?? undefined,
              },
            );
          }
          const registeredGoals = runtime.matchEvents.filter(
            (event) => event.type === "GOAL" && !event.corrected,
          );
          const registeredScore = {
            home: registeredGoals.filter((event) => event.teamId === scenarioMatch.homeTeamId)
              .length,
            away: registeredGoals.filter((event) => event.teamId === scenarioMatch.awayTeamId)
              .length,
          };
          if (registeredScore.home !== 2 || registeredScore.away !== 1)
            throw new Error(
              `De uitslag 2–1 sluit niet aan op de geregistreerde goals (${registeredScore.home}–${registeredScore.away}).`,
            );
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
          if (runtime.resultDispute.open)
            throw new Error("Het uitslagconflict moet eerst worden opgelost.");
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
        case "confirm-home-result": {
          if (scenarioMatch.status !== "FINISHED_PROVISIONAL")
            throw new Error("Er is geen voorlopige uitslag om te bevestigen.");
          runtime.resultConfirmations.home = true;
          audit(
            draft,
            role,
            "HOME_TEAM_RESULT_CONFIRMED",
            scenarioMatch.id,
            "AWAITING_HOME",
            "HOME_CONFIRMED",
          );
          notify(
            draft,
            "leadership",
            "Quick bevestigde de uitslag",
            "De bevestiging van Duindorp SV is nog vereist.",
            "/beheer/toernooileiding/uitslagen",
          );
          break;
        }
        case "dispute-result": {
          if (scenarioMatch.status !== "FINISHED_PROVISIONAL")
            throw new Error("Alleen een voorlopige uitslag kan worden betwist.");
          const note = z.string().min(8).max(500).parse(payload.note);
          runtime.resultDispute = { open: true, note };
          runtime.resultConfirmations.away = false;
          audit(
            draft,
            role,
            "RESULT_DISPUTED",
            scenarioMatch.id,
            "AWAITING_AWAY",
            "DISPUTED",
            note,
          );
          notify(
            draft,
            "leadership",
            "Uitslagconflict vereist beoordeling",
            note,
            "/beheer/toernooileiding/uitslagen",
          );
          break;
        }
        case "resolve-result-dispute": {
          if (!runtime.resultDispute.open) throw new Error("Er is geen open uitslagconflict.");
          const resolution = z.string().min(8).max(500).parse(payload.resolution);
          runtime.resultDispute = { ...runtime.resultDispute, open: false, resolution };
          audit(
            draft,
            role,
            "RESULT_DISPUTE_RESOLVED",
            scenarioMatch.id,
            "DISPUTED",
            "RESOLVED",
            resolution,
          );
          break;
        }
        case "confirm-result": {
          if (scenarioMatch.status !== "FINISHED_PROVISIONAL")
            throw new Error("Er is geen voorlopige uitslag om te bevestigen.");
          if (!runtime.resultConfirmations.home || !runtime.resultConfirmations.away)
            throw new Error("Wacht op bevestiging van beide teams.");
          if (runtime.resultDispute.open) throw new Error("Los eerst het open uitslagconflict op.");
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
          const reason = z.string().min(8).max(300).parse(payload.reason);
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
            reason,
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
        case "request-fixture-change": {
          if (scenarioMatch.official)
            throw new Error("Een officiële wedstrijd is vergrendeld voor wijzigingen.");
          const proposedKickoff = z.string().datetime({ offset: true }).parse(payload.kickoff);
          const proposedVenue = z.string().min(4).max(120).parse(payload.venue);
          const reason = z.string().min(8).max(300).parse(payload.reason);
          runtime.fixtureChangeRequests.push({
            id: `change-${Date.now()}`,
            matchId: scenarioMatch.id,
            proposedKickoff,
            proposedVenue,
            reason,
            opponentApproved: false,
            leadershipApproved: false,
            status: "REQUESTED",
          });
          audit(
            draft,
            role,
            "FIXTURE_CHANGE_REQUESTED",
            scenarioMatch.id,
            scenarioMatch.kickoff,
            proposedKickoff,
            reason,
          );
          notify(
            draft,
            "matchops",
            "Wedstrijdwijziging wacht op tegenstander",
            `${proposedKickoff} · ${proposedVenue}`,
            "/beheer/wedstrijdleiding",
          );
          break;
        }
        case "approve-fixture-change-opponent": {
          const request = runtime.fixtureChangeRequests.find(
            (item) => item.id === String(payload.requestId),
          );
          if (!request || request.status !== "REQUESTED")
            throw new Error("Open wijzigingsverzoek niet gevonden.");
          request.opponentApproved = true;
          request.status = "OPPONENT_APPROVED";
          audit(
            draft,
            role,
            "FIXTURE_CHANGE_OPPONENT_APPROVED",
            request.id,
            "REQUESTED",
            "OPPONENT_APPROVED",
          );
          notify(
            draft,
            "leadership",
            "Wedstrijdwijziging klaar voor besluit",
            request.reason,
            "/beheer/toernooileiding/wedstrijden",
          );
          break;
        }
        case "approve-fixture-change-leadership": {
          const request = runtime.fixtureChangeRequests.find(
            (item) => item.id === String(payload.requestId),
          );
          if (!request || request.status !== "OPPONENT_APPROVED")
            throw new Error("De tegenstander moet eerst akkoord zijn.");
          request.leadershipApproved = true;
          request.status = "APPROVED";
          const previous = `${scenarioMatch.kickoff} · ${scenarioMatch.venue}`;
          scenarioMatch.kickoff = request.proposedKickoff;
          scenarioMatch.venue = request.proposedVenue;
          audit(
            draft,
            role,
            "FIXTURE_CHANGE_APPROVED",
            request.id,
            previous,
            `${scenarioMatch.kickoff} · ${scenarioMatch.venue}`,
            request.reason,
          );
          notify(
            draft,
            "all",
            "Wedstrijd definitief gewijzigd",
            "Aftrap en locatie zijn bijgewerkt.",
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
        case "save-rules": {
          if (runtime.seasonLocked) throw new Error("Het seizoen is vergrendeld.");
          const nextRules = {
            version: runtime.rules.version + 1,
            effectiveFrom: z
              .string()
              .regex(/^\d{4}-\d{2}-\d{2}$/)
              .parse(payload.effectiveFrom),
            category: z.enum(["A", "B"]).parse(payload.category),
            format: z.enum(["6X6", "8X8", "11X11"]).parse(payload.format),
            minimumAge: z.coerce.number().int().min(5).max(60).parse(payload.minimumAge),
            birthYearFrom: z.coerce.number().int().min(1950).max(2030).parse(payload.birthYearFrom),
            birthYearTo: z.coerce.number().int().min(1950).max(2030).parse(payload.birthYearTo),
            maxDispensations: z.coerce
              .number()
              .int()
              .min(0)
              .max(10)
              .parse(payload.maxDispensations),
            halfDurationMinutes: z.coerce
              .number()
              .int()
              .min(10)
              .max(60)
              .parse(payload.halfDurationMinutes),
            halves: z.coerce.number().int().min(1).max(4).parse(payload.halves),
            timeoutsPerTeam: z.coerce.number().int().min(0).max(3).parse(payload.timeoutsPerTeam),
            starterCount: z.coerce.number().int().min(6).max(11).parse(payload.starterCount),
            maxSquadSize: z.coerce.number().int().min(6).max(30).parse(payload.maxSquadSize),
            substitutions: z.enum(["DOORLOPEND", "MAX_5"]).parse(payload.substitutions),
            extraTimeRounds: Array.isArray(payload.extraTimeRounds)
              ? payload.extraTimeRounds.map(String)
              : [],
            penaltiesAfterDraw: Boolean(payload.penaltiesAfterDraw),
            yellowCardsForSuspension: z.coerce
              .number()
              .int()
              .min(1)
              .max(5)
              .parse(payload.yellowCardsForSuspension),
            refereeType: z.enum(["NEUTRAL", "CLUB"]).parse(payload.refereeType),
            assistantsRequired: z.coerce
              .number()
              .int()
              .min(0)
              .max(4)
              .parse(payload.assistantsRequired),
            standardMatchDay: z.string().min(2).max(30).parse(payload.standardMatchDay),
            standardKickoff: z
              .string()
              .regex(/^\d{2}:\d{2}$/)
              .parse(payload.standardKickoff),
            finalExtraTimeMinutes: z.coerce
              .number()
              .int()
              .min(0)
              .max(60)
              .parse(payload.finalExtraTimeMinutes),
          };
          if (nextRules.birthYearFrom > nextRules.birthYearTo)
            throw new Error("Het eerste geboortejaar moet vóór het laatste geboortejaar liggen.");
          if (nextRules.starterCount > nextRules.maxSquadSize)
            throw new Error("Het aantal basisspelers kan niet groter zijn dan de selectie.");
          runtime.rules = nextRules;
          runtime.regulationHistory.push(nextRules);
          audit(
            draft,
            role,
            "REGULATION_VERSION_CREATED",
            "tournament_swc_2026",
            `v${nextRules.version - 1}`,
            `v${nextRules.version}`,
            "CONFIGURATION_UPDATE",
          );
          notify(
            draft,
            "all",
            "Nieuwe reglementversie vastgesteld",
            `Versie ${nextRules.version} geldt vanaf ${nextRules.effectiveFrom}.`,
            "/toernooien/sir-winston-cup/reglement",
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
          const matchId = z.string().default("match_qf_1").parse(payload.matchId);
          if (!draft.matches.some((match) => match.id === matchId))
            throw new Error("Wedstrijd niet gevonden binnen de mediascope.");
          const clubId = payload.clubId ? String(payload.clubId) : undefined;
          if (clubId && !draft.clubs.some((club) => club.id === clubId))
            throw new Error("Club niet gevonden binnen de mediascope.");
          const rights = {
            website: payload.website !== false,
            articles: payload.articles !== false,
            social: payload.social === true,
          };
          if (!rights.website && !rights.articles && !rights.social)
            throw new Error("Kies minimaal één toegestaan publicatiekanaal.");
          runtime.mediaSubmissions.unshift({
            id: `media-${Date.now()}`,
            name,
            consent: true,
            status: "IN_MODERATIE",
            matchId,
            clubId,
            uploaderRole: role,
            rights,
            credit: z
              .string()
              .max(100)
              .parse(payload.credit ?? "Demo-inzender"),
          });
          audit(draft, role, "MEDIA_SUBMITTED", "community-media", "draft", "IN_MODERATIE");
          break;
        }
        case "moderate-media": {
          const item = runtime.mediaSubmissions.find(
            (submission) => submission.id === String(payload.id),
          );
          if (!item || item.status !== "IN_MODERATIE")
            throw new Error("Open media-item niet gevonden.");
          const status = z.enum(["GOEDGEKEURD", "AFGEKEURD"]).parse(payload.status);
          const reason = z.string().min(4).max(300).parse(payload.reason);
          item.status = status;
          audit(draft, role, "MEDIA_MODERATED", item.id, "IN_MODERATIE", status, reason);
          break;
        }
        case "set-press-permissions": {
          runtime.pressPermissions = {
            names: Boolean(payload.names),
            shirtNumbers: Boolean(payload.shirtNumbers),
            lineups: Boolean(payload.lineups),
            media: Boolean(payload.media),
          };
          audit(
            draft,
            role,
            "PRESS_PERMISSIONS_UPDATED",
            "tournament_swc_2026",
            "PREVIOUS",
            "UPDATED",
            "PRIVACY_POLICY",
          );
          break;
        }
        case "follow": {
          const id = z.string().min(2).parse(payload.id);
          const followableIds = new Set([
            ...draft.clubs.map((club) => club.id),
            ...draft.tournaments.map((tournament) => tournament.id),
            ...draft.matches.map((match) => match.id),
          ]);
          if (!followableIds.has(id)) throw new Error("Dit item kan niet worden gevolgd.");
          runtime.favorites = runtime.favorites.includes(id)
            ? runtime.favorites.filter((item) => item !== id)
            : [...runtime.favorites, id];
          break;
        }
        case "vote": {
          const id = z.string().min(2).parse(payload.id);
          if (id !== "photo-week") throw new Error("Deze stemoptie bestaat niet.");
          if (!runtime.votes.includes(id)) runtime.votes.push(id);
          break;
        }
        case "mark-read": {
          const id = z.string().min(1).parse(payload.id);
          const item = runtime.notifications.find((notification) => notification.id === id);
          if (!item || (item.role !== "all" && item.role !== role))
            throw new Error("Melding niet gevonden binnen de rolscope.");
          item.read = true;
          break;
        }
        case "preference": {
          const key = z.enum(["match", "news", "club"]).parse(payload.key);
          runtime.notificationSettings[key] = Boolean(payload.value);
          break;
        }
        case "set-push": {
          runtime.pushPermission = z.enum(["ENABLED", "DENIED"]).parse(payload.permission);
          break;
        }
        default:
          throw new Error("Onbekende actie.");
      }
      if (
        !["follow", "vote", "mark-read", "preference", "set-clock", "set-push"].includes(action)
      ) {
        runtime.securityEvents.unshift({
          id: `security-${Date.now()}-${runtime.securityEvents.length + 1}`,
          timestamp: new Date().toISOString(),
          role,
          action,
          outcome: "ALLOWED",
          detail: "Server-side rolpolicy en payloadvalidatie doorlopen.",
        });
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
