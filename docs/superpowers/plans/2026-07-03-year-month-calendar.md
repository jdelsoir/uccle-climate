# Year Phase C1 — 12-Month Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 12-month tile calendar to the Year screen (`YearView`), aligned with the Month tab's `MonthHeatmap`: tiles tinted by month mean-vs-normal, sun/snowflake watermark on monthly-mean record months, tap → Month view.

**Architecture:** New `year/YYYY.json` pipeline emit (pure transpose of existing `month_data`) → `useYear` hook → presentational `MonthGrid` component rendered below the Year hero. Record flags precomputed in the pipeline (cross-year). Reuses `tempColor`, `WeatherGlyph`, existing `openMonth` navigation.

**Tech Stack:** Python 3.11 stdlib (pipeline), React 18 + TypeScript + Tailwind v4, Vitest + pytest.

## Global Constraints

- Python pipeline is **stdlib only** (no new deps).
- **Square corners** (no `rounded-*`) on Today-tab UI; decorative glyph `aria-hidden`.
- **Tokens not hex** for color (`text-warm`/`text-accent`/`bg-warm/15` etc.); only `lib/ramp.ts` + icon script hold literal hex.
- `tempColor(value, normal)` (strict ±2°, `src/lib/dayStats.ts`) is the single source of truth for warm/neutral/cool.
- **No PII** anywhere.
- TDD throughout; test output kept pristine. `fetch`-stubbing tests add `afterEach(() => vi.unstubAllGlobals())`.
- Commit message trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: Pipeline — `year_data` transpose + `year/YYYY.json` emit

**Files:**
- Modify: `scripts/uccle/derive.py` (add `year_data`, after `daily_data`)
- Modify: `scripts/uccle/build_data.py` (add `year/` emit loop in `build`, after the `daily/` loop ~line 138)
- Test: `scripts/uccle/tests/test_derive.py` (add `test_year_data_*`), `scripts/uccle/tests/test_build.py` (extend the emit assertions)

**Interfaces:**
- Consumes: `month_data(recs, baseline)` → `{mm: {"series":[{year,mean,meanMax,meanMin,complete}], "recordWarm":{"year","v"}|None, "recordCold":{...}|None, "normal":float|None, ...}}`. Test helper `month_recs(year, month, n, tmean)` already in `test_derive.py`.
- Produces: `year_data(recs, baseline=(1991,2020)) -> {"YYYY": [ {"mm","mean","normal","complete","recHi"?,"recLo"?}, ... ]}` (only months present for that year; record flags set only when true and month-year complete).

- [ ] **Step 1: Write the failing test** — append to `scripts/uccle/tests/test_derive.py`:

```python
def test_year_data_transpose_and_records():
    from scripts.uccle.derive import year_data
    # June: 1990 coldest, 2020 warmest (both complete); 2026 partial (incomplete)
    recs = (month_recs(1990, 6, 30, 15.0) + month_recs(2000, 6, 30, 18.0)
            + month_recs(2020, 6, 30, 20.0) + month_recs(2026, 6, 26, 99.0))
    yd = year_data(recs, baseline=(1990, 2020))
    assert set(yd.keys()) == {"1990", "2000", "2020", "2026"}
    # 2020 holds the warmest-June record → recHi on its June entry
    jun2020 = next(e for e in yd["2020"] if e["mm"] == "06")
    assert jun2020["mean"] == 20.0 and jun2020["complete"] is True
    assert jun2020.get("recHi") is True and "recLo" not in jun2020
    assert jun2020["normal"] == round((15.0 + 18.0 + 20.0) / 3, 2)
    # 1990 holds the coldest-June record → recLo
    jun1990 = next(e for e in yd["1990"] if e["mm"] == "06")
    assert jun1990.get("recLo") is True and "recHi" not in jun1990
    # 2000 holds no record → no flags
    jun2000 = next(e for e in yd["2000"] if e["mm"] == "06")
    assert "recHi" not in jun2000 and "recLo" not in jun2000

def test_year_data_incomplete_month_never_flagged():
    from scripts.uccle.derive import year_data
    # 2026 June is the hottest value but partial → must not be a record holder
    recs = month_recs(2020, 6, 30, 20.0) + month_recs(2026, 6, 26, 99.0)
    yd = year_data(recs, baseline=(1990, 2020))
    jun2026 = next(e for e in yd["2026"] if e["mm"] == "06")
    assert jun2026["complete"] is False
    assert "recHi" not in jun2026 and "recLo" not in jun2026
    # the complete 2020 June is the record holder instead
    assert next(e for e in yd["2020"] if e["mm"] == "06").get("recHi") is True
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m pytest scripts/uccle/tests/test_derive.py::test_year_data_transpose_and_records -q`
Expected: FAIL — `ImportError: cannot import name 'year_data'`.

- [ ] **Step 3: Write minimal implementation** — add to `scripts/uccle/derive.py` (after `daily_data`):

```python
def year_data(recs, baseline=(1991, 2020)):
    md = month_data(recs, baseline)
    years = set()
    for payload in md.values():
        for s in payload["series"]:
            years.add(s["year"])
    out = {}
    for y in sorted(years):
        months = []
        for m in range(1, 13):
            mm = f"{m:02d}"
            payload = md[mm]
            s = next((x for x in payload["series"] if x["year"] == y), None)
            if s is None:
                continue
            entry = {"mm": mm, "mean": s["mean"], "normal": payload["normal"], "complete": s["complete"]}
            if s["complete"]:
                rw, rc = payload["recordWarm"], payload["recordCold"]
                if rw and rw["year"] == y:
                    entry["recHi"] = True
                if rc and rc["year"] == y:
                    entry["recLo"] = True
            months.append(entry)
        out[f"{y:04d}"] = months
    return out
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python3 -m pytest scripts/uccle/tests/test_derive.py -q`
Expected: PASS (both new tests + existing).

- [ ] **Step 5: Add the build emit + test** — in `scripts/uccle/build_data.py`, in `build`, immediately after the existing `daily/` loop:

```python
    os.makedirs(os.path.join(out_dir, "year"), exist_ok=True)
    for ykey, payload in derive.year_data(recs).items():
        _write(os.path.join(out_dir, "year", f"{ykey}.json"), payload)
```

Then extend `scripts/uccle/tests/test_build.py`. First inspect how `build` is invoked there (it takes `text`/`records`/`out_dir=`). Add a test that builds into a `tmp_path` and asserts a `year/YYYY.json` file exists with the expected shape:

```python
def test_build_emits_year_files(tmp_path):
    import json, os
    from scripts.uccle.build_data import build
    recs = (month_recs(2000, 6, 30, 18.0) + month_recs(2020, 6, 30, 20.0))
    build(records=recs, archive={}, recent={}, out_dir=str(tmp_path))
    p = os.path.join(str(tmp_path), "year", "2020.json")
    assert os.path.exists(p)
    data = json.load(open(p))
    jun = next(e for e in data if e["mm"] == "06")
    assert jun["mean"] == 20.0 and jun.get("recHi") is True
```

> NOTE for implementer: `month_recs` lives in `test_derive.py`. Import it (`from .test_derive import month_recs`) or inline an equivalent local helper in `test_build.py`. Check `build`'s actual signature/params in `build_data.py` before writing — match how the other `test_build.py` tests call it (they pass `recs=`, `archive=`, `recent=`, `today=`). If `build` requires GHCN `text` when `records` is None, pass `records=recs`.

- [ ] **Step 6: Run pipeline tests**

Run: `python3 -m pytest scripts/uccle/tests/ -q`
Expected: PASS (all).

- [ ] **Step 7: Commit**

```bash
git add scripts/uccle/derive.py scripts/uccle/build_data.py scripts/uccle/tests/test_derive.py scripts/uccle/tests/test_build.py
git commit -m "feat(pipeline): year_data transpose + year/YYYY.json emit

Per-year 12-month array (mean, normal, complete, recHi/recLo record
flags) pivoted from month_data; emitted as year/YYYY.json for the Year
calendar. Record flags only on complete months (provisional-safe).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Frontend data layer — types + loader + `useYear` hook

**Files:**
- Modify: `src/types.ts` (add `YearMonth`, `YearData`)
- Modify: `src/data/loader.ts` (add `loadYear`)
- Create: `src/data/useYear.ts`
- Test: `src/data/useYear.test.ts`

**Interfaces:**
- Consumes: `loadJSON<T>(path)` from `loader.ts`; `import.meta.env.BASE_URL`.
- Produces:
  - `interface YearMonth { mm: string; mean: number; normal: number | null; complete: boolean; recHi?: boolean; recLo?: boolean }`
  - `type YearData = YearMonth[]`
  - `loadYear(year: number): Promise<YearData>` → fetches `data/year/${year}.json`
  - `useYear(year: number): { data: YearData | null; error: Error | null; loading: boolean }`

- [ ] **Step 1: Add types** — append to `src/types.ts`:

```ts
export interface YearMonth { mm: string; mean: number; normal: number | null; complete: boolean; recHi?: boolean; recLo?: boolean }
export type YearData = YearMonth[]
```

- [ ] **Step 2: Add loader** — in `src/data/loader.ts`, add `YearData` to the type import from `../types` and append:

```ts
export const loadYear = (year: number) => loadJSON<YearData>(`data/year/${year}.json`)
```

- [ ] **Step 3: Write the failing hook test** — create `src/data/useYear.test.ts`:

```ts
import { renderHook, waitFor } from '@testing-library/react'
import { vi, afterEach, it, expect } from 'vitest'
import { useYear } from './useYear'
import type { YearData } from '../types'

afterEach(() => vi.unstubAllGlobals())

it('loads the year months array for the given year', async () => {
  const months: YearData = [{ mm: '06', mean: 20, normal: 18, complete: true, recHi: true }]
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => months }))
  const { result } = renderHook(() => useYear(2020))
  await waitFor(() => expect(result.current.loading).toBe(false))
  expect(result.current.data).toEqual(months)
  expect(result.current.error).toBeNull()
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run src/data/useYear.test.ts`
Expected: FAIL — cannot resolve `./useYear`.

- [ ] **Step 5: Write the hook** — create `src/data/useYear.ts` (mirror `useDaily.ts`):

```ts
import { useEffect, useState } from 'react'
import { loadYear } from './loader'
import type { YearData } from '../types'

export function useYear(year: number) {
  const [data, setData] = useState<YearData | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { let a = true; setLoading(true); setError(null)
    loadYear(year).then(d => a && setData(d)).catch(e => a && setError(e)).finally(() => a && setLoading(false))
    return () => { a = false } }, [year])
  return { data, error, loading }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/data/useYear.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/data/loader.ts src/data/useYear.ts src/data/useYear.test.ts
git commit -m "feat(data): YearData types + loadYear + useYear hook

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `MonthGrid` component

**Files:**
- Create: `src/components/MonthGrid.tsx`
- Test: `src/components/MonthGrid.test.tsx`

**Interfaces:**
- Consumes: `YearData` (`YearMonth[]`) from Task 2; `tempColor` (`src/lib/dayStats.ts`); `fmtMonth` (`src/lib/format.ts`, returns full month name e.g. `"July"`); `WeatherGlyph` (`src/components/WeatherGlyph.tsx`, props `{tone: 'warm'|'cool'|'neutral', intensity: number, className?}`).
- Produces: `MonthGrid({ year, months, onPickMonth }: { year: number; months: YearData; onPickMonth: (year: number, month: number) => void })` — default export.

- [ ] **Step 1: Write the failing test** — create `src/components/MonthGrid.test.tsx`:

```tsx
import { it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MonthGrid from './MonthGrid'
import type { YearMonth } from '../types'

const mo = (mm: string, mean: number, normal: number, extra: Partial<YearMonth> = {}): YearMonth =>
  ({ mm, mean, normal, complete: true, ...extra })

it('renders 12 gridcells; months absent from data are inert (not buttons)', () => {
  render(<MonthGrid year={2020} months={[mo('06', 20, 18)]} onPickMonth={vi.fn()} />)
  const cells = screen.getAllByRole('gridcell')
  expect(cells).toHaveLength(12)
  const march = screen.getByRole('gridcell', { name: /March 2020 — no data/i })
  expect(march.tagName).not.toBe('BUTTON')
})

it('clicking a month tile calls onPickMonth with the month number', () => {
  const onPickMonth = vi.fn()
  render(<MonthGrid year={2020} months={[mo('06', 20, 18)]} onPickMonth={onPickMonth} />)
  fireEvent.click(screen.getByRole('gridcell', { name: /June 2020.*Open this month/i }))
  expect(onPickMonth).toHaveBeenCalledWith(2020, 6)
})

it('a record-warm month shows a warm sun glyph and names it "warmest … on record"', () => {
  render(<MonthGrid year={2020} months={[mo('07', 23.1, 18, { recHi: true })]} onPickMonth={vi.fn()} />)
  const cell = screen.getByRole('gridcell', { name: /July 2020.*warmest July on record/i })
  expect(cell.querySelector('svg.text-warm')).toBeTruthy()
  expect(cell.querySelector('svg.text-accent')).toBeNull()
})

it('a record-cold month shows a cool snowflake glyph and names it "coldest … on record"', () => {
  render(<MonthGrid year={1990} months={[mo('01', -2, 3, { recLo: true })]} onPickMonth={vi.fn()} />)
  const cell = screen.getByRole('gridcell', { name: /January 1990.*coldest January on record/i })
  expect(cell.querySelector('svg.text-accent')).toBeTruthy()
  expect(cell.querySelector('svg.text-warm')).toBeNull()
})

it('a non-record month renders no glyph', () => {
  render(<MonthGrid year={2000} months={[mo('06', 18, 18)]} onPickMonth={vi.fn()} />)
  expect(screen.getByRole('gridcell', { name: /June 2000/i }).querySelector('svg')).toBeNull()
})

it('tints a warm month warm and a cool month cool', () => {
  render(<MonthGrid year={2020} months={[mo('07', 23, 18), mo('01', 0, 4)]} onPickMonth={vi.fn()} />)
  expect(screen.getByRole('gridcell', { name: /July 2020/i }).className).toMatch(/bg-warm\/15/)
  expect(screen.getByRole('gridcell', { name: /January 2020/i }).className).toMatch(/bg-accent\/15/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/MonthGrid.test.tsx`
Expected: FAIL — cannot resolve `./MonthGrid`.

- [ ] **Step 3: Write the component** — create `src/components/MonthGrid.tsx`:

```tsx
import { tempColor } from '../lib/dayStats'
import { fmtMonth } from '../lib/format'
import type { YearData } from '../types'
import WeatherGlyph from './WeatherGlyph'

const TINT: Record<string, string> = { 'text-warm': 'bg-warm/15', 'text-accent': 'bg-accent/15', 'text-fg': 'bg-surface-2' }

export default function MonthGrid({ year, months, onPickMonth }: {
  year: number; months: YearData
  onPickMonth: (year: number, month: number) => void
}) {
  const byMm = new Map(months.map(e => [e.mm, e]))
  return (
    <div className="border border-border bg-surface p-5">
      <p className="mb-3 text-[11px] uppercase tracking-[0.09em] text-muted">{year} month by month</p>
      <div role="grid" aria-label={`${year} monthly means`} className="grid grid-cols-3 gap-1 text-center">
        {Array.from({ length: 12 }).map((_, i) => {
          const m = i + 1
          const mm = String(m).padStart(2, '0')
          const name = fmtMonth(mm)
          const e = byMm.get(mm)
          if (!e) {
            return <div key={mm} role="gridcell" aria-label={`${name} ${year} — no data`} className="min-h-[64px] bg-surface-2/40" />
          }
          const recHi = !!e.recHi, recLo = !!e.recLo
          const recClause = recHi ? `, warmest ${name} on record` : recLo ? `, coldest ${name} on record` : ''
          const tint = TINT[tempColor(e.mean, e.normal)]
          return (
            <button key={mm} type="button" role="gridcell" onClick={() => onPickMonth(year, m)}
              aria-label={`${name} ${year} — mean ${e.mean.toFixed(1)}°${recClause}. Open this month`}
              className={`relative min-h-[64px] overflow-hidden ${tint} p-2 text-left transition-colors hover:ring-1 hover:ring-border`}>
              {(recHi || recLo) && (
                <WeatherGlyph tone={recHi ? 'warm' : 'cool'} intensity={0.5} className="absolute inset-0 z-0 h-full w-full" />
              )}
              <span className="relative z-10 block text-[11px] font-bold text-fg">{name.slice(0, 3).toUpperCase()}</span>
              <span className="relative z-10 block text-[13px] text-muted">{Math.round(e.mean)}°</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/MonthGrid.test.tsx`
Expected: PASS (all 6).

- [ ] **Step 5: Commit**

```bash
git add src/components/MonthGrid.tsx src/components/MonthGrid.test.tsx
git commit -m "feat(year): MonthGrid 12-month calendar component

3x4 month tiles tinted by tempColor(mean, normal), sun/snowflake
WeatherGlyph watermark on monthly-mean record months, tap →
onPickMonth. Inert tiles for months with no data.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Wire `MonthGrid` into `YearView` + `Today`

**Files:**
- Modify: `src/tabs/today/YearView.tsx`
- Modify: `src/tabs/Today.tsx:101`
- Modify: `src/tabs/today/YearView.test.tsx` (pass the new required prop)

**Interfaces:**
- Consumes: `useYear` (Task 2), `MonthGrid` (Task 3), existing `openMonth(y, mo)` in `Today.tsx`.
- Produces: `YearView({ year, onPickMonth }: { year: number; onPickMonth: (year: number, month: number) => void })`.

- [ ] **Step 1: Update `YearView`** — in `src/tabs/today/YearView.tsx`:

Add imports near the others:
```tsx
import { useYear } from '../../data/useYear'
import MonthGrid from '../../components/MonthGrid'
```
Change the signature:
```tsx
export default function YearView({ year, onPickMonth }: { year: number; onPickMonth: (year: number, month: number) => void }) {
```
Call the hook near the top (after `useSummary`), BEFORE the early `loading`/`error` returns so hook order is stable:
```tsx
  const { data: yearMonths } = useYear(year)
```
Render the grid **immediately after** the closing `</HeroShell>` and before the "Where {year} sits" RangeBar card. Guard on a non-empty array so the existing tests (whose `fetch` stub returns the summary object, not an array) simply skip it:
```tsx
      {Array.isArray(yearMonths) && yearMonths.length > 0 && (
        <MonthGrid year={year} months={yearMonths} onPickMonth={onPickMonth} />
      )}
```

- [ ] **Step 2: Update `Today.tsx`** — change line ~101:

```tsx
        {mode === 'year' && <YearView year={selYear} onPickMonth={openMonth} />}
```

- [ ] **Step 3: Update `YearView.test.tsx`** — add the required prop to every `render(<YearView .../>)`. There are two direct calls in the `test(...)` blocks and one inside `renderYear`:

```tsx
  render(<YearView year={2026} onPickMonth={vi.fn()} />)
```
and in `renderYear`:
```tsx
  render(<YearView year={aEntry.year} onPickMonth={vi.fn()} />)
```
(No other assertions change — the fetch stubs return the summary object, which is not an array, so `MonthGrid` is skipped and existing expectations hold.)

- [ ] **Step 4: Run the affected tests**

Run: `npx vitest run src/tabs/today/YearView.test.tsx src/tabs/Today.test.tsx`
Expected: PASS.

- [ ] **Step 5: Full suite + prod build**

Run: `npm test`
Expected: all test files pass.
Run: `VITE_BASE=/uccle-climate/ npm run build`
Expected: build succeeds (only the pre-existing Recharts chunk-size warning).

- [ ] **Step 6: Commit**

```bash
git add src/tabs/today/YearView.tsx src/tabs/Today.tsx src/tabs/today/YearView.test.tsx
git commit -m "feat(year): render MonthGrid below the Year hero, wire → Month view

YearView takes onPickMonth (Today passes openMonth); useYear loads
year/YYYY.json; grid renders non-blocking (omitted while loading or on
error). Completes Year Phase C1.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:** heading ✓(T3), 3×4 grid ✓(T3), tile content+tint ✓(T3), sun/snowflake record watermark ✓(T3), tap→Month ✓(T3/T4), inert tiles ✓(T3), a11y names ✓(T3), `year/YYYY.json` transpose+flags ✓(T1), lazy `useYear` ✓(T2), non-blocking grid render ✓(T4), no removals ✓(T4). Tests: pytest transpose+incomplete+emit ✓(T1), MonthGrid vitest ✓(T3), useYear ✓(T2).

**Placeholders:** none — all code shown. The one NOTE (T1 Step 5) instructs verifying `build`'s real signature — legitimate, since `build_data.py` was not fully quoted here.

**Type consistency:** `YearMonth`/`YearData` identical across T2/T3/T4; `onPickMonth(year, month)` signature identical in T3/T4; `WeatherGlyph` props match its source (`tone`,`intensity`,`className`); `TINT` map + watermark markup mirror shipped `MonthHeatmap`.
