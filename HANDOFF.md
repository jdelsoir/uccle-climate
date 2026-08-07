# HANDOFF

## Session 2026-08-07

## State
No code changes this session — LinkedIn post work only. App live and stable at https://jdelsoir.github.io/uccle-climate/ (all prior work shipped and verified; see git history).

- **LinkedIn post draft v1 (EN)** written and saved to `docs/linkedin-post-draft.md` — story-first (June 2026 heatwave "record at Uccle" news hook → built the app → lesson: AI accelerates the SDLC, doesn't replace it), per-step tool list, superpowers plugin recommendation, ~1500 chars.

## Decisions
- **Language:** English first; French translation only once the EN version is locked.
- **Angle:** story-first (personal hook → lesson) over process-first or tool-showcase.
- **Length:** medium ~1500 chars (LinkedIn sweet spot, avoids "see more" fatigue).
- **Attribution:** superpowers plugin credited to Jesse Vincent; tag on LinkedIn if connected.
- No PII, public data only — org policy clean.

## Open questions
- User feedback on draft v1 pending (tone, per-step detail, hook, hashtags).
- Which image to attach: Day-view screenshot on a record-hot day vs the app's own share-card PNG.
- Carried over: auto-retry the `deploy-pages@v5` "try again later" transient at CI level, or keep re-dispatching manually? (documented in CLAUDE.md CI section)
- Carried over: opus subagents misbehaved on 2026-07-05 (0-tool-use spurious output) — env glitch or persistent? sonnet was reliable.

## Next steps
- Get feedback on the EN draft → revise → lock.
- Translate to French (post FR in first comment or as separate post — decide then).
- Pick/capture the image, then publish.
- **Year Phase 2 leftovers (parked):** research ideas #3 stripe timeline (overlaps PeriodScatter), #6 shifting-distribution histogram, #7 radial year plot — in `docs/superpowers/research/year-screen-ideas.md`.
- **Me tab:** un-park + redesign when a "your lifetime" feature is wanted again.
- **Known fast-follows** (see CLAUDE.md): monthly-mean records provisional-blind; `TINT`/watermark duplicated MonthHeatmap↔MonthGrid; `year_data` recomputes `month_data`; per-key data hooks don't reset on cursor change (brief stale-flash); Recharts bundle code-split; dead `month_data.thenNow`.
