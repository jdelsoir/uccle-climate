# Year Phase C2 — Detail + Share Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four client-side pieces to the Year screen — a daily-anomaly barcode strip (#1), a records tally (#5), a year counters card (#4), and a share card + `?y=` deep link (#10).

**Architecture:** All app-side from existing data: `summary.counters` (already loaded) for counters; a new `useDaily(year)`+`useDayNorm()` in `YearView` for the strip and tally; reuses `anomalyColor`/`RAMP`, and the `MonthCounters`/`NotableDays`/Month-share patterns. No pipeline change.

**Tech Stack:** React 18 + TypeScript + Tailwind v4, Recharts (existing), lucide-react, `html-to-image` (via `lib/share.ts`), Vitest.

## Global Constraints

- **Square corners** (no `rounded-*`) on Today-tab UI; decorative SVG/glyph `aria-hidden`.
- **Tokens not hex** for color; the only hex is in `lib/ramp.ts`, consumed via `anomalyColor` (`lib/colorScale.ts`). The barcode strip uses the continuous 16-step ramp by design (not `tempColor`).
- **No PII**: share card = derived stats + "Uccle, Brussels" + app URL only.
- **No new dependencies**; no external fonts/CDNs.
- `fetch`-stubbing tests add `afterEach(() => vi.unstubAllGlobals())`; avoid date-coupled fixtures; mock Recharts `ResponsiveContainer` only where a chart renders.
- a11y: single-select toggles use `role="radiogroup"`/`role="radio"`+`aria-checked`; every control has an accessible name; decorative icons `aria-hidden`.
- Commit trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: `shareText.ts` — year share sentence + caption

**Files:**
- Modify: `src/lib/shareText.ts` (append 3 functions)
- Test: `src/lib/shareText.test.ts` (create if absent; otherwise append)

**Interfaces:**
- Consumes: `APP_URL`, `ordinal` (from `./format`), `HeroKey` (from `./heroState`) — all already imported at the top of `shareText.ts`.
- Produces:
  - `yearShareSentence({ year, key, rank, total, complete }: { year: number; key: HeroKey; rank: number | null; total: number | null; complete: boolean }): string`
  - `yearShareUrl(year: number): string`
  - `yearShareCaption(sentence: string, year: number): string`

- [ ] **Step 1: Write failing tests** — create/append `src/lib/shareText.test.ts`:

```ts
import { it, expect } from 'vitest'
import { yearShareSentence, yearShareUrl, yearShareCaption } from './shareText'

it('year sentence: warmest year on record', () => {
  expect(yearShareSentence({ year: 2023, key: 'record-hot', rank: 1, total: 190, complete: true }))
    .toBe('2023 was the warmest year on record.')
})
it('year sentence: nth warmest with rank + total', () => {
  expect(yearShareSentence({ year: 2020, key: 'above', rank: 3, total: 190, complete: true }))
    .toBe('2020 was the 3rd warmest year in 190 years.')
})
it('year sentence: coldest and typical', () => {
  expect(yearShareSentence({ year: 1963, key: 'record-cold', rank: null, total: null, complete: true }))
    .toBe('1963 was the coldest year on record.')
  expect(yearShareSentence({ year: 1975, key: 'close', rank: 90, total: 190, complete: true }))
    .toBe('1975 was a typical year.')
})
it('year sentence: incomplete year runs "so far"', () => {
  expect(yearShareSentence({ year: 2026, key: 'above', rank: null, total: null, complete: false }))
    .toMatch(/^2026 so far/)
})
it('year caption appends the ?y= deep link', () => {
  expect(yearShareUrl(2023)).toMatch(/#\/today\?y=2023$/)
  expect(yearShareCaption('X.', 2023)).toBe(`X.\n${yearShareUrl(2023)}`)
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/lib/shareText.test.ts`
Expected: FAIL — `yearShareSentence` not exported.

- [ ] **Step 3: Implement** — append to `src/lib/shareText.ts`:

```ts
export function yearShareSentence({ year, key, rank, total, complete }: {
  year: number; key: HeroKey; rank: number | null; total: number | null; complete: boolean
}): string {
  if (!complete) {
    switch (key) {
      case 'record-hot': case 'above': return `${year} so far is running warmer than usual.`
      case 'record-cold': case 'below': return `${year} so far is running cooler than usual.`
      default: return `${year} so far is running about average.`
    }
  }
  switch (key) {
    case 'record-hot': return `${year} was the warmest year on record.`
    case 'record-cold': return `${year} was the coldest year on record.`
    case 'above':
      return rank != null && total != null
        ? `${year} was the ${ordinal(rank)} warmest year in ${total} years.`
        : `${year} was warmer than usual.`
    case 'below': return `${year} was cooler than usual.`
    case 'close': default: return `${year} was a typical year.`
  }
}

export function yearShareUrl(year: number): string { return `${APP_URL}#/today?y=${year}` }
export function yearShareCaption(sentence: string, year: number): string { return `${sentence}\n${yearShareUrl(year)}` }
```

> NOTE: confirm `HeroKey` and `ordinal` are already imported at the top of `shareText.ts` (they are used by `shareSentence`). If `HeroKey`'s union lacks any of `record-hot`/`record-cold`/`above`/`below`/`close`, read `heroState.ts` and use the actual literals.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib/shareText.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/shareText.ts src/lib/shareText.test.ts
git commit -m "feat(year): yearShareSentence/Url/Caption for the Year share card

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `YearStrip` — daily-anomaly barcode

**Files:**
- Create: `src/components/YearStrip.tsx`
- Test: `src/components/YearStrip.test.tsx`

**Interfaces:**
- Consumes: `anomalyColor` (`src/lib/colorScale.ts`, `(v: number, span?) => string` mapping anomaly → `RAMP` hex); `DailyPoint` (`src/types.ts`, `{mmdd,tmax,tmin,provisional?,recHi?,recLo?}`).
- Produces: `YearStrip({ year, days, normalFor }: { year: number; days: DailyPoint[]; normalFor: (mmdd: string) => number | null })` — default export.

- [ ] **Step 1: Write failing test** — create `src/components/YearStrip.test.tsx`:

```tsx
import { it, expect } from 'vitest'
import { render } from '@testing-library/react'
import YearStrip from './YearStrip'
import type { DailyPoint } from '../types'
import { anomalyColor } from '../lib/colorScale'

const d = (mmdd: string, tmax: number, tmin: number): DailyPoint => ({ mmdd, tmax, tmin })

it('renders one rect per day', () => {
  const { container } = render(<YearStrip year={2020} days={[d('0101', 5, 1), d('0102', 6, 2)]} normalFor={() => 3} />)
  expect(container.querySelectorAll('rect')).toHaveLength(2)
})
it('colors a hot day with the warm-anomaly ramp color', () => {
  const { container } = render(<YearStrip year={2020} days={[d('0701', 30, 20)]} normalFor={() => 18} />)
  expect(container.querySelector('rect')!.getAttribute('fill')).toBe(anomalyColor((30 + 20) / 2 - 18))
})
it('uses a neutral fill when the normal is missing', () => {
  const { container } = render(<YearStrip year={2020} days={[d('0101', 5, 1)]} normalFor={() => null} />)
  expect(container.querySelector('rect')!.getAttribute('fill')).toBe('var(--surface-2)')
})
it('renders nothing for an empty year', () => {
  const { container } = render(<YearStrip year={2020} days={[]} normalFor={() => 3} />)
  expect(container.querySelector('svg')).toBeNull()
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/components/YearStrip.test.tsx`
Expected: FAIL — cannot resolve `./YearStrip`.

- [ ] **Step 3: Implement** — create `src/components/YearStrip.tsx`:

```tsx
import { anomalyColor } from '../lib/colorScale'
import type { DailyPoint } from '../types'

const H = 48

export default function YearStrip({ year, days, normalFor }: {
  year: number; days: DailyPoint[]; normalFor: (mmdd: string) => number | null
}) {
  if (!days.length) return null
  const w = 100 / days.length
  let warm = 0, cool = 0
  const rects = days.map((d, i) => {
    const normal = normalFor(d.mmdd)
    const anom = normal == null ? null : (d.tmax + d.tmin) / 2 - normal
    if (anom != null) { if (anom > 0) warm++; else if (anom < 0) cool++ }
    const fill = anom == null ? 'var(--surface-2)' : anomalyColor(anom)
    return <rect key={d.mmdd} x={i * w} y={0} width={w + 0.3} height={H} fill={fill} />
  })
  return (
    <div className="border border-border bg-surface p-5">
      <p className="mb-3 text-[11px] uppercase tracking-[0.09em] text-muted">{year} day by day</p>
      <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" width="100%" height={H} className="block"
        role="img" aria-label={`${year}: ${warm} days warmer, ${cool} days cooler than the 1991–2020 normal`}>
        {rects}
      </svg>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/components/YearStrip.test.tsx`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add src/components/YearStrip.tsx src/components/YearStrip.test.tsx
git commit -m "feat(year): YearStrip daily-anomaly barcode (16-step ramp)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `YearCounters` + extract shared counter rows

**Files:**
- Create: `src/lib/counterRows.tsx` (shared `COUNTER_ROWS` + `CounterKey`)
- Modify: `src/components/MonthCounters.tsx` (use the shared rows instead of its local `ROWS`/`Key`)
- Create: `src/components/YearCounters.tsx`
- Test: `src/components/YearCounters.test.tsx`

**Interfaces:**
- Consumes: `Summary['counters']` (`src/types.ts`: `{ SU: CounterPoint[]; hot30: …; TR: …; FD: …; ID: …; heatwaveDays: …; gsl: … }`, `CounterPoint = {year:number;n:number}`).
- Produces:
  - `counterRows.tsx`: `export type CounterKey = 'SU'|'hot30'|'TR'|'FD'|'ID'`; `export const COUNTER_ROWS: { key: CounterKey; label: string; Icon: typeof Sun }[]`.
  - `YearCounters({ year, counters, incomplete }: { year: number; counters: Summary['counters']; incomplete: boolean })` — default export.

- [ ] **Step 1: Extract the shared rows** — create `src/lib/counterRows.tsx`:

```tsx
import { Sun, Flame, MoonStar, Snowflake, ThermometerSnowflake } from 'lucide-react'

export type CounterKey = 'SU' | 'hot30' | 'TR' | 'FD' | 'ID'

export const COUNTER_ROWS: { key: CounterKey; label: string; Icon: typeof Sun }[] = [
  { key: 'SU', label: 'summer days', Icon: Sun },
  { key: 'hot30', label: 'hot days', Icon: Flame },
  { key: 'TR', label: 'tropical nights', Icon: MoonStar },
  { key: 'FD', label: 'frost days', Icon: Snowflake },
  { key: 'ID', label: 'ice days', Icon: ThermometerSnowflake },
]
```

- [ ] **Step 2: Point `MonthCounters` at the shared rows** — in `src/components/MonthCounters.tsx`, remove the local `ROWS` array and the local `type Key`/icon imports, and instead:

```tsx
import { COUNTER_ROWS, type CounterKey } from '../lib/counterRows'

type Counts = Record<CounterKey, number>

export default function MonthCounters({ name, counts, normals, soFar }: {
  name: string; counts: Counts; normals: Counts | null; soFar: boolean
}) {
  const shown = COUNTER_ROWS.filter(r => (normals?.[r.key] ?? 0) >= 0.5 || counts[r.key] > 0)
  if (!shown.length) return null
  return (
    <div className="border border-border bg-surface p-5">
      <p className="mb-2 text-[11px] uppercase tracking-[0.09em] text-muted">This {name} {soFar ? 'so far' : 'by the numbers'}</p>
      <ul className="border-t border-border divide-y divide-border">
        {shown.map(({ key, label, Icon }) => (
          <li key={key} className="flex items-center gap-3 py-2.5">
            <Icon size={16} className="text-muted" aria-hidden />
            <span className="text-lg font-bold text-fg">{counts[key]}</span>
            <span className="flex-1 text-sm">{label}</span>
            {normals && <span className="text-xs text-muted">normal {normals[key].toFixed(1)}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: Verify `MonthCounters` tests still pass** (behavior is unchanged)

Run: `npx vitest run src/components/MonthCounters.test.tsx`
Expected: PASS (no changes to output).

- [ ] **Step 4: Write failing test** — create `src/components/YearCounters.test.tsx`:

```tsx
import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import YearCounters from './YearCounters'
import type { Summary } from '../types'

const cp = (pairs: [number, number][]) => pairs.map(([year, n]) => ({ year, n }))
const counters = {
  SU: cp([[1991, 10], [2020, 20], [2023, 40]]),   // normal (10+20)/2 = 15.0, 2023 count 40
  hot30: cp([[1991, 0], [2020, 2], [2023, 5]]),
  TR: cp([[2023, 0]]),                              // normal null + count 0 → hidden row
  FD: cp([[1991, 60], [2020, 40], [2023, 12]]),
  ID: cp([[1991, 4], [2020, 2], [2023, 1]]),
  heatwaveDays: cp([]), gsl: cp([]),
} as unknown as Summary['counters']

it('shows the viewed-year count and the 1991-2020 normal', () => {
  render(<YearCounters year={2023} counters={counters} incomplete={false} />)
  expect(screen.getByText('40')).toBeInTheDocument()          // SU 2023 count
  expect(screen.getByText(/normal 15\.0/)).toBeInTheDocument() // SU normal
  expect(screen.getByText(/by the numbers/)).toBeInTheDocument()
})
it('hides a counter with no normal and zero count, and says "so far" when incomplete', () => {
  render(<YearCounters year={2023} counters={counters} incomplete={true} />)
  expect(screen.queryByText('tropical nights')).toBeNull()
  expect(screen.getByText(/so far/)).toBeInTheDocument()
})
it('renders nothing when every counter is zero/absent', () => {
  const empty = { SU: [], hot30: [], TR: [], FD: [], ID: [], heatwaveDays: [], gsl: [] } as unknown as Summary['counters']
  const { container } = render(<YearCounters year={2023} counters={empty} incomplete={false} />)
  expect(container.firstChild).toBeNull()
})
```

- [ ] **Step 5: Run to verify fail**

Run: `npx vitest run src/components/YearCounters.test.tsx`
Expected: FAIL — cannot resolve `./YearCounters`.

- [ ] **Step 6: Implement** — create `src/components/YearCounters.tsx`:

```tsx
import { COUNTER_ROWS, type CounterKey } from '../lib/counterRows'
import type { Summary } from '../types'

export default function YearCounters({ year, counters, incomplete }: {
  year: number; counters: Summary['counters']; incomplete: boolean
}) {
  const countFor = (k: CounterKey) => counters[k].find(p => p.year === year)?.n ?? 0
  const normalFor = (k: CounterKey) => {
    const vs = counters[k].filter(p => p.year >= 1991 && p.year <= 2020).map(p => p.n)
    return vs.length ? Math.round((vs.reduce((s, x) => s + x, 0) / vs.length) * 10) / 10 : null
  }
  const rows = COUNTER_ROWS
    .map(r => ({ ...r, count: countFor(r.key), normal: normalFor(r.key) }))
    .filter(r => (r.normal ?? 0) >= 0.5 || r.count > 0)
  if (!rows.length) return null
  return (
    <div className="border border-border bg-surface p-5">
      <p className="mb-2 text-[11px] uppercase tracking-[0.09em] text-muted">This year {incomplete ? 'so far' : 'by the numbers'}</p>
      <ul className="border-t border-border divide-y divide-border">
        {rows.map(({ key, label, Icon, count, normal }) => (
          <li key={key} className="flex items-center gap-3 py-2.5">
            <Icon size={16} className="text-muted" aria-hidden />
            <span className="text-lg font-bold text-fg">{count}</span>
            <span className="flex-1 text-sm">{label}</span>
            {normal != null && <span className="text-xs text-muted">normal {normal.toFixed(1)}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 7: Run to verify pass** (both new + MonthCounters)

Run: `npx vitest run src/components/YearCounters.test.tsx src/components/MonthCounters.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/counterRows.tsx src/components/MonthCounters.tsx src/components/YearCounters.tsx src/components/YearCounters.test.tsx
git commit -m "feat(year): YearCounters card + shared COUNTER_ROWS

Extract the counter row/icon/label table to lib/counterRows so Month
and Year counters stay in lockstep. YearCounters derives per-year
counts + 1991-2020 normals from summary.counters.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: `RecordsTally` — expandable daily-record list

**Files:**
- Create: `src/components/RecordsTally.tsx`
- Test: `src/components/RecordsTally.test.tsx`

**Interfaces:**
- Consumes: `DailyPoint` (`src/types.ts`); `fmtMonth` (`src/lib/format.ts`, full month name).
- Produces: `RecordsTally({ year, days, onPickDay }: { year: number; days: DailyPoint[]; onPickDay: (iso: string) => void })` — default export.

- [ ] **Step 1: Write failing test** — create `src/components/RecordsTally.test.tsx`:

```tsx
import { it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RecordsTally from './RecordsTally'
import type { DailyPoint } from '../types'

const d = (mmdd: string, tmax: number, tmin: number, extra: Partial<DailyPoint> = {}): DailyPoint => ({ mmdd, tmax, tmin, ...extra })

it('returns null when there are no records', () => {
  const { container } = render(<RecordsTally year={2023} days={[d('0101', 5, 1)]} onPickDay={vi.fn()} />)
  expect(container.firstChild).toBeNull()
})
it('counts highs and lows and lists highs (hottest first) by default', () => {
  const days = [d('0715', 36.4, 20, { recHi: true }), d('0824', 35.1, 19, { recHi: true }), d('0120', 2, -8, { recLo: true })]
  render(<RecordsTally year={2023} days={days} onPickDay={vi.fn()} />)
  expect(screen.getByRole('radio', { name: /2 highs/i })).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: /1 lows/i })).toBeInTheDocument()
  const rows = screen.getAllByRole('button').filter(b => /Open this day/.test(b.getAttribute('aria-label') || ''))
  expect(rows[0].getAttribute('aria-label')).toMatch(/36\.4/)   // hottest record first
})
it('clicking a high row opens that day', () => {
  const onPickDay = vi.fn()
  render(<RecordsTally year={2023} days={[d('0715', 36.4, 20, { recHi: true })]} onPickDay={onPickDay} />)
  fireEvent.click(screen.getByRole('button', { name: /15 July 2023.*Open this day/i }))
  expect(onPickDay).toHaveBeenCalledWith('2023-07-15')
})
it('toggling to lows shows the low list', () => {
  const days = [d('0715', 36.4, 20, { recHi: true }), d('0120', 2, -8, { recLo: true })]
  render(<RecordsTally year={2023} days={days} onPickDay={vi.fn()} />)
  fireEvent.click(screen.getByRole('radio', { name: /1 lows/i }))
  expect(screen.getByRole('button', { name: /20 January 2023.*record low/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/components/RecordsTally.test.tsx`
Expected: FAIL — cannot resolve `./RecordsTally`.

- [ ] **Step 3: Implement** — create `src/components/RecordsTally.tsx`:

```tsx
import { useState } from 'react'
import { fmtMonth } from '../lib/format'
import type { DailyPoint } from '../types'

export default function RecordsTally({ year, days, onPickDay }: {
  year: number; days: DailyPoint[]; onPickDay: (iso: string) => void
}) {
  const [warm, setWarm] = useState(true)
  const highs = days.filter(d => d.recHi).sort((a, b) => b.tmax - a.tmax)
  const lows = days.filter(d => d.recLo).sort((a, b) => a.tmin - b.tmin)
  if (!highs.length && !lows.length) return null
  const list = warm ? highs : lows
  const accent = warm ? 'text-warm' : 'text-accent'
  return (
    <div className="border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Daily records set in {year}</p>
        <div role="radiogroup" aria-label="Record type" className="inline-flex border border-border text-sm">
          <button type="button" role="radio" aria-checked={warm} onClick={() => setWarm(true)}
            className={`px-3 py-1.5 font-semibold transition-colors ${warm ? 'bg-warm text-white' : 'text-muted hover:text-fg'}`}>{highs.length} highs</button>
          <button type="button" role="radio" aria-checked={!warm} onClick={() => setWarm(false)}
            className={`px-3 py-1.5 font-semibold transition-colors ${!warm ? 'bg-accent text-white' : 'text-muted hover:text-fg'}`}>{lows.length} lows</button>
        </div>
      </div>
      <ol className="mt-3 border-t border-border divide-y divide-border">
        {list.map(d => {
          const v = warm ? d.tmax : d.tmin
          const mm = d.mmdd.slice(0, 2), dd = d.mmdd.slice(2)
          const name = fmtMonth(mm)
          const iso = `${year}-${mm}-${dd}`
          return (
            <li key={d.mmdd}>
              <button type="button" onClick={() => onPickDay(iso)}
                aria-label={`${Number(dd)} ${name} ${year} — record ${warm ? 'high' : 'low'} ${v.toFixed(1)}°. Open this day`}
                className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-surface-2">
                <span className="flex-1 text-sm">{Number(dd)} {name.slice(0, 3)}</span>
                <span className={`text-lg font-bold ${accent}`}>{v.toFixed(1)}<span className="ml-0.5 text-xs">°C</span></span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/components/RecordsTally.test.tsx`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add src/components/RecordsTally.tsx src/components/RecordsTally.test.tsx
git commit -m "feat(year): RecordsTally — expandable daily-record highs/lows list

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Wire into `YearView` + `Today` (strip, tally, counters, share, `?y=`)

**Files:**
- Modify: `src/tabs/today/YearView.tsx` (full new content below)
- Modify: `src/tabs/Today.tsx` (`?y=` parse; pass `onPickDay`)
- Modify: `src/tabs/today/YearView.test.tsx` (add `onPickDay` prop to renders)
- Modify: `src/tabs/Today.test.tsx` (add a `?y=` deep-link test; ensure fetch stub is URL-safe)

**Interfaces:**
- Consumes: `YearStrip` (T2), `YearCounters` (T3), `RecordsTally` (T4), `yearShareSentence`/`yearShareCaption` (T1); existing `useDaily`, `useDayNorm`, `useYear`, `MonthGrid`, `shareNode`; `Today.tsx`'s existing `openDay`/`openMonth`/`inMonthRange`.
- Produces: `YearView({ year, onPickMonth, onPickDay })`.

- [ ] **Step 1: Replace `src/tabs/today/YearView.tsx` with:**

```tsx
import { useRef, useState } from 'react'
import { useSummary } from '../../data/useSummary'
import { useYear } from '../../data/useYear'
import { useDaily } from '../../data/useDaily'
import { useDayNorm } from '../../data/useDayNorm'
import { fmtTemp, ordinal } from '../../lib/format'
import { Loading, ErrorState } from '../../components/States'
import CalendarTile from '../../components/CalendarTile'
import BigTemp from '../../components/BigTemp'
import RangeBar from '../../components/RangeBar'
import StatCard from '../../components/StatCard'
import WarmingStrip from '../../components/WarmingStrip'
import PeriodScatter from '../../components/PeriodScatter'
import HeroShell from '../../components/HeroShell'
import MonthGrid from '../../components/MonthGrid'
import YearStrip from '../../components/YearStrip'
import RecordsTally from '../../components/RecordsTally'
import YearCounters from '../../components/YearCounters'
import { heroState, deltaLine, bannerClass, toneText } from '../../lib/heroState'
import { shareNode } from '../../lib/share'
import { yearShareSentence, yearShareCaption } from '../../lib/shareText'
import { Share2 } from 'lucide-react'

type Annual = { year: number; mean: number; incomplete: boolean }
function yearWindowMean(annual: Annual[], from: number, to: number): number | null {
  const v = annual.filter(a => a.year >= from && a.year <= to && !a.incomplete).map(a => a.mean)
  return v.length ? Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 10) / 10 : null
}

export default function YearView({ year, onPickMonth, onPickDay }: {
  year: number
  onPickMonth: (year: number, month: number) => void
  onPickDay: (iso: string) => void
}) {
  const { summary, loading, error } = useSummary()
  const { data: yearMonths } = useYear(year)
  const daily = useDaily(year)
  const dayNorm = useDayNorm()
  const [capturing, setCapturing] = useState(false)
  const busy = useRef(false)
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

  const yComplete = !!a && !a.incomplete
  const state = heroState({
    value: a ? a.mean : null,
    normal,
    brokeHigh: yComplete && recordWarm?.year === year,
    brokeLow: yComplete && recordCold?.year === year,
  })
  const dl = deltaLine(state)
  const banner = !a ? null
    : !yComplete ? 'This year so far'
    : state.key === 'record-hot' ? 'Warmest year on record'
    : state.key === 'record-cold' ? 'Coldest year on record'
    : state.key === 'above' && rank ? `${ordinal(rank)} warmest year in ${total} years`
    : state.key === 'below' ? 'Cooler than usual'
    : 'A typical year'
  const bannerKey = yComplete ? state.key : 'close'

  const recentFrom = year - 11, recentTo = year - 1, thenFrom = year - 111, thenTo = year - 101
  const recentMean = yearWindowMean(summary.annual, recentFrom, recentTo)
  const thenMean = yearWindowMean(summary.annual, thenFrom, thenTo)

  const normMap = new Map((dayNorm.data?.['1991-2020'] ?? []).map(n => [n.mmdd, n.normal]))
  const normalFor = (mmdd: string) => normMap.get(mmdd) ?? null
  const days = Array.isArray(daily.data) ? daily.data : []

  const handleShare = async () => {
    if (busy.current) return
    busy.current = true; setCapturing(true)
    try {
      await new Promise<void>(res => requestAnimationFrame(() => requestAnimationFrame(() => res())))
      const node = document.getElementById('year-capture')
      if (node && a) await shareNode(node, 'uccle-year.png', {
        text: yearShareCaption(yearShareSentence({ year, key: state.key, rank, total, complete: yComplete }), year),
      })
    } finally { setCapturing(false); busy.current = false }
  }

  return (
    <div className="space-y-4">
      <div id="year-capture" className="space-y-4">
        <HeroShell tone={state.tone} intensity={state.intensity}>
          <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
            <CalendarTile header="YEAR" body={year} />
            <div className="min-w-0 flex-1">
              {a ? (
                <>
                  <p className="text-[11px] uppercase tracking-[0.09em] text-muted">{state.word}</p>
                  <div><BigTemp v={a.mean} className={`text-[40px] ${toneText(state.tone)}`} /></div>
                  {dl && <p className="mt-1 text-sm text-muted">{dl}</p>}
                </>
              ) : <p className="text-sm text-muted">No data for {year} yet.</p>}
            </div>
          </div>
          {banner && (
            <div className="mt-3">
              <span className={`inline-block px-2.5 py-1 text-xs font-semibold ${bannerClass(bannerKey)}`}>{banner}</span>
            </div>
          )}
        </HeroShell>

        {Array.isArray(daily.data) && dayNorm.data && <YearStrip year={year} days={days} normalFor={normalFor} />}

        {capturing && (
          <div className="border border-border bg-surface px-5 py-3 text-[11px] text-muted">
            <p>Uccle, Brussels · jdelsoir.github.io/uccle-climate</p>
          </div>
        )}
      </div>

      {a && (
        <div className="flex justify-end">
          <button type="button" aria-label="Share this year" disabled={capturing} onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-muted transition-colors hover:text-fg disabled:opacity-40">
            <Share2 size={14} aria-hidden /> Share
          </button>
        </div>
      )}

      {Array.isArray(yearMonths) && yearMonths.length > 0 && (
        <MonthGrid year={year} months={yearMonths} onPickMonth={onPickMonth} />
      )}

      {Array.isArray(daily.data) && <RecordsTally year={year} days={days} onPickDay={onPickDay} />}

      <YearCounters year={year} counters={summary.counters} incomplete={!yComplete} />

      {a && recordWarm && recordCold && (
        <div className="border border-border bg-surface p-5">
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

- [ ] **Step 2: `Today.tsx` — add `?y=` parse + pass `onPickDay`.**

Near the existing `dParam`/`mParam` parsing (around lines 21-24), add:
```tsx
  const yParam = params.get('y')
  const yValid = !!yParam && /^\d{4}$/.test(yParam)
```
Change the `mode` initializer (currently `useState<Mode>(() => (dValid ? 'day' : mMatch ? 'month' : 'day'))`) to:
```tsx
  const [mode, setMode] = useState<Mode>(() => (dValid ? 'day' : mMatch ? 'month' : yValid ? 'year' : 'day'))
```
Change the `year` state initializer (currently `useState<number | null>(null)`) to:
```tsx
  const [year, setYear] = useState<number | null>(() => (yValid ? Math.min(now.getFullYear(), Math.max(1833, +yParam!)) : null))
```
Change the Year render line (currently `{mode === 'year' && <YearView year={selYear} onPickMonth={openMonth} />}`) to:
```tsx
      {mode === 'year' && <YearView year={selYear} onPickMonth={openMonth} onPickDay={openDay} />}
```
> `now` is already defined in `Today.tsx` (used by `inMonthRange`). Confirm before use.

- [ ] **Step 3: `YearView.test.tsx` — add the new required prop.** Every `render(<YearView .../>)` (two direct `test()` calls + the `renderYear` helper) gains `onPickDay={vi.fn()}`, e.g.:
```tsx
  render(<YearView year={2026} onPickMonth={vi.fn()} onPickDay={vi.fn()} />)
```
and in `renderYear`:
```tsx
  render(<YearView year={aEntry.year} onPickMonth={vi.fn()} onPickDay={vi.fn()} />)
```
No assertions change: those tests stub `fetch` to return the summary object for every URL, so `useDaily`/`useYear` receive a non-array (`Array.isArray` guard skips strip/tally/grid) and the fixture's empty `counters` arrays make `YearCounters` return `null`.

- [ ] **Step 4: `Today.test.tsx` — `?y=` deep link.** First read the file to see how it renders `Today` (router + how `fetch` is stubbed by URL). Add a test that mounts `Today` at `/today?y=2015` (match the existing router-mount pattern in that file) and asserts Year mode opens at 2015:
```tsx
test('?y= deep link cold-opens Year mode at that year', async () => {
  // reuse this file's existing fetch stub; if it returns one object for all URLs it is fine —
  // YearView guards on Array.isArray, so non-array data just skips strip/tally.
  // Mount at ?y=2015 the same way the ?d=/?m= (or default) tests mount Today in this file.
  // Assert: the Year radio is checked and the hero shows 2015.
})
```
Implement it concretely against the file's actual harness (MemoryRouter/initialEntries or hash). Assert `screen.getByRole('radio', { name: /year/i })` has `aria-checked="true"` and the year `2015` renders. Keep `afterEach(() => vi.unstubAllGlobals())` if the file stubs fetch.

- [ ] **Step 5: Run affected tests, then full suite + build.**

Run: `npx vitest run src/tabs/today/YearView.test.tsx src/tabs/Today.test.tsx`
Expected: PASS.
Run: `npm test`
Expected: all files pass.
Run: `VITE_BASE=/uccle-climate/ npm run build`
Expected: succeeds (only the pre-existing Recharts chunk-size warning).

- [ ] **Step 6: Commit**

```bash
git add src/tabs/today/YearView.tsx src/tabs/Today.tsx src/tabs/today/YearView.test.tsx src/tabs/Today.test.tsx
git commit -m "feat(year): wire strip/tally/counters/share into YearView + ?y= deep link

Completes Year Phase C2: YearStrip + RecordsTally + YearCounters render
below the hero, a Share-this-year button captures #year-capture (hero +
strip + attribution) to PNG with a ?y= deep-linked caption, and Today
parses ?y=YYYY to cold-open the Year view at a shared year.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:** #1 YearStrip ✓(T2, wired T5), #4 YearCounters ✓(T3, wired T5), #5 RecordsTally ✓(T4, wired T5), #10 share button + capture region + `yearShare*` + `?y=` ✓(T1+T5). Shared `COUNTER_ROWS` extraction ✓(T3). Non-blocking render via `Array.isArray(daily.data)` guards ✓(T5). `onPickDay` threaded ✓(T5). No pipeline change ✓.

**Placeholder scan:** T5 Step 4 leaves the `Today.test.tsx` body as prose-with-intent because the test must match that file's existing (unknown-here) mount/stub harness — the implementer is told exactly what to assert and to read the file first. All other steps carry complete code.

**Type consistency:** `yearShareSentence({year,key,rank,total,complete})` identical T1↔T5 call site; `CounterKey`/`COUNTER_ROWS` identical T3↔consumers; `YearStrip`/`RecordsTally`/`YearCounters` prop shapes identical between their Create task and the T5 JSX; `DailyPoint`/`Summary['counters']` from `types.ts`. `anomalyColor` arity matches `colorScale.ts`.
