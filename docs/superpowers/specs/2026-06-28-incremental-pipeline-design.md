# Incremental daily-fresh data pipeline — design

**Date:** 2026-06-28
**Status:** approved (brainstorm)

## Problem

Recent days (yesterday / day-before) show "no data" in the app. Data is **not** structurally
missing — the pipeline already fetches recent days (ERA5 archive and Open-Meteo forecast both
return through today for Uccle). The data is **stale between refreshes**: the only automated
rebuilds are on push to `main` (`deploy.yml`) and a **weekly** cron (`refresh.yml`, Mondays
05:00 UTC). On the ~6 non-push days each week the current-year daily series never gets the last
few days, so the Day view renders them empty.

## Goal

Keep the dataset fresh to **yesterday** every day, automatically, for $0 on GitHub, while being
honest that the most-recent days are provisional (subject to revision by ERA5 reanalysis).

## Approach (chosen)

**Daily stateless full rebuild.** Flip the refresh cron weekly → daily; the existing full
rebuild already re-derives everything from sources, so revised values self-heal each run. No
committed data, no delta state, no bot commits — `public/data/` stays git-ignored and
CI-generated.

Rejected alternatives:
- **Incremental append with committed data** — adds repo state, bot commits, and merge
  complexity when GHCN/ERA5 later revise. Overkill for this dataset size.
- **Client-side recent-days fetch** — only fixes the Day view; summary/records/rankings/"so far"
  year stay as stale as the last build.

## Architecture

- `refresh.yml` cron `0 5 * * *` (daily 05:00 UTC — yesterday fully settled in Europe/Brussels);
  keep `workflow_dispatch`. Still `workflow_call`s `deploy.yml` (full rebuild → Pages deploy).
- No new infrastructure. Stateless: each run fetches sources fresh and regenerates `public/data/`.

### Cost & reliability

- **Free.** Public repo → unlimited GitHub Actions minutes. Pages deploy free for public repos
  (well under the 100 GB/mo bandwidth + 10 builds/hr soft limits at 1 run/day).
- **Cron is not exact** — GitHub delays scheduled jobs under load (05:00 UTC may fire later).
  Acceptable for daily data.
- **60-day inactivity auto-disable** — GitHub disables *scheduled* workflows when a repo has no
  commits for 60 days. Because `public/data/` is git-ignored, daily deploys do **not** commit, so
  a quiet dev period (60 days no pushes) silently stops the cron. Mitigation in v1: rely on the
  retained `workflow_dispatch` (a manual run re-enables it). **Fast-follow (optional):** a tiny
  scheduled keepalive that commits a heartbeat file (or bumps a timestamp) on a cadence < 60 days
  to keep the schedule alive unattended.

## Data sources & precedence

Add a third source. Precedence for any given date: **GHCN > ERA5-archive > forecast**.

| Source | Range | Role |
|--------|-------|------|
| GHCN `.dly` (`BE000006447`) | full record | authoritative; unchanged |
| Open-Meteo ERA5 archive | `1940 → yesterday` | gap-fill; `end` clamped to yesterday |
| **NEW** Open-Meteo *forecast* `past_days=7` | last ~7 days incl. yesterday | fills recent dates ERA5 archive didn't return |

**Cutoff = today − 1 (yesterday).** The app continues to own "today" via its live Open-Meteo
fetch and the existing shared `mergeLiveExtreme`/`allTimeRank` logic (`src/lib/records.ts`),
unchanged. No partial/provisional "today" enters the series, records, or rankings.

## Provisional marking

- **Rule:** a filled, **non-GHCN** day with `date ≥ build_date − LAG` is `provisional: true`,
  where `LAG = 5` (ERA5 finalization lag). GHCN days are never provisional; ERA5 days older than
  the lag window are final.
- Thread `provisional` from `recs` → `derive.per_date` **daily series** entries only. Emit
  `"provisional": true` **only when true** (omit the key otherwise → JSON stays small).
- **Day view:** subtle muted marker when viewing a past day whose series entry is provisional —
  a small `· provisional` caption near the temps (muted color, `aria`-labeled). Hidden for
  today (`isReal`, live-owned) and for all non-provisional days.
- **Records / extremes: not flagged in v1** (accepted caveat). A hot provisional day could
  transiently top a daily record or the top-10 extremes; the next daily rebuild corrects it once
  ERA5 finalizes. Add one caveat line to the About page. (Flagging records is a possible
  fast-follow.)
- **Month aggregates: not flagged** (monthly means are aggregates; a single provisional day is
  immaterial).

## Pipeline code

`scripts/uccle/build_data.py`:
- `end = (today - 1)` for the archive fetch.
- New `fetch_recent()` → Open-Meteo forecast `past_days` into `{date: {tmax, tmin}}`
  (best-effort; isolated `try/except`, prints WARNING, never fails the build).
- Replace `merge_archive` with `merge_fills(recs, archive, recent, today, lag=5)`:
  - GHCN records authoritative (kept as-is, never provisional).
  - For dates GHCN lacks: take ERA5-archive value if present, else forecast value.
  - Tag a filled day `provisional=True` iff `date >= today - lag`.
  - Drop days missing tmax or tmin (existing behavior).
- Error isolation preserves the existing graceful degradation: forecast fail → ERA5 only;
  ERA5 fail → GHCN only.

`scripts/uccle/derive.py`:
- `per_date` series entry includes `provisional` when the underlying record has it
  (`{"year", "tmax", "tmin", **("provisional": True if set)}`).

## Frontend

- `src/types.ts`: thisday series entry `+ provisional?: boolean`.
- `src/tabs/today/DayView.tsx`: render the provisional marker when
  `entry?.provisional && !isReal`. Uses tokens (muted text), decorative dot `aria-hidden`,
  caption carries an accessible name.

## Error handling

Each network fetch is best-effort and isolated (existing convention): a failure logs a WARNING
and degrades to the next-best source; the build never aborts on a fill source. GHCN parse
failure still aborts (format-drift guard, unchanged).

## Testing

**pytest (`scripts/uccle/tests/`):**
- `merge_fills` precedence: GHCN wins over ERA5 and forecast; ERA5 fills GHCN gaps; forecast
  fills dates ERA5 lacks.
- Provisional tagging: days within the last `LAG` are flagged; older filled days are not; GHCN
  days never flagged. Inject `today` — no real network.
- `end = yesterday` clamp.
- `per_date` propagates `provisional` onto the series entry.

**vitest (`src/tabs/today/DayView.test.tsx`):**
- Provisional marker shown when a viewed past day's series entry is `provisional`.
- Marker hidden when the entry is not provisional.
- Today (`isReal`, live) path unaffected by the flag.

## Out of scope (YAGNI)

Committed data; delta-only fetch; provisional flag on records/extremes/month; provisional on
"today" (live owns it); the keepalive heartbeat (optional fast-follow).
