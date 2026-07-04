# Nav First-Level Day/Month/Year Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Day/Month/Year first-level nav tabs (own routes), remove Trends/Climate, park Me (keep file, unroute).

**Architecture:** `/day` `/month` `/year` routes each render `<Today mode="…" />`; `Today` takes mode from the route (no in-content radiogroup), reads its per-mode deep-link param, and does cross-mode navigation via `useNavigate`. Bottom nav = Day·Month·Year·Records·About. No `/today` legacy route (nothing shared yet).

**Tech Stack:** React 18 + TS, react-router v6 (HashRouter), Tailwind v4, lucide-react, Vitest.

## Global Constraints

- HashRouter; no new dependencies (icons already in `lucide-react`).
- Square corners (no `rounded-*`) on Today-tab UI; decorative icons `aria-hidden`.
- a11y: `NavLink`s have accessible names; nav keeps `aria-label="Main"`; skip-to-content link intact.
- No `/today` route and no backward-compat alias. Default `/` and unknown `*` → `/day`.
- **Delete** Trends + Climate (files + tests). **Park** Me: keep `src/tabs/Me.tsx` + `src/tabs/Me.test.tsx`, only remove it from routes + nav (do NOT delete).
- Commit trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: `shareText.ts` share URLs → `/day` `/month` `/year`

**Files:**
- Modify: `src/lib/shareText.ts` (three URL builders)
- Test: `src/lib/shareText.test.ts` (update expected URLs)

**Interfaces:**
- Produces (unchanged signatures, new output): `dayShareUrl(date)`, `monthShareUrl(year, mm)`, `yearShareUrl(year)`.

- [ ] **Step 1: Update the failing test expectations** — in `src/lib/shareText.test.ts`, change every `#/today?d=` → `#/day?d=`, `#/today?m=` → `#/month?m=`, `#/today?y=` → `#/year?y=`. (Grep the file for `/today` and fix each; e.g. the year test `expect(yearShareUrl(2023)).toMatch(/#\/today\?y=2023$/)` → `/#\/year\?y=2023$/`.)

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/shareText.test.ts`
Expected: FAIL — builders still emit `#/today?…`.

- [ ] **Step 3: Update the builders** — in `src/lib/shareText.ts`:

```ts
// dayShareUrl:
  return `${APP_URL}#/day?d=${isoOf(date)}`
// monthShareUrl:
  return `${APP_URL}#/month?m=${year}-${mm}`
// yearShareUrl:
export function yearShareUrl(year: number): string { return `${APP_URL}#/year?y=${year}` }
```
Also update the `// Deep link to a specific day/month/year (HashRouter ?… form …)` comments to name the new routes.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib/shareText.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/shareText.ts src/lib/shareText.test.ts
git commit -m "feat(nav): share URLs point to /day /month /year routes

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `Today.tsx` — mode from route, remove radiogroup, cross-nav via navigate

**Files:**
- Modify (replace with the full content below): `src/tabs/Today.tsx`
- Test (rewrite): `src/tabs/Today.test.tsx`

**Interfaces:**
- Consumes: `DayView`/`MonthView`/`YearView`; `useSummary`; `isoOf`; react-router `useSearchParams`, `useNavigate`.
- Produces: `Today({ mode }: { mode: 'day' | 'month' | 'year' })` — default export. Cross-nav: `openDay(iso)`→`navigate('/day?d=…')`, `openMonth(y,mo)`→`navigate('/month?m=…')`.

- [ ] **Step 1: Rewrite the test first** — replace `src/tabs/Today.test.tsx` with (route harness; the old radiogroup is gone):

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
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
const yearMonths = [{ mm: '06', mean: 20, normal: 18, complete: true }]

function routeFetch(u: string) {
  if (u.includes('open-meteo')) return live
  if (u.includes('daynorm')) return daynorm
  if (u.includes('summary')) return summary
  if (u.includes('/month/')) return month
  if (u.includes('/year/')) return yearMonths
  if (u.includes('/daily/')) return []
  return thisday
}
beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () => routeFetch(u) }))))
afterEach(() => vi.unstubAllGlobals())

// Mounts the three view routes so cross-mode navigate() lands.
const app = (initial: string) => render(
  <MemoryRouter initialEntries={[initial]}>
    <Routes>
      <Route path="/day" element={<Today mode="day" />} />
      <Route path="/month" element={<Today mode="month" />} />
      <Route path="/year" element={<Today mode="year" />} />
    </Routes>
  </MemoryRouter>
)

test('/day renders the Day view with a date picker, default cursor is today', async () => {
  const { container } = app('/day')
  await waitFor(() => expect(container.querySelector('input[type="date"]')).toBeTruthy())
  expect(screen.getByRole('heading', { name: /this day in history/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /go to today/i })).toBeDisabled()   // starts on today
})

test('the ◀ stepper moves the day off today (Today button re-enables)', async () => {
  const { container } = app('/day')
  await waitFor(() => expect(container.querySelector('input[type="date"]')).toBeTruthy())
  fireEvent.click(screen.getByRole('button', { name: /^previous/i }))
  expect(screen.getByRole('button', { name: /go to today/i })).not.toBeDisabled()
})

test('/day?d= deep-links to that day', async () => {
  app('/day?d=2019-07-25')
  expect(await screen.findByText('JULY')).toBeInTheDocument()
  expect(screen.getByText('25')).toBeInTheDocument()
})

test('/month?m= opens that month-year', async () => {
  app('/month?m=2019-06')
  expect(await screen.findByText(/JUNE/)).toBeInTheDocument()
  expect(await screen.findByText('2019')).toBeInTheDocument()
})

test('/month?m= with an out-of-range month falls back to the current month', async () => {
  app('/month?m=2019-13')
  expect(await screen.findByText(/this month in history/i)).toBeInTheDocument()
  expect(screen.queryByText('2019')).not.toBeInTheDocument()
})

test('/year?y= opens that year', async () => {
  app('/year?y=2015')
  expect(await screen.findByText('2015')).toBeInTheDocument()
})

test('tapping a month tile in Year view navigates to the Month view', async () => {
  app('/year')
  const tile = await screen.findByRole('gridcell', { name: /June .*Open this month/i })
  fireEvent.click(tile)
  // navigate('/month?m=2023-06') → Month route renders MonthView (CalendarTile shows JUNE)
  expect(await screen.findByText(/this month in history/i)).toBeInTheDocument()
  expect(await screen.findByText(/JUNE/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/tabs/Today.test.tsx`
Expected: FAIL — `Today` does not accept a `mode` prop yet / still renders the radiogroup.

- [ ] **Step 3: Replace `src/tabs/Today.tsx` with:**

```tsx
import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import DayView from './today/DayView'
import MonthView from './today/MonthView'
import YearView from './today/YearView'
import { useSummary } from '../data/useSummary'
import { isoOf } from '../lib/format'

type Mode = 'day' | 'month' | 'year'
const HEADINGS: Record<Mode, string> = { day: 'This Day in History', month: 'This Month in History', year: 'This Year in History' }
const NOUN: Record<Mode, string> = { day: 'day', month: 'month', year: 'year' }
const MIN_DATE = new Date(1833, 0, 1)
const midnight = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }

export default function Today({ mode }: { mode: Mode }) {
  const { summary } = useSummary()
  const now = new Date()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const dParam = params.get('d')
  const mParam = params.get('m')
  const dValid = !!dParam && /^\d{4}-\d{2}-\d{2}$/.test(dParam)
  const mMatch = mParam && /^(\d{4})-(\d{2})$/.exec(mParam)
  const yParam = params.get('y')
  const yValid = !!yParam && /^\d{4}$/.test(yParam)

  const [date, setDate] = useState<Date>(() => {
    if (dValid) {
      const parsed = midnight(new Date(dParam + 'T00:00:00'))
      const lo = midnight(MIN_DATE), hi = midnight(new Date())
      if (!isNaN(parsed.getTime()) && parsed >= lo && parsed <= hi) return parsed
    }
    return midnight(new Date())
  })
  const inMonthRange = (y: number, mo: number) =>
    mo >= 1 && mo <= 12 && y >= 1833 && (y < now.getFullYear() || (y === now.getFullYear() && mo <= now.getMonth() + 1))
  const [month, setMonth] = useState(() => (mMatch && inMonthRange(+mMatch[1], +mMatch[2]) ? +mMatch[2] : now.getMonth() + 1))
  const [monthYear, setMonthYear] = useState(() => (mMatch && inMonthRange(+mMatch[1], +mMatch[2]) ? +mMatch[1] : now.getFullYear()))
  const [year, setYear] = useState<number | null>(() => (yValid ? Math.min(now.getFullYear(), Math.max(1833, +yParam!)) : null))

  const years = summary?.annual?.map(a => a.year) ?? []
  const minYear = years.length ? Math.min(...years) : 1833
  const maxYear = years.length ? Math.max(...years) : now.getFullYear()
  const selYear = year ?? maxYear
  const mm = String(month).padStart(2, '0')
  const maxDate = midnight(now)

  const stepDay = (d: number) => { const x = new Date(date); x.setDate(x.getDate() + d); if (isoOf(x) >= isoOf(MIN_DATE) && isoOf(x) <= isoOf(maxDate)) setDate(midnight(x)) }
  const monthIdx = monthYear * 12 + (month - 1)
  const MONTH_LO = 1833 * 12 + 0
  const MONTH_HI = now.getFullYear() * 12 + now.getMonth()
  const stepMonth = (d: number) => {
    const idx = monthIdx + d
    if (idx < MONTH_LO || idx > MONTH_HI) return
    setMonthYear(Math.floor(idx / 12)); setMonth((idx % 12) + 1)
  }
  const stepYear = (d: number) => setYear(Math.min(maxYear, Math.max(minYear, selYear + d)))

  let onPrev = () => {}, onNext = () => {}, onToday = () => {}, prevDisabled = false, nextDisabled = false, todayDisabled = false
  if (mode === 'day') {
    onPrev = () => stepDay(-1); onNext = () => stepDay(1)
    prevDisabled = isoOf(date) <= isoOf(MIN_DATE); nextDisabled = isoOf(date) >= isoOf(maxDate)
    onToday = () => setDate(midnight(new Date())); todayDisabled = isoOf(date) >= isoOf(maxDate)
  } else if (mode === 'month') {
    onPrev = () => stepMonth(-1); onNext = () => stepMonth(1)
    prevDisabled = monthIdx <= MONTH_LO; nextDisabled = monthIdx >= MONTH_HI
    onToday = () => { setMonthYear(now.getFullYear()); setMonth(now.getMonth() + 1) }
    todayDisabled = monthIdx >= MONTH_HI
  } else {
    onPrev = () => stepYear(-1); onNext = () => stepYear(1)
    prevDisabled = selYear <= minYear; nextDisabled = selYear >= maxYear
    onToday = () => setYear(now.getFullYear()); todayDisabled = selYear === maxYear
  }

  const openDay = (iso: string) => navigate(`/day?d=${iso}`)
  const openMonth = (y: number, mo: number) => { if (inMonthRange(y, mo)) navigate(`/month?m=${y}-${String(mo).padStart(2, '0')}`) }

  return (
    <section className="fade-in space-y-3">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">{HEADINGS[mode]}</h2>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onToday} disabled={todayDisabled} aria-label="Go to today"
            className="border border-border px-3 py-1 text-xs font-medium text-muted transition-colors hover:text-fg disabled:opacity-40 disabled:hover:text-muted">Today</button>
          <button type="button" onClick={onPrev} disabled={prevDisabled} aria-label={`Previous ${NOUN[mode]}`}
            className="grid h-9 w-9 place-items-center border border-border text-muted transition-colors hover:text-fg disabled:opacity-40"><ChevronLeft size={18} aria-hidden /></button>
          <button type="button" onClick={onNext} disabled={nextDisabled} aria-label={`Next ${NOUN[mode]}`}
            className="grid h-9 w-9 place-items-center border border-border text-muted transition-colors hover:text-fg disabled:opacity-40"><ChevronRight size={18} aria-hidden /></button>
        </div>
      </div>

      {mode === 'day' && <DayView date={date} min={MIN_DATE} max={maxDate} onChange={setDate} />}
      {mode === 'month' && <MonthView year={monthYear} mm={mm} onPickDay={openDay} onPickMonth={openMonth} />}
      {mode === 'year' && <YearView year={selYear} onPickMonth={openMonth} onPickDay={openDay} />}
    </section>
  )
}
```
(Changes vs current: `mode` is a prop — the `useState<Mode>` mode line and the `MODES` const are gone; `useNavigate` added; the `role="radiogroup"` granularity block is removed; `openDay`/`openMonth` now `navigate` instead of `setMode`.)

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/tabs/Today.test.tsx`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
git add src/tabs/Today.tsx src/tabs/Today.test.tsx
git commit -m "feat(nav): Today takes mode from route; cross-nav via navigate

Removes the in-content Day/Month/Year radiogroup (the bottom nav is now
the switcher). Mode is a prop set per route; each route reads its own
?d/?m/?y deep link; cross-mode jumps (heatmap/tile/tally) navigate to
/day?d= or /month?m= and remount at the target period.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `App.tsx` routes + `Nav.tsx` tabs + Records link + remove Trends/Climate + unroute Me

**Files:**
- Modify: `src/App.tsx`, `src/components/Nav.tsx`, `src/tabs/Records.tsx`
- Delete: `src/tabs/Trends.tsx`, `src/tabs/Trends.test.tsx`, `src/tabs/Climate.tsx`, `src/tabs/Climate.test.tsx`
- Keep (do NOT touch): `src/tabs/Me.tsx`, `src/tabs/Me.test.tsx` (parked)
- Test: `src/App.test.tsx`, `src/tabs/Records.test.tsx`

**Interfaces:**
- Consumes: `Today` (now requires a `mode` prop, Task 2).

- [ ] **Step 1: Rewrite `src/App.tsx`:**

```tsx
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header'
import Nav from './components/Nav'
import Today from './tabs/Today'
import Records from './tabs/Records'
import About from './tabs/About'

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-dvh bg-bg text-fg">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2 focus:text-fg">Skip to content</a>
        <Header />
        <Nav />
        <main id="main" className="mx-auto max-w-[680px] px-4 pb-28 pt-4 lg:pb-12">
          <Routes>
            <Route path="/day" element={<Today key="day" mode="day" />} />
            <Route path="/month" element={<Today key="month" mode="month" />} />
            <Route path="/year" element={<Today key="year" mode="year" />} />
            <Route path="/records" element={<Records />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<Navigate to="/day" replace />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
```
(Trends/Climate/Me imports + routes removed; `/today` removed; default → `/day`.)

> **CRITICAL — the per-mode `key` props are required, not cosmetic.** All three routes render the same `Today` component type at the same tree position; React Router v6 does NOT remount on a path change between same-type sibling routes, so `Today`'s `useState` cursor initializers would not re-read the new route's `?d/?m/?y` param — a cross-mode jump (Year tile→`/month?m=…`, heatmap→`/day?d=…`, Records row→`/day?d=…`) would land on the current period instead of the tapped one. The distinct `key="day"/"month"/"year"` forces a remount so the initializer runs. (Confirmed in Task 2 by reading react-router source; the Task 2 test harness already keys its routes.) Do not omit them.

- [ ] **Step 2: Rewrite the `tabs` array in `src/components/Nav.tsx`:**

Change the import line to:
```tsx
import { Sun, CalendarDays, CalendarRange, Trophy, Info } from 'lucide-react'
```
and the array to:
```tsx
const tabs = [
  { to: '/day',     label: 'Day',     Icon: Sun },
  { to: '/month',   label: 'Month',   Icon: CalendarDays },
  { to: '/year',    label: 'Year',    Icon: CalendarRange },
  { to: '/records', label: 'Records', Icon: Trophy },
  { to: '/about',   label: 'About',   Icon: Info },
]
```
Leave the rest of `Nav.tsx` (the `<nav>`/`NavLink` markup + classes) unchanged.

- [ ] **Step 3: Update the Records deep link** — in `src/tabs/Records.tsx`, change `to={\`/today?d=\${rec.date}\`}` → `to={\`/day?d=\${rec.date}\`}`.

- [ ] **Step 4: Delete Trends + Climate**

```bash
git rm src/tabs/Trends.tsx src/tabs/Trends.test.tsx src/tabs/Climate.tsx src/tabs/Climate.test.tsx
```

- [ ] **Step 5: Update `src/App.test.tsx`** — replace the nav-link assertion. Read the file first; keep its recharts mock + fetch stub. The default-render assertion (`/this day in history/i`) still holds (default → `/day`). Replace the `trends` link assertion with the new nav set and a negative check:

```tsx
test('renders the Day tab by default with the five nav links', async () => {
  render(<App />)
  await waitFor(() => expect(screen.getByRole('heading', { name: /this day in history/i })).toBeInTheDocument())
  for (const name of [/^day$/i, /^month$/i, /^year$/i, /^records$/i, /^about$/i]) {
    expect(screen.getByRole('link', { name })).toBeInTheDocument()
  }
  expect(screen.queryByRole('link', { name: /trends|climate|^me$/i })).toBeNull()
})
```

- [ ] **Step 6: Update `src/tabs/Records.test.tsx`** — if it asserts an href, change `/today?d=` → `/day?d=`. (Grep the file for `/today`; read it and adjust the matching assertion. If it doesn't reference the href, no change.)

- [ ] **Step 7: Run affected tests, full suite, build**

Run: `npx vitest run src/App.test.tsx src/tabs/Records.test.tsx src/tabs/Today.test.tsx`
Expected: PASS.
Run: `npm test`
Expected: all files pass (Me.test still green — it renders `<Me/>` directly, unaffected by routing).
Run: `VITE_BASE=/uccle-climate/ npm run build`
Expected: succeeds (only the pre-existing Recharts chunk-size warning). Trends/Climate no longer imported → not bundled; Me unimported → tree-shaken.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(nav): first-level Day/Month/Year tabs; drop Trends/Climate; park Me

App routes /day /month /year (Today per mode) + /records + /about,
default → /day. Bottom nav = Day·Month·Year·Records·About. Records row
links to /day?d=. Trends + Climate deleted; Me kept but unrouted
(parked for later reuse).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:** routes /day/month/year/records/about + default /day ✓(T3); no /today ✓(T3); Nav 5 tabs + icons ✓(T3); Today mode-from-prop + radiogroup removed + per-mode param + cross-nav via navigate ✓(T2); Records link → /day ✓(T3); shareText URLs ✓(T1); delete Trends/Climate ✓(T3); park Me (kept, unrouted) ✓(T3); tests rewritten ✓(T2/T3).

**Placeholder scan:** T3 Steps 5–6 ask the implementer to read `App.test.tsx`/`Records.test.tsx` and adapt — justified (their exact current assertions must be matched), and the replacement test code is given for App.test. No TODO/TBD.

**Type consistency:** `Today({ mode })` prop type `'day'|'month'|'year'` identical T2↔T3 call sites (`<Today mode="day" />` etc.); `openDay(iso)`/`openMonth(y,mo)` signatures unchanged for the view props; `dayShareUrl`/`monthShareUrl`/`yearShareUrl` signatures unchanged (only output strings differ).
