# Today Tab Redesign (Day / Month / Year) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Today tab's Day screen to the approved mockup and adapt Month and Year to the same layout, using four shared components, with a shared header (Today + ◀▶ + underline tabs).

**Architecture:** `Today.tsx` owns the cursor for every mode (day `Date`, month, year) and renders the shared header; `DayView`/`MonthView`/`YearView` are controlled. Four pure shared components — `CalendarTile`, `RangeBar`, `StatCard`, `WarmingStrip` — compose every hero. Native date picker stays reachable via the day `CalendarTile`.

**Tech Stack:** React 18 + TypeScript, Tailwind v4 (tokens in `src/index.css`), Vitest + Testing Library, lucide-react, Recharts (unchanged).

## Global Constraints

- **Tokens, not hex** — `--cal-header`, `text-warm`/`text-accent`/`text-fg`/`text-muted`/`bg-surface`/`bg-surface-2`/`border-border`/`bg-badge-bg`/`text-badge-fg`. No literal hex in components.
- **No PII** anywhere.
- **a11y:** single-select toggles use `role="radiogroup"`/`role="radio"`+`aria-checked`; every control has an accessible name; decorative glyphs `aria-hidden`; range visual gets `role="img"` + text summary.
- **Tests:** mock Recharts `ResponsiveContainer`; test files that stub `fetch` add `afterEach(() => vi.unstubAllGlobals())`; avoid date-coupled fixtures (derive from real `new Date()` only via past-dated navigation).
- **Commits** end with: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **No data-pipeline / JSON changes.** All values come from existing `thisday`/`daynorm`/`month`/`summary` data + live `useTodayTemp`.

---

### Task 1: Shared components (CalendarTile, RangeBar, StatCard, WarmingStrip)

Four pure, presentational components. No app wiring; fully unit-tested in isolation.

**Files:**
- Create: `src/components/CalendarTile.tsx`, `src/components/RangeBar.tsx`, `src/components/StatCard.tsx`, `src/components/WarmingStrip.tsx`
- Test: `src/components/CalendarTile.test.tsx`, `src/components/RangeBar.test.tsx`, `src/components/StatCard.test.tsx`, `src/components/WarmingStrip.test.tsx`

**Interfaces (Produces — later tasks rely on these):**
- `CalendarTile({ header, body, footer?, onClick?, ariaLabel? }: { header: string; body: string|number; footer?: string; onClick?: () => void; ariaLabel?: string })` — `<button>` when `onClick` set (with `ariaLabel`, `aria-haspopup="dialog"`), else static `<div>`.
- `rangePct(v: number, lo: number, hi: number): number` (named export from RangeBar) and `RangeBar({ min, max, markers, summary }: { min: {v:number,label:string}; max: {v:number,label:string}; markers: {v:number,label:string,kind:'tick'|'dot'|'diamond',color?:string}[]; summary: string })`.
- `StatCard({ label, value, sub?, valueClass?, onClick? }: { label: string; value: string; sub?: string; valueClass?: string; onClick?: () => void })`.
- `WarmingStrip({ label, then, recent, delta }: { label: string; then: {mean:number,from:number,to:number}; recent: {mean:number,from:number,to:number}; delta: number })`.

- [ ] **Step 1: Write the failing tests**

`src/components/CalendarTile.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import CalendarTile from './CalendarTile'

test('renders header, body, footer', () => {
  render(<CalendarTile header="JUNE" body={29} footer="MONDAY" />)
  expect(screen.getByText('JUNE')).toBeInTheDocument()
  expect(screen.getByText('29')).toBeInTheDocument()
  expect(screen.getByText('MONDAY')).toBeInTheDocument()
})

test('is a button with accessible name when onClick set, and fires', () => {
  const onClick = vi.fn()
  render(<CalendarTile header="JUNE" body={29} onClick={onClick} ariaLabel="Change date" />)
  const btn = screen.getByRole('button', { name: 'Change date' })
  fireEvent.click(btn)
  expect(onClick).toHaveBeenCalled()
})

test('is not a button when onClick omitted', () => {
  render(<CalendarTile header="JUNE" body="2026" />)
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
```

`src/components/RangeBar.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import RangeBar, { rangePct } from './RangeBar'

test('rangePct maps and clamps', () => {
  expect(rangePct(5, 0, 10)).toBe(50)
  expect(rangePct(0, 0, 10)).toBe(0)
  expect(rangePct(10, 0, 10)).toBe(100)
  expect(rangePct(-5, 0, 10)).toBe(0)     // clamp low
  expect(rangePct(99, 0, 10)).toBe(100)   // clamp high
  expect(rangePct(5, 5, 5)).toBe(50)      // zero-width → midpoint
})

test('renders end-cap labels, marker labels, and an aria summary', () => {
  render(<RangeBar
    min={{ v: 5.3, label: '5.3° record low' }}
    max={{ v: 32.6, label: '32.6° record high' }}
    markers={[{ v: 17.9, label: 'avg 17.9°', kind: 'tick' }, { v: 26.8, label: 'high 26.8°', kind: 'diamond' }]}
    summary="High 26.8°, avg 17.9°, between 5.3° low and 32.6° high record" />)
  expect(screen.getByText('5.3° record low')).toBeInTheDocument()
  expect(screen.getByText('32.6° record high')).toBeInTheDocument()
  expect(screen.getByText('avg 17.9°')).toBeInTheDocument()
  expect(screen.getByRole('img', { name: /between 5.3° low and 32.6° high record/ })).toBeInTheDocument()
})
```

`src/components/StatCard.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import StatCard from './StatCard'

test('renders label, value, sub and applies valueClass', () => {
  render(<StatCard label="RECORD HIGH" value="32.6 °C" sub="1957" valueClass="text-warm" />)
  expect(screen.getByText('RECORD HIGH')).toBeInTheDocument()
  const v = screen.getByText('32.6 °C')
  expect(v).toHaveClass('text-warm')
  expect(screen.getByText('1957')).toBeInTheDocument()
})

test('is a button that fires when onClick set', () => {
  const onClick = vi.fn()
  render(<StatCard label="RECORD HIGH" value="32.6 °C" onClick={onClick} />)
  fireEvent.click(screen.getByRole('button', { name: /RECORD HIGH/ }))
  expect(onClick).toHaveBeenCalled()
})
```

`src/components/WarmingStrip.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import WarmingStrip from './WarmingStrip'

test('renders then/recent means, ranges, and signed delta', () => {
  render(<WarmingStrip label="A warming June 29"
    then={{ mean: 15.7, from: 1915, to: 1925 }}
    recent={{ mean: 19.3, from: 2015, to: 2025 }} delta={3.6} />)
  expect(screen.getByText('A warming June 29')).toBeInTheDocument()
  expect(screen.getByText('15.7 °C')).toBeInTheDocument()
  expect(screen.getByText('19.3 °C')).toBeInTheDocument()
  expect(screen.getByText('1915–1925')).toBeInTheDocument()
  expect(screen.getByText('2015–2025')).toBeInTheDocument()
  expect(screen.getByText('+3.6 °C')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/CalendarTile.test.tsx src/components/RangeBar.test.tsx src/components/StatCard.test.tsx src/components/WarmingStrip.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the four components**

`src/components/CalendarTile.tsx`:
```tsx
export default function CalendarTile({ header, body, footer, onClick, ariaLabel }: {
  header: string; body: string | number; footer?: string; onClick?: () => void; ariaLabel?: string
}) {
  const inner = (
    <>
      <span aria-hidden className="absolute -top-1 left-[34%] z-10 h-3 w-1.5 -translate-x-1/2 rounded-full bg-muted" />
      <span aria-hidden className="absolute -top-1 left-[66%] z-10 h-3 w-1.5 -translate-x-1/2 rounded-full bg-muted" />
      <span className="block overflow-hidden rounded-xl border border-border shadow-md">
        <span className="block bg-cal-header py-1 text-center text-[11px] font-bold leading-none tracking-wide text-white">{header}</span>
        <span className="block bg-surface px-2 pt-2 pb-2">
          <span className="block text-center text-3xl font-extrabold leading-none text-fg">{body}</span>
          {footer && <span className="mt-1 block text-center text-[10px] font-semibold uppercase tracking-wide text-muted">{footer}</span>}
        </span>
      </span>
    </>
  )
  if (onClick) return (
    <button type="button" aria-label={ariaLabel} aria-haspopup="dialog" onClick={onClick}
      className="relative w-20 shrink-0 transition-transform hover:-translate-y-0.5 focus-visible:-translate-y-0.5">{inner}</button>
  )
  return <div className="relative w-20 shrink-0">{inner}</div>
}
```

`src/components/RangeBar.tsx`:
```tsx
export function rangePct(v: number, lo: number, hi: number): number {
  if (hi === lo) return 50
  return Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100))
}

type Marker = { v: number; label: string; kind: 'tick' | 'dot' | 'diamond'; color?: string }

export default function RangeBar({ min, max, markers, summary }: {
  min: { v: number; label: string }; max: { v: number; label: string }; markers: Marker[]; summary: string
}) {
  return (
    <div role="img" aria-label={summary} className="select-none">
      <div className="relative h-5">
        {markers.map((m, i) => (
          <span key={i} aria-hidden style={{ left: `${rangePct(m.v, min.v, max.v)}%` }}
            className="absolute -translate-x-1/2 whitespace-nowrap text-[11px] text-muted">{m.label}</span>
        ))}
      </div>
      <div className="relative h-2 rounded-full bg-surface-2 ring-1 ring-border">
        {markers.map((m, i) => {
          const left = `${rangePct(m.v, min.v, max.v)}%`
          if (m.kind === 'tick') return <span key={i} aria-hidden style={{ left }} className="absolute top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-muted" />
          if (m.kind === 'diamond') return <span key={i} aria-hidden style={{ left }} className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-warm" />
          return <span key={i} aria-hidden style={{ left }} className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg" />
        })}
      </div>
      <div className="mt-1 flex justify-between text-xs">
        <span className="text-accent">{min.label}</span>
        <span className="text-warm">{max.label}</span>
      </div>
    </div>
  )
}
```

`src/components/StatCard.tsx`:
```tsx
export default function StatCard({ label, value, sub, valueClass = 'text-fg', onClick }: {
  label: string; value: string; sub?: string; valueClass?: string; onClick?: () => void
}) {
  const body = (
    <>
      <p className="text-[11px] uppercase tracking-[0.09em] text-muted">{label}</p>
      <p className={`mt-1 text-lg font-bold ${valueClass}`}>{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </>
  )
  const cls = 'rounded-xl border border-border bg-surface p-4'
  if (onClick) return (
    <button type="button" onClick={onClick} className={`${cls} text-left transition-colors hover:border-warm`}>{body}</button>
  )
  return <div className={cls}>{body}</div>
}
```

`src/components/WarmingStrip.tsx`:
```tsx
import { fmtTemp } from '../lib/format'

export default function WarmingStrip({ label, then, recent, delta }: {
  label: string; then: { mean: number; from: number; to: number }; recent: { mean: number; from: number; to: number }; delta: number
}) {
  const sign = delta > 0 ? '+' : ''
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-surface p-4 text-sm">
      <span className="text-[11px] uppercase tracking-[0.09em] text-muted">{label}</span>
      <span className="font-bold">{fmtTemp(then.mean)}</span>
      <span className="text-xs text-muted">{then.from}–{then.to}</span>
      <span aria-hidden className="text-warm">→</span>
      <span className="font-bold">{fmtTemp(recent.mean)}</span>
      <span className="text-xs text-muted">{recent.from}–{recent.to}</span>
      <span className="ml-auto rounded-md bg-cal-header px-2 py-1 text-xs font-bold text-white">{sign}{delta.toFixed(1)} °C</span>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/CalendarTile.test.tsx src/components/RangeBar.test.tsx src/components/StatCard.test.tsx src/components/WarmingStrip.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/CalendarTile.tsx src/components/RangeBar.tsx src/components/StatCard.tsx src/components/WarmingStrip.tsx src/components/CalendarTile.test.tsx src/components/RangeBar.test.tsx src/components/StatCard.test.tsx src/components/WarmingStrip.test.tsx
git commit -m "feat(components): CalendarTile, RangeBar, StatCard, WarmingStrip for Today redesign

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Shared chrome + controlled views

`Today.tsx` owns all cursors and renders the shared header (title · Today · ◀▶ stepping the active unit · underline tabs). `DayView` becomes controlled (`date`/`min`/`max`/`onChange` props), drops its internal date state and `DateNav`, and renders a day `CalendarTile` that opens the native picker (interim hero kept — full hero is Task 3). Delete `DateNav`.

**Files:**
- Modify: `src/tabs/Today.tsx` (full rewrite of header + cursor wiring)
- Modify: `src/tabs/today/DayView.tsx` (controlled props; CalendarTile picker; remove `<DateNav>`)
- Delete: `src/components/DateNav.tsx`, `src/components/DateNav.test.tsx`
- Modify: `src/tabs/Today.test.tsx`, `src/tabs/today/DayView.test.tsx`

**Interfaces:**
- Consumes: `CalendarTile` (Task 1); `fmtMonth`, `fmtWeekday`, `isoOf` from `src/lib/format`.
- Produces: `DayView` default export now takes `{ date: Date; min: Date; max: Date; onChange: (d: Date) => void }`. `MonthView` (`{ mm, currentYear }`) and `YearView` (`{ year }`) signatures unchanged.

- [ ] **Step 1: Write the failing tests**

Rewrite `src/tabs/Today.test.tsx` (keep the existing summary fixture/mock if present; this is the full file):
```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import Today from './Today'

vi.mock('recharts', async (o) => { const a = await o<typeof import('recharts')>()
  return { ...a, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 800, height: 300 }}>{children}</div> } })

const summary = { station:{id:'x',name:'Uccle',lat:0,lon:0}, baselines:{'1991-2020':10.5,'1961-1990':9.8},
  annual:[{year:2025,mean:12,tmin:8,tmax:16,incomplete:false}], anomaly:{'1991-2020':[{year:2025,v:1.5}],'1961-1990':[]},
  decadal:[], warmingRate:{full:0.2,last30:0.3}, records:{year:2025,highs:0,lows:0},
  extremes:{warmest:[],coldest:[]}, counters:{SU:[],hot30:[],TR:[],FD:[],ID:[],heatwaveDays:[],gsl:[]},
  rankings:{warmest:[{year:2025,mean:12}],coldest:[{year:2025,mean:12}]} }
const daynorm = { '1991-2020':[], '1961-1990':[] }
const live = { current:{time:'2026-06-29T12:00',temperature_2m:23.2}, daily:{time:['2026-06-29'],temperature_2m_max:[26.8],temperature_2m_min:[16]} }
const thisday = { mmdd:'0629', recordHigh:{v:32.6,year:1957}, recordLow:{v:5.3,year:1844},
  series:[{year:2024,tmax:25,tmin:14},{year:2026,tmax:26.8,tmin:16}], thenNow:{early:{from:1833,to:1900,mean:18},recent:{from:1996,to:2025,mean:21}} }
const month = { mm:'06', series:[{year:2025,mean:18,complete:true}], recordWarm:{year:2020,v:21}, recordCold:{year:1923,v:14}, normal:17, thenNow:{early:{from:1833,to:1900,mean:16},recent:{from:1996,to:2025,mean:18}} }

function routeFetch(u: string) {
  if (u.includes('open-meteo')) return live
  if (u.includes('daynorm')) return daynorm
  if (u.includes('summary')) return summary
  if (u.includes('/month/')) return month
  return thisday
}
afterEach(() => vi.unstubAllGlobals())

test('underline tabs switch mode; day is default', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () => routeFetch(u) })))
  render(<Today />)
  expect(screen.getByRole('radio', { name: /day/i })).toHaveAttribute('aria-checked', 'true')
  fireEvent.click(screen.getByRole('radio', { name: /year/i }))
  await waitFor(() => expect(screen.getByRole('radio', { name: /year/i })).toHaveAttribute('aria-checked', 'true'))
})

test('header Previous steps the active unit (day) and Today is disabled on today', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () => routeFetch(u) })))
  const { container } = render(<Today />)
  await waitFor(() => expect(container.querySelector('input[type="date"]')).toBeTruthy())
  expect(screen.getByRole('button', { name: /go to today/i })).toBeDisabled()  // cursor starts at today
  fireEvent.click(screen.getByRole('button', { name: /^previous/i }))
  expect(screen.getByRole('button', { name: /go to today/i })).not.toBeDisabled()  // moved off today
})
```

Rewrite `src/tabs/today/DayView.test.tsx` so `DayView` is controlled (props) and fixtures are **derived from the real run date** (project convention — no date-coupled fixtures). Full file:
```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import DayView from './DayView'
import { todayMMDD } from '../../lib/format'

vi.mock('recharts', async (o) => { const a = await o<typeof import('recharts')>()
  return { ...a, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 800, height: 300 }}>{children}</div> } })

const NOW = new Date()
const Y = NOW.getFullYear()
const MMDD = todayMMDD()
const midnight = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const TODAY = midnight(NOW)
const PAST = midnight(new Date(Y - 2, NOW.getMonth(), NOW.getDate()))   // same month/day, past year (not record)

// series spans Y-relative years so warming windows ([Y-11..Y-1] and [Y-111..Y-101]) are both non-empty on any run date
const thisday = { mmdd: MMDD, recordHigh: { v: 32.6, year: 1957 }, recordLow: { v: 5.3, year: 1844 },
  series: [
    { year: Y - 105, tmax: 19, tmin: 9 }, { year: 1957, tmax: 32.6, tmin: 12 },
    { year: Y - 2, tmax: 25, tmin: 14 }, { year: Y, tmax: 26.8, tmin: 16 },
  ], thenNow: { early: { from: 1833, to: 1900, mean: 18 }, recent: { from: 1996, to: 2025, mean: 21 } } }
const daynorm = { '1991-2020': [{ doy: 1, mmdd: MMDD, normal: 17.9, p10: 12, p90: 24 }], '1961-1990': [] }
const live = { current: { time: `${TODAY.getFullYear()}-01-01T12:00`, temperature_2m: 23.2 },
  daily: { time: [`${TODAY.getFullYear()}-01-01`], temperature_2m_max: [26.8], temperature_2m_min: [16] } }
function routeFetch(u: string) { if (u.includes('open-meteo')) return live; if (u.includes('daynorm')) return daynorm; return thisday }
afterEach(() => vi.unstubAllGlobals())

const MIN = new Date(1833, 0, 1)
function renderDay(date: Date) { return render(<DayView date={date} min={MIN} max={TODAY} onChange={() => {}} />) }

// NOTE: useTodayTemp picks today's daily row by matching current.time's date; here both are Jan 1
// so the matched row's tmax/tmin (26.8/16) are used regardless of the real run date.

test('today: HIGH + NOW + rank badge', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () => routeFetch(u) })))
  renderDay(TODAY)
  await waitFor(() => expect(screen.getByText('26.8 °C')).toBeInTheDocument())   // live today's high
  expect(screen.getByText("Today's high")).toBeInTheDocument()
  expect(screen.getByText('23.2°')).toBeInTheDocument()                           // NOW
  expect(screen.getByText('Now')).toBeInTheDocument()
  expect(screen.getByText(/warmest/i)).toBeInTheDocument()                        // rank badge present
})

test('opening the picker works (CalendarTile click does not throw)', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () => routeFetch(u) })))
  const { container } = renderDay(TODAY)
  await waitFor(() => expect(container.querySelector('input[type="date"]')).toBeTruthy())
  expect(() => fireEvent.click(screen.getByRole('button', { name: /change date/i }))).not.toThrow()
})

test('past day: HIGH + LOW (no NOW)', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () => routeFetch(u) })))
  renderDay(PAST)                                  // Y-2 row: high 25, low 14
  await waitFor(() => expect(screen.getByText('25.0 °C')).toBeInTheDocument())   // that day's high
  expect(screen.getByText('Low')).toBeInTheDocument()
  expect(screen.queryByText('Now')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/tabs/Today.test.tsx src/tabs/today/DayView.test.tsx`
Expected: FAIL — `DayView` not controlled / header controls absent / "Today's high" not rendered yet.

- [ ] **Step 3: Rewrite `Today.tsx`**

```tsx
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import DayView from './today/DayView'
import MonthView from './today/MonthView'
import YearView from './today/YearView'
import { useSummary } from '../data/useSummary'
import { isoOf } from '../lib/format'

type Mode = 'day' | 'month' | 'year'
const MODES: Mode[] = ['day', 'month', 'year']
const HEADINGS: Record<Mode, string> = { day: 'This Day in History', month: 'This Month in History', year: 'This Year in History' }
const NOUN: Record<Mode, string> = { day: 'day', month: 'month', year: 'year' }
const MIN_DATE = new Date(1833, 0, 1)
const midnight = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }

export default function Today() {
  const { summary } = useSummary()
  const now = new Date()
  const [mode, setMode] = useState<Mode>('day')
  const [date, setDate] = useState<Date>(() => midnight(new Date()))
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState<number | null>(null)

  const years = summary?.annual?.map(a => a.year) ?? []
  const minYear = years.length ? Math.min(...years) : 1833
  const maxYear = years.length ? Math.max(...years) : now.getFullYear()
  const selYear = year ?? maxYear
  const mm = String(month).padStart(2, '0')
  const maxDate = midnight(now)

  const stepDay = (d: number) => { const x = new Date(date); x.setDate(x.getDate() + d); if (isoOf(x) >= isoOf(MIN_DATE) && isoOf(x) <= isoOf(maxDate)) setDate(midnight(x)) }
  const stepMonth = (d: number) => setMonth(((month - 1 + d + 12) % 12) + 1)
  const stepYear = (d: number) => setYear(Math.min(maxYear, Math.max(minYear, selYear + d)))

  let onPrev = () => {}, onNext = () => {}, onToday = () => {}, prevDisabled = false, nextDisabled = false, todayDisabled = false
  if (mode === 'day') {
    onPrev = () => stepDay(-1); onNext = () => stepDay(1)
    prevDisabled = isoOf(date) <= isoOf(MIN_DATE); nextDisabled = isoOf(date) >= isoOf(maxDate)
    onToday = () => setDate(midnight(new Date())); todayDisabled = isoOf(date) >= isoOf(maxDate)
  } else if (mode === 'month') {
    onPrev = () => stepMonth(-1); onNext = () => stepMonth(1)
    onToday = () => setMonth(now.getMonth() + 1); todayDisabled = month === now.getMonth() + 1
  } else {
    onPrev = () => stepYear(-1); onNext = () => stepYear(1)
    prevDisabled = selYear <= minYear; nextDisabled = selYear >= maxYear
    onToday = () => setYear(now.getFullYear()); todayDisabled = selYear === maxYear
  }

  return (
    <section className="fade-in space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-2xl font-extrabold tracking-tight">{HEADINGS[mode]}</h2>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onToday} disabled={todayDisabled} aria-label="Go to today"
            className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted transition-colors hover:text-fg disabled:opacity-40 disabled:hover:text-muted">Today</button>
          <button type="button" onClick={onPrev} disabled={prevDisabled} aria-label={`Previous ${NOUN[mode]}`}
            className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:text-fg disabled:opacity-40"><ChevronLeft size={18} aria-hidden /></button>
          <button type="button" onClick={onNext} disabled={nextDisabled} aria-label={`Next ${NOUN[mode]}`}
            className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:text-fg disabled:opacity-40"><ChevronRight size={18} aria-hidden /></button>
        </div>
      </div>

      <div role="radiogroup" aria-label="Granularity" className="flex gap-6 border-b border-border">
        {MODES.map(m => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
            className={`-mb-px border-b-2 pb-2 text-sm capitalize transition-colors ${mode === m ? 'border-warm font-semibold text-fg' : 'border-transparent text-muted hover:text-fg'}`}>{m}</button>
        ))}
      </div>

      {mode === 'day' && <DayView date={date} min={MIN_DATE} max={maxDate} onChange={setDate} />}
      {mode === 'month' && <MonthView mm={mm} currentYear={now.getFullYear()} />}
      {mode === 'year' && <YearView year={selYear} />}
    </section>
  )
}
```

- [ ] **Step 4: Make `DayView` controlled + CalendarTile picker (interim hero)**

Rewrite `src/tabs/today/DayView.tsx` — accept props, drop internal date state and `<DateNav>`, render a day `CalendarTile` that opens the hidden picker, keep the existing temps/average/rank/records/then-now body for now (Task 3 replaces the body):
```tsx
import { useRef } from 'react'
import { Flame, Snowflake } from 'lucide-react'
import { useThisDay } from '../../data/useThisDay'
import { useTodayTemp } from '../../data/useTodayTemp'
import { useDayNorm } from '../../data/useDayNorm'
import { fmtTemp, mmddOf, isoOf, todayISO, ordinal, fmtMonth, fmtWeekday } from '../../lib/format'
import { rankOf } from '../../lib/stats'
import { previousRecordHigh, previousRecordLow, tempColor } from '../../lib/dayStats'
import { Loading, ErrorState } from '../../components/States'
import CalendarTile from '../../components/CalendarTile'
import PeriodScatter from '../../components/PeriodScatter'

export default function DayView({ date, min, max, onChange }: { date: Date; min: Date; max: Date; onChange: (d: Date) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
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
  const provisional = !!entry?.provisional && !isReal

  let maxV: number | null = null, secondV: number | null = null, secondLabel = 'min'
  if (isReal && live.data) { maxV = live.data.tmax; secondV = live.data.temp; secondLabel = 'current' }
  else if (entry) { maxV = entry.tmax; secondV = entry.tmin; secondLabel = 'min' }

  const brokeHigh = data.recordHigh.year === year
  const brokeLow = data.recordLow.year === year
  const prevHigh = brokeHigh ? previousRecordHigh(data.series, year) : null
  const prevLow = brokeLow ? previousRecordLow(data.series, year) : null

  const r = maxV != null ? rankOf(maxV, data.series.map(s => s.tmax)) : null
  const dayLabel = `${fmtMonth(mmdd.slice(0, 2))} ${Number(mmdd.slice(2))}`
  const firstYear = data.series.length ? Math.min(...data.series.map(s => s.year)) : null

  const mm = mmdd.slice(0, 2)
  const fullLabel = `${fmtWeekday(date)} ${date.getDate()} ${fmtMonth(mm)} ${year}`
  const openPicker = () => { const el = inputRef.current; if (!el) return; if (typeof el.showPicker === 'function') { try { el.showPicker(); return } catch { /* */ } } el.focus(); el.click() }
  const clampIso = (v: string) => (v < isoOf(min) ? isoOf(min) : v > isoOf(max) ? isoOf(max) : v)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-start gap-5">
          <CalendarTile header={fmtMonth(mm).toUpperCase()} body={date.getDate()} footer={fmtWeekday(date).toUpperCase()}
            onClick={openPicker} ariaLabel={`Change date — ${fullLabel}`} />
          <div className="min-w-0">
            {maxV != null ? (
              <>
                <p className="text-[11px] uppercase tracking-[0.09em] text-muted">{isReal ? "Today's high" : 'High'}</p>
                <span className={`text-[40px] font-extrabold leading-none ${tempColor(maxV, normal)}`}>{fmtTemp(maxV)}</span>
              </>
            ) : <p className="text-sm text-muted">No data for this date.</p>}
            {provisional && <p className="mt-1 text-[11px] text-muted"><span aria-hidden>· </span>Provisional — may be revised</p>}
            {r && <p className="mt-2 inline-block rounded-full bg-badge-bg px-3 py-1 text-xs font-semibold text-badge-fg">{ordinal(r.rank)} warmest {dayLabel}{firstYear != null && ` since ${firstYear}`}</p>}
          </div>
          {secondV != null && (
            <div className="ml-auto text-right">
              <p className="text-[11px] uppercase tracking-[0.09em] text-muted">{secondLabel === 'current' ? 'Now' : 'Low'}</p>
              <span className="text-2xl font-bold">{secondLabel === 'current' ? `${secondV.toFixed(1)}°` : fmtTemp(secondV)}</span>
            </div>
          )}
        </div>

        {(brokeHigh || brokeLow) && (
          <p className={`mt-3 flex items-center gap-2 text-sm font-semibold ${brokeHigh ? 'text-warm' : 'text-accent'}`}>
            {brokeHigh ? <Flame size={16} aria-hidden /> : <Snowflake size={16} aria-hidden />}
            <span>{brokeHigh ? 'Record high for this date!' : 'Record low for this date!'}{brokeHigh ? prevHigh && ` Previous: ${fmtTemp(prevHigh.v)} (${prevHigh.year})` : prevLow && ` Previous: ${fmtTemp(prevLow.v)} (${prevLow.year})`}</span>
          </p>
        )}
      </div>

      <input ref={inputRef} type="date" tabIndex={-1} aria-hidden className="sr-only"
        value={isoOf(date)} min={isoOf(min)} max={isoOf(max)}
        onChange={e => { if (e.target.value) onChange(new Date(clampIso(e.target.value) + 'T00:00:00')) }} />

      <PeriodScatter title="Every year on this date" data={data.series}
        series={[{ key: 'tmax', name: 'High', color: 'var(--warm)' }, { key: 'tmin', name: 'Low', color: 'var(--accent)' }]} />
    </div>
  )
}
```

- [ ] **Step 5: Delete `DateNav` and run tests**

```bash
git rm src/components/DateNav.tsx src/components/DateNav.test.tsx
```
Run: `npx vitest run`
Expected: PASS (Today + DayView updated; DateNav tests gone). Fix any remaining references to `DateNav`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(today): shared header (Today + arrows + underline tabs), controlled DayView via CalendarTile picker; drop DateNav

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Day hero — RangeBar, StatCards, WarmingStrip

Replace the interim Day body with the full mockup: hero (tile + HIGH/NOW|LOW + rank) → `RangeBar` ("where today sits") → 2×2 `StatCard` grid → `WarmingStrip`. PeriodScatter stays below.

**Files:**
- Modify: `src/tabs/today/DayView.tsx`
- Modify: `src/tabs/today/DayView.test.tsx` (assert range bar markers, stat cards, warming strip)

**Interfaces:**
- Consumes: `CalendarTile`, `RangeBar`, `StatCard`, `WarmingStrip` (Task 1); `decadeMean`, `previousRecordHigh/Low`, `tempColor` (dayStats); `useThisDay`/`useTodayTemp`/`useDayNorm`.

- [ ] **Step 1: Add the failing assertions**

Append to `src/tabs/today/DayView.test.tsx` (uses the file's existing `routeFetch`/`renderDay`/`TODAY` and the Y-relative fixture — both warming windows are populated, so the strip renders on any run date):
```tsx
test('today: range bar + stat cards (average, vs average, record high/low) + warming strip', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () => routeFetch(u) })))
  renderDay(TODAY)
  await waitFor(() => expect(screen.getByText('Average')).toBeInTheDocument())
  expect(screen.getByRole('img', { name: /record high/i })).toBeInTheDocument()  // RangeBar summary
  expect(screen.getByText('17.9 °C')).toBeInTheDocument()                  // 1991-2020 normal (Average card)
  expect(screen.getByText('Today vs average')).toBeInTheDocument()
  expect(screen.getByText('+8.9 °C')).toBeInTheDocument()                  // 26.8 - 17.9
  expect(screen.getByText('Record high')).toBeInTheDocument()              // StatCard label (exact)
  expect(screen.getByText('32.6 °C')).toBeInTheDocument()                  // record-high value (card)
  expect(screen.getByText('Record low')).toBeInTheDocument()
  expect(screen.getByText('5.3 °C')).toBeInTheDocument()
  expect(screen.getByText(/A warming/)).toBeInTheDocument()                // warming strip
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/tabs/today/DayView.test.tsx`
Expected: FAIL — "Average"/"Record high"/warming strip not rendered.

- [ ] **Step 3: Replace the Day body**

Rewrite `src/tabs/today/DayView.tsx` to the full layout:
```tsx
import { useRef } from 'react'
import { Flame, Snowflake } from 'lucide-react'
import { useThisDay } from '../../data/useThisDay'
import { useTodayTemp } from '../../data/useTodayTemp'
import { useDayNorm } from '../../data/useDayNorm'
import { fmtTemp, mmddOf, isoOf, todayISO, ordinal, fmtMonth, fmtWeekday } from '../../lib/format'
import { rankOf } from '../../lib/stats'
import { decadeMean, previousRecordHigh, previousRecordLow, tempColor } from '../../lib/dayStats'
import { Loading, ErrorState } from '../../components/States'
import CalendarTile from '../../components/CalendarTile'
import RangeBar from '../../components/RangeBar'
import StatCard from '../../components/StatCard'
import WarmingStrip from '../../components/WarmingStrip'
import PeriodScatter from '../../components/PeriodScatter'

export default function DayView({ date, min, max, onChange }: { date: Date; min: Date; max: Date; onChange: (d: Date) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const mmdd = mmddOf(date)
  const mm = mmdd.slice(0, 2)
  const year = date.getFullYear()
  const isReal = isoOf(date) === todayISO()

  const { data, loading, error } = useThisDay(mmdd)
  const live = useTodayTemp()
  const dayNorm = useDayNorm()
  if (loading) return <Loading label="Loading day…" />
  if (error || !data) return <ErrorState label="Could not load this date." />

  const normal = dayNorm.data?.['1991-2020']?.find(n => n.mmdd === mmdd)?.normal ?? null
  const entry = data.series.find(s => s.year === year)
  const provisional = !!entry?.provisional && !isReal

  let highV: number | null = null, secondV: number | null = null
  const todayLive = isReal && live.data
  if (todayLive) { highV = live.data!.tmax; secondV = live.data!.temp }
  else if (entry) { highV = entry.tmax; secondV = entry.tmin }
  const secondLabel = todayLive ? 'Now' : 'Low'

  const brokeHigh = data.recordHigh.year === year
  const brokeLow = data.recordLow.year === year
  const prevHigh = brokeHigh ? previousRecordHigh(data.series, year) : null
  const prevLow = brokeLow ? previousRecordLow(data.series, year) : null

  const r = highV != null ? rankOf(highV, data.series.map(s => s.tmax)) : null
  const dayLabel = `${fmtMonth(mm)} ${Number(mmdd.slice(2))}`
  const firstYear = data.series.length ? Math.min(...data.series.map(s => s.year)) : null

  const delta = highV != null && normal != null ? Math.round((highV - normal) * 10) / 10 : null
  const deltaWord = delta == null ? '' : delta > 0 ? 'warmer than normal' : delta < 0 ? 'cooler than normal' : 'at normal'

  // viewed-year-relative warming windows (matches mockup: 2026 → 1915–1925 vs 2015–2025)
  const recentFrom = year - 11, recentTo = year - 1, thenFrom = year - 111, thenTo = year - 101
  const recentMean = decadeMean(data.series, recentFrom, recentTo)
  const thenMean = decadeMean(data.series, thenFrom, thenTo)

  const fullLabel = `${fmtWeekday(date)} ${date.getDate()} ${fmtMonth(mm)} ${year}`
  const openPicker = () => { const el = inputRef.current; if (!el) return; if (typeof el.showPicker === 'function') { try { el.showPicker(); return } catch { /* */ } } el.focus(); el.click() }
  const clampIso = (v: string) => (v < isoOf(min) ? isoOf(min) : v > isoOf(max) ? isoOf(max) : v)
  const goToYear = (y: number) => { const m = date.getMonth(); const d = Math.min(date.getDate(), new Date(y, m + 1, 0).getDate()); onChange(new Date(y, m, d)) }

  const rangeSummary = highV != null
    ? `${secondLabel} ${secondV?.toFixed(1)}°, high ${highV.toFixed(1)}°, avg ${normal ?? '—'}°, between ${data.recordLow.v}° record low and ${data.recordHigh.v}° record high`
    : `Records ${data.recordLow.v}° to ${data.recordHigh.v}°`

  return (
    <div className="space-y-4">
      {/* HERO */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
          <CalendarTile header={fmtMonth(mm).toUpperCase()} body={date.getDate()} footer={fmtWeekday(date).toUpperCase()}
            onClick={openPicker} ariaLabel={`Change date — ${fullLabel}`} />
          <div className="min-w-0 flex-1">
            {highV != null ? (
              <>
                <p className="text-[11px] uppercase tracking-[0.09em] text-muted">{isReal ? "Today's high" : 'High'}</p>
                <span className={`text-[40px] font-extrabold leading-none ${tempColor(highV, normal)}`}>{fmtTemp(highV)}</span>
              </>
            ) : <p className="text-sm text-muted">No data for this date.</p>}
            {provisional && <p className="mt-1 text-[11px] text-muted"><span aria-hidden>· </span>Provisional — may be revised</p>}
            {r && <p className="mt-2 inline-block rounded-full bg-badge-bg px-3 py-1 text-xs font-semibold text-badge-fg">{ordinal(r.rank)} warmest {dayLabel}{firstYear != null && ` since ${firstYear}`}</p>}
          </div>
          {secondV != null && (
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.09em] text-muted">{secondLabel}</p>
              <span className="text-2xl font-bold">{todayLive ? `${secondV.toFixed(1)}°` : fmtTemp(secondV)}</span>
            </div>
          )}
        </div>

        {(brokeHigh || brokeLow) && (
          <p className={`mt-3 flex items-center gap-2 text-sm font-semibold ${brokeHigh ? 'text-warm' : 'text-accent'}`}>
            {brokeHigh ? <Flame size={16} aria-hidden /> : <Snowflake size={16} aria-hidden />}
            <span>{brokeHigh ? 'Record high for this date!' : 'Record low for this date!'}{brokeHigh ? prevHigh && ` Previous: ${fmtTemp(prevHigh.v)} (${prevHigh.year})` : prevLow && ` Previous: ${fmtTemp(prevLow.v)} (${prevLow.year})`}</span>
          </p>
        )}

        {/* WHERE TODAY SITS */}
        {highV != null && (
          <div className="mt-5">
            <p className="mb-2 text-[11px] uppercase tracking-[0.09em] text-muted">Where {isReal ? 'today' : 'it'} sits</p>
            <RangeBar
              min={{ v: data.recordLow.v, label: `${data.recordLow.v}° record low` }}
              max={{ v: data.recordHigh.v, label: `${data.recordHigh.v}° record high` }}
              markers={[
                ...(normal != null ? [{ v: normal, label: `avg ${normal}°`, kind: 'tick' as const }] : []),
                ...(secondV != null ? [{ v: secondV, label: `${secondLabel.toLowerCase()} ${secondV.toFixed(1)}°`, kind: 'dot' as const }] : []),
                { v: highV, label: `high ${highV.toFixed(1)}°`, kind: 'diamond' as const },
              ]}
              summary={rangeSummary} />
          </div>
        )}
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {normal != null && <StatCard label="Average" value={fmtTemp(normal)} sub="1991–2020 normal" />}
        {delta != null && <StatCard label={isReal ? 'Today vs average' : 'High vs average'} value={`${delta > 0 ? '+' : ''}${delta.toFixed(1)} °C`} sub={deltaWord} valueClass={delta > 0 ? 'text-warm' : delta < 0 ? 'text-accent' : 'text-fg'} />}
        <StatCard label="Record high" value={fmtTemp(data.recordHigh.v)} sub={String(data.recordHigh.year)} valueClass="text-warm" onClick={() => goToYear(data.recordHigh.year)} />
        <StatCard label="Record low" value={fmtTemp(data.recordLow.v)} sub={String(data.recordLow.year)} valueClass="text-accent" onClick={() => goToYear(data.recordLow.year)} />
      </div>

      {/* WARMING STRIP */}
      {thenMean != null && recentMean != null && (
        <WarmingStrip label={`A warming ${dayLabel}`}
          then={{ mean: thenMean, from: thenFrom, to: thenTo }}
          recent={{ mean: recentMean, from: recentFrom, to: recentTo }}
          delta={Math.round((recentMean - thenMean) * 10) / 10} />
      )}

      <input ref={inputRef} type="date" tabIndex={-1} aria-hidden className="sr-only"
        value={isoOf(date)} min={isoOf(min)} max={isoOf(max)}
        onChange={e => { if (e.target.value) onChange(new Date(clampIso(e.target.value) + 'T00:00:00')) }} />

      <PeriodScatter title="Every year on this date" data={data.series}
        series={[{ key: 'tmax', name: 'High', color: 'var(--warm)' }, { key: 'tmin', name: 'Low', color: 'var(--accent)' }]} />
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tabs/today/DayView.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tabs/today/DayView.tsx src/tabs/today/DayView.test.tsx
git commit -m "feat(day): redesigned hero + where-it-sits range bar + stat cards + warming strip

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Month adaptation

Rebuild `MonthView` to the same layout: `CalendarTile` (`JUNE / 2026`) + JUNE MEAN + rank → `RangeBar` (coldest→warmest June mean; normal tick + this-year dot) → 2×2 `StatCard` (Average · This-year vs average · Warmest June · Coldest June) → `WarmingStrip` (from `data.thenNow`). PeriodScatter stays.

**Files:**
- Modify: `src/tabs/today/MonthView.tsx`
- Modify: `src/tabs/today/MonthView.test.tsx`

**Interfaces:**
- Consumes: `CalendarTile`, `RangeBar`, `StatCard`, `WarmingStrip`; `useMonth`; `MonthData` (`{ mm; series:{year,mean,complete}[]; recordWarm:{year,v}|null; recordCold:{year,v}|null; normal:number|null; thenNow:{early:{from,to,mean},recent:{from,to,mean}} }`).

- [ ] **Step 1: Update the test**

Rewrite `src/tabs/today/MonthView.test.tsx`:
```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import MonthView from './MonthView'

vi.mock('recharts', async (o) => { const a = await o<typeof import('recharts')>()
  return { ...a, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 800, height: 300 }}>{children}</div> } })

const month = { mm: '06', normal: 17.0,
  series: [{ year: 2000, mean: 16, complete: true }, { year: 2020, mean: 21, complete: true }, { year: 2026, mean: 18.4, complete: true }],
  recordWarm: { year: 2020, v: 21 }, recordCold: { year: 2000, v: 16 },
  thenNow: { early: { from: 1833, to: 1900, mean: 16.1 }, recent: { from: 1996, to: 2025, mean: 18.0 } } }
afterEach(() => vi.unstubAllGlobals())

test('month: tile, mean, rank, stat cards, warming strip', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve({ ok: true, json: async () => month })))
  render(<MonthView mm="06" currentYear={2026} />)
  await waitFor(() => expect(screen.getByText('18.4 °C')).toBeInTheDocument())   // June 2026 mean
  expect(screen.getByText('JUNE')).toBeInTheDocument()                            // tile header
  expect(screen.getByText('2026')).toBeInTheDocument()                            // tile body
  expect(screen.getByText(/warmest June/)).toBeInTheDocument()                    // rank badge
  expect(screen.getByText('Average')).toBeInTheDocument()
  expect(screen.getByText('17.0 °C')).toBeInTheDocument()                         // normal
  expect(screen.getByText('Warmest June')).toBeInTheDocument()
  expect(screen.getByText('Coldest June')).toBeInTheDocument()
  expect(screen.getByText(/A warming June/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/tabs/today/MonthView.test.tsx`
Expected: FAIL — new structure absent.

- [ ] **Step 3: Rewrite `MonthView`**

```tsx
import { useMonth } from '../../data/useMonth'
import { fmtTemp, fmtMonth, ordinal } from '../../lib/format'
import { Loading, ErrorState } from '../../components/States'
import CalendarTile from '../../components/CalendarTile'
import RangeBar from '../../components/RangeBar'
import StatCard from '../../components/StatCard'
import WarmingStrip from '../../components/WarmingStrip'
import PeriodScatter from '../../components/PeriodScatter'

export default function MonthView({ mm, currentYear }: { mm: string; currentYear: number }) {
  const { data, loading, error } = useMonth(mm)
  if (loading) return <Loading label="Loading month…" />
  if (error || !data) return <ErrorState label="Could not load this month." />

  const name = fmtMonth(mm)
  const cur = data.series.find(s => s.year === currentYear)
  const complete = data.series.filter(s => s.complete)
  const rank = cur ? complete.filter(s => s.mean > cur.mean).length + 1 : null
  const delta = cur && data.normal != null ? Math.round((cur.mean - data.normal) * 10) / 10 : null
  const deltaWord = delta == null ? '' : delta > 0 ? 'warmer than normal' : delta < 0 ? 'cooler than normal' : 'at normal'
  const tn = data.thenNow
  const warmingDelta = tn.early.mean != null && tn.recent.mean != null ? Math.round((tn.recent.mean - tn.early.mean) * 10) / 10 : null

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
          <CalendarTile header={name.toUpperCase()} body={currentYear} />
          <div className="min-w-0 flex-1">
            {cur ? (
              <>
                <p className="text-[11px] uppercase tracking-[0.09em] text-muted">{name} mean{cur.complete ? '' : ' (so far)'}</p>
                <span className="text-[40px] font-extrabold leading-none">{fmtTemp(cur.mean)}</span>
                {rank && cur.complete && <p className="mt-2 inline-block rounded-full bg-badge-bg px-3 py-1 text-xs font-semibold text-badge-fg">{ordinal(rank)} warmest {name} in {complete.length} years</p>}
              </>
            ) : <p className="text-sm text-muted">No data for {name} {currentYear} yet.</p>}
          </div>
        </div>

        {cur && data.recordCold && data.recordWarm && (
          <div className="mt-5">
            <p className="mb-2 text-[11px] uppercase tracking-[0.09em] text-muted">Where {currentYear} sits</p>
            <RangeBar
              min={{ v: data.recordCold.v, label: `${data.recordCold.v}° coldest` }}
              max={{ v: data.recordWarm.v, label: `${data.recordWarm.v}° warmest` }}
              markers={[
                ...(data.normal != null ? [{ v: data.normal, label: `normal ${data.normal}°`, kind: 'tick' as const }] : []),
                { v: cur.mean, label: `${currentYear} ${cur.mean}°`, kind: 'dot' as const },
              ]}
              summary={`${name} ${currentYear} mean ${cur.mean}°, normal ${data.normal ?? '—'}°, between ${data.recordCold.v}° coldest and ${data.recordWarm.v}° warmest`} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {data.normal != null && <StatCard label="Average" value={fmtTemp(data.normal)} sub="1991–2020 normal" />}
        {delta != null && <StatCard label="This year vs average" value={`${delta > 0 ? '+' : ''}${delta.toFixed(1)} °C`} sub={deltaWord} valueClass={delta > 0 ? 'text-warm' : delta < 0 ? 'text-accent' : 'text-fg'} />}
        <StatCard label={`Warmest ${name}`} value={fmtTemp(data.recordWarm?.v)} sub={data.recordWarm ? String(data.recordWarm.year) : undefined} valueClass="text-warm" />
        <StatCard label={`Coldest ${name}`} value={fmtTemp(data.recordCold?.v)} sub={data.recordCold ? String(data.recordCold.year) : undefined} valueClass="text-accent" />
      </div>

      {warmingDelta != null && (
        <WarmingStrip label={`A warming ${name}`}
          then={{ mean: tn.early.mean!, from: tn.early.from, to: tn.early.to }}
          recent={{ mean: tn.recent.mean!, from: tn.recent.from, to: tn.recent.to }}
          delta={warmingDelta} />
      )}

      <PeriodScatter title={`Every ${name} mean`} data={complete.map(s => ({ year: s.year, mean: s.mean }))}
        series={[{ key: 'mean', name: `${name} mean`, color: 'var(--accent)' }]} />
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/tabs/today/MonthView.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tabs/today/MonthView.tsx src/tabs/today/MonthView.test.tsx
git commit -m "feat(month): adopt redesigned layout (tile, range bar, stat cards, warming strip)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Year adaptation

Rebuild `YearView` to the same layout: `CalendarTile` (`YEAR / 2026`) + ANNUAL MEAN + rank → `RangeBar` (coldest→warmest annual mean; normal tick + this-year dot) → 2×2 `StatCard` (Average · This-year vs average · Warmest year · Coldest year) → `WarmingStrip` (annual means, viewed-year-relative windows). PeriodScatter stays.

**Files:**
- Modify: `src/tabs/today/YearView.tsx`
- Modify: `src/tabs/today/YearView.test.tsx`

**Interfaces:**
- Consumes: `CalendarTile`, `RangeBar`, `StatCard`, `WarmingStrip`; `useSummary`; `Summary` (`annual:{year,mean,tmin,tmax,incomplete}[]`, `anomaly['1991-2020']:{year,v}[]`, `baselines['1991-2020']:number|null`, `rankings.warmest/coldest:{year,mean}[]`).
- Produces: `yearWindowMean(annual, from, to)` (module-local helper) — mean of complete annual means in `[from,to]` or null.

- [ ] **Step 1: Update the test**

Rewrite `src/tabs/today/YearView.test.tsx`:
```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import YearView from './YearView'

vi.mock('recharts', async (o) => { const a = await o<typeof import('recharts')>()
  return { ...a, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 800, height: 300 }}>{children}</div> } })

const annual = [
  { year: 1920, mean: 9.5, tmin: 5, tmax: 14, incomplete: false },
  { year: 2000, mean: 10.5, tmin: 6, tmax: 15, incomplete: false },
  { year: 2024, mean: 12.1, tmin: 8, tmax: 16, incomplete: false },
  { year: 2026, mean: 11.8, tmin: 8, tmax: 16, incomplete: false },
]
const summary = { station:{id:'x',name:'Uccle',lat:0,lon:0}, baselines:{'1991-2020':10.5,'1961-1990':9.8},
  annual, anomaly:{'1991-2020':[{year:2026,v:1.3}],'1961-1990':[]}, decadal:[], warmingRate:{full:0.2,last30:0.3},
  records:{year:2026,highs:0,lows:0}, extremes:{warmest:[],coldest:[]},
  counters:{SU:[],hot30:[],TR:[],FD:[],ID:[],heatwaveDays:[],gsl:[]},
  rankings:{warmest:[{year:2024,mean:12.1},{year:2026,mean:11.8},{year:2000,mean:10.5},{year:1920,mean:9.5}],
            coldest:[{year:1920,mean:9.5},{year:2000,mean:10.5}]} }
afterEach(() => vi.unstubAllGlobals())

test('year: tile, mean, rank, stat cards', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve({ ok: true, json: async () => summary })))
  render(<YearView year={2026} />)
  await waitFor(() => expect(screen.getByText('11.8 °C')).toBeInTheDocument())  // 2026 annual mean
  expect(screen.getByText('YEAR')).toBeInTheDocument()
  expect(screen.getByText('2026')).toBeInTheDocument()
  expect(screen.getByText(/warmest year/)).toBeInTheDocument()
  expect(screen.getByText('Average')).toBeInTheDocument()
  expect(screen.getByText('10.5 °C')).toBeInTheDocument()                       // 1991-2020 baseline
  expect(screen.getByText('Warmest year')).toBeInTheDocument()
  expect(screen.getByText('Coldest year')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/tabs/today/YearView.test.tsx`
Expected: FAIL — new structure absent.

- [ ] **Step 3: Rewrite `YearView`**

```tsx
import { useSummary } from '../../data/useSummary'
import { fmtTemp, ordinal } from '../../lib/format'
import { Loading, ErrorState } from '../../components/States'
import CalendarTile from '../../components/CalendarTile'
import RangeBar from '../../components/RangeBar'
import StatCard from '../../components/StatCard'
import WarmingStrip from '../../components/WarmingStrip'
import PeriodScatter from '../../components/PeriodScatter'

type Annual = { year: number; mean: number; incomplete: boolean }
function yearWindowMean(annual: Annual[], from: number, to: number): number | null {
  const v = annual.filter(a => a.year >= from && a.year <= to && !a.incomplete).map(a => a.mean)
  return v.length ? Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 10) / 10 : null
}

export default function YearView({ year }: { year: number }) {
  const { summary, loading, error } = useSummary()
  if (loading) return <Loading label="Loading year…" />
  if (error || !summary) return <ErrorState label="Could not load data." />

  const a = summary.annual.find(x => x.year === year)
  const rankIdx = summary.rankings.warmest.findIndex(x => x.year === year)
  const rank = rankIdx >= 0 ? rankIdx + 1 : null
  const total = summary.rankings.warmest.length
  const normal = summary.baselines['1991-2020']
  const recordWarm = summary.rankings.warmest[0]
  const recordCold = summary.rankings.coldest[0]
  const delta = a && normal != null ? Math.round((a.mean - normal) * 10) / 10 : null
  const deltaWord = delta == null ? '' : delta > 0 ? 'warmer than normal' : delta < 0 ? 'cooler than normal' : 'at normal'

  const recentFrom = year - 11, recentTo = year - 1, thenFrom = year - 111, thenTo = year - 101
  const recentMean = yearWindowMean(summary.annual, recentFrom, recentTo)
  const thenMean = yearWindowMean(summary.annual, thenFrom, thenTo)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
          <CalendarTile header="YEAR" body={year} />
          <div className="min-w-0 flex-1">
            {a ? (
              <>
                <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Annual mean{a.incomplete ? ' (so far)' : ''}</p>
                <span className="text-[40px] font-extrabold leading-none">{fmtTemp(a.mean)}</span>
                {rank && !a.incomplete && <p className="mt-2 inline-block rounded-full bg-badge-bg px-3 py-1 text-xs font-semibold text-badge-fg">{ordinal(rank)} warmest year in {total} years</p>}
              </>
            ) : <p className="text-sm text-muted">No data for {year}.</p>}
          </div>
        </div>

        {a && recordWarm && recordCold && (
          <div className="mt-5">
            <p className="mb-2 text-[11px] uppercase tracking-[0.09em] text-muted">Where {year} sits</p>
            <RangeBar
              min={{ v: recordCold.mean, label: `${recordCold.mean}° coldest` }}
              max={{ v: recordWarm.mean, label: `${recordWarm.mean}° warmest` }}
              markers={[
                ...(normal != null ? [{ v: normal, label: `normal ${normal}°`, kind: 'tick' as const }] : []),
                { v: a.mean, label: `${year} ${a.mean}°`, kind: 'dot' as const },
              ]}
              summary={`${year} annual mean ${a.mean}°, normal ${normal ?? '—'}°, between ${recordCold.mean}° coldest and ${recordWarm.mean}° warmest year`} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {normal != null && <StatCard label="Average" value={fmtTemp(normal)} sub="1991–2020 normal" />}
        {delta != null && <StatCard label="This year vs average" value={`${delta > 0 ? '+' : ''}${delta.toFixed(1)} °C`} sub={deltaWord} valueClass={delta > 0 ? 'text-warm' : delta < 0 ? 'text-accent' : 'text-fg'} />}
        <StatCard label="Warmest year" value={fmtTemp(recordWarm?.mean)} sub={recordWarm ? String(recordWarm.year) : undefined} valueClass="text-warm" />
        <StatCard label="Coldest year" value={fmtTemp(recordCold?.mean)} sub={recordCold ? String(recordCold.year) : undefined} valueClass="text-accent" />
      </div>

      {thenMean != null && recentMean != null && (
        <WarmingStrip label="A warming year"
          then={{ mean: thenMean, from: thenFrom, to: thenTo }}
          recent={{ mean: recentMean, from: recentFrom, to: recentTo }}
          delta={Math.round((recentMean - thenMean) * 10) / 10} />
      )}

      <PeriodScatter title="Annual mean by year" data={summary.annual.filter(x => !x.incomplete).map(x => ({ year: x.year, mean: x.mean }))}
        series={[{ key: 'mean', name: 'Annual mean', color: 'var(--accent)' }]} />
    </div>
  )
}
```

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: PASS (all suites green).

- [ ] **Step 5: Commit**

```bash
git add src/tabs/today/YearView.tsx src/tabs/today/YearView.test.tsx
git commit -m "feat(year): adopt redesigned layout (tile, range bar, stat cards, warming strip)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Final: build, deploy, live-verify

- [ ] **Build:** `VITE_BASE=/uccle-climate/ npm run build` (tsc + vite) — must succeed.
- [ ] **Full suites:** `npx vitest run` green.
- [ ] **Push:** `git push origin main`; watch the deploy run to success.
- [ ] **Live verify:** screenshot the Today tab Day / Month / Year at light + dark × 375 / 768 / 1280; confirm the calendar tile, hero (HIGH/NOW today, HIGH/LOW past), range bar, 2×2 stat cards, and warming strip render with no horizontal overflow; confirm underline tabs + header arrows + Today behave.
