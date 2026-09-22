# Rule: Keep README.md Up-to-Date

Whenever a meaningful change is made to the CampusFind codebase, the `README.md` must be reviewed and updated if the change affects any of the following:

## Trigger Conditions — Update README when:

1. **New npm dependency added** — if it changes what's in the Stack table (layers: UI, Style, Motion, Data, Cache, Realtime, Search, Hosting).
2. **New page or route added** — add it to the Repository Structure section under `pages/`.
3. **New component directory or major component** — update the Repository Structure.
4. **New hook added** — update the `hooks/` line in Repository Structure.
5. **Rate limit changed** — if Postgres trigger rate limits change (posts/hour, claims/day, notifications/hour), update the Product Rules section.
6. **New database table or major schema change** — update the Security Model table.
7. **New Supabase function or migration with meaningful user-facing impact** — update the relevant section.
8. **Auth flow changes** — update the Security Model or Architecture section.
9. **Cost model changes** — if a new paid service is introduced (avoid this, but document if it happens).
10. **Search engine changes** — if a major change is made to `search-engine.ts` (new synonym families, scoring changes), note it in the Stack row for Search.

## What NOT to update in README:

- Internal refactors that don't change public-facing behavior.
- Renaming of internal types or interface fields.
- Style/UI micro-fixes that don't add or remove features.
- Test file additions.

## How to update:

- Edits must be accurate against the actual code — do NOT guess. Read the relevant source file before writing.
- The README is written for **humans** (contributors, campus tech leads). Keep language plain and direct.
- Never introduce marketing fluff, AI readiness claims, or vague superlatives.
- The AI checker / AI readiness section is permanently removed — do NOT re-add it.
