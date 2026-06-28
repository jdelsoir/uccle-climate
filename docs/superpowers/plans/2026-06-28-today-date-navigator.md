# Today specific-date navigator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the Day view into a specific-date navigator whose hero drives navigation (◀▶ + calendar picker), shows two same-size temperatures colored vs the day's normal, surfaces record-broken + previous record on any past date, and a Then-vs-Now comparing decades 100 years apart relative to the viewed year.

**Architecture:** Frontend-only. `DayView` self-owns a `selectedDate`; a new `DateNav` component handles stepping + the native date picker. All values come from the existing `thisday/MMDD.json` (per-year series + all-time records), `daynorm` (mean normal), and live Open-Meteo; Then-vs-Now decades + previous-record are computed client-side. Month/Year modes and other tabs unchanged.

**Tech Stack:** React 18 + Vite + TS, Tailwind v4, Recharts, lucide-react, Vitest.

## Global Constraints

- **Frontend-only**, no pipeline/data change. Existing tests stay green; new logic TDD'd; tests pristine (Recharts `ResponsiveContainer` mocked).
- Date bounds: `MIN = 1833-01-01`, `MAX = today` (local). No future / pre-1833 dates. ◀ disabled at MIN, ▶ at MAX; stepping ±1 day crosses month/year.
- Date display: `weekday · ordinalDay · monthFull · year` (e.g. "Monday · 28th · June · 2026"), from a real local `Date`.
- Two temps, same row, **equal font size**: Max first, then **Current** (real today) / **Min** (past date). Real-today source = live (`tmax`, `temp`); past = `series.find(year)` (`tmax`,`tmin`); year missing → "No data for this date." and no temp pair.
- **Color per temperature** vs 1991-2020 **mean** DOY normal for the mmdd: `v−normal > 2` → `text-warm`; `< −2` → `text-accent`; within ±2 (or normal null) → `text-fg`. (Accepted caveat: max usually red, min usually blue.)
- **Records** Record High + Record Low rendered **side-by-side `grid-cols-2` at all widths**, each a clickable button → navigate DayView to `(record.year, mmdd)`. When viewed date's year == record year → banner "Record high/low for this date!" + previous record (`previousRecordHigh/Low`), omit "previous" if no earlier year.
- **Then vs Now** relative to viewed `year`: recent `[year-11 … year-1]`, then `[year-111 … year-101]`; means of daily `(tmax+tmin)/2` from the series, 1 dp; **hide the row when the then-window mean is null**.
- Keep the per-year High/Low `PeriodScatter` and a "Nth warmest on this date in N years" line in the hero.
- Heading "This Day in History" stays in Day mode (App.test depends on it).

---

## File Structure
```
src/lib/format.ts        # + fmtWeekday, ordinalDay, isoOf
src/lib/dayStats.ts (NEW)# decadeMean, previousRecordHigh, previousRecordLow, tempColor
src/lib/dayStats.test.ts (NEW)
src/components/DateNav.tsx (NEW)     # ◀ label ▶ + calendar date picker
src/components/DateNav.test.tsx (NEW)
src/tabs/today/DayView.tsx           # rewrite: self-managed specific date
src/tabs/today/DayView.test.tsx      # rewrite
src/tabs/Today.tsx                    # Day mode: render <DayView/>, drop external Day stepper
src/tabs/Today.test.tsx               # adjust mock if needed
```

---

### Task 1: lib helpers (format + dayStats)

**Files:** Modify `src/lib/format.ts`; Create `src/lib/dayStats.ts`, `src/lib/dayStats.test.ts`; Test `src/lib/format.test.ts`

**Interfaces:**
- Produces (format): `fmtWeekday(d: Date): string` ("Monday"); `ordinalDay(n: number): string` ("1st"); `isoOf(d: Date): string` (local "YYYY-MM-DD").
- Produces (dayStats): type `Daily = { year: number; tmax: number; tmin: number }`; `decadeMean(series: Daily[], from: number, to: number): number | null` (mean of (tmax+tmin)/2 in [from,to], 1 dp); `previousRecordHigh(series, year): { v: number; year: number } | null` (max tmax among years < year); `previousRecordLow(series, year)` (min tmin among years < year); `tempColor(v: number | null, normal: number | null): 'text-warm'|'text-accent'|'text-fg'`.

- [ ] **Step 1: Write failing tests**

Append to `src/lib/format.test.ts` (add `fmtWeekday, ordinalDay, isoOf` to the import):
```ts
import { fmtWeekday, ordinalDay, isoOf } from './format'
describe('date helpers', () => {
  it('fmtWeekday / ordinalDay / isoOf', () => {
    expect(fmtWeekday(new Date(2026, 5, 28))).toBe('Sunday')   // 2026-06-28 is a Sunday
    expect(ordinalDay(1)).toBe('1st'); expect(ordinalDay(28)).toBe('28th')
    expect(isoOf(new Date(2026, 0, 3))).toBe('2026-01-03')
  })
})
```
Create `src/lib/dayStats.test.ts`:
```ts
import { decadeMean, previousRecordHigh, previousRecordLow, tempColor } from './dayStats'

const series = [
  { year: 1900, tmax: 10, tmin: 0 },   // mean 5
  { year: 1905, tmax: 14, tmin: 2 },   // mean 8
  { year: 2000, tmax: 20, tmin: 8 },   // mean 14
  { year: 2005, tmax: 22, tmin: 10 },  // mean 16
]

test('decadeMean averages (tmax+tmin)/2 within window, null when empty', () => {
  expect(decadeMean(series, 1900, 1905)).toBe(6.5)   // (5+8)/2
  expect(decadeMean(series, 1700, 1800)).toBeNull()
})
test('previousRecordHigh = max tmax among years before the given year', () => {
  expect(previousRecordHigh(series, 2005)).toEqual({ v: 20, year: 2000 })
  expect(previousRecordHigh(series, 1900)).toBeNull()
})
test('previousRecordLow = min tmin among years before the given year', () => {
  expect(previousRecordLow(series, 2005)).toEqual({ v: 0, year: 1900 })
  expect(previousRecordLow(series, 1900)).toBeNull()
})
test('tempColor thresholds vs normal ±2', () => {
  expect(tempColor(20, 15)).toBe('text-warm')   // +5
  expect(tempColor(10, 15)).toBe('text-accent') // -5
  expect(tempColor(16, 15)).toBe('text-fg')     // +1
  expect(tempColor(null, 15)).toBe('text-fg')
  expect(tempColor(20, null)).toBe('text-fg')
})
```

- [ ] **Step 2: Run to verify fail** → `npm test -- format dayStats` FAIL.

- [ ] **Step 3: Implement**

Append to `src/lib/format.ts`:
```ts
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const fmtWeekday = (d: Date): string => WEEKDAYS[d.getDay()]
export const ordinalDay = (n: number): string => ordinal(n)
export const isoOf = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
```
Create `src/lib/dayStats.ts`:
```ts
export type Daily = { year: number; tmax: number; tmin: number }

export function decadeMean(series: Daily[], from: number, to: number): number | null {
  const vals = series.filter(s => s.year >= from && s.year <= to).map(s => (s.tmax + s.tmin) / 2)
  if (!vals.length) return null
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
}

export function previousRecordHigh(series: Daily[], year: number): { v: number; year: number } | null {
  const before = series.filter(s => s.year < year)
  if (!before.length) return null
  const r = before.reduce((m, s) => (s.tmax > m.tmax ? s : m))
  return { v: r.tmax, year: r.year }
}

export function previousRecordLow(series: Daily[], year: number): { v: number; year: number } | null {
  const before = series.filter(s => s.year < year)
  if (!before.length) return null
  const r = before.reduce((m, s) => (s.tmin < m.tmin ? s : m))
  return { v: r.tmin, year: r.year }
}

export function tempColor(v: number | null, normal: number | null): 'text-warm' | 'text-accent' | 'text-fg' {
  if (v == null || normal == null) return 'text-fg'
  const d = v - normal
  return d > 2 ? 'text-warm' : d < -2 ? 'text-accent' : 'text-fg'
}
```

- [ ] **Step 4: Run to verify pass** → `npm test -- format dayStats` PASS; `npm run build` clean.
- [ ] **Step 5: Commit** → `git add -A && git commit -m "feat(lib): date helpers + dayStats (decadeMean, prev records, tempColor)"`

### Task 2: `DateNav` component

**Files:** Create `src/components/DateNav.tsx`, `src/components/DateNav.test.tsx`

**Interfaces:**
- Consumes: `fmtWeekday`, `ordinalDay`, `fmtMonth`, `isoOf` (Task 1 / existing).
- Produces: `<DateNav date={Date} min={Date} max={Date} onChange={(d: Date) => void} />`. Renders the date label, ◀/▶ (step ±1 day, clamped, disabled at bounds), and a calendar-icon button wrapping a native `<input type="date">` (aria-label "Pick a date", min/max bounded) that calls `onChange`.

- [ ] **Step 1: Write failing test** `src/components/DateNav.test.tsx`
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import DateNav from './DateNav'

test('shows label, steps days within bounds, picks a date', () => {
  const onChange = vi.fn()
  const date = new Date(2026, 5, 28)            // Sun 28 Jun 2026
  const min = new Date(1833, 0, 1), max = new Date(2026, 5, 28)
  render(<DateNav date={date} min={min} max={max} onChange={onChange} />)
  expect(screen.getByText(/Sunday · 28th · June · 2026/)).toBeInTheDocument()
  // next is disabled at max
  expect(screen.getByLabelText('Next day')).toBeDisabled()
  fireEvent.click(screen.getByLabelText('Previous day'))
  expect(onChange).toHaveBeenCalled()
  expect((onChange.mock.calls[0][0] as Date).getDate()).toBe(27)
  // date picker
  fireEvent.change(screen.getByLabelText('Pick a date'), { target: { value: '2000-01-15' } })
  expect((onChange.mock.calls.at(-1)![0] as Date).getFullYear()).toBe(2000)
})
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement** `src/components/DateNav.tsx`
```tsx
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { fmtWeekday, ordinalDay, fmtMonth, isoOf } from '../lib/format'

export default function DateNav({ date, min, max, onChange }: {
  date: Date; min: Date; max: Date; onChange: (d: Date) => void
}) {
  const iso = isoOf(date)
  const prevDisabled = iso <= isoOf(min)
  const nextDisabled = iso >= isoOf(max)
  const step = (delta: number) => {
    const d = new Date(date); d.setDate(d.getDate() + delta)
    if (isoOf(d) >= isoOf(min) && isoOf(d) <= isoOf(max)) onChange(d)
  }
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const label = `${fmtWeekday(date)} · ${ordinalDay(date.getDate())} · ${fmtMonth(mm)} · ${date.getFullYear()}`
  return (
    <div className="flex items-center justify-between gap-2">
      <button type="button" aria-label="Previous day" onClick={() => step(-1)} disabled={prevDisabled}
        className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:text-fg disabled:opacity-40">
        <ChevronLeft size={18} />
      </button>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{label}</span>
        <label className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-border text-muted hover:text-fg">
          <Calendar size={16} aria-hidden />
          <input type="date" className="sr-only" aria-label="Pick a date" value={iso} min={isoOf(min)} max={isoOf(max)}
            onChange={e => { if (e.target.value) onChange(new Date(e.target.value + 'T00:00:00')) }} />
        </label>
      </div>
      <button type="button" aria-label="Next day" onClick={() => step(1)} disabled={nextDisabled}
        className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:text-fg disabled:opacity-40">
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify pass** → `npm test -- DateNav` PASS; `npm run build` clean.
- [ ] **Step 5: Commit** → `git add -A && git commit -m "feat(ui): DateNav (day stepper + calendar picker)"`

### Task 3: `DayView` rewrite (specific-date hero)

**Files:** Rewrite `src/tabs/today/DayView.tsx`, `src/tabs/today/DayView.test.tsx`

**Interfaces:**
- Consumes: `useThisDay`, `useTodayTemp`, `useDayNorm`, `DateNav`, dayStats (`decadeMean`/`previousRecordHigh`/`previousRecordLow`/`tempColor`), `rankOf`, `fmtTemp`/`mmddOf`/`isoOf`/`todayISO`/`ordinal`, `PeriodScatter`, `Loading`/`ErrorState`.
- Produces: `<DayView />` (no props; self-managed date).

- [ ] **Step 1: Write failing test** `src/tabs/today/DayView.test.tsx`
```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import DayView from './DayView'

vi.mock('recharts', async (o) => { const a = await o<typeof import('recharts')>()
  return { ...a, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 800, height: 300 }}>{children}</div> } })

// thisday for 06-28: record high held by 1955, with earlier years present
const thisday = { mmdd: '0628', recordHigh: { v: 34.8, year: 1955 }, recordLow: { v: 4.1, year: 1923 },
  series: [
    { year: 1923, tmax: 20, tmin: 4.1 }, { year: 1925, tmax: 22, tmin: 6 },
    { year: 1955, tmax: 34.8, tmin: 12 }, { year: 2015, tmax: 30, tmin: 16 },
    { year: 2020, tmax: 31, tmin: 17 }, { year: 2024, tmax: 29, tmin: 15 },
  ],
  thenNow: { early: { from: 1833, to: 1900, mean: 18 }, recent: { from: 1996, to: 2025, mean: 21 } } }
const daynorm = { '1991-2020': [{ doy: 180, mmdd: '0628', normal: 24, p10: 18, p90: 30 }], '1961-1990': [] }
const live = { current: { time: '2026-06-28T12:00', temperature_2m: 27 }, daily: { time: ['2026-06-28'], temperature_2m_max: [29], temperature_2m_min: [16] } }

function routeFetch(u: string) {
  if (u.includes('open-meteo')) return live
  if (u.includes('daynorm')) return daynorm
  return thisday
}
afterEach(() => vi.unstubAllGlobals())

test('today shows max + current, both colored, date line', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () => routeFetch(u) })))
  render(<DayView />)
  await waitFor(() => expect(screen.getByText('29.0 °C')).toBeInTheDocument()) // max
  expect(screen.getByText('27.0 °C')).toBeInTheDocument()                      // current
  expect(screen.getByText('current')).toBeInTheDocument()
})

test('navigating to the record year shows the record-broken banner + previous record, and records are clickable', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () => routeFetch(u) })))
  render(<DayView />)
  await waitFor(() => screen.getByLabelText('Pick a date'))
  // jump to 1955-06-28 (the record-high year)
  fireEvent.change(screen.getByLabelText('Pick a date'), { target: { value: '1955-06-28' } })
  await waitFor(() => expect(screen.getByText(/Record high for this date/i)).toBeInTheDocument())
  expect(screen.getByText(/Previous: 22.0 °C \(1925\)/)).toBeInTheDocument()
  expect(screen.getByText('34.8 °C')).toBeInTheDocument()  // max from series for 1955
  expect(screen.getByText('min')).toBeInTheDocument()       // past date → min, not current
})

test('then-vs-now uses viewed-year-relative 100yr decades', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () => routeFetch(u) })))
  render(<DayView />)
  await waitFor(() => screen.getByLabelText('Pick a date'))
  fireEvent.change(screen.getByLabelText('Pick a date'), { target: { value: '2025-06-28' } })
  // recent = 2014..2024 (series: 2015,2020,2024), then = 1914..1924 (series: 1923)
  await waitFor(() => expect(screen.getByText(/1914–1924/)).toBeInTheDocument())
  expect(screen.getByText(/2014–2024/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement** `src/tabs/today/DayView.tsx`
```tsx
import { useState } from 'react'
import { Flame, Snowflake } from 'lucide-react'
import { useThisDay } from '../../data/useThisDay'
import { useTodayTemp } from '../../data/useTodayTemp'
import { useDayNorm } from '../../data/useDayNorm'
import { fmtTemp, mmddOf, isoOf, todayISO, ordinal } from '../../lib/format'
import { rankOf } from '../../lib/stats'
import { decadeMean, previousRecordHigh, previousRecordLow, tempColor } from '../../lib/dayStats'
import { Loading, ErrorState } from '../../components/States'
import DateNav from '../../components/DateNav'
import PeriodScatter from '../../components/PeriodScatter'

const MIN = new Date(1833, 0, 1)
const midnight = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }

export default function DayView() {
  const [date, setDate] = useState<Date>(() => midnight(new Date()))
  const max = midnight(new Date())
  const mmdd = mmddOf(date)
  const year = date.getFullYear()
  const isReal = isoOf(date) === todayISO()

  const { data, loading, error } = useThisDay(mmdd)
  const live = useTodayTemp()
  const dayNorm = useDayNorm()
  if (loading) return <Loading label="Loading day…" />
  if (error || !data) return <ErrorState label="Could not load this date." />

  const normal = dayNorm.data?.['1991-2020']?.find(n => n.mmdd === mmdd)?.normal ?? null
  const entry = data.series.find(s => s.year === year)

  let maxV: number | null = null, secondV: number | null = null, secondLabel = 'min'
  if (isReal && live.data) { maxV = live.data.tmax; secondV = live.data.temp; secondLabel = 'current' }
  else if (entry) { maxV = entry.tmax; secondV = entry.tmin; secondLabel = 'min' }

  const brokeHigh = entry != null && data.recordHigh.year === year
  const brokeLow = entry != null && data.recordLow.year === year
  const prevHigh = brokeHigh ? previousRecordHigh(data.series, year) : null
  const prevLow = brokeLow ? previousRecordLow(data.series, year) : null

  const r = maxV != null ? rankOf(maxV, data.series.map(s => s.tmax)) : null

  const recentFrom = year - 11, recentTo = year - 1
  const thenFrom = year - 111, thenTo = year - 101
  const recentMean = decadeMean(data.series, recentFrom, recentTo)
  const thenMean = decadeMean(data.series, thenFrom, thenTo)

  const goToYear = (y: number) => setDate(midnight(new Date(y, date.getMonth(), date.getDate())))

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-5">
        <DateNav date={date} min={MIN} max={max} onChange={d => setDate(midnight(d))} />
        {maxV != null ? (
          <div className="mt-4 flex items-end gap-6">
            <div>
              <span className={`text-[40px] font-extrabold leading-none ${tempColor(maxV, normal)}`}>{fmtTemp(maxV)}</span>
              <p className="mt-1 text-xs text-muted">max</p>
            </div>
            {secondV != null && (
              <div>
                <span className={`text-[40px] font-extrabold leading-none ${tempColor(secondV, normal)}`}>{fmtTemp(secondV)}</span>
                <p className="mt-1 text-xs text-muted">{secondLabel}</p>
              </div>
            )}
          </div>
        ) : <p className="mt-4 text-sm text-muted">No data for this date.</p>}

        {(brokeHigh || brokeLow) && (
          <p className={`mt-3 flex items-center gap-2 text-sm font-semibold ${brokeHigh ? 'text-warm' : 'text-accent'}`}>
            {brokeHigh ? <Flame size={16} aria-hidden /> : <Snowflake size={16} aria-hidden />}
            <span>
              {brokeHigh ? 'Record high for this date!' : 'Record low for this date!'}
              {brokeHigh && prevHigh && ` Previous: ${fmtTemp(prevHigh.v)} (${prevHigh.year})`}
              {brokeLow && prevLow && ` Previous: ${fmtTemp(prevLow.v)} (${prevLow.year})`}
            </span>
          </p>
        )}

        {r && <p className="mt-3 inline-block rounded-full bg-badge-bg px-3 py-1 text-xs font-semibold text-badge-fg">
          {ordinal(r.rank)} warmest on this date in {r.total} years</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => goToYear(data.recordHigh.year)}
          className="rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-warm">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Record high</p>
          <p className="mt-1 text-lg font-bold text-warm">{fmtTemp(data.recordHigh.v)}</p>
          <p className="text-xs text-muted">{data.recordHigh.year}</p>
        </button>
        <button type="button" onClick={() => goToYear(data.recordLow.year)}
          className="rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-accent">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Record low</p>
          <p className="mt-1 text-lg font-bold text-accent">{fmtTemp(data.recordLow.v)}</p>
          <p className="text-xs text-muted">{data.recordLow.year}</p>
        </button>
      </div>

      {thenMean != null && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Then vs now</p>
          <p className="mt-1 text-sm">
            {fmtTemp(thenMean)} <span className="text-muted">({thenFrom}–{thenTo})</span>
            {' → '}<strong>{fmtTemp(recentMean)}</strong> <span className="text-muted">({recentFrom}–{recentTo})</span>
          </p>
        </div>
      )}

      <PeriodScatter title="Every year on this date"
        data={data.series}
        series={[{ key: 'tmax', name: 'High', color: 'var(--warm)' }, { key: 'tmin', name: 'Low', color: 'var(--accent)' }]} />
    </div>
  )
}
```

- [ ] **Step 4: Run to verify pass** → `npm test -- DayView` PASS; full `npm test` green; `npm run build` clean.
- [ ] **Step 5: Commit** → `git add -A && git commit -m "feat(today): specific-date DayView (date nav, colored temps, records, then-now)"`

### Task 4: Wire `Today` (Day mode = self-managed DayView)

**Files:** Modify `src/tabs/Today.tsx`, `src/tabs/Today.test.tsx`

**Interfaces:** Day mode renders `<DayView/>` (no props) with NO external stepper; Month/Year keep their stepper + the mode toggle + headings.

- [ ] **Step 1: Update `src/tabs/Today.tsx`**

Remove the Day-specific `mmdd`/`setMmdd`/`stepDay` state and the `CAL` constant (no longer used). Render the external stepper only for month/year, and `<DayView/>` (no props) for day:
```tsx
import { useState } from 'react'
import DayView from './today/DayView'
import MonthView from './today/MonthView'
import YearView from './today/YearView'
import Stepper from '../components/Stepper'
import { useSummary } from '../data/useSummary'
import { fmtMonth } from '../lib/format'

type Mode = 'day' | 'month' | 'year'
const MODES: Mode[] = ['day', 'month', 'year']
const HEADINGS: Record<Mode, string> = { day: 'This Day in History', month: 'This Month in History', year: 'This Year in History' }

export default function Today() {
  const { summary } = useSummary()
  const now = new Date()
  const [mode, setMode] = useState<Mode>('day')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState<number | null>(null)

  const years = summary?.annual?.map(a => a.year) ?? []
  const minYear = years.length ? Math.min(...years) : 1833
  const maxYear = years.length ? Math.max(...years) : now.getFullYear()
  const selYear = year ?? maxYear
  const mm = String(month).padStart(2, '0')

  const stepMonth = (d: number) => setMonth(((month - 1 + d + 12) % 12) + 1)
  const stepYear = (d: number) => setYear(Math.min(maxYear, Math.max(minYear, selYear + d)))

  return (
    <section className="fade-in space-y-4">
      <h2 className="text-2xl font-extrabold tracking-tight">{HEADINGS[mode]}</h2>

      <div className="inline-flex rounded-lg border border-border bg-surface p-1 text-sm" role="radiogroup" aria-label="Granularity">
        {MODES.map(m => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
            className={`rounded-md px-3 py-1.5 capitalize ${mode === m ? 'bg-accent-soft font-semibold text-accent' : 'text-muted'}`}>{m}</button>
        ))}
      </div>

      {mode === 'month' && <div className="rounded-xl border border-border bg-surface p-2">
        <Stepper label={fmtMonth(mm)} onPrev={() => stepMonth(-1)} onNext={() => stepMonth(1)} unit="month" /></div>}
      {mode === 'year' && <div className="rounded-xl border border-border bg-surface p-2">
        <Stepper label={String(selYear)} onPrev={() => stepYear(-1)} onNext={() => stepYear(1)} prevDisabled={selYear <= minYear} nextDisabled={selYear >= maxYear} unit="year" /></div>}

      {mode === 'day' && <DayView />}
      {mode === 'month' && <MonthView mm={mm} currentYear={now.getFullYear()} />}
      {mode === 'year' && <YearView year={selYear} />}
    </section>
  )
}
```

- [ ] **Step 2: Update `src/tabs/Today.test.tsx`**

Ensure the fetch mock covers DayView's hooks (thisday + open-meteo + daynorm) so Day mode renders. Use a `routeFetch` that branches on `open-meteo` / `daynorm` / `month` / `summary` and defaults to a thisday fixture. Keep the existing assertions: default Day heading "This Day in History" present; clicking the Month radio shows "This Month in History". Full replacement:
```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import Today from './Today'

vi.mock('recharts', async (o) => { const a = await o<typeof import('recharts')>()
  return { ...a, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 800, height: 300 }}>{children}</div> } })

const thisday = { mmdd: '0628', recordHigh: { v: 34.8, year: 1955 }, recordLow: { v: 4.1, year: 1923 },
  series: [{ year: 2020, tmax: 31, tmin: 17 }], thenNow: { early: { from: 1833, to: 1900, mean: 18 }, recent: { from: 1996, to: 2025, mean: 21 } } }
const daynorm = { '1991-2020': [{ doy: 180, mmdd: '0628', normal: 24, p10: 18, p90: 30 }], '1961-1990': [] }
const month = { mm: '06', series: [{ year: 2020, mean: 19, complete: true }], recordWarm: { year: 2020, v: 19 }, recordCold: { year: 2020, v: 19 }, normal: 17, thenNow: { early: { from: 1833, to: 1900, mean: 15 }, recent: { from: 1996, to: 2025, mean: 18 } } }
const summary = { station: {}, baselines: { '1991-2020': 10, '1961-1990': 10 }, annual: [{ year: 2026, mean: 11, tmin: 6, tmax: 16, incomplete: true }, { year: 2025, mean: 12, tmin: 7, tmax: 17, incomplete: false }],
  anomaly: { '1991-2020': [], '1961-1990': [] }, decadal: [], warmingRate: { full: 0, last30: 0 }, records: { year: 2026, highs: 0, lows: 0 },
  extremes: { warmest: [], coldest: [] }, counters: { SU: [], hot30: [], TR: [], FD: [], ID: [], heatwaveDays: [], gsl: [] }, rankings: { warmest: [{ year: 2025, mean: 12 }], coldest: [{ year: 2025, mean: 12 }] } }
const live = { current: { time: '2026-06-28T12:00', temperature_2m: 27 }, daily: { time: ['2026-06-28'], temperature_2m_max: [29], temperature_2m_min: [16] } }

function routeFetch(u: string) {
  if (u.includes('open-meteo')) return live
  if (u.includes('daynorm')) return daynorm
  if (u.includes('/month/')) return month
  if (u.includes('summary.json')) return summary
  return thisday
}
afterEach(() => vi.unstubAllGlobals())

test('defaults to Day mode with heading and switches to Month', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () => routeFetch(u) })))
  render(<Today />)
  expect(screen.getByRole('heading', { name: /this day in history/i })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('radio', { name: /month/i }))
  await waitFor(() => expect(screen.getByRole('heading', { name: /this month in history/i })).toBeInTheDocument())
})
```

- [ ] **Step 3: Run tests + build** → `npm test` all green + pristine (App.test "This Day in History" still passes); `VITE_BASE=/uccle-climate/ npm run build` clean.
- [ ] **Step 4: Commit** → `git add -A && git commit -m "feat(today): day mode uses self-managed DayView; drop external day stepper"`

### Task 5: Deploy + independent live verification

(Controller-run after Tasks 1–4 merge to main, push, CI deploy.) Then independent verification agents check the **live site** `https://jdelsoir.github.io/uccle-climate/`:
- **Code shipped:** fetch the live JS bundle; confirm new markers (e.g. "Previous day", "Pick a date", weekday separators) present and old MMDD-stepper gone.
- **Behavior/data:** fetch live `thisday/MMDD.json` + `daynorm.json` for sampled dates; recompute the hero's Max/Min, the temp colors (vs mean normal ±2), record-broken + previous record (e.g. for the record-high date), and the Then-vs-Now windows ([Y-11..Y-1] vs [Y-111..Y-101]); confirm they match the component formulas in this plan.
- **A11y/layout:** confirm DateNav controls have accessible names (Previous day / Next day / Pick a date), records grid is 2-col, no console-noise, responsive column intact.
- Output findings; dispatch ONE fix wave for any Critical/Important; re-verify.

---

## Self-Review

**Spec coverage:** §3 state/nav → Task 2 (DateNav) + Task 3 (DayView state) + Task 4 (wiring, drop stepper). §4 date display → Task 1 (fmtWeekday/ordinalDay) + DateNav label. §5 two temps + color → Task 1 (tempColor) + Task 3. §6 records side-by-side/clickable/record-broken → Task 1 (prev records) + Task 3. §7 then-vs-now → Task 1 (decadeMean) + Task 3. §8 keep scatter + rank → Task 3. §9 files → Tasks 1–4. §10 testing → each task TDD. §11 verification → Task 5. ✓

**Placeholder scan:** none — every code step is complete.

**Type consistency:** `Daily`/`decadeMean`/`previousRecordHigh/Low`/`tempColor` (Task 1) consumed in Task 3. `DateNav` props `{date,min,max,onChange}` (Task 2) used in Task 3. `fmtWeekday`/`ordinalDay`/`isoOf` (Task 1) used in DateNav. `mmddOf`/`todayISO`/`ordinal`/`fmtTemp` already exist. `useThisDay(mmdd)` returns `{data,error,loading}`; `useTodayTemp()` → `{data:{temp,tmax,tmin}}`; `useDayNorm().data['1991-2020']` entries `{mmdd,normal}`. DayView default export takes no props; Today renders `<DayView/>`. Heading "This Day in History" preserved.

**Fix applied inline:** none needed.
