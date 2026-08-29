#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"

required=(
  "START_HERE.md"
  "AGENTS.md"
  "CODEX_AUTONOMOUS_BUILD_PROMPT.md"
  "requirements/Haaglanden_Voetbal_TournamentOS_Master_300_Features.xlsx"
  "requirements/FEATURE_PRIORITY_MATRIX.md"
  "requirements/DESIGN_SYSTEM.md"
  "requirements/PRODUCT_AND_ROUTE_SCOPE.md"
  "requirements/ROLE_WORKFLOWS.md"
  "requirements/DEMO_DATA_AND_STATE_MODEL.md"
  "requirements/QA_ACCEPTANCE_MATRIX.md"
  "requirements/VPS_BUILD_RUNBOOK.md"
  "assets/brand/haaglanden-voetbal-logo.jpg"
  "assets/brand/club-placeholder.svg"
  "assets/brand/player-placeholder.svg"
  "assets/concepts/HV_TournamentOS_Concept_01_Matchday_8K.png"
  "assets/concepts/HV_TournamentOS_Concept_02_Editorial_8K.png"
  "assets/concepts/HV_TournamentOS_Concept_03_Tournament_Arena_8K.png"
  "assets/concepts/HV_TournamentOS_Concept_04_Football_Network_8K.png"
  "assets/concepts/HV_TournamentOS_Concept_05_HV_Next_8K.png"
  "demo-data/tournamentos-seed.json"
  "references/originals/haaglanden-tournamentos-html-prototype.zip"
)

for relative in "${required[@]}"; do
  if [[ ! -f "$PACKAGE_ROOT/$relative" ]]; then
    printf 'Missing required file: %s\n' "$relative" >&2
    exit 1
  fi
done

python3 -m json.tool "$PACKAGE_ROOT/handoff-manifest.json" >/dev/null
python3 -m json.tool "$PACKAGE_ROOT/demo-data/tournamentos-seed.json" >/dev/null
unzip -tq "$PACKAGE_ROOT/references/originals/haaglanden-tournamentos-html-prototype.zip" >/dev/null

if [[ -f "$PACKAGE_ROOT/checksums/SHA256SUMS.txt" ]]; then
  # These files are living implementation status/entrypoint documents or this verifier itself.
  # All immutable requirements, references, assets and the source seed remain checksum-verified.
  (cd "$PACKAGE_ROOT" &&
    awk '$2 != "./README.md" && $2 != "./CURRENT_STATE.md" && $2 != "./scripts/verify-handoff.sh"' \
      checksums/SHA256SUMS.txt | sha256sum -c -)
fi

printf 'Handoff verification passed: %s\n' "$PACKAGE_ROOT"
