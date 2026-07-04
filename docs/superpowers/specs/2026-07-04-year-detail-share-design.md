# Year Phase C2 — "the year in detail + shareable"

*Design spec. 2026-07-04. Builds the deep-research recommended Year set (minus the already-shipped calendar): #1 daily-anomaly barcode strip, #4 year counters, #5 records tally, #10 year share card. All client-side — no pipeline change.*

## Goal

After C1 (12-month `MonthGrid` calendar), the Year screen still lacks: the iconic daily-resolution climate signal, threshold-day storytelling, a records headline, and a share button (Day + Month both have one). C2 adds four cohesive, minimal pieces, all derived app-side from data the app already emits.

**New Year-view layout** (additions in **bold**; nothing removed):
hero (+ **Share button**) → **YearStrip** → MonthGrid → **RecordsTally** → **YearCounters** → RangeBar (Where {year} sits) → StatCards → WarmingStrip → PeriodScatter.

## Data (no pipeline change)

- `summary.counters` — already loaded via `useSummary`; each of `SU`/`hot30`/`TR`/`FD`/`ID`/`heatwaveDays`/`gsl` is a 194-entry list of `{year, n}`. Feeds **#4**.
- `daily/YYYY.json` (`DailyPoint[]`, `{mmdd,tmax,tmin,provisional?,recHi?,recLo?}`) via a new `useDaily(year)` call in `YearView`. Feeds **#1** and **#5**. `recHi`/`recLo` are already provisional-suppressed by the pipeline.
- `daynorm.json` (`DayNorm[]`, `{doy,mmdd,normal,p10,p90}`) via `useDayNorm()`; the `1991-2020` normals feed **#1**'s anomaly coloring (mirror `MonthView`'s `normMap`/`normalFor`).

`YearView` gains `useDaily(year)` + `useDayNorm()` and a new prop `onPickDay` (Today passes its existing `openDay`). Strip + tally render **non-blocking** (omitted until `daily.data` / `dayNorm.data` arrive); counters render whenever `summary` is present.

## Components

### #1 `src/components/YearStrip.tsx`

```
YearStrip({ year, days, normalFor }: {
  year: number
  days: DailyPoint[]
  normalFor: (mmdd: string) => number | null
})
```
- One `<svg viewBox="0 0 100 H" preserveAspectRatio="none" width="100%" height={H}>` (H ≈ 48), `role="img"`, no axes/labels — the Ed-Hawkins "barcode".
- For each day `d` in `days` (already date-sorted), a `<rect>` at `x = i * (100/n)`, `width = 100/n + 0.3`, full height, `fill = anomalyColor(mean − normal)` where `mean = (d.tmax + d.tmin) / 2` and `normal = normalFor(d.mmdd)`. If `normal == null`, use a neutral fill (`var(--surface-2)`) rather than skipping the bar (keeps day alignment).
- Reuses `anomalyColor` (`src/lib/colorScale.ts`, the shared 16-step `RAMP`) — same scale as `Stripes`/`WarmingStrip`, so the app has one stripe language.
- `aria-label` summarizes the mix, e.g. `` `${year}: ${warm} warmer days, ${cool} cooler than the 1991–2020 normal` `` (warm = mean−normal > 0, cool < 0; ties ignored). Returns `null` if `days` is empty.
- Square corners (no `rounded-*`); the SVG itself carries no rounding (unlike `Stripes`' `rounded-md`, which is a Trends-tab element — Today-tab is square).

### #4 `src/components/YearCounters.tsx`

```
YearCounters({ year, counters, incomplete }: {
  year: number
  counters: Summary['counters']
  incomplete: boolean
})
```
- Computes, app-side, for the 5 keys `SU`/`hot30`/`TR`/`FD`/`ID` (parity with `MonthCounters`; ignore `heatwaveDays`/`gsl`):
  - `count` = the `{year,n}` entry for the viewed `year` (`0` if absent).
  - `normal` = mean of `n` over entries with `1991 ≤ year ≤ 2020` (rounded to 1 dp); `null` if none.
- Visual is `MonthCounters` adapted: header `This year {incomplete ? 'so far' : 'by the numbers'}`, same icon set (`Sun`/`Flame`/`MoonStar`/`Snowflake`/`ThermometerSnowflake`), same row = icon · big count · label · `normal N.n`. Same labels (summer days / hot days / tropical nights / frost days / ice days). Show a row only when `normal ≥ 0.5 || count > 0`. Returns `null` if no rows.
- Note: `MonthCounters` and `YearCounters` share the `ROWS` table + row markup — factor the shared `ROWS`/labels/icons into a tiny module (`src/lib/counterRows.tsx` or export from `MonthCounters`) so the two stay in lockstep, rather than a second verbatim copy. (Follows the CLAUDE.md guidance against duplicated constants.)

### #5 `src/components/RecordsTally.tsx`

```
RecordsTally({ year, days, onPickDay }: {
  year: number
  days: DailyPoint[]
  onPickDay: (iso: string) => void
})
```
- `highs = days.filter(d => d.recHi)`, `lows = days.filter(d => d.recLo)` (a day can be in both). Returns `null` if both empty.
- Header card: `Daily records set in {year}` with the two counts (`{highs.length} record highs · {lows.length} record lows`).
- **Expandable:** a `Highs` / `Lows` radiogroup toggle (mirror `NotableDays`' radiogroup: `Highs` = `bg-warm text-white`, `Lows` = `bg-accent text-white`) reveals an `<ol>` of that category's days, each a `<button>` row → `onPickDay(iso)`:
  - value shown = `recHi` list → `d.tmax`, `recLo` list → `d.tmin`;
  - `iso = ${year}-${d.mmdd.slice(0,2)}-${d.mmdd.slice(2)}`; label e.g. `` `${dnum} ${MonthAbbr} ${year} — record ${high|low} ${v.toFixed(1)}°. Open this day` ``.
  - Sort each list by value (highs desc, lows asc) so the strongest record leads.
- a11y: radiogroup `role="radiogroup"`/`role="radio"`+`aria-checked`; rows are buttons with accessible names.

### #10 Share — `YearView` + `shareText.ts` + `Today.tsx`

- **`YearView`**: wrap the hero + `YearStrip` + a capture-only attribution footer in `<div id="year-capture" className="space-y-4">` (mirror `MonthView`'s `#month-capture`). Add a discreet ghost "Share this year" button (same markup/`handleShare` as `MonthView`: `busy` ref, `capturing` state, double-`requestAnimationFrame`, `shareNode(node, 'uccle-year.png', { text })`). The capture-only footer (`{capturing && …}`) shows `Uccle, Brussels · jdelsoir.github.io/uccle-climate`. The share button renders only when `a` (the year has data).
- **`src/lib/shareText.ts`** — add (style matches `shareSentence`: no location in the sentence; footer carries it):
  ```ts
  export function yearShareSentence({ year, key, rank, total, complete }: {
    year: number; key: HeroKey; rank: number | null; total: number | null; complete: boolean
  }): string
  ```
  - `!complete` → `` `${year} so far: … ` `` variants (present tense-ish, e.g. "running warmer than usual"). When `complete`:
    - `record-hot` → `${year} was the warmest year on record.`
    - `record-cold` → `${year} was the coldest year on record.`
    - `above` + rank/total → `${year} was the ${ordinal(rank)} warmest year in ${total} years.`
    - `above` w/o rank → `${year} was warmer than usual.`
    - `below` → `${year} was cooler than usual.`
    - `close`/default → `${year} was a typical year.`
  - `export function yearShareUrl(year: number): string` → `` `${APP_URL}#/today?y=${year}` ``
  - `export function yearShareCaption(sentence: string, year: number): string` → `` `${sentence}\n${yearShareUrl(year)}` ``
- **`Today.tsx`** — parse `?y=`:
  - `const yParam = params.get('y'); const yValid = !!yParam && /^\d{4}$/.test(yParam)`
  - mode init precedence: `dValid ? 'day' : mMatch ? 'month' : yValid ? 'year' : 'day'`.
  - `year` state init: `useState<number | null>(() => yValid ? Math.min(now.getFullYear(), Math.max(1833, +yParam!)) : null)` (clamp; `selYear` falls back to `maxYear` when null, unchanged).
  - Pass `onPickDay={openDay}` to `<YearView>` alongside `onPickMonth={openMonth}`.

## `YearView` wiring detail

- Signature: `YearView({ year, onPickMonth, onPickDay })`.
- Call `useYear(year)`, `useDaily(year)`, `useDayNorm()` all **before** the early `loading`/`error` returns (stable hook order).
- Build `normalFor` from `dayNorm.data?.['1991-2020']` exactly as `MonthView` does.
- Compute the share sentence from the already-computed `state.key`, `rank`, `total`, `yComplete`.
- Render order per the layout above; `YearStrip`/`RecordsTally` guarded on `daily.data` (+ `dayNorm.data` for the strip); `YearCounters` guarded on `summary` (always present past the error gate).

## Testing (vitest only)

- **YearStrip**: renders `n` `<rect>`s for `n` days; a warm day (mean≫normal) gets a warm-end `RAMP` color and a cool day a cool-end color (assert the `fill` hex is from the warm/cool half of `RAMP` via `anomalyColor`); empty `days` → renders nothing (`null`); `normalFor` returning `null` → neutral fill, still a rect. Mock nothing (pure SVG).
- **YearCounters**: given a `counters` fixture, viewed-year `count` and 1991–2020 `normal` are correct; a key with `normal < 0.5 && count === 0` is hidden; `incomplete` → header says "so far"; no rows → `null`.
- **RecordsTally**: counts `recHi`/`recLo`; `null` when none; toggling Highs/Lows shows the right list sorted correctly; clicking a row calls `onPickDay` with the right ISO; a both-record day appears in both lists.
- **shareText**: `yearShareSentence` for each `key` (complete) + one incomplete "so far" case; `yearShareCaption` appends `?y=YYYY`.
- **Today**: `?y=2015` cold-opens Year mode at 2015 (radio checked, hero shows 2015); invalid `?y=abcd` ignored; `?d` beats `?y`. Share button present in Year mode with data. (Extend existing `Today.test.tsx` fetch stub to route `/year/` and `/daily/` to arrays; `afterEach(vi.unstubAllGlobals())`.)

Follow conventions: no date-coupled fixtures where avoidable; `fetch`-stub tests clean up globals; mock Recharts `ResponsiveContainer` only where a chart renders (YearView test already does via existing setup).

## Out of scope (parked)

#3 stripe timeline (overlaps `PeriodScatter`), #6 histogram, #7 radial. No changes to Records/Trends/Climate/pipeline.

## Conventions honored

Square corners; tokens not hex (only `lib/ramp.ts` holds hex, reused via `anomalyColor`); `tempColor` unaffected (strip uses the continuous ramp deliberately, per design decision); `WeatherGlyph`/`MonthCounters`/`NotableDays` patterns reused; no PII (share = derived stats + "Uccle, Brussels" + URL only); no new deps; NetworkFirst data caching unchanged; TDD.
