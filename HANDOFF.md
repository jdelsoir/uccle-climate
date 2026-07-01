## Session 2026-07-01

Shipped the full **Month-tab feature arc** (Phase A → month-picker → B1 → B2), each via the Superpowers flow (brainstorm → spec → plan → subagent-driven execution → opus whole-branch review → merge → CI deploy → live-validate). All live on https://jdelsoir.github.io/uccle-climate/.

## State
- **Month tab is feature-complete. Nothing parked.**
- Phase A — "the month in detail": new per-year `daily/YYYY.json` (provisional-aware record flags) → `MonthHeatmap` (click→Day), `monthSummary` day-mix/records line, `NotableDays` warmest/coldest toggle, hero+heatmap share, year-aware Month cursor + `?m=` deep link.
- Month picker: native `<input type="month">` on the CalendarTile (fast jump; `?m=` clamped 1–12).
- Phase B1 — "how this month is changing": `lib/trend.ts` (OLS) → Warming °/decade StatCard, opt-in trend line on `PeriodScatter` (fits shown period), then-now parity with Day (`windowMean`).
- Phase B2 — "highs, lows & counts": pipeline `meanMax`/`meanMin` + `monthly_counter_normals` → hero high/low subline + `MonthCounters` card (in-season counts vs 1991–2020 normal).
- Latest `main` = commit `9c95886` (incl. keepalive merge). Full suite: 161 vitest / 33 pytest green; prod build clean.
- Specs/plans in `docs/superpowers/`; per-run ledgers in `.superpowers/sdd/` (git-ignored scratch).

## Decisions
- **Phased delivery** each time (build highest-value/app-side sub-phase first): Phase A before B; B1 (app-side, no pipeline) before B2 (needs pipeline data). Rationale: faster feedback, smaller reviews, ship value incrementally.
- **Data-layer split**: within-month detail from per-year `daily/YYYY.json` (lazy per viewed year, ~193 files) rather than bloating `month/MM.json` or 2,300 per-month-year files.
- **`tempColor` single source of truth** for warm/cool everywhere (heatmap tint, day-mix); thresholds for counters duplicated across 3 sites (`threshold_counters`, `monthly_counter_normals`, `monthCounters`) — documented in CLAUDE.md as change-blast-radius.
- **Record flags provisional-aware** in `daily/YYYY.json` (suppressed on provisional days) — fixes the blind-spot for the Month path (Records tab + Day banner still blind).
- Model tiering in subagent execution: haiku for transcription tasks, sonnet for integration, opus for whole-branch reviews.

## Open questions
- None blocking.

## Next steps (parked fast-follows, non-blocking — see CLAUDE.md "Known fast-follows")
- Drop the now-dead `month_data.thenNow` field + emission (unused since B1's relative-window switch).
- `summary.extremes`/`summary.records` still provisional-blind (Records tab + Day record-broken banner can transiently show a forecast-filled day until ERA5 finalizes).
- Recharts ~600 kB bundle — code-split charts to halve initial JS.
- `useSummary`/`useDayNorm`/`useTodayTemp`/`useDaily` lack in-app fetch dedup.
- Minor test-hardening deferred during reviews (recorded in `.superpowers/sdd/progress.md` per phase).
