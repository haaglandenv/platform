# Inhoud van het overdrachtspakket

| Pad | Inhoud | Gebruik |
|---|---|---|
| `START_HERE.md` | Korte overdracht en definitie van klaar | Eerst lezen |
| `AGENTS.md` | Automatisch geldende Codex-projectregels | Blijft in projectroot |
| `CODEX_AUTONOMOUS_BUILD_PROMPT.md` | Volledige autonome VPS-bouwopdracht | Hoofdopdracht voor Codex |
| `requirements/Haaglanden_Voetbal_TournamentOS_Master_300_Features.xlsx` | Origineel register met 300 features | Autoritatieve functionele bron |
| `requirements/FEATURE_PRIORITY_MATRIX.md` | Uitgeschreven 20 MVP + 36 V1 | Traceability en planning |
| `requirements/DESIGN_SYSTEM.md` | Premium visuele regels, grids, type en components | Implementatiecontract |
| `requirements/PRODUCT_AND_ROUTE_SCOPE.md` | Routes en zichtbaar gedrag | Functionele scope |
| `requirements/ROLE_WORKFLOWS.md` | Rollen en end-to-end werkstromen | Beheersysteem |
| `requirements/DEMO_DATA_AND_STATE_MODEL.md` | Canonieke seeddata en statussen | Eén consistente demo |
| `requirements/PHOTOGRAPHY_AND_ASSET_PLAN.md` | Beeldslots, prompts, rechten en fallbacks | Lokale fotografie-assets |
| `requirements/QA_ACCEPTANCE_MATRIX.md` | Functionele, responsive, privacy- en a11y-gates | Oplevercriteria |
| `requirements/VPS_BUILD_RUNBOOK.md` | Veilige bouw- en GitHub-gate | VPS-uitvoering |
| `assets/concepts/` | Vijf originele 8K-conceptboards | Visuele richting per productgebied |
| `assets/reference-ui/` | Oorspronkelijk dashboardconcept | Extra dashboardreferentie |
| `assets/brand/` | Logo plus SVG-fallbacks | Lokale implementatie-assets |
| `references/design-briefs/` | Twee originele ontwerpbrieven | Volledige context |
| `references/originals/` | Originele HTML-prototype-ZIP | Ongewijzigde bronreferentie |
| `starter/` | Uitgepakte oude werkende HTML-demo | Functioneel start-/vergelijkpunt |
| `demo-data/` | Synthetische demo-entiteiten en accounts | Seeding en tests |
| `scripts/verify-handoff.sh` | Controleert aanwezigheid en checksums | Voor bouwen uitvoeren |
| `checksums/SHA256SUMS.txt` | SHA-256 van pakketinhoud | Integriteitscontrole |

## Belangrijke statusnotitie

De eerdere live Sites-checkout was niet meer lokaal materialiseerbaar tijdens het samenstellen van dit pakket. Daarom bevat dit pakket de originele HTML-demo als bronstarter, alle blijvend opgeslagen conceptbeelden, het logo, het volledige featurewerkboek en een zelfstandige implementatiespecificatie. Als op de VPS al een nieuwere Next.js-versie staat, heeft die bestaande broncode voorrang als technische basis.

Bekende visuele preview: <https://haaglanden-tournamentos-prototype.famgoldenbelt.chatgpt.site>
