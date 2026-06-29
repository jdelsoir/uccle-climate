# Today tab redesign (Day / Month / Year) — design

**Date:** 2026-06-29
**Status:** approved (brainstorm)

## Goal

Redesign the Today tab's Day screen per the provided mockup (light + dark), and adapt Month and
Year to the same layout language. One coherent visual system across all three granularities, built
from shared components, tokens only, responsive, accessible.

Reference mockup: calendar tile + "TODAY'S HIGH"/"NOW" hero with rank badge; a "WHERE TODAY SITS"
range bar (record-low → record-high with avg / now / high markers); a 2×2 stat-card grid
(Average · Today vs Average · Record High · Record Low); a full-width "A WARMING JUNE 29"
then→now strip with a delta badge. Header: section title + Today + ◀▶ on the right, underline
Day/Month/Year tabs below.

## Architecture

`Today.tsx` owns the **cursor** for every mode (it already holds month + year; add the day `Date`,
re-externalizing day stepping so the shared header drives it). It renders the shared header and
passes `(cursor, onChange, bounds)` to each view; `DayView`/`MonthView`/`YearView` become
**controlled** presentational views.

Shared header (in `Today.tsx`, all modes):
- Left: section title `THIS DAY / MONTH / YEAR IN HISTORY` (by mode).
- Right: **Today** button (jump to current day/month/year; disabled when already there) + **◀ ▶**
  that step the **active unit** (day / month-wrap / year-clamped), disabled at bounds.
- Below: **underline tabs** Day · Month · Year (`role=radiogroup`, red underline on active),
  replacing the current pill toggle.

The native date **picker** stays reachable in Day mode by clicking the `CalendarTile` (keeps the
hidden `<input type=date>` + `showPicker()` fallback). Month/Year have no picker (arrows + Today).

## New shared components (`src/components/`)

All pure, token-styled, unit-tested in isolation.

- **`CalendarTile`** — the calendar-icon card: red header (`bg-cal-header`, white) / large body /
  optional footer, two decorative binding tabs, `border`/`shadow`, `bg-surface` body.
  - Props: `{ header: string; body: string; footer?: string; onClick?: () => void; ariaLabel?: string }`.
  - Day: `header=JUNE body=29 footer=MONDAY`, `onClick` opens picker. Month: `JUNE / 2026`.
    Year: `YEAR / 2026`. When `onClick` set, renders as a `<button>` with `ariaLabel`; else a
    static tile.
- **`RangeBar`** — horizontal track from `min`→`max` with labeled end-caps and markers.
  - Props: `{ min: {v:number,label:string}; max: {v:number,label:string};
    markers: { v:number; label:string; kind:'tick'|'dot'|'diamond'; color?:string }[];
    summary: string }`.
  - Positions clamp to `[0,100]%`. `role="img"` + `aria-label={summary}`. Marker labels above,
    end-cap labels below (record low left / record high right).
- **`StatCard`** — `{ label: string; value: string; sub?: string; valueClass?: string }` →
  bordered card: uppercase muted label / big value (`valueClass` for `text-warm`/`text-accent`) /
  muted sub-line. Used in the 2×2 grid.
- **`WarmingStrip`** — `{ label: string; then: {mean:number,from:number,to:number};
  recent: {mean:number,from:number,to:number}; delta: number }` → full-width strip:
  `label · thenMean (from–to) → recentMean (from–to) · +Δ°C badge`. Hidden by caller when either
  window is empty.

## Per-view mapping

| Block | Day | Month | Year |
|---|---|---|---|
| Tile | `JUNE/29/MONDAY` (click→picker) | `JUNE/2026` | `YEAR/2026` |
| Hero metric | **TODAY'S HIGH** (today) / **HIGH** (past); secondary **NOW** (today, live) / **LOW** (past); rank badge | **JUNE MEAN** + rank badge | **ANNUAL MEAN** + rank badge |
| RangeBar | recLow→recHigh; markers: avg(tick) · now\|low(dot) · high(diamond) | coldest→warmest Jun mean; markers: normal(tick) · this-year(dot) | coldest→warmest annual mean; markers: normal(tick) · this-year(dot) |
| 2×2 cards | Average (1991-2020 normal) · vs-Average Δ · Record High (v, yr) · Record Low (v, yr) | Average (Jun normal) · vs-Average Δ · Warmest Jun (v, yr) · Coldest Jun (v, yr) | Average (annual normal) · vs-Average Δ · Warmest Year · Coldest Year |
| Warming strip | "A warming June 29" | "A warming June" | "A warming year" |
| Chart | PeriodScatter (unchanged, below) | PeriodScatter | PeriodScatter |

- **vs-Average Δ** = (big metric) − (1991-2020 normal). Day uses HIGH; Month/Year use the mean.
  Label: Day today `TODAY VS AVERAGE`, Day past `HIGH VS AVERAGE`, M/Y `THIS YEAR VS AVERAGE`.
  Sub-line: `warmer than normal` / `cooler than normal` / `at normal`. Color by sign
  (`text-warm` / `text-accent`).
- **Rank badge:** Day keeps `Nth warmest <Month D> since <firstYear>` (already shipped). Month/Year
  keep their existing phrasing (`Nth warmest <Month> in N years` / `Nth warmest year in N years`).
- **Day metric coloring** keeps `tempColor` vs the DOY normal; the **provisional** marker for recent
  forecast days stays.

## Data (all already available)

- Day: `thisday/MMDD.json` (series, recordHigh/recordLow), `daynorm` (DOY normal = avg),
  live `useTodayTemp` (now), `decadeMean` windows for warming strip — all in use today.
- Month: `month/MM.json` (series, normal, recordWarm/recordCold, thenNow).
- Year: `summary` (annual, anomaly, baselines, rankings warmest/coldest). Year warming strip uses
  **viewed-year-relative** annual-mean windows `[Y-111..Y-101] → [Y-11..Y-1]` computed from
  `summary.annual`; hidden when either window has no complete years.

## Behavior details

- **Past day:** no live NOW → hero shows `HIGH` + `LOW` (the day's max/min from series); RangeBar
  middle marker becomes `low` (dot). Today → `TODAY'S HIGH` + `NOW`; middle marker `now`.
- **Today button** per mode: Day → today's date, Month → current month, Year → current year;
  disabled when the cursor already equals it.
- **Arrows** step the active unit: day ±1 (clamped 1833-01-01 … today), month ±1 (wraps), year ±1
  (clamped min..max year). Disabled at bounds (day/year; month wraps so never disabled).

## Responsive

- Header: title left; Today + ◀▶ right; tabs on their own row below. Wraps on narrow.
- Hero: flex row, wraps — `CalendarTile` (fixed) + metric block (flex) + NOW/LOW; ≤~420px the
  NOW/LOW drops under the metric, tile stays left.
- RangeBar: full width; end-cap + marker labels clamp within track.
- 2×2 grid: `grid-cols-1 sm:grid-cols-2`.
- WarmingStrip: row on desktop, wraps on mobile.
- Verify **375 / 768 / 1280**, light + dark, **no horizontal overflow**.

## a11y

- Tabs: `role=radiogroup` / `role=radio` + `aria-checked` (keep).
- Today + arrows: accessible names; disabled reflected.
- `CalendarTile` button: full-date accessible name (e.g. "Change date — Monday 29 June 2026").
- `RangeBar`: `role="img"` + `aria-label` text summary; markers/decoration `aria-hidden`.
- Tokens only — `--cal-header`, `warm`, `accent`, `fg`, `muted`, `surface`, `border`,
  `badge-*`; no new hex.

## Testing

- **Components (Vitest, isolated):** `RangeBar` (marker % positions, clamping out-of-range,
  aria summary), `StatCard` (label/value/sub/color), `WarmingStrip` (delta sign + values, hidden
  when window empty is caller's job → test the populated render), `CalendarTile` (header/body/footer
  variants; button vs static; onClick fires).
- **Views:** `DayView` today (HIGH + NOW + provisional path) vs past (HIGH + LOW); rank badge;
  RangeBar present; 2×2 values; warming strip. `MonthView` / `YearView` values + labels + rank.
- **`Today.tsx`:** underline tabs switch mode; ◀▶ step the active unit; Today disabled when on
  current; day cursor lifted (DayView controlled).
- Keep `input[type=date]` reachable for the picker. Mock Recharts `ResponsiveContainer`;
  `afterEach(vi.unstubAllGlobals())` where `fetch` is stubbed.

## Phases (one plan, 5 tasks)

1. **Shared chrome** — `Today.tsx` header (title · Today · ◀▶ active-unit step · underline tabs) +
   lift day cursor; make `DayView`/`MonthView`/`YearView` controlled (props for cursor + onChange).
2. **Shared components** — `CalendarTile`, `RangeBar`, `StatCard`, `WarmingStrip` (TDD, isolated).
3. **Day rebuild** — hero (tile + metric + NOW/LOW + rank) + RangeBar + 2×2 StatCards +
   WarmingStrip; today vs past; picker on tile; provisional marker retained.
4. **Month adaptation** — same blocks from `month/MM.json`.
5. **Year adaptation** — same blocks from `summary`, incl. annual then-vs-now windows.

Deploy + independent live verification (screenshots, light/dark × 375/768/1280) at the end.

## Out of scope (YAGNI)

No data-pipeline changes; no new JSON fields; no animation; PeriodScatter unchanged; no custom
date popover (native picker stays); Records/Climate/Me/About tabs untouched.
