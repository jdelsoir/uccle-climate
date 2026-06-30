# Month Page — Phase B1 "How this month is changing" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quantify and visualize the Month tab's long-term climate signal — a full-record warming-rate stat, an OLS trend line on the scatter that fits the shown period, and then-vs-now windows that track the viewed year like the Day view.

**Architecture:** All app-side, no pipeline/data change. A new pure `lib/trend.ts` (OLS) feeds both a "Warming" StatCard in `MonthView` and an opt-in trend line in the shared `PeriodScatter`. A new `windowMean` helper in `lib/monthDetail.ts` replaces the fixed-window `WarmingStrip` source with viewed-year-relative windows.

**Tech Stack:** React 18 + TypeScript + Vite, Recharts (`ComposedChart`/`Line` already in the recharts dep), Vitest + Testing Library.

## Global Constraints

- **No new dependencies** (recharts `Line` ships with recharts).
- **Tokens, not hex** — trend line uses `var(--muted)`; no literal hex.
- **Square corners** on UI (no `rounded-*`); decorative chart marks stay `aria-hidden`/`role="img"` as already in `PeriodScatter`.
- **`tempColor`** stays the single source of truth for warm/cool (B1 adds no color classification).
- **Tests:** mock Recharts `ResponsiveContainer` (jsdom width(0) noise); `fireEvent` (NOT `userEvent`) is the project convention; `fetch`-stubbing tests add `afterEach(() => vi.unstubAllGlobals())`.
- **`perDecade` convention:** per-year slope × 10 (matches the pipeline's `ols_slope_per_decade`).
- **Relative windows:** recent `[year-11, year-1]`, then `[year-111, year-101]`; hide when either is empty (exact parity with Day view).
- **Commit messages** end with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: `lib/trend.ts` — OLS linear regression

**Files:**
- Create: `src/lib/trend.ts`
- Test: `src/lib/trend.test.ts`

**Interfaces:**
- Produces:
  - `interface Line { slope: number; intercept: number }`
  - `linregress(points: { x: number; y: number }[]): Line | null` — OLS; `null` for <2 points or zero variance in x.
  - `perDecade(slope: number): number` — `slope * 10`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/trend.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { linregress, perDecade } from './trend'

describe('linregress', () => {
  it('recovers slope and intercept of an exact line y = 2x + 1', () => {
    const fit = linregress([{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }])
    expect(fit).not.toBeNull()
    expect(fit!.slope).toBeCloseTo(2, 10)
    expect(fit!.intercept).toBeCloseTo(1, 10)
  })
  it('fits a best-fit slope through noisy points', () => {
    const fit = linregress([{ x: 2000, y: 10 }, { x: 2010, y: 11 }, { x: 2020, y: 12 }])
    expect(fit!.slope).toBeCloseTo(0.1, 10)   // +1°C per 10 years
  })
  it('returns null for fewer than 2 points', () => {
    expect(linregress([])).toBeNull()
    expect(linregress([{ x: 1, y: 1 }])).toBeNull()
  })
  it('returns null when all x are identical (zero variance)', () => {
    expect(linregress([{ x: 5, y: 1 }, { x: 5, y: 9 }])).toBeNull()
  })
})

describe('perDecade', () => {
  it('multiplies a per-year slope by 10', () => {
    expect(perDecade(0.1)).toBeCloseTo(1, 10)
    expect(perDecade(0.018)).toBeCloseTo(0.18, 10)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/trend.test.ts`
Expected: FAIL — cannot resolve `./trend`.

- [ ] **Step 3: Implement**

Create `src/lib/trend.ts`:

```ts
export interface Line { slope: number; intercept: number }

export function linregress(points: { x: number; y: number }[]): Line | null {
  const n = points.length
  if (n < 2) return null
  let sx = 0, sy = 0, sxx = 0, sxy = 0
  for (const { x, y } of points) { sx += x; sy += y; sxx += x * x; sxy += x * y }
  const denom = n * sxx - sx * sx
  if (denom === 0) return null
  const slope = (n * sxy - sx * sy) / denom
  return { slope, intercept: (sy - slope * sx) / n }
}

export const perDecade = (slope: number): number => slope * 10
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/trend.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trend.ts src/lib/trend.test.ts
git commit -m "feat(lib): trend — OLS linregress + perDecade

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `PeriodScatter` — opt-in OLS trend line

**Files:**
- Modify: `src/components/PeriodScatter.tsx`
- Test: `src/components/PeriodScatter.test.tsx` (create)

**Interfaces:**
- Consumes: `linregress` (Task 1).
- Produces: `PeriodScatter` gains an optional prop `trendKey?: string`. When set and ≥2 shown points have a numeric `row[trendKey]`, it fits OLS over the shown points, augments each shown row with a `__trend` value, renders a dashed muted `<Line dataKey="__trend">`, and shows a **legend entry** `trend · shown period` (the test hook). Re-fits when the period `<select>` changes.

- [ ] **Step 1: Write the failing test**

Create `src/components/PeriodScatter.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PeriodScatter from './PeriodScatter'

vi.mock('recharts', async (o) => { const a = await o<typeof import('recharts')>()
  return { ...a, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 800, height: 240 }}>{children}</div> } })

const data = [{ year: 2000, mean: 16 }, { year: 2010, mean: 17 }, { year: 2020, mean: 18 }]
const series = [{ key: 'mean', name: 'June mean', color: 'var(--accent)' }]

describe('PeriodScatter trend line', () => {
  it('shows a trend legend entry when trendKey is set and ≥2 points are shown', () => {
    render(<PeriodScatter title="Every June mean" data={data} series={series} trendKey="mean" />)
    expect(screen.getByText(/trend · shown period/i)).toBeInTheDocument()
  })
  it('shows no trend entry without trendKey', () => {
    render(<PeriodScatter title="Every June mean" data={data} series={series} />)
    expect(screen.queryByText(/trend · shown period/i)).not.toBeInTheDocument()
  })
  it('shows no trend entry when fewer than 2 points are present', () => {
    render(<PeriodScatter title="Every June mean" data={[{ year: 2020, mean: 18 }]} series={series} trendKey="mean" />)
    expect(screen.queryByText(/trend · shown period/i)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/PeriodScatter.test.tsx`
Expected: FAIL — `trendKey` does nothing yet; the trend legend text is never rendered.

- [ ] **Step 3: Implement**

Edit `src/components/PeriodScatter.tsx`. (a) Add `Line` to the recharts import and import `linregress`:

```tsx
import { Scatter, XAxis, YAxis, ResponsiveContainer, ComposedChart, CartesianGrid, Tooltip, Line } from 'recharts'
import { linregress } from '../lib/trend'
```

(b) Add `trendKey` to the prop type:

```tsx
export default function PeriodScatter({ data, series, title, trendKey }: {
  data: Row[]; series: { key: string; name: string; color: string }[]; title: string; trendKey?: string
}) {
```

(c) After `const shown = data.filter(...)`, fit the trend and build the chart rows:

```tsx
  const fit = trendKey
    ? linregress(shown.filter(d => typeof d[trendKey] === 'number').map(d => ({ x: d.year, y: d[trendKey] as number })))
    : null
  const rows = fit ? shown.map(d => ({ ...d, __trend: fit.intercept + fit.slope * d.year })) : shown
```

(d) In the legend `<p>`, add the trend entry after the series spans (before the `(°C)` text):

```tsx
      <p className="mb-1 text-xs text-muted">
        {series.map(s => <span key={s.key} className="mr-3"><span style={{ color: s.color }} aria-hidden>●</span> {s.name}</span>)}
        {fit && <span className="mr-3"><span className="text-muted" aria-hidden>– –</span> trend · shown period</span>}
        (°C)
      </p>
```

(e) Change the chart to render `rows` and add the `<Line>` after the `<Scatter>`s:

```tsx
          <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="year" tick={{ fill: 'var(--muted)', fontSize: 11 }} stroke="var(--border)" />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} stroke="var(--border)" />
            <Tooltip contentStyle={tooltipStyle} />
            {series.map(s => <Scatter key={s.key} name={s.name} dataKey={s.key} fill={s.color} />)}
            {fit && <Line type="linear" dataKey="__trend" name="trend · shown period"
              stroke="var(--muted)" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />}
          </ComposedChart>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/PeriodScatter.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/PeriodScatter.tsx src/components/PeriodScatter.test.tsx
git commit -m "feat(component): PeriodScatter — opt-in OLS trend line (fits shown period)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `lib/monthDetail.ts` — `windowMean`

**Files:**
- Modify: `src/lib/monthDetail.ts` (append)
- Test: `src/lib/monthDetail.test.ts` (append)

**Interfaces:**
- Produces: `windowMean(series: { year: number; mean: number; complete: boolean }[], from: number, to: number): number | null` — mean of `mean` over complete years in `[from, to]`, rounded to 1 decimal; `null` when none.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/monthDetail.test.ts` (add `windowMean` to the existing import from `./monthDetail`):

```ts
import { windowMean } from './monthDetail'   // merge into the existing import line

describe('windowMean', () => {
  const series = [
    { year: 1918, mean: 14, complete: true },
    { year: 1922, mean: 16, complete: true },
    { year: 1950, mean: 99, complete: false },   // incomplete → excluded
    { year: 2020, mean: 18, complete: true },
  ]
  it('averages complete years inside the window, rounded to 1 decimal', () => {
    expect(windowMean(series, 1915, 1925)).toBe(15)     // (14+16)/2
  })
  it('excludes incomplete years', () => {
    expect(windowMean(series, 1949, 1951)).toBeNull()   // only the incomplete 1950 is in range
  })
  it('returns null when no complete year falls in the window', () => {
    expect(windowMean(series, 1700, 1800)).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/monthDetail.test.ts`
Expected: FAIL — `windowMean` is not exported.

- [ ] **Step 3: Implement**

Append to `src/lib/monthDetail.ts`:

```ts
export function windowMean(series: { year: number; mean: number; complete: boolean }[], from: number, to: number): number | null {
  const vals = series.filter(s => s.complete && s.year >= from && s.year <= to).map(s => s.mean)
  if (!vals.length) return null
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/monthDetail.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/monthDetail.ts src/lib/monthDetail.test.ts
git commit -m "feat(lib): monthDetail — windowMean for viewed-year-relative then/now

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: `MonthView` — warming StatCard, trend line, relative then-now

**Files:**
- Modify: `src/tabs/today/MonthView.tsx`
- Test: `src/tabs/today/MonthView.test.tsx`

**Interfaces:**
- Consumes: `linregress`/`perDecade` (Task 1), `PeriodScatter` `trendKey` prop (Task 2), `windowMean` (Task 3).
- Produces: no new exports — wires B1 into the Month view.

- [ ] **Step 1: Write the failing test + fix the legacy fixture**

In `src/tabs/today/MonthView.test.tsx`:

(a) The legacy `month` fixture (in the `describe('existing MonthView behaviour')` block) currently has no year in the `[year-111, year-101]` then-window, so under relative windows its `A warming June` strip would vanish and the existing assertion at `expect(screen.getByText(/A warming June/))` would break. Add a then-window year to that fixture's `series`:

```ts
  const month = {
    mm: '06', normal: 17.0,
    series: [{ year: 1920, mean: 15, complete: true }, { year: 2000, mean: 16, complete: true }, { year: 2020, mean: 21, complete: true }, { year: 2026, mean: 18.4, complete: true }],
    recordWarm: { year: 2020, v: 21 }, recordCold: { year: 2000, v: 16 },
    thenNow: { early: { from: 1833, to: 1900, mean: 16.1 }, recent: { from: 1996, to: 2025, mean: 18.0 } },
  }
```

(For `year=2026`: recent `[2015,2025]` → {2020:21} → 21.0; then `[1915,1925]` → {1920:15} → 15.0, so the strip renders.)

(b) Add a dedicated B1 test (place it inside the `describe('existing MonthView behaviour')` block, after the existing tests). It reuses `stubFetch`/`month` from that block:

```tsx
  it('B1: shows the warming rate stat and viewed-year-relative then-now windows', async () => {
    stubFetch({
      'month/06.json': month,
      'daynorm.json': { '1991-2020': [], '1961-1990': [] },
      'daily/2026.json': [],
    })
    render(<MonthView mm="06" year={2026} onPickDay={vi.fn()} onPickMonth={vi.fn()} />)
    // warming-rate StatCard (full record, since the earliest complete year 1920)
    expect(await screen.findByText('Warming')).toBeInTheDocument()
    expect(screen.getByText(/°C\/decade/)).toBeInTheDocument()
    expect(screen.getByText('since 1920')).toBeInTheDocument()
    // then-now windows are viewed-year-relative (2026 → then 1915–1925, recent 2015–2025), not the fixed 1833–1900/1996–2025
    expect(screen.getByText('1915–1925')).toBeInTheDocument()
    expect(screen.getByText('2015–2025')).toBeInTheDocument()
    expect(screen.queryByText('1833–1900')).not.toBeInTheDocument()
  })
```

(Note: `1915–1925`/`2015–2025` use the en-dash `–`, matching `WarmingStrip`'s `{from}–{to}` output.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/tabs/today/MonthView.test.tsx`
Expected: FAIL — no "Warming" card; then-now still shows fixed `1833–1900` window (from `data.thenNow`).

- [ ] **Step 3: Implement the MonthView changes**

Edit `src/tabs/today/MonthView.tsx`:

(a) Add imports (merge `windowMean` into the existing `monthDetail` import; add the trend import):

```tsx
import { monthDays, dayMix, recordsBroken, topWarmest, topColdest, windowMean } from '../../lib/monthDetail'
import { linregress, perDecade } from '../../lib/trend'
```

(b) Replace the two `data.thenNow`-based lines (currently):

```tsx
  const tn = data.thenNow
  const warmingDelta = tn.early.mean != null && tn.recent.mean != null ? Math.round((tn.recent.mean - tn.early.mean) * 10) / 10 : null
```

with the warming fit + viewed-year-relative windows:

```tsx
  const fit = linregress(complete.map(s => ({ x: s.year, y: s.mean })))
  const ratePerDecade = fit ? Math.round(perDecade(fit.slope) * 100) / 100 : null
  const firstComplete = complete.length ? Math.min(...complete.map(s => s.year)) : null
  const recentFrom = year - 11, recentTo = year - 1, thenFrom = year - 111, thenTo = year - 101
  const recentMean = windowMean(data.series, recentFrom, recentTo)
  const thenMean = windowMean(data.series, thenFrom, thenTo)
```

(c) Add the "Warming" StatCard as the last card in the 2×2 grid (immediately after the `Coldest ${name}` StatCard, still inside the `<div className="grid ...">`):

```tsx
        {ratePerDecade != null && (
          <StatCard label="Warming"
            value={`${ratePerDecade > 0 ? '+' : ''}${ratePerDecade.toFixed(2)} °C/decade`}
            sub={firstComplete != null ? `since ${firstComplete}` : 'full record'}
            valueClass={ratePerDecade > 0 ? 'text-warm' : ratePerDecade < 0 ? 'text-accent' : 'text-fg'} />
        )}
```

(d) Replace the `WarmingStrip` block (currently keyed on `warmingDelta`/`tn`):

```tsx
      {warmingDelta != null && (
        <WarmingStrip label={`A warming ${name}`}
          then={{ mean: tn.early.mean!, from: tn.early.from, to: tn.early.to }}
          recent={{ mean: tn.recent.mean!, from: tn.recent.from, to: tn.recent.to }}
          delta={warmingDelta} />
      )}
```

with the relative-window version:

```tsx
      {thenMean != null && recentMean != null && (
        <WarmingStrip label={`A warming ${name}`}
          then={{ mean: thenMean, from: thenFrom, to: thenTo }}
          recent={{ mean: recentMean, from: recentFrom, to: recentTo }}
          delta={Math.round((recentMean - thenMean) * 10) / 10} />
      )}
```

(e) Add `trendKey="mean"` to the `PeriodScatter`:

```tsx
      <PeriodScatter title={`Every ${name} mean`} data={complete.map(s => ({ year: s.year, mean: s.mean }))}
        series={[{ key: 'mean', name: `${name} mean`, color: 'var(--accent)' }]} trendKey="mean" />
```

- [ ] **Step 4: Run the focused test + full suite + typecheck**

Run: `npx vitest run src/tabs/today/MonthView.test.tsx`
Expected: PASS (all MonthView tests, incl. the new B1 test and the still-passing legacy `A warming June`).
Run: `npm test`
Expected: PASS (full vitest suite).
Run: `npx tsc --noEmit`
Expected: no NEW app-code errors (repo has pre-existing test-global tsc noise + 1 pre-existing DayView error, unrelated). Confirm `tn`/`warmingDelta` are fully removed so no "unused"/"undefined" errors remain.

- [ ] **Step 5: Commit**

```bash
git add src/tabs/today/MonthView.tsx src/tabs/today/MonthView.test.tsx
git commit -m "feat(month): warming-rate stat, scatter trend line, viewed-year-relative then-now

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Full verification + ship

**Files:** none (verification only)

- [ ] **Step 1: Full suites**

Run: `npm test`
Expected: PASS (all vitest).
Run: `python3 -m pytest scripts/uccle/tests/ -q`
Expected: PASS (unchanged — B1 touches no pipeline code).

- [ ] **Step 2: Prod build (CI parity)**

Run: `VITE_BASE=/uccle-climate/ npm run build`
Expected: builds, no type errors.

- [ ] **Step 3: Ship per the standing workflow**

Merge the branch to `main`, push (CI deploys), then validate it shipped on the live site (bundle hash matches a fresh build from `main` HEAD, or visual check of the Month tab: Warming stat card, dashed trend line on the scatter, and a then-now strip whose window years track the viewed year).

---

## Self-Review

**Spec coverage** (spec → task):
- `lib/trend.ts` `linregress` + `perDecade` → Task 1 ✓
- Warming-rate StatCard (full-record, `since {firstComplete}`, hidden <2 yrs) → Task 4 ✓
- Opt-in trend line fitting the shown period on `PeriodScatter` → Task 2 (component) + Task 4 (`trendKey="mean"`) ✓
- Then-now parity via `windowMean` + relative windows, hidden when empty → Task 3 (helper) + Task 4 (wiring) ✓
- Day/Year scatter unchanged (no `trendKey`) → Task 2 leaves the prop optional; Task 4 only sets it on Month ✓
- No pipeline change; `data.thenNow` left emitted but unused → Task 4 stops consuming it (noted) ✓
- Conventions (tokens, no new deps, fireEvent, ResponsiveContainer mock, square corners) → enforced per task ✓

**Placeholder scan:** none — every code/test step has concrete content.

**Type consistency:** `Line { slope, intercept }` and `linregress`/`perDecade` signatures identical across Tasks 1/2/4; `windowMean(series, from, to)` signature identical in Tasks 3/4; `PeriodScatter` `trendKey?: string` matches the `trendKey="mean"` call site; `WarmingStrip` props (`then/recent {mean,from,to}`, `delta`) unchanged and fed correctly; the removed `tn`/`warmingDelta` locals are replaced everywhere they were used (the `WarmingStrip` block in Task 4 (d)).
