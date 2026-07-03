# Year Phase C1 — "the year month by month" (12-month calendar)

*Design spec. 2026-07-03. Aligns the Year screen with the Month screen: a calendar-style grid of the 12 months of the viewed year, each tile tinted by that month's mean-vs-normal, marked with a hero-style sun/snowflake when it holds an all-time monthly-mean record, tapping through to the Month view.*

## Goal

The Year screen (`src/tabs/today/YearView.tsx`) currently shows: state-driven hero, "Where {year} sits" RangeBar, 2×2 StatCards, WarmingStrip, annual-mean PeriodScatter. It has **no per-month breakdown and no navigation into months**. Add a 12-month calendar as the new centerpiece directly below the hero — the Year analogue of the Month tab's `MonthHeatmap` — giving the Year screen a navigation role and monthly-record storytelling.

Scope is **Phase 1 only** (the calendar alignment). Phase 2 (deep-research ideas #1/#4/#5/#10 etc. in `docs/superpowers/research/year-screen-ideas.md`) is a separate later cycle.

## User-facing behavior

A `MonthGrid` renders below the Year hero:

- **Heading:** `{year} month by month` (parity with `MonthHeatmap`'s "{month} {year} day by day").
- **Layout:** 3 columns × 4 rows (quarter rows: JFM / AMJ / JAS / OND), 12 tiles JAN→DEC. Responsive; comfortable tap targets at 375px.
- **Each tile (month with data):** month abbreviation (`JAN`) + that year's rounded monthly **mean** (`4°`); background tinted by `tempColor(mean, monthNormal)` (the existing strict ±2° single source of truth — warm/neutral/cool); tap → `onPickMonth(year, m)`.
- **Record marker:** when the viewed year holds the all-time record for that calendar month, a hero-style `WeatherGlyph` **watermark** — **sun** if it is the warmest [month] on record (`recordWarm.year == year`), **snowflake** if the coldest (`recordCold.year == year`). Same watermark treatment shipped on `MonthHeatmap`: `absolute inset-0 z-0` behind `z-10` text, tile `relative overflow-hidden`. Both-record (essentially never for a monthly mean) → sun.
- **Inert tiles:** months with no data for that year (including future months of the current year, which are simply absent from the data file) render as neutral (`bg-surface-2/40`), no temperature, not a button. The current partial month **is** shown (its mean-so-far), tinted and clickable, but carries **no** record marker (records are computed only over complete months, so it is never flagged).
- **a11y:** `role="grid"` / `role="gridcell"`; a data tile's accessible name is e.g. *"July 2019 — mean 23.1°, warmest July on record. Open this month."* (record clause only when flagged; omit otherwise). Inert tile: *"March 2026 — no data"*. The glyph SVG is `aria-hidden` (already is in `WeatherGlyph`).

Nothing existing in `YearView` is removed — the grid is inserted between the hero and the "Where {year} sits" RangeBar card.

## Data — new `year/YYYY.json` layer

Monthly-mean **record** flags require cross-year comparison the app cannot derive from a single year's file, so Phase 1 adds a small pipeline emit — a pure transpose of the already-computed `month_data`. This mirrors the `daily/YYYY.json` per-year precedent: one lazy fetch per viewed year, `summary.json` stays lean.

### Pipeline: `derive.year_data(recs, baseline=(1991, 2020))`

New function in `scripts/uccle/derive.py`. Reuses `month_data(recs, baseline)` (single source of truth for the per-month `series`, `normal`, `recordWarm`, `recordCold`) and pivots month→year:

- Collect every year appearing in any month's `series`.
- For each year `y`, emit an array of the months **present** for that year (missing months simply omitted — the client fills 12 slots by `mm` lookup and renders absent months inert), each:
  ```
  {"mm": "07", "mean": 23.1, "normal": 18.4, "complete": true, "recHi": true}   # recLo similarly; flags omitted when false
  ```
  - `mean` = that year's monthly mean from `series` (already rounded by `monthly_means`).
  - `normal` = the month's 1991–2020 normal (`month_data[mm]["normal"]`; may be `null`).
  - `complete` = the month-year completeness gate (`series[].complete`).
  - `recHi` = `month_data[mm]["recordWarm"].year == y` **and** the month-year is complete (guard defensive; records already only consider complete months). Set only when true.
  - `recLo` = `month_data[mm]["recordCold"].year == y` and complete. Set only when true.
- Returns `{"1833": [...], ..., "2026": [...]}` keyed by 4-digit year string.

Records are provisional-safe by construction: the current partial month is `complete: false` → never a record holder in `month_data`, so never flagged.

### Pipeline: emit in `build_data.build`

After the existing `daily/` loop, add a `year/` loop mirroring it exactly:
```python
os.makedirs(os.path.join(out_dir, "year"), exist_ok=True)
for ykey, payload in derive.year_data(recs).items():
    _write(os.path.join(out_dir, "year", f"{ykey}.json"), payload)
```
`public/data/` is CI-generated + git-ignored; ~194 new small files (parity with `daily/`). PWA already serves all `/data/*.json` NetworkFirst — no service-worker change.

### Frontend types + loader + hook

- `src/types.ts`:
  ```ts
  export interface YearMonth { mm: string; mean: number; normal: number | null; complete: boolean; recHi?: boolean; recLo?: boolean }
  export type YearData = YearMonth[]
  ```
- `src/data/loader.ts`: `export const loadYear = (year: number) => loadJSON<YearData>(\`data/year/${year}.json\`)`
- `src/data/useYear.ts`: `useYear(year)` mirroring `useDaily` (same `{data, error, loading}` shape, re-fetch on `year`).

## Components

### `src/components/MonthGrid.tsx`

```
MonthGrid({ year, months, onPickMonth }: {
  year: number
  months: YearData
  onPickMonth: (year: number, month: number) => void
})
```

- Wraps in the same card chrome as `MonthHeatmap` (`border border-border bg-surface p-5`, `role="grid"`, heading paragraph).
- Builds `byMm = new Map(months.map(e => [e.mm, e]))`.
- Iterates `m` 1→12, `mm = String(m).padStart(2,'0')`, `entry = byMm.get(mm)`:
  - **No entry** → inert `<div role="gridcell">` neutral tile, name `"{MonthName} {year} — no data"`.
  - **Entry** → `<button role="gridcell" onClick={() => onPickMonth(year, m)}>`:
    - `relative overflow-hidden` + `TINT[tempColor(entry.mean, entry.normal)]` background (reuse the `TINT` map shape from `MonthHeatmap`).
    - record watermark: `(entry.recHi || entry.recLo) && <WeatherGlyph tone={entry.recHi ? 'warm' : 'cool'} intensity={0.5} className="absolute inset-0 z-0 h-full w-full" />`.
    - `z-10` content: month abbrev (`fmtMonth(mm).slice(0,3).toUpperCase()` or a local `MONTHS_ABBR`) + `{Math.round(entry.mean)}°`.
    - accessible name: `` `${MonthName} ${year} — mean ${entry.mean.toFixed(1)}°${recClause}. Open this month` ``, where `recClause` = `, warmest ${MonthName} on record` / `, coldest ${MonthName} on record` / `''`.
- Tiles ~`min-h-[64px]`, `grid grid-cols-3 gap-1`, square corners, light+dark.

No new lib module needed — tint comes from `tempColor`, record from the emitted flags. `MonthGrid` is a pure presentational component (data + one callback in, tiles out), independently testable.

### `src/components/WeatherGlyph.tsx`

Unchanged — reused as-is.

## Wiring

- `src/tabs/today/YearView.tsx`:
  - Accept a new prop: `YearView({ year, onPickMonth }: { year: number; onPickMonth: (year: number, month: number) => void })`.
  - Call `useYear(year)`; render `<MonthGrid>` between the hero and the RangeBar card when data is present. The grid does **not** block the rest of the view — if `year/YYYY.json` is loading/errors, the grid is simply omitted (hero + stats still render from `summary`). No full-view Loading/Error gate for the grid.
- `src/tabs/Today.tsx`: `{mode === 'year' && <YearView year={selYear} onPickMonth={openMonth} />}` (reuse the existing `openMonth`, which range-clamps).

## Testing

**pytest — `scripts/uccle/tests/` (`test_year_data` or add to existing derive test file):**
- `year_data` transposes a small synthetic `recs` into per-year month arrays.
- The record-holding year for a month gets `recHi`/`recLo`; other years do not.
- An incomplete month-year is `complete: false` and carries no record flag even if it is the extreme value among present data.
- `normal` and `mean` propagate from `month_data`.

**vitest — `src/components/MonthGrid.test.tsx`:**
- Renders 12 gridcells (data + inert) for a partial `months` array; months absent from data are inert (not buttons).
- A `recHi` month renders `svg.text-warm` and names it "warmest {month} on record"; a `recLo` month renders `svg.text-accent` and "coldest {month} on record".
- Clicking a data tile calls `onPickMonth(year, m)` with the right month number.
- A non-record month renders no `svg`.
- Tile tint class follows `tempColor` (warm mean → `bg-warm/15`, etc.).

**vitest — `src/data/useYear.test.ts`** (optional, mirror `useTodayTemp` fetch-stub style with `afterEach(vi.unstubAllGlobals)`): resolves to fetched data; keep minimal.

Follow existing test conventions: no date-coupled fixtures where avoidable; mock only what is unavoidable.

## Out of scope (Phase 2, later cycle)

Year barcode strip (#1), year counters card (#4), records tally (#5), year share card (#10), radial/histogram visuals (#6/#7). No changes to Records/Trends/Climate. No `meanMax`/`meanMin` in `year/YYYY.json` yet (add when a Phase 2 feature needs them — YAGNI).

## Conventions honored

Square corners; tokens not hex; `tempColor` single source of truth; `WeatherGlyph` reuse (record parity with Month); TDD (pytest + vitest); no PII; no external fonts/CDNs; NetworkFirst data caching unchanged.
