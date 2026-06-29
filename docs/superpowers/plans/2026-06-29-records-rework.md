# Records Tab Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the Records tab into a flat, divided leaderboard inside one square panel, with a solid-fill Warmest/Coldest toggle (red / blue) and rows that link to the Today → Day view for each record's date.

**Architecture:** `Today.tsx` learns to read a `?d=YYYY-MM-DD` query param and start its Day cursor there (it remounts on each navigation, so a lazy state initializer suffices). `Records.tsx` is re-presented: per-row cards become an `<ol>` of dividers; each row is a React-Router `<Link to={"/today?d=<date>"}>`. The data layer (`useSummary`, `useTodayTemp`, `mergeLiveExtreme`) is unchanged.

**Tech Stack:** React 18 + TS, react-router-dom (HashRouter in app; MemoryRouter in tests), Tailwind v4 tokens, Vitest + @testing-library/react.

## Global Constraints

- **Tokens, not hex** — color via `warm`/`accent`/`muted`/`fg`/`surface`/`surface-2`/`border` (+ `text-white`). No literal hex.
- **Square corners** — no `rounded-*` on the panel, toggle, or rows.
- **a11y** — toggle keeps `role="radiogroup"`/`role="radio"`+`aria-checked`; each row link has an accessible name; no icon-only controls.
- **No PII** — dates + temps + "Uccle" only.
- **No data/pipeline change** — `summary.extremes`, `mergeLiveExtreme`, JSON shapes untouched.
- **Light + dark**; **responsive 375/768/1280**, no horizontal overflow.
- **Tests pristine** — `afterEach(() => vi.unstubAllGlobals())` where `fetch` is stubbed; mock Recharts `ResponsiveContainer` where charts render.
- **Commits** end with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

## File Structure

- `src/tabs/Today.tsx` (**modify**) — read `?d=` query param; initialize the Day cursor from it.
- `src/tabs/Today.test.tsx` (**modify**) — wrap existing renders in `MemoryRouter`; add a deep-link test.
- `src/tabs/Records.tsx` (**modify**) — flat divided leaderboard, solid-fill toggle, row→Day links.
- `src/tabs/Records.test.tsx` (**rewrite**) — toggle fill, links + hrefs, accent swap, flat rows, live merge. Wrap in `MemoryRouter`.

---

## Task 1: `Today.tsx` reads the `?d=` query param

**Files:**
- Modify: `src/tabs/Today.tsx`
- Test: `src/tabs/Today.test.tsx`

**Interfaces:**
- Consumes: `useSearchParams` from `react-router-dom`; existing module-level `MIN_DATE`, `midnight()`.
- Produces: no exported API change. New behavior: when the current location has `?d=YYYY-MM-DD` (valid, in `[1833-01-01, today]`), `Today` starts in Day mode at that date.

- [ ] **Step 1: Wrap the existing Today renders in MemoryRouter (refactor, stays green)**

`Today.tsx` will start using a router hook, which requires a Router ancestor in tests. Update `src/tabs/Today.test.tsx`:

Add the import at the top:
```tsx
import { MemoryRouter } from 'react-router-dom'
```
Change each existing `render(<Today />)` call (there are two) to:
```tsx
render(<MemoryRouter><Today /></MemoryRouter>)
```
and the one destructured form `const { container } = render(<Today />)` to:
```tsx
const { container } = render(<MemoryRouter><Today /></MemoryRouter>)
```
Leave all existing assertions unchanged.

- [ ] **Step 2: Run the existing Today tests — still green**

Run: `npx vitest run src/tabs/Today.test.tsx`
Expected: PASS (wrapping in a router changes nothing yet).

- [ ] **Step 3: Add the failing deep-link test**

Append to `src/tabs/Today.test.tsx`:
```tsx
test('deep-links to a specific day via ?d= query param', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () => routeFetch(u) })))
  render(
    <MemoryRouter initialEntries={['/today?d=2019-07-25']}>
      <Today />
    </MemoryRouter>
  )
  // Day is the default mode; the cursor must be 25 Jul 2019, not today (29 Jun 2026)
  expect(await screen.findByText('JULY')).toBeInTheDocument()
  expect(screen.getByText('25')).toBeInTheDocument()
})
```
(The CalendarTile renders header `JULY` and body `25` for that date even though the fixture has no 2019 series entry — the temp area shows "No data for this date." but the tile still renders the cursor date.)

- [ ] **Step 4: Run it to verify it fails**

Run: `npx vitest run src/tabs/Today.test.tsx -t "deep-links"`
Expected: FAIL — `Today` ignores the param and defaults to today (June), so `JULY` is absent.

- [ ] **Step 5: Implement the param read in `Today.tsx`**

Add to the imports:
```tsx
import { useSearchParams } from 'react-router-dom'
```
Inside the component, immediately after `const { summary } = useSummary()` and `const now = new Date()`, add the params hook, then change the `date` state initializer. Replace:
```tsx
  const [mode, setMode] = useState<Mode>('day')
  const [date, setDate] = useState<Date>(() => midnight(new Date()))
```
with:
```tsx
  const [params] = useSearchParams()
  const [mode, setMode] = useState<Mode>('day')
  const [date, setDate] = useState<Date>(() => {
    const d = params.get('d')
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const parsed = midnight(new Date(d + 'T00:00:00'))
      const lo = midnight(MIN_DATE)
      const hi = midnight(new Date())
      if (!isNaN(parsed.getTime()) && parsed >= lo && parsed <= hi) return parsed
    }
    return midnight(new Date())
  })
```
(Day is already the default mode, so no mode change is needed. `Today` remounts on each navigation to `/today`, so the initializer reads the param fresh each time; the Nav "Today" link — `/today` with no param — still resets to today.)

- [ ] **Step 6: Run the Today tests + a focused check**

Run: `npx vitest run src/tabs/Today.test.tsx`
Expected: PASS (all existing + the new deep-link test).

- [ ] **Step 7: Commit**

```bash
git add src/tabs/Today.tsx src/tabs/Today.test.tsx
git commit -m "feat(today): start Day cursor from a ?d=YYYY-MM-DD deep link

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `Records.tsx` flat leaderboard + linked rows

**Files:**
- Modify: `src/tabs/Records.tsx`
- Test: `src/tabs/Records.test.tsx` (rewrite)

**Interfaces:**
- Consumes: `Link` from `react-router-dom`; `useSummary`, `useTodayTemp`; `mergeLiveExtreme(list, live, dir)` from `src/lib/records.ts` (`DayExtreme = { date: string; v: number }`); `fmtTemp`, `fmtDate`, `todayISO` from `src/lib/format.ts`. The `?d=` consumer is Task 1's `Today.tsx`.
- Produces: no exported API change.

- [ ] **Step 1: Rewrite the test file (failing)**

Replace the entire contents of `src/tabs/Records.test.tsx` with:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import Records from './Records'

const summary = {
  station: { id: '', name: '', lat: 0, lon: 0 },
  baselines: { '1991-2020': 0, '1961-1990': 0 },
  annual: [],
  anomaly: { '1991-2020': [], '1961-1990': [] },
  decadal: [],
  warmingRate: { full: 0, last30: 0 },
  records: { year: 2026, highs: 0, lows: 0 },
  extremes: {
    warmest: [{ date: '1947-06-25', v: 36.6 }, { date: '1976-07-03', v: 35.9 }],
    coldest: [{ date: '1942-01-26', v: -19.5 }, { date: '1985-01-16', v: -18.0 }],
  },
  counters: { SU: [], hot30: [], TR: [], FD: [], ID: [], heatwaveDays: [], gsl: [] },
  rankings: { warmest: [], coldest: [] },
}

const openMeteoPayload = {
  current: { time: '2026-06-25T12:00', temperature_2m: 38 },
  daily: { time: ['2026-06-25'], temperature_2m_max: [38], temperature_2m_min: [20] },
}

afterEach(() => vi.unstubAllGlobals())

function stub(s: unknown = summary, live: unknown = openMeteoPayload) {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) =>
    Promise.resolve({ ok: true, json: async () => (u.includes('open-meteo') ? live : s) })))
}
const renderRecords = () => render(<MemoryRouter><Records /></MemoryRouter>)

test('Warmest is selected by default with a solid red fill', async () => {
  stub(); renderRecords()
  const warmBtn = await screen.findByRole('radio', { name: /warmest/i })
  expect(warmBtn).toHaveAttribute('aria-checked', 'true')
  expect(warmBtn.className).toContain('bg-warm')
  expect(warmBtn.className).toContain('text-white')
})

test('rows are links to the Day view for that date, with warm accent', async () => {
  stub(); renderRecords()
  const link = await screen.findByRole('link', { name: /25 Jun 1947/i })
  expect(link).toHaveAttribute('href', '/today?d=1947-06-25')
  expect(link.querySelector('.text-warm')).toBeTruthy()
})

test('toggling to Coldest swaps data, accent to blue, and shows a solid blue fill', async () => {
  stub(); renderRecords()
  await screen.findByRole('link', { name: /25 Jun 1947/i })
  fireEvent.click(screen.getByRole('radio', { name: /coldest/i }))
  const coldBtn = screen.getByRole('radio', { name: /coldest/i })
  expect(coldBtn).toHaveAttribute('aria-checked', 'true')
  expect(coldBtn.className).toContain('bg-accent')
  expect(coldBtn.className).toContain('text-white')
  const link = screen.getByRole('link', { name: /26 Jan 1942/i })
  expect(link).toHaveAttribute('href', '/today?d=1942-01-26')
  expect(link.querySelector('.text-accent')).toBeTruthy()
  expect(screen.queryByRole('link', { name: /25 Jun 1947/i })).not.toBeInTheDocument()
})

test('rows are flat — no per-row card border, list uses dividers', async () => {
  stub(); renderRecords()
  const link = await screen.findByRole('link', { name: /25 Jun 1947/i })
  expect(link.closest('li')!.className).not.toMatch(/border|rounded/)
  expect(link.closest('ol')!.className).toContain('divide-y')
})

test('today’s live datum still merges into the list', async () => {
  const s = { ...summary, extremes: { warmest: [{ date: '2019-07-25', v: 39.7 }, { date: '2026-06-25', v: 36.4 }], coldest: [] } }
  const live = { current: { time: '2026-06-26T12:00', temperature_2m: 38 }, daily: { time: ['2026-06-26'], temperature_2m_max: [38], temperature_2m_min: [20] } }
  stub(s, live); renderRecords()
  expect(await screen.findByRole('link', { name: /39\.7 °C/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /38\.0 °C/ })).toBeInTheDocument() // live today merged at 38.0
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/tabs/Records.test.tsx`
Expected: FAIL — current `Records.tsx` has no `<Link>` rows, no `bg-warm`/`text-white` toggle, no `divide-y` list.

- [ ] **Step 3: Rewrite `Records.tsx`**

Replace the entire contents of `src/tabs/Records.tsx` with:
```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSummary } from '../data/useSummary'
import { useTodayTemp } from '../data/useTodayTemp'
import { Loading, ErrorState } from '../components/States'
import { fmtTemp, fmtDate, todayISO } from '../lib/format'
import { mergeLiveExtreme } from '../lib/records'

type Mode = 'warm' | 'cold'

export default function Records() {
  const { summary, loading, error } = useSummary()
  const live = useTodayTemp()
  const [mode, setMode] = useState<Mode>('warm')
  if (loading) return <Loading label="Loading records…" />
  if (error || !summary) return <ErrorState label="Could not load data." />

  const warm = mode === 'warm'
  const today = todayISO()
  const liveDatum = live.data ? { date: today, v: warm ? live.data.tmax : live.data.tmin } : null
  const list = mergeLiveExtreme(warm ? summary.extremes.warmest : summary.extremes.coldest, liveDatum, warm ? 'warm' : 'cold').slice(0, 10)
  const accent = warm ? 'text-warm' : 'text-accent'

  return (
    <section className="fade-in space-y-4">
      <div className="border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-extrabold tracking-tight">Records</h2>
          <div role="radiogroup" aria-label="Record type" className="inline-flex border border-border text-sm">
            <button
              type="button" role="radio" aria-checked={warm} onClick={() => setMode('warm')}
              className={`px-3 py-1.5 font-semibold transition-colors ${warm ? 'bg-warm text-white' : 'text-muted hover:text-fg'}`}
            >Warmest</button>
            <button
              type="button" role="radio" aria-checked={!warm} onClick={() => setMode('cold')}
              className={`px-3 py-1.5 font-semibold transition-colors ${!warm ? 'bg-accent text-white' : 'text-muted hover:text-fg'}`}
            >Coldest</button>
          </div>
        </div>

        <p className="mt-3 text-xs text-muted">
          Top 10 {warm ? 'hottest days' : 'coldest days'} on record at Uccle (daily {warm ? 'maximum' : 'minimum'}; today included live).
        </p>

        <ol className="mt-2 border-t border-border divide-y divide-border">
          {list.map((rec, i) => (
            <li key={rec.date}>
              <Link
                to={`/today?d=${rec.date}`}
                aria-label={`${fmtDate(rec.date)} — ${fmtTemp(rec.v)}, rank ${i + 1}. Open this day`}
                className="flex items-center gap-3 py-3 transition-colors hover:bg-surface-2"
              >
                <span className="w-6 text-right text-sm font-bold text-muted">{i + 1}</span>
                <span className="flex-1 text-sm">{fmtDate(rec.date)}{rec.date === today ? ' · today' : ''}</span>
                <span className={`text-lg font-bold ${accent}`}>{rec.v.toFixed(1)}<span className="ml-0.5 text-xs">°C</span></span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run the Records tests + full suite**

Run: `npx vitest run src/tabs/Records.test.tsx && npx vitest run`
Expected: Records tests PASS; full suite green.

- [ ] **Step 5: Commit**

```bash
git add src/tabs/Records.tsx src/tabs/Records.test.tsx
git commit -m "feat(records): flat divided leaderboard, solid-fill toggle, rows link to Day view

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Verify, deploy, live-validate

**Files:** none (verification only).

- [ ] **Step 1: Full suite + production build**

Run: `npm test && VITE_BASE=/uccle-climate/ npm run build`
Expected: all vitest green; build succeeds.

- [ ] **Step 2: Push (CI deploys to Pages)**

```bash
git push origin main
```

- [ ] **Step 3: Live validation**

After CI finishes, on https://jdelsoir.github.io/uccle-climate/ :
- Records tab shows the flat divided leaderboard inside one square panel; Warmest selected = solid red, Coldest selected = solid blue; no per-row cards.
- Clicking a row opens the Today → Day view at that record's date (URL becomes `#/today?d=YYYY-MM-DD`); the day shows the expected high/low.
- Light + dark × 375/768/1280, no horizontal overflow.

---

## Self-Review

**Spec coverage:**
- Square flat panel + divided rows (no cards) → Task 2. ✓
- Solid-fill toggle, red Warmest / blue Coldest, icons dropped → Task 2. ✓
- Intro copy unchanged → Task 2. ✓
- Row → Day links (`/today?d=`) → Task 2 (links) + Task 1 (`Today` consumes the param). ✓
- Data unchanged (`mergeLiveExtreme`, live merge) → preserved in Task 2; live-merge test retained. ✓
- a11y radiogroup + accessible link names → Task 2. ✓
- Constraints (tokens, square, no PII, responsive, pristine tests) → Global Constraints + per-task. ✓

**Placeholder scan:** none — both files are shown in full; all test code is concrete.

**Type consistency:** `mergeLiveExtreme(list, live, dir)` and `DayExtreme {date,v}` match the existing lib; `Link to={"/today?d=" + rec.date}` matches the `useSearchParams().get('d')` reader in Task 1 (`?d=`); `fmtDate`/`fmtTemp` outputs (`"25 Jun 1947"`, `"36.6 °C"`) match the aria-label assertions in the tests.

**Note:** the visible temperature splits the value and `°C` across nodes (smaller `°C`), so tests assert via the link's `aria-label` (built from `fmtTemp`, a single string) and the accent class, not via `getByText('36.6 °C')`. Intentional — keeps assertions robust against the split.
