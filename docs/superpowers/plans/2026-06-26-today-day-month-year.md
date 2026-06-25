# Today Day/Month/Year + records consistency — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Today tab a Day/Month/Year toggle with ◀/▶ time-travel (Month/Year on mean temperature), and make the all-time daily rank consistent between the Today and Records tabs.

**Architecture:** New monthly aggregates in the Python pipeline (`month/MM.json`). A shared `lib/records.ts` merges the live "today" datum into `summary.extremes` so Today and Records agree. `Today.tsx` becomes an orchestrator (mode toggle + stepper) rendering `DayView` / `MonthView` / `YearView`, with a shared `PeriodScatter` and `Stepper`.

**Tech Stack:** React 18 + Vite + TS, Tailwind v4, Recharts, lucide-react, Vitest; Python stdlib + pytest.

## Global Constraints

- **No behavior change to data/routes** beyond this feature; existing tests stay green; new logic is TDD'd. Tests pristine; Recharts `ResponsiveContainer` mocked in component tests.
- **Day/Month steppers browse calendar position** (MMDD / month 1–12), always highlighting the current year's instance; **Year stepper browses years** (min..max, clamped). Defaults: current day / month / year.
- **Live overlay** (current temp, "new record" line, all-time-rank line, anomaly-vs-today) renders **only in Day mode AND when the selected day == actual today**.
- **Means:** Month = calendar-month mean; Year = annual mean. Month-year **complete** when `valid_days ≥ days_in_month − 3`. Records/normal/thenNow use complete months only; current partial month shown flagged "(so far)".
- **Consistency:** Today all-time line and Records list both go through `lib/records.ts` with the same live `{date, v}` (tmax→warm, tmin→cold). Rank = count strictly-more-extreme + 1 (ties share rank).
- **Stripe/scatter colors** via tokens: `var(--warm)` (high), `var(--accent)` (low/mean). Keep heading "This Day in History" in Day mode (App.test depends on it).
- Vite base `/uccle-climate/`; data CI-generated (public/data gitignored); ERA5-filled merged `recs` feeds all derivations.

---

## File Structure
```
scripts/uccle/derive.py        # + monthly_means, month_data
scripts/uccle/build_data.py    # emit public/data/month/MM.json
scripts/uccle/tests/test_derive.py, test_build.py  # + monthly tests
src/types.ts                   # + MonthData
src/lib/records.ts (NEW)       # allTimeRank, mergeLiveExtreme
src/lib/records.test.ts (NEW)
src/lib/format.ts              # + fmtMonth, fmtDayLabel
src/data/loader.ts             # + loadMonth
src/data/useMonth.ts (NEW)
src/components/Stepper.tsx (NEW)
src/components/PeriodScatter.tsx (NEW)   # shared scatter + period filter
src/tabs/today/DayView.tsx (NEW)
src/tabs/today/MonthView.tsx (NEW)
src/tabs/today/YearView.tsx (NEW)
src/tabs/Today.tsx             # orchestrator: mode toggle + stepper
src/tabs/Records.tsx           # use mergeLiveExtreme + useTodayTemp
```

---

## Phase A — Monthly pipeline

### Task 1: `monthly_means`

**Files:** Modify `scripts/uccle/derive.py`; Test `scripts/uccle/tests/test_derive.py`

**Interfaces:**
- Produces: `monthly_means(recs) -> dict[(year,month) -> {"mean": float, "n": int, "complete": bool}]` where `complete = n >= days_in_month(year,month) - 3`.

- [ ] **Step 1: Write failing test**
```python
import calendar
from scripts.uccle.derive import monthly_means

def month_recs(year, month, n, tmean):
    out = []
    for d in range(1, n + 1):
        out.append({"date": dt.date(year, month, d), "tmax": tmean + 5, "tmin": tmean - 5, "tmean": tmean})
    return out

def test_monthly_means_and_completeness():
    full = month_recs(2000, 6, 30, 18.0)     # June has 30 days → complete
    partial = month_recs(2026, 6, 26, 20.0)  # 26 < 30-3 → incomplete
    mm = monthly_means(full + partial)
    assert mm[(2000, 6)] == {"mean": 18.0, "n": 30, "complete": True}
    assert mm[(2026, 6)]["complete"] is False
    assert mm[(2026, 6)]["mean"] == 20.0
```

- [ ] **Step 2: Run to verify fail**
Run: `python3 -m pytest scripts/uccle/tests/test_derive.py::test_monthly_means_and_completeness -v` → FAIL.

- [ ] **Step 3: Implement** (append to `derive.py`)
```python
import calendar

def monthly_means(recs):
    by = defaultdict(list)
    for r in recs:
        by[(r["date"].year, r["date"].month)].append(r["tmean"])
    out = {}
    for (y, m), vals in by.items():
        dim = calendar.monthrange(y, m)[1]
        out[(y, m)] = {"mean": round(sum(vals) / len(vals), 2), "n": len(vals), "complete": len(vals) >= dim - 3}
    return out
```

- [ ] **Step 4: Run to verify pass** → PASS.
- [ ] **Step 5: Commit** → `git commit -am "feat(pipeline): monthly means + completeness gate"`

### Task 2: `month_data` (per-calendar-month payload)

**Files:** Modify `scripts/uccle/derive.py`; Test `scripts/uccle/tests/test_derive.py`

**Interfaces:**
- Consumes: `monthly_means`.
- Produces: `month_data(recs, baseline=(1991,2020), early=(1833,1900), recent=(1996,2025)) -> dict["MM" -> {mm, series:[{year,mean,complete}], recordWarm:{year,v}, recordCold:{year,v}, normal, thenNow}]`. `series` sorted by year, all year-months present; record/normal/thenNow over complete months only; `normal`/means rounded 2dp; `normal` None if no complete baseline months.

- [ ] **Step 1: Write failing test**
```python
from scripts.uccle.derive import month_data

def test_month_data_records_normal_thennow():
    recs = (month_recs(1990, 6, 30, 15.0) + month_recs(2000, 6, 30, 18.0)
            + month_recs(2020, 6, 30, 20.0) + month_recs(2026, 6, 26, 99.0))  # 2026 partial → excluded from records/normal
    md = month_data(recs, baseline=(1990, 2020), early=(1833, 1990), recent=(2000, 2025))
    june = md["06"]
    assert june["mm"] == "06"
    assert {"year": 2020, "mean": 20.0, "complete": True} in june["series"]
    assert any(s["year"] == 2026 and s["complete"] is False for s in june["series"])
    assert june["recordWarm"] == {"year": 2020, "v": 20.0}   # 2026 excluded
    assert june["recordCold"] == {"year": 1990, "v": 15.0}
    assert june["normal"] == round((15.0 + 18.0 + 20.0) / 3, 2)  # complete months in 1990-2020
    assert june["thenNow"]["early"]["mean"] == 15.0 and june["thenNow"]["recent"]["mean"] == 19.0
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement** (append to `derive.py`)
```python
def month_data(recs, baseline=(1991, 2020), early=(1833, 1900), recent=(1996, 2025)):
    mm = monthly_means(recs)
    by_month = defaultdict(list)               # month -> [(year, info)]
    for (y, m), info in mm.items():
        by_month[m].append((y, info))
    out = {}
    for m in range(1, 13):
        entries = sorted(by_month.get(m, []), key=lambda t: t[0])
        series = [{"year": y, "mean": info["mean"], "complete": info["complete"]} for y, info in entries]
        complete = [(y, info["mean"]) for y, info in entries if info["complete"]]
        warm = max(complete, key=lambda t: t[1]) if complete else None
        cold = min(complete, key=lambda t: t[1]) if complete else None
        base_vals = [v for y, v in complete if baseline[0] <= y <= baseline[1]]
        early_vals = [v for y, v in complete if early[0] <= y <= early[1]]
        recent_vals = [v for y, v in complete if recent[0] <= y <= recent[1]]
        out[f"{m:02d}"] = {
            "mm": f"{m:02d}",
            "series": series,
            "recordWarm": {"year": warm[0], "v": warm[1]} if warm else None,
            "recordCold": {"year": cold[0], "v": cold[1]} if cold else None,
            "normal": round(sum(base_vals) / len(base_vals), 2) if base_vals else None,
            "thenNow": {
                "early": {"from": early[0], "to": early[1], "mean": round(sum(early_vals) / len(early_vals), 2) if early_vals else None},
                "recent": {"from": recent[0], "to": recent[1], "mean": round(sum(recent_vals) / len(recent_vals), 2) if recent_vals else None},
            },
        }
    return out
```

- [ ] **Step 4: Run to verify pass** → PASS.
- [ ] **Step 5: Commit** → `git commit -am "feat(pipeline): per-month data (series, records, normal, then-now)"`

### Task 3: Emit `month/MM.json`

**Files:** Modify `scripts/uccle/build_data.py`; Test `scripts/uccle/tests/test_build.py`

**Interfaces:**
- Consumes: `derive.month_data`.
- Produces: `public/data/month/MM.json` × 12.

- [ ] **Step 1: Write failing test** (append to `test_build.py`)
```python
def test_build_emits_month_files(tmp_path):
    from scripts.uccle.tests.test_derive import month_recs
    recs = month_recs(2000, 6, 30, 18.0) + month_recs(2020, 6, 30, 20.0)
    build(records=recs, out_dir=str(tmp_path))
    june = json.loads((tmp_path / "month" / "06.json").read_text())
    assert june["mm"] == "06"
    assert june["recordWarm"] == {"year": 2020, "v": 20.0}
    assert (tmp_path / "month" / "01.json").exists()  # all 12 emitted
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement** — in `build_data.py` `build()`, after the `thisday` loop add:
```python
    os.makedirs(os.path.join(out_dir, "month"), exist_ok=True)
    for mmkey, payload in derive.month_data(recs).items():
        _write(os.path.join(out_dir, "month", f"{mmkey}.json"), payload)
```

- [ ] **Step 4: Run to verify pass** → `python3 -m pytest scripts/uccle/tests/test_build.py -v` PASS.
- [ ] **Step 5: Commit** → `git commit -am "feat(pipeline): emit month/MM.json"`

---

## Phase B — Shared logic + data layer

### Task 4: `lib/records.ts` (consistency core)

**Files:** Create `src/lib/records.ts`, `src/lib/records.test.ts`

**Interfaces:**
- Produces: `interface DayExtreme { date: string; v: number }`; `allTimeRank(values: number[], value: number, dir: 'warm'|'cold'): number`; `mergeLiveExtreme(list: DayExtreme[], live: DayExtreme | null, dir: 'warm'|'cold'): DayExtreme[]`.

- [ ] **Step 1: Write failing test** `src/lib/records.test.ts`
```ts
import { allTimeRank, mergeLiveExtreme } from './records'

test('allTimeRank warm: ties share rank', () => {
  expect(allTimeRank([39, 38, 37, 36.8], 36.8, 'warm')).toBe(4) // 3 strictly greater +1
  expect(allTimeRank([39, 38, 37], 40, 'warm')).toBe(1)
})
test('allTimeRank cold: lower is rank 1', () => {
  expect(allTimeRank([-10, -5, 0], -8, 'cold')).toBe(2)
})
test('mergeLiveExtreme inserts, sorts desc for warm, dedupes by date', () => {
  const list = [{ date: '2019-07-25', v: 39.7 }, { date: '1959-07-09', v: 36.8 }]
  const merged = mergeLiveExtreme(list, { date: '2026-06-26', v: 38.0 }, 'warm')
  expect(merged.map(e => e.v)).toEqual([39.7, 38.0, 36.8])
})
test('mergeLiveExtreme null live returns sorted copy', () => {
  expect(mergeLiveExtreme([{ date: 'a', v: 1 }, { date: 'b', v: 3 }], null, 'warm').map(e => e.v)).toEqual([3, 1])
})
```

- [ ] **Step 2: Run to verify fail** → `npm test -- records` FAIL.

- [ ] **Step 3: Implement** `src/lib/records.ts`
```ts
export interface DayExtreme { date: string; v: number }

export function allTimeRank(values: number[], value: number, dir: 'warm' | 'cold'): number {
  const more = dir === 'warm'
    ? values.filter(v => v > value).length
    : values.filter(v => v < value).length
  return more + 1
}

export function mergeLiveExtreme(list: DayExtreme[], live: DayExtreme | null, dir: 'warm' | 'cold'): DayExtreme[] {
  const merged = live ? [...list.filter(e => e.date !== live.date), live] : [...list]
  merged.sort((a, b) => (dir === 'warm' ? b.v - a.v : a.v - b.v))
  return merged
}
```

- [ ] **Step 4: Run to verify pass** → PASS.
- [ ] **Step 5: Commit** → `git add src/lib/records.ts src/lib/records.test.ts && git commit -m "feat(lib): records merge + all-time rank"`

### Task 5: Types + format helpers + month loader/hook

**Files:** Modify `src/types.ts`, `src/lib/format.ts`, `src/data/loader.ts`; Create `src/data/useMonth.ts`; Test `src/lib/format.test.ts`

**Interfaces:**
- Produces: `MonthData` type; `fmtMonth(mm: string): string` ("06"→"June"), `fmtDayLabel(mmdd: string): string` ("0626"→"26 June"); `loadMonth(mm): Promise<MonthData>`; `useMonth(mm)` → `{ data, error, loading }`.

- [ ] **Step 1: Write failing test** (append to `src/lib/format.test.ts`)
```ts
import { fmtMonth, fmtDayLabel } from './format'
describe('fmtMonth/fmtDayLabel', () => {
  it('formats month and day labels', () => {
    expect(fmtMonth('06')).toBe('June')
    expect(fmtMonth('01')).toBe('January')
    expect(fmtDayLabel('0626')).toBe('26 June')
    expect(fmtDayLabel('0103')).toBe('3 January')
  })
})
```
(add `fmtMonth, fmtDayLabel` to the import at top of the test file)

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement**
Append to `src/lib/format.ts`:
```ts
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
export const fmtMonth = (mm: string): string => MONTHS_FULL[Number(mm) - 1]
export const fmtDayLabel = (mmdd: string): string =>
  `${Number(mmdd.slice(2))} ${fmtMonth(mmdd.slice(0, 2))}`
```
Add to `src/types.ts`:
```ts
export interface MonthData {
  mm: string
  series: { year: number; mean: number; complete: boolean }[]
  recordWarm: { year: number; v: number } | null
  recordCold: { year: number; v: number } | null
  normal: number | null
  thenNow: { early: { from: number; to: number; mean: number | null }; recent: { from: number; to: number; mean: number | null } }
}
```
Add to `src/data/loader.ts` (after `loadThisDay`):
```ts
import type { Summary, DayNorm, ThisDay, Baseline, MonthData } from '../types'
export const loadMonth = (mm: string) => loadJSON<MonthData>(`data/month/${mm}.json`)
```
(merge `MonthData` into the existing type import line)
Create `src/data/useMonth.ts`:
```ts
import { useEffect, useState } from 'react'
import { loadMonth } from './loader'
import type { MonthData } from '../types'

export function useMonth(mm: string) {
  const [data, setData] = useState<MonthData | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { let a = true; setLoading(true)
    loadMonth(mm).then(d => a && setData(d)).catch(e => a && setError(e)).finally(() => a && setLoading(false))
    return () => { a = false } }, [mm])
  return { data, error, loading }
}
```

- [ ] **Step 4: Run to verify pass** → `npm test -- format` PASS; `npm run build` clean.
- [ ] **Step 5: Commit** → `git add -A && git commit -m "feat(data): MonthData type, month loader/hook, month/day formatters"`

---

## Phase C — Shared UI components

### Task 6: `Stepper` + `PeriodScatter`

**Files:** Create `src/components/Stepper.tsx`, `src/components/PeriodScatter.tsx`, `src/components/Stepper.test.tsx`

**Interfaces:**
- Produces: `<Stepper label onPrev onNext prevDisabled? nextDisabled? />`; `<PeriodScatter data series title />` where `series: { key: string; name: string; color: string }[]`, `data: ({ year: number } & Record<string, number>)[]`. Exports `PERIODS`.

- [ ] **Step 1: Write failing test** `src/components/Stepper.test.tsx`
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import Stepper from './Stepper'
test('renders label and fires prev/next', () => {
  const onPrev = vi.fn(), onNext = vi.fn()
  render(<Stepper label="June" onPrev={onPrev} onNext={onNext} />)
  expect(screen.getByText('June')).toBeInTheDocument()
  fireEvent.click(screen.getByLabelText('Previous')); expect(onPrev).toHaveBeenCalled()
  fireEvent.click(screen.getByLabelText('Next')); expect(onNext).toHaveBeenCalled()
})
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement**
`src/components/Stepper.tsx`:
```tsx
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Stepper({ label, onPrev, onNext, prevDisabled, nextDisabled }: {
  label: string; onPrev: () => void; onNext: () => void; prevDisabled?: boolean; nextDisabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <button type="button" aria-label="Previous" onClick={onPrev} disabled={prevDisabled}
        className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:text-fg disabled:opacity-40">
        <ChevronLeft size={18} />
      </button>
      <span className="text-sm font-semibold">{label}</span>
      <button type="button" aria-label="Next" onClick={onNext} disabled={nextDisabled}
        className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:text-fg disabled:opacity-40">
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
```
`src/components/PeriodScatter.tsx`:
```tsx
import { useState } from 'react'
import { Scatter, XAxis, YAxis, ResponsiveContainer, ComposedChart, CartesianGrid, Tooltip } from 'recharts'

const tooltipStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--fg)', fontSize: 12 }

export const PERIODS: { label: string; from: number; to: number }[] = [
  { label: '2001–Now', from: 2001, to: 9999 },
  { label: '1951–2000', from: 1951, to: 2000 },
  { label: '1901–1950', from: 1901, to: 1950 },
  { label: '1833–1900', from: 1833, to: 1900 },
  { label: 'All time', from: 0, to: 9999 },
]

type Row = { year: number } & Record<string, number>

export default function PeriodScatter({ data, series, title }: {
  data: Row[]; series: { key: string; name: string; color: string }[]; title: string
}) {
  const [idx, setIdx] = useState(0)
  const p = PERIODS[idx]
  const shown = data.filter(d => d.year >= p.from && d.year <= p.to)
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.09em] text-muted">{title}</p>
        <select value={idx} onChange={e => setIdx(Number(e.target.value))} aria-label="Period"
          className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs">
          {PERIODS.map((pp, i) => <option key={pp.label} value={i}>{pp.label}</option>)}
        </select>
      </div>
      <p className="mb-1 text-xs text-muted">
        {series.map(s => <span key={s.key} className="mr-3"><span style={{ color: s.color }}>●</span> {s.name}</span>)} (°C)
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={shown} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="year" tick={{ fill: 'var(--muted)', fontSize: 11 }} stroke="var(--border)" />
          <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} stroke="var(--border)" />
          <Tooltip contentStyle={tooltipStyle} />
          {series.map(s => <Scatter key={s.key} name={s.name} dataKey={s.key} fill={s.color} />)}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify pass** → `npm test -- Stepper` PASS; `npm run build` clean.
- [ ] **Step 5: Commit** → `git add -A && git commit -m "feat(ui): Stepper + shared PeriodScatter"`

---

## Phase D — Today views

### Task 7: `DayView`

**Files:** Create `src/tabs/today/DayView.tsx`, `src/tabs/today/DayView.test.tsx`

**Interfaces:**
- Consumes: `useThisDay`, `useTodayTemp`, `useDayNorm`, `useSummary`, `rankOf`, `meanAnomaly`, `allTimeRank`, `PeriodScatter`, `Loading`, `ErrorState`, `fmtTemp`.
- Produces: `<DayView mmdd: string isToday: boolean />` default export.

- [ ] **Step 1: Write failing test** `src/tabs/today/DayView.test.tsx`
```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import DayView from './DayView'

vi.mock('recharts', async (o) => { const a = await o<typeof import('recharts')>()
  return { ...a, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 800, height: 300 }}>{children}</div> } })

const thisday = { mmdd: '0626', recordHigh: { v: 34.8, year: 1947 }, recordLow: { v: 4.1, year: 1923 },
  series: [{ year: 1900, tmax: 24, tmin: 12 }, { year: 2020, tmax: 33, tmin: 20 }],
  thenNow: { early: { from: 1833, to: 1900, mean: 18 }, recent: { from: 1996, to: 2025, mean: 21 } } }

afterEach(() => vi.unstubAllGlobals())

test('today shows live block + record high', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () =>
    u.includes('open-meteo') ? { current: { temperature_2m: 35 }, daily: { temperature_2m_max: [36], temperature_2m_min: [20] } } : thisday })))
  render(<DayView mmdd="0626" isToday />)
  await waitFor(() => expect(screen.getByText(/34.8/)).toBeInTheDocument())
  expect(screen.getByText(/record high for this date/i)).toBeInTheDocument()
})

test('non-today day hides the live block', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => thisday }))
  render(<DayView mmdd="0301" isToday={false} />)
  await waitFor(() => expect(screen.getByText(/34.8/)).toBeInTheDocument())
  expect(screen.queryByText(/record high for this date/i)).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement** `src/tabs/today/DayView.tsx`
```tsx
import { Flame, Snowflake } from 'lucide-react'
import { useThisDay } from '../../data/useThisDay'
import { useTodayTemp } from '../../data/useTodayTemp'
import { useDayNorm } from '../../data/useDayNorm'
import { useSummary } from '../../data/useSummary'
import { fmtTemp } from '../../lib/format'
import { rankOf, meanAnomaly } from '../../lib/stats'
import { allTimeRank } from '../../lib/records'
import { Loading, ErrorState } from '../../components/States'
import PeriodScatter from '../../components/PeriodScatter'

const ordinal = (n: number) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]) }

export default function DayView({ mmdd, isToday }: { mmdd: string; isToday: boolean }) {
  const { data, loading, error } = useThisDay(mmdd)
  const live = useTodayTemp()
  const dayNorm = useDayNorm()
  const { summary } = useSummary()
  if (loading) return <Loading label="Loading day…" />
  if (error || !data) return <ErrorState label="Could not load this date." />

  const ld = isToday ? live.data : null
  const r = ld ? rankOf(ld.tmax, data.series.map(s => s.tmax)) : null
  const isHotRecord = ld != null && ld.tmax > data.recordHigh.v
  const isColdRecord = ld != null && ld.tmin < data.recordLow.v
  const heroClass = isHotRecord ? 'rounded-xl border-2 border-warm bg-warm/5 p-5'
    : isColdRecord ? 'rounded-xl border-2 border-accent bg-accent/5 p-5'
    : 'rounded-xl border border-border bg-surface p-5'
  const recordCount = summary?.records ? (isHotRecord ? summary.records.highs : summary.records.lows) : 0
  const entry = dayNorm.data?.['1991-2020']?.find(n => n.mmdd === mmdd)
  const startYear = summary?.annual?.[0]?.year ?? 1833

  let allTime: { rank: number; kind: 'warmest' | 'coldest' } | null = null
  if (ld && summary?.extremes) {
    const wRank = allTimeRank(summary.extremes.warmest.map(e => e.v), ld.tmax, 'warm')
    const cRank = allTimeRank(summary.extremes.coldest.map(e => e.v), ld.tmin, 'cold')
    if (wRank <= 10) allTime = { rank: wRank, kind: 'warmest' }
    else if (cRank <= 10) allTime = { rank: cRank, kind: 'coldest' }
  }

  return (
    <div className="space-y-4">
      {isToday && (
        <div className={heroClass}>
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Today · Uccle, Brussels</p>
          {live.error ? <p className="mt-1 text-sm text-muted">Live temperature unavailable — showing records only.</p>
            : live.loading ? <p className="mt-1 text-sm text-muted">Fetching today…</p>
            : <div className="mt-1 flex items-end gap-3">
                <span className="text-[46px] font-extrabold leading-none">{fmtTemp(live.data!.temp)}</span>
                <span className="pb-1.5 text-sm text-muted">max {fmtTemp(live.data!.tmax)}</span>
              </div>}
          {(isHotRecord || isColdRecord) && (
            <p className={`mt-2 flex items-center gap-2 text-sm font-semibold ${isHotRecord ? 'text-warm' : 'text-accent'}`}>
              {isHotRecord ? <Flame size={16} aria-hidden /> : <Snowflake size={16} aria-hidden />}
              <span>{isHotRecord ? 'New record high for this date!' : 'New record low for this date!'}
                {recordCount > 0 && ` ${recordCount} ${isHotRecord ? 'heat' : 'cold'} records set in ${summary!.records.year}.`}</span>
            </p>
          )}
          {r && <p className="mt-3 inline-block rounded-full bg-badge-bg px-3 py-1 text-xs font-semibold text-badge-fg">
            {ordinal(r.rank)} warmest on this date in {r.total} years</p>}
          {allTime && <p className={`mt-2 text-sm font-semibold ${allTime.kind === 'warmest' ? 'text-warm' : 'text-accent'}`}>
            {ordinal(allTime.rank)} {allTime.kind} day since {startYear}</p>}
          {entry?.normal != null && live.data != null && (
            <p className="mt-3 text-sm text-muted">
              Today averages <strong className="text-fg">{Math.abs(meanAnomaly(live.data.tmax, live.data.tmin, entry.normal))} °C {meanAnomaly(live.data.tmax, live.data.tmin, entry.normal) >= 0 ? 'above' : 'below'}</strong> the 1991–2020 normal ({entry.normal} °C) for this date.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Record high</p>
          <p className="mt-1 text-lg font-bold text-warm">{fmtTemp(data.recordHigh.v)}</p>
          <p className="text-xs text-muted">{data.recordHigh.year}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Record low</p>
          <p className="mt-1 text-lg font-bold text-accent">{fmtTemp(data.recordLow.v)}</p>
          <p className="text-xs text-muted">{data.recordLow.year}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Then vs now</p>
        <p className="mt-1 text-sm">
          {fmtTemp(data.thenNow.early.mean)} <span className="text-muted">({data.thenNow.early.from}–{data.thenNow.early.to})</span>
          {' → '}<strong>{fmtTemp(data.thenNow.recent.mean)}</strong> <span className="text-muted">({data.thenNow.recent.from}–{data.thenNow.recent.to})</span>
        </p>
      </div>

      <PeriodScatter title="Every year on this date"
        data={data.series as never}
        series={[{ key: 'tmax', name: 'High', color: 'var(--warm)' }, { key: 'tmin', name: 'Low', color: 'var(--accent)' }]} />
    </div>
  )
}
```

- [ ] **Step 4: Run to verify pass** → `npm test -- DayView` PASS.
- [ ] **Step 5: Commit** → `git add -A && git commit -m "feat(today): DayView (live overlay only when today)"`

### Task 8: `MonthView`

**Files:** Create `src/tabs/today/MonthView.tsx`, `src/tabs/today/MonthView.test.tsx`

**Interfaces:**
- Consumes: `useMonth`, `fmtTemp`, `PeriodScatter`, `Loading`, `ErrorState`.
- Produces: `<MonthView mm: string currentYear: number />` default export.

- [ ] **Step 1: Write failing test** `src/tabs/today/MonthView.test.tsx`
```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import MonthView from './MonthView'

vi.mock('recharts', async (o) => { const a = await o<typeof import('recharts')>()
  return { ...a, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 800, height: 300 }}>{children}</div> } })

const month = { mm: '06',
  series: [{ year: 2000, mean: 16, complete: true }, { year: 2020, mean: 19, complete: true }, { year: 2026, mean: 21, complete: false }],
  recordWarm: { year: 2020, v: 19 }, recordCold: { year: 2000, v: 16 }, normal: 17,
  thenNow: { early: { from: 1833, to: 1900, mean: 15 }, recent: { from: 1996, to: 2025, mean: 18 } } }

afterEach(() => vi.unstubAllGlobals())

test('shows current-year month mean, rank, record', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => month }))
  render(<MonthView mm="06" currentYear={2026} />)
  await waitFor(() => expect(screen.getByText(/16\.0 °C/)).toBeInTheDocument()) // record cold value present
  expect(screen.getByText(/so far/i)).toBeInTheDocument()        // 2026 partial
  expect(screen.getByText(/warmest June on record/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement** `src/tabs/today/MonthView.tsx`
```tsx
import { useMonth } from '../../data/useMonth'
import { fmtTemp, fmtMonth } from '../../lib/format'
import { Loading, ErrorState } from '../../components/States'
import PeriodScatter from '../../components/PeriodScatter'

const ordinal = (n: number) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]) }

export default function MonthView({ mm, currentYear }: { mm: string; currentYear: number }) {
  const { data, loading, error } = useMonth(mm)
  if (loading) return <Loading label="Loading month…" />
  if (error || !data) return <ErrorState label="Could not load this month." />

  const name = fmtMonth(mm)
  const cur = data.series.find(s => s.year === currentYear)
  const complete = data.series.filter(s => s.complete)
  const rank = cur ? complete.filter(s => s.mean > cur.mean).length + 1 : null
  const anomaly = cur && data.normal != null ? Math.round((cur.mean - data.normal) * 10) / 10 : null

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="text-[11px] uppercase tracking-[0.09em] text-muted">{name} mean · Uccle, Brussels</p>
        {cur ? (
          <>
            <div className="mt-1 flex items-end gap-3">
              <span className="text-[40px] font-extrabold leading-none">{fmtTemp(cur.mean)}</span>
              <span className="pb-1.5 text-sm text-muted">{currentYear}{cur.complete ? '' : ' (so far)'}</span>
            </div>
            {rank && cur.complete && <p className="mt-3 inline-block rounded-full bg-badge-bg px-3 py-1 text-xs font-semibold text-badge-fg">
              {ordinal(rank)} warmest {name} in {complete.length} years</p>}
            {anomaly != null && <p className="mt-3 text-sm text-muted">
              <strong className="text-fg">{Math.abs(anomaly)} °C {anomaly >= 0 ? 'above' : 'below'}</strong> the 1991–2020 {name} normal ({data.normal} °C).</p>}
          </>
        ) : <p className="mt-2 text-sm text-muted">No data for {name} {currentYear} yet.</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Warmest {name} on record</p>
          <p className="mt-1 text-lg font-bold text-warm">{fmtTemp(data.recordWarm?.v)}</p>
          <p className="text-xs text-muted">{data.recordWarm?.year}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Coldest {name} on record</p>
          <p className="mt-1 text-lg font-bold text-accent">{fmtTemp(data.recordCold?.v)}</p>
          <p className="text-xs text-muted">{data.recordCold?.year}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Then vs now</p>
        <p className="mt-1 text-sm">
          {fmtTemp(data.thenNow.early.mean)} <span className="text-muted">({data.thenNow.early.from}–{data.thenNow.early.to})</span>
          {' → '}<strong>{fmtTemp(data.thenNow.recent.mean)}</strong> <span className="text-muted">({data.thenNow.recent.from}–{data.thenNow.recent.to})</span>
        </p>
      </div>

      <PeriodScatter title={`Every ${name} mean`}
        data={complete.map(s => ({ year: s.year, mean: s.mean })) as never}
        series={[{ key: 'mean', name: `${name} mean`, color: 'var(--accent)' }]} />
    </div>
  )
}
```

- [ ] **Step 4: Run to verify pass** → `npm test -- MonthView` PASS.
- [ ] **Step 5: Commit** → `git add -A && git commit -m "feat(today): MonthView (monthly mean, rank, anomaly, records)"`

### Task 9: `YearView`

**Files:** Create `src/tabs/today/YearView.tsx`, `src/tabs/today/YearView.test.tsx`

**Interfaces:**
- Consumes: `useSummary`, `fmtTemp`, `PeriodScatter`, `Loading`, `ErrorState`.
- Produces: `<YearView year: number />` default export.

- [ ] **Step 1: Write failing test** `src/tabs/today/YearView.test.tsx`
```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import YearView from './YearView'

vi.mock('recharts', async (o) => { const a = await o<typeof import('recharts')>()
  return { ...a, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 800, height: 300 }}>{children}</div> } })

const summary = { station: { id: '', name: '', lat: 0, lon: 0 }, baselines: { '1991-2020': 10, '1961-1990': 10 },
  annual: [{ year: 2000, mean: 10.5, tmin: 6, tmax: 15, incomplete: false }, { year: 2020, mean: 12.1, tmin: 8, tmax: 16, incomplete: false }],
  anomaly: { '1991-2020': [{ year: 2000, v: 0.5 }, { year: 2020, v: 2.1 }], '1961-1990': [] }, decadal: [],
  warmingRate: { full: 0, last30: 0 }, records: { year: 2026, highs: 0, lows: 0 },
  extremes: { warmest: [], coldest: [] },
  counters: { SU: [], hot30: [], TR: [], FD: [], ID: [], heatwaveDays: [], gsl: [] },
  rankings: { warmest: [{ year: 2020, mean: 12.1 }, { year: 2000, mean: 10.5 }], coldest: [{ year: 2000, mean: 10.5 }] } }

afterEach(() => vi.unstubAllGlobals())

test('shows selected year mean + rank', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => summary }))
  render(<YearView year={2020} />)
  await waitFor(() => expect(screen.getByText(/12\.1 °C/)).toBeInTheDocument())
  expect(screen.getByText(/1st warmest year/i)).toBeInTheDocument()  // 2020 is warmest
})
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement** `src/tabs/today/YearView.tsx`
```tsx
import { useSummary } from '../../data/useSummary'
import { fmtTemp } from '../../lib/format'
import { Loading, ErrorState } from '../../components/States'
import PeriodScatter from '../../components/PeriodScatter'

const ordinal = (n: number) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]) }

export default function YearView({ year }: { year: number }) {
  const { summary, loading, error } = useSummary()
  if (loading) return <Loading label="Loading year…" />
  if (error || !summary) return <ErrorState label="Could not load data." />

  const a = summary.annual.find(x => x.year === year)
  const rankIdx = summary.rankings.warmest.findIndex(x => x.year === year)
  const rank = rankIdx >= 0 ? rankIdx + 1 : null
  const total = summary.rankings.warmest.length
  const anomaly = summary.anomaly['1991-2020'].find(x => x.year === year)?.v ?? null
  const recordWarm = summary.rankings.warmest[0]
  const recordCold = summary.rankings.coldest[0]

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="text-[11px] uppercase tracking-[0.09em] text-muted">{year} annual mean · Uccle, Brussels</p>
        {a ? (
          <>
            <div className="mt-1 flex items-end gap-3">
              <span className="text-[40px] font-extrabold leading-none">{fmtTemp(a.mean)}</span>
              <span className="pb-1.5 text-sm text-muted">{a.incomplete ? '(so far)' : ''}</span>
            </div>
            {rank && !a.incomplete && <p className="mt-3 inline-block rounded-full bg-badge-bg px-3 py-1 text-xs font-semibold text-badge-fg">
              {ordinal(rank)} warmest year in {total} years</p>}
            {anomaly != null && <p className="mt-3 text-sm text-muted">
              <strong className="text-fg">{Math.abs(anomaly)} °C {anomaly >= 0 ? 'above' : 'below'}</strong> the 1991–2020 normal ({summary.baselines['1991-2020']} °C).</p>}
          </>
        ) : <p className="mt-2 text-sm text-muted">No data for {year}.</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Warmest year on record</p>
          <p className="mt-1 text-lg font-bold text-warm">{fmtTemp(recordWarm?.mean)}</p>
          <p className="text-xs text-muted">{recordWarm?.year}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Coldest year on record</p>
          <p className="mt-1 text-lg font-bold text-accent">{fmtTemp(recordCold?.mean)}</p>
          <p className="text-xs text-muted">{recordCold?.year}</p>
        </div>
      </div>

      <PeriodScatter title="Annual mean by year"
        data={summary.annual.filter(x => !x.incomplete).map(x => ({ year: x.year, mean: x.mean })) as never}
        series={[{ key: 'mean', name: 'Annual mean', color: 'var(--accent)' }]} />
    </div>
  )
}
```

- [ ] **Step 4: Run to verify pass** → `npm test -- YearView` PASS.
- [ ] **Step 5: Commit** → `git add -A && git commit -m "feat(today): YearView (annual mean, rank, anomaly, records)"`

### Task 10: `Today` orchestrator (mode toggle + stepper)

**Files:** Rewrite `src/tabs/Today.tsx`; Test `src/tabs/Today.test.tsx` (replace)

**Interfaces:**
- Consumes: `DayView`, `MonthView`, `YearView`, `Stepper`, `useSummary`, `todayMMDD`, `fmtDayLabel`, `fmtMonth`.

- [ ] **Step 1: Write failing test** `src/tabs/Today.test.tsx`
```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import Today from './Today'

vi.mock('recharts', async (o) => { const a = await o<typeof import('recharts')>()
  return { ...a, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 800, height: 300 }}>{children}</div> } })

const thisday = { mmdd: '0626', recordHigh: { v: 34.8, year: 1947 }, recordLow: { v: 4.1, year: 1923 },
  series: [{ year: 2020, tmax: 33, tmin: 20 }], thenNow: { early: { from: 1833, to: 1900, mean: 18 }, recent: { from: 1996, to: 2025, mean: 21 } } }
const month = { mm: '06', series: [{ year: 2020, mean: 19, complete: true }], recordWarm: { year: 2020, v: 19 }, recordCold: { year: 2020, v: 19 }, normal: 17, thenNow: { early: { from: 1833, to: 1900, mean: 15 }, recent: { from: 1996, to: 2025, mean: 18 } } }
const summary = { station: {}, baselines: { '1991-2020': 10, '1961-1990': 10 }, annual: [{ year: 2026, mean: 11, tmin: 6, tmax: 16, incomplete: true }, { year: 2025, mean: 12, tmin: 7, tmax: 17, incomplete: false }],
  anomaly: { '1991-2020': [], '1961-1990': [] }, decadal: [], warmingRate: { full: 0, last30: 0 }, records: { year: 2026, highs: 0, lows: 0 },
  extremes: { warmest: [], coldest: [] }, counters: { SU: [], hot30: [], TR: [], FD: [], ID: [], heatwaveDays: [], gsl: [] }, rankings: { warmest: [{ year: 2025, mean: 12 }], coldest: [{ year: 2025, mean: 12 }] } }

function routeFetch(u: string) {
  if (u.includes('open-meteo')) return { current: { temperature_2m: 20 }, daily: { temperature_2m_max: [21], temperature_2m_min: [12] } }
  if (u.includes('/month/')) return month
  if (u.includes('summary.json')) return summary
  return thisday
}
afterEach(() => vi.unstubAllGlobals())

test('defaults to Day mode with heading and switches to Month', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () => routeFetch(u) })))
  render(<Today />)
  expect(screen.getByRole('heading', { name: /this day in history/i })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /month/i }))
  await waitFor(() => expect(screen.getByRole('heading', { name: /this month in history/i })).toBeInTheDocument())
})
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement** `src/tabs/Today.tsx`
```tsx
import { useState } from 'react'
import DayView from './today/DayView'
import MonthView from './today/MonthView'
import YearView from './today/YearView'
import Stepper from '../components/Stepper'
import { useSummary } from '../data/useSummary'
import { todayMMDD, fmtDayLabel, fmtMonth } from '../lib/format'

type Mode = 'day' | 'month' | 'year'
const MODES: Mode[] = ['day', 'month', 'year']
const HEADINGS: Record<Mode, string> = { day: 'This Day in History', month: 'This Month in History', year: 'This Year in History' }

// 366 calendar mmdd strings (leap year), for day stepping.
const CAL: string[] = (() => {
  const out: string[] = []
  const d = new Date(Date.UTC(2000, 0, 1))
  for (let i = 0; i < 366; i++) { out.push(`${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`); d.setUTCDate(d.getUTCDate() + 1) }
  return out
})()

export default function Today() {
  const { summary } = useSummary()
  const now = new Date()
  const realToday = todayMMDD()
  const [mode, setMode] = useState<Mode>('day')
  const [mmdd, setMmdd] = useState(realToday)
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState<number | null>(null)

  const minYear = summary?.annual?.[0]?.year ?? 1833
  const maxYear = summary?.annual?.length ? summary.annual[summary.annual.length - 1].year : now.getFullYear()
  const selYear = year ?? maxYear

  const stepDay = (d: number) => { const i = CAL.indexOf(mmdd); setMmdd(CAL[(i + d + 366) % 366]) }
  const stepMonth = (d: number) => setMonth(((month - 1 + d + 12) % 12) + 1)
  const stepYear = (d: number) => setYear(Math.min(maxYear, Math.max(minYear, selYear + d)))

  const stepper = mode === 'day'
    ? <Stepper label={fmtDayLabel(mmdd)} onPrev={() => stepDay(-1)} onNext={() => stepDay(1)} />
    : mode === 'month'
      ? <Stepper label={fmtMonth(String(month).padStart(2, '0'))} onPrev={() => stepMonth(-1)} onNext={() => stepMonth(1)} />
      : <Stepper label={String(selYear)} onPrev={() => stepYear(-1)} onNext={() => stepYear(1)} prevDisabled={selYear <= minYear} nextDisabled={selYear >= maxYear} />

  return (
    <section className="fade-in space-y-4">
      <h2 className="text-2xl font-extrabold tracking-tight">{HEADINGS[mode]}</h2>

      <div className="inline-flex rounded-lg border border-border bg-surface p-1 text-sm" role="group" aria-label="Granularity">
        {MODES.map(m => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
            className={`rounded-md px-3 py-1.5 capitalize ${mode === m ? 'bg-accent-soft font-semibold text-accent' : 'text-muted'}`}>{m}</button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface p-2">{stepper}</div>

      {mode === 'day' && <DayView mmdd={mmdd} isToday={mmdd === realToday} />}
      {mode === 'month' && <MonthView mm={String(month).padStart(2, '0')} currentYear={now.getFullYear()} />}
      {mode === 'year' && <YearView year={selYear} />}
    </section>
  )
}
```

- [ ] **Step 4: Run to verify pass** → `npm test` (App.test still finds "This Day in History"; Today.test passes). `npm run build` clean.
- [ ] **Step 5: Commit** → `git add -A && git commit -m "feat(today): Day/Month/Year toggle + time-travel stepper"`

---

## Phase E — Records consistency

### Task 11: Records tab merges live today

**Files:** Modify `src/tabs/Records.tsx`, `src/tabs/Records.test.tsx`

**Interfaces:**
- Consumes: `useSummary`, `useTodayTemp`, `mergeLiveExtreme`, `fmtTemp`, `fmtDate`.

- [ ] **Step 1: Write failing test** — add to `src/tabs/Records.test.tsx`
```tsx
import { useTodayTemp } from '../data/useTodayTemp'   // for type only; mocked via fetch
test('merges live today into the warmest list at its rank', async () => {
  // summary warmest top values 39.7, 36.4; live today 38.0 should appear between them
  const s = { ...summary, extremes: { warmest: [{ date: '2019-07-25', v: 39.7 }, { date: '2026-06-25', v: 36.4 }], coldest: [] } }
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () =>
    u.includes('open-meteo') ? { current: { time: '2026-06-26T12:00', temperature_2m: 38 }, daily: { time: ['2026-06-26'], temperature_2m_max: [38], temperature_2m_min: [20] } } : s })))
  render(<Records />)
  await waitFor(() => expect(screen.getByText('38.0 °C')).toBeInTheDocument())
  expect(screen.getByText('26 Jun 2026')).toBeInTheDocument()  // today appears in the list
})
```
(reuse the existing `summary` fixture in the file; add `fireEvent`/`waitFor` imports if missing.)

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement** — update `src/tabs/Records.tsx`
```tsx
import { useState } from 'react'
import { Flame, Snowflake } from 'lucide-react'
import { useSummary } from '../data/useSummary'
import { useTodayTemp } from '../data/useTodayTemp'
import { Loading, ErrorState } from '../components/States'
import { fmtTemp, fmtDate } from '../lib/format'
import { mergeLiveExtreme } from '../lib/records'

type Mode = 'warm' | 'cold'

export default function Records() {
  const { summary, loading, error } = useSummary()
  const live = useTodayTemp()
  const [mode, setMode] = useState<Mode>('warm')
  if (loading) return <Loading label="Loading records…" />
  if (error || !summary) return <ErrorState label="Could not load data." />

  const warm = mode === 'warm'
  const todayISO = new Date().toISOString().slice(0, 10)
  const liveDatum = live.data ? { date: todayISO, v: warm ? live.data.tmax : live.data.tmin } : null
  const list = mergeLiveExtreme(warm ? summary.extremes.warmest : summary.extremes.coldest, liveDatum, warm ? 'warm' : 'cold').slice(0, 10)
  const accent = warm ? 'text-warm' : 'text-accent'

  return (
    <section className="fade-in space-y-4">
      <h2 className="text-2xl font-extrabold tracking-tight">Records</h2>
      <div className="inline-flex rounded-lg border border-border bg-surface p-1 text-sm" role="group" aria-label="Record type">
        <button type="button" aria-pressed={warm} onClick={() => setMode('warm')}
          className={`flex items-center gap-1 rounded-md px-3 py-1.5 ${warm ? 'bg-warm/10 font-semibold text-warm' : 'text-muted'}`}>
          <Flame size={14} aria-hidden /> Warmest
        </button>
        <button type="button" aria-pressed={!warm} onClick={() => setMode('cold')}
          className={`flex items-center gap-1 rounded-md px-3 py-1.5 ${!warm ? 'bg-accent/10 font-semibold text-accent' : 'text-muted'}`}>
          <Snowflake size={14} aria-hidden /> Coldest
        </button>
      </div>
      <p className="text-xs text-muted">Top 10 {warm ? 'hottest days' : 'coldest days'} on record at Uccle (daily {warm ? 'maximum' : 'minimum'}; today included live).</p>
      <ol className="space-y-2">
        {list.map((rec, i) => (
          <li key={rec.date} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${rec.date === todayISO ? 'border-warm bg-warm/5' : 'border-border bg-surface'}`}>
            <div className="flex items-center gap-3">
              <span className="w-5 text-right text-sm font-bold text-muted">{i + 1}</span>
              <span className="text-sm">{fmtDate(rec.date)}{rec.date === todayISO ? ' · today' : ''}</span>
            </div>
            <span className={`text-lg font-bold ${accent}`}>{fmtTemp(rec.v)}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
```

- [ ] **Step 2 (note):** the existing two Records tests use a fetch mock returning `summary` for all URLs; with `useTodayTemp` now fetching too, that mock returns `summary` for the open-meteo URL → `fetchTodayTemp` reads `j.current.temperature_2m` (undefined) → live.data has `temp: undefined`. Update those two tests' mock to branch on `u.includes('open-meteo')` and return a valid open-meteo payload (as in the new test), so `live` resolves cleanly. Keep their existing assertions.

- [ ] **Step 4: Run to verify pass** → `npm test -- Records` PASS; full `npm test` green.
- [ ] **Step 5: Commit** → `git add -A && git commit -m "fix(records): merge live today so Records and Today agree"`

---

## Phase F — Verification (item 4)

### Task 12: Verification workflow (run, not code)
After all tasks merge + deploy, run a multi-agent workflow (controller does this via the Workflow tool, not a code commit):
- **Inputs:** the live `summary.json`, `daynorm.json`, all `thisday/MMDD.json`, all `month/MM.json`.
- **Fan-out ≥200 states:** Day × {all 12 month-firsts, the 10 warmest + 10 coldest extreme dates, ~30 random MMDD}; Month × 12; Year × {1833, every decade, 2014–2026, rankings top/bottom 10}.
- **Per state, assert cross-screen consistency** by recomputing from the JSON and comparing to the component formulas in this plan: Records top-1 warm == that date's Day `recordHigh` == DayView all-time line for the live case; Month headline mean == its `series` point == `recordWarm` where year matches; Year rank == position in `rankings.warmest`; Today live all-time rank == Records merged rank for the live day.
- **Accessibility audit:** every interactive control (mode buttons, stepper, selects, toggles) has an accessible name/role; color is never the only signal (icon+text present); headings present per mode.
- **Layout audit:** content stays in the `max-w-[680px]` column; charts use `ResponsiveContainer`; grids are `grid-cols-1 sm:grid-cols-2`; no element uses a fixed width that exceeds the column; legends/labels wrap.
- **Output:** a findings list (mismatches/violations); dispatch ONE fix wave for any Critical/Important, then re-verify. ⚠️ Pixel rendering is out of scope (no Playwright) — this is a data + markup audit plus a few live-render spot checks.

---

## Self-Review

**Spec coverage:** §3 nav model → Task 10 (CAL stepping, clamped year). §4 modes → Tasks 7/8/9. §5 monthly pipeline + month/MM.json → Tasks 1/2/3; year reuse → Task 9. §6 records consistency → Tasks 4 + 11 (both use mergeLiveExtreme/allTimeRank). §7 components/files → Tasks 4–11. §8 testing → every task TDD. §9 verification → Task 12. ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code. The one cross-task test caveat (Records existing tests' mock) is called out with the exact fix in Task 11.

**Type consistency:** `DayExtreme`/`allTimeRank`/`mergeLiveExtreme` (Task 4) used in Tasks 7, 11. `MonthData` (Task 5) used by `useMonth`/MonthView (Tasks 5, 8). `PeriodScatter` props `{data, series:{key,name,color}[], title}` (Task 6) used consistently in Tasks 7/8/9. `fmtMonth`/`fmtDayLabel` (Task 5) used in Task 10. `useMonth(mm)` returns `{data,error,loading}` consumed in Task 8. Heading "This Day in History" preserved in Day mode (Task 10) so App.test stays green.

**Fix applied inline:** none needed.
