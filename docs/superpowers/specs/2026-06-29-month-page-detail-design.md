# Month Page — Phase A: "The month in detail" — design

**Date:** 2026-06-29
**Status:** approved (brainstorm) → ready for implementation plan
**Scope:** Phase A only. Phase B ("How this month is changing" — per-month warming rate, trend line, mean-high/mean-low split, monthly counters vs normal, then-now parity) is a separate later spec.

## Problem

The Month view (`src/tabs/today/MonthView.tsx`) is a flat aggregate: one monthly-mean number, the all-time warmest/coldest-month records, a where-it-sits RangeBar, then/now warming strip, and a per-year scatter. A month is 28–31 days but the page shows **none of them** — there is no within-month story. The page also carries **zero daily data**; it only loads yearly aggregates from `month/MM.json`.

Phase A makes the Month page tell the story of *how the viewed month actually played out*, day by day.

## Goal

For the viewed month-year (e.g. June 2019), surface:
- a **calendar heatmap** of every day, tinted by how warm/cool it was, each day clickable through to the Day view;
- a one-line **summary** of the day-mix and records broken;
- a **notable-days** list (top-5 warmest/coldest, each linking to Day);
- a **share** button that captures the hero + heatmap as a PNG.

All within-month figures derive from a new per-year daily data layer.

## Non-goals (Phase A)

- Per-month warming rate / trend line on the scatter — Phase B.
- Mean-high / mean-low split in the hero — Phase B.
- Monthly counters vs normal (summer days, frost days, …) — Phase B.
- Then-vs-now window parity with Day view — Phase B.
- Year-view within-year detail (the new daily file is designed to be reusable there later, but no Year-view work in Phase A).

## Data layer

### New emitted file: `public/data/daily/YYYY.json`

One file per year (~193 files, ~10 KB each), array of day records sorted by date:

```json
[
  { "mmdd": "0619", "tmax": 34.1, "tmin": 18.0, "recHi": true },
  { "mmdd": "0620", "tmax": 24.0, "tmin": 14.2 },
  { "mmdd": "0621", "tmax": 21.5, "tmin": 13.0, "provisional": true }
]
```

Fields:
- `mmdd` — month-day key (matches `daynorm.json` / `thisday` keying).
- `tmax`, `tmin` — the merged consolidated/filled values (post-`merge_fills`, GHCN > ERA5 > forecast precedence).
- `provisional?` — true for forecast-filled days inside the ERA5 lag (same flag semantics as `thisday` series).
- `recHi?` / `recLo?` — true when **this year holds the all-time daily record** (high / low) for that `mmdd`. **Suppressed when the day is `provisional`** — a provisional hot day must not be announced as a broken record before ERA5 finalizes (directly addresses the known "records/extremes are provisional-blind" issue; the next daily rebuild self-corrects once consolidated).

Days are only emitted where a paired record exists (the parser already keeps paired-only days); gap days are simply absent from the array.

### Pipeline

- `scripts/uccle/derive.py` gains `daily_data(recs)`:
  - group `recs` by year;
  - compute the all-time daily record holder per `mmdd` (reuse the existing daily-record computation used by `thisday`); mark `recHi`/`recLo` on the holder year's day, unless that day is provisional;
  - return `{ "YYYY": [ {mmdd, tmax, tmin, provisional?, recHi?, recLo?}, … ], … }`.
- `scripts/uccle/build_data.py`: `os.makedirs(out_dir/"daily")` and write each `daily/{year}.json` (mirrors the existing `month/` emission loop). `public/data/` stays git-ignored and CI-generated.

### Frontend data access

- `src/data/loader.ts` gains `loadDaily(year)`.
- New `src/data/useDaily.ts` → `useDaily(year)` returning `{ data, loading, error }`, mirroring `useMonth`.
- New type in `src/types.ts`:
  ```ts
  export interface DailyPoint { mmdd: string; tmax: number; tmin: number; provisional?: boolean; recHi?: boolean; recLo?: boolean }
  export type DailyYear = DailyPoint[]
  ```

### PWA caching

`daily/*.json` lives under `public/data/`, so it is already covered by `globIgnores: ['**/data/**']` (not precached) and served **NetworkFirst** by the existing `climate-data` runtime rule. No Workbox config change.

## App-side derivation

All within-month figures are computed in the view from the daily file (filtered to the month) plus the existing `useDayNorm` 1991–2020 day-of-year normals. No extra counts are precomputed in the pipeline — this keeps `tempColor` (value vs DOY normal, strict ±2°) the single source of truth for warm/cool classification, consistent with Day view.

- **Warm/cool tally:** for each day, classify `tmax` vs its `mmdd` 1991–2020 normal using `tempColor` → `warm` (above) / `neutral` / `cool` (below); count each bucket over the days present.
- **Records broken:** count `recHi` + `recLo` flags among the month's days.
- **Notable days:** **Warmest** = top-5 days by `tmax` descending (row value = `tmax`, `recHi` → record dot). **Coldest** = top-5 days by `tmin` ascending (row value = `tmin`, `recLo` → record dot). This follows the project-wide convention (record high = `tmax`, record low = `tmin`).

## Page layout (top → bottom)

1. **Hero** — unchanged (`CalendarTile` · state word · `BigTemp`(monthly mean) · delta line · rank / "so far" banner).
2. **Summary line** *(new)* — e.g. "12 of 30 days ran warm, 5 cool — and 2 all-time daily records fell." Partial month → "X of N days so far …". Built by `lib/monthSummary.ts`; the same builder feeds the share caption so on-page text and caption never disagree (mirrors the Day `shareSentence` ↔ hero contract).
3. **Calendar heatmap** *(new centerpiece)* — see below.
4. **Share button** *(new)* — discreet "Share this month" ghost button (parity with Day's "Share").
5. **RangeBar card** — unchanged (where the year's monthly mean sits).
6. **Notable days** *(new)* — Warmest↔Coldest solid-fill toggle + top-5 list; see below.
7. **StatCards 2×2** — unchanged (Average · This year vs average · Warmest month · Coldest month).
8. **WarmingStrip** — unchanged.
9. **PeriodScatter** — unchanged.

Sections **1–3 plus a capture-only footer** are wrapped in `#month-capture`, the PNG share target.

## New components & libs

### `MonthHeatmap` (`src/components/MonthHeatmap.tsx`)
- Props: `{ year: number; mm: string; days: DailyPoint[]; normals: Map<string, number> | DayNorm lookup; liveToday?: { mmdd: string; tmax: number }; onPick: (iso: string) => void }`.
- Renders a **Monday-start** month grid: weekday header row (Mo…Su), leading blank cells for the first week (from `new Date(year, month-1, 1).getDay()`), then one cell per day.
- **Cell content:** day number + that day's high (`tmax`) + a record dot (`•`) when `recHi || recLo`.
- **Cell tint:** `tempColor(tmax, normalForMmdd)` → warm / neutral / cool background (token-based, e.g. `bg-warm/…`, `bg-surface-2`, `bg-accent/…`); tint is decorative → `aria-hidden` on the color layer.
- **Interaction:** each populated cell is a link/button → `onPick` with `YYYY-MM-DD` → navigates `/today?d=YYYY-MM-DD` (Day view). Accessible name per cell, e.g. "June 19, 2019 — high 34.1°, record". Grid semantics (`role="grid"`/row/gridcell or a labelled list).
- **Current month:** today's cell uses `liveToday` (app owns today, from `useTodayTemp`); future days render as empty/disabled cells; absent (gap) days render empty.
- Responsive: 7 columns at 375 px (≈ 50 px cells), comfortable at 768/1280; square corners.

### `NotableDays` (`src/components/NotableDays.tsx`)
- Props: `{ warmest: {mmdd, tmax, recHi?}[]; coldest: {mmdd, tmin, recLo?}[]; year: number; mm: string; onPick: (iso: string) => void }` (top-5 each, precomputed by the view; warmest by `tmax`, coldest by `tmin`).
- One square panel: a **Warmest↔Coldest solid-fill toggle** (same visual + a11y as the Records tab toggle — `role="radiogroup"`/`role="radio"` + `aria-checked`, red/blue solid fill, `text-white`, no icons) over an `<ol>` `divide-y` flat leaderboard.
- Each row: date · value · optional "record •" · chevron; the whole row is a `<Link to={"/today?d=YYYY-MM-DD"}>` (matches Records rows).

### `lib/monthSummary.ts`
- `monthSummary({ warm, cool, total, records, soFar })` → sentence string used both on-page (section 2) and as the share caption text.
- Adapts: complete vs `soFar` ("X of N days so far"), zero records (drop the records clause), all-neutral months (graceful wording).

### Share
- `lib/shareText.ts` gains a month sentence builder (or `monthShareSentence`) reusing the `monthSummary` output; `lib/share.ts` `shareNode(node, file, {text})` is reused as-is.
- The share handler mirrors `DayView`: `requestAnimationFrame` settle → `document.getElementById('month-capture')` → `shareNode(node, 'uccle-month.png', { text: caption })`.
- **Caption deep-link:** caption appends a per-month deep link `…/#/today?m=YYYY-MM` (see below) so a shared month opens to that month (parity with Day's `?d=` caption link via `dayShareUrl`).

## Month deep-link (`?m=YYYY-MM`)

`Today.tsx` currently parses only `?d=YYYY-MM-DD` (opens Day mode at a date, regex-validated + clamped). Add a sibling **`?m=YYYY-MM`** param: validated (regex + clamp to `[1833-01, current month]`), opens **Month mode** at that month-year by seeding the shared cursor and active unit = Month. Precedence: if both `?d` and `?m` present, `?d` wins (Day is more specific). Param-less Nav link still resets to today (the per-nav remount behavior is unchanged).

## Edge cases

- **Partial / current month:** consolidated + provisional days from the file; today's cell from live; future days empty. Tally and summary count only days present ("X of N days so far"). Hero already shows the neutral "(so far)" pill via `heroState` incompleteness.
- **Provisional days:** tinted and shown in the heatmap, but record dots suppressed and excluded from the records-broken count (flag suppression happens in the pipeline).
- **Gap days:** absent from the daily array → empty cell, excluded from tallies.
- **Missing DOY normal** for a `mmdd` (should not happen for a full year of normals): cell falls back to neutral tint.
- **Sparse-history years** (e.g. GHCN TMIN 2000–2024 gap): the daily file uses post-merge recs, so tmax/tmin are present where ERA5 filled; pre-1940 GHCN-only days behave normally.

## Testing

**pytest (`scripts/uccle/tests/`):**
- `daily_data`: correct grouping by year; `recHi`/`recLo` set only on the all-time record-holder year for each `mmdd`; record flags suppressed on provisional days; provisional flag passthrough; gap days absent.
- `build_data`: writes `daily/{year}.json` for each year present; payload shape matches.

**vitest:**
- `MonthHeatmap`: correct tint per cell (warm/neutral/cool via `tempColor`), record dot on flagged days, click → `?d=` navigation, partial-month future cells empty, live-today cell wired, gap-day empty.
- `NotableDays`: toggle switches warmest/coldest, top-5 ordering, rows link to Day, radiogroup a11y.
- `monthSummary`: complete vs so-far wording, zero-records clause dropped, counts correct.
- `MonthView` integration: summary line renders with derived counts; capture wrapper present.
- `Today.tsx`: `?m=YYYY-MM` opens Month mode at the month-year; regex-invalid/out-of-range clamped; `?d` precedence over `?m`.
- Follow existing test conventions: mock Recharts `ResponsiveContainer`; `vi.unstubAllGlobals()` after fetch stubs; derive mmdd from `todayMMDD()` (no date-coupled fixtures).

## Conventions / constraints

- **No PII** anywhere (derived stats + "Uccle, Brussels" + app URL only on the share card).
- **No external fonts/CDNs**; system sans only.
- **Tokens, not hex** (`text-warm`/`text-accent`/`bg-surface`/`bg-warm/10`…); only `lib/ramp.ts` + icon script hold literal hex.
- **Square corners** throughout the new UI; decorative glyph/tints `aria-hidden`.
- **a11y:** toggle = radiogroup; every cell/row has an accessible name; chevrons/dots decorative.

## CI / deploy impact

- `build_data` (and the daily `refresh.yml` cron) now also writes ~193 `daily/*.json` files each run — stdlib-only, fast, git-ignored. No workflow change required.
- Standing workflow per change: tests → commit → `git push origin main` (CI deploys) → validate it shipped on the live site.
