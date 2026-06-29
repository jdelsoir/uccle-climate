# Today-tab Hero Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Today-tab hero (Day view) as a state-driven block — weather-state eyebrow, big temp, anomaly delta line, state-colored banner, and a decorative sun/snowflake glyph with a tinted gradient whose intensity scales with the anomaly — then cascade the same to Month and Year heroes.

**Architecture:** One pure state engine (`src/lib/heroState.ts`) classifies value-vs-normal into 5 states and derives tone/intensity/word/banner-style/delta-line. Two new presentational components — `WeatherGlyph` (inline SVG sun/snowflake) and `HeroShell` (bordered frame + gradient + glyph + content slot) — are reused by all three views. Each view composes its own content (Day adds a NOW/LOW slot and a record subline). The existing "where it sits" RangeBar moves out of the hero box into its own sibling card to avoid overlapping the glyph; stat cards, warming strip, and scatter are untouched.

**Tech Stack:** React 18 + TypeScript, Tailwind v4 (token colors + opacity modifiers, inline `style` only for dynamic opacity), Vitest + @testing-library/react. Inline SVG only (CSP/offline — no external assets).

## Global Constraints

- **No PII** anywhere (org policy) — derived stats + "Uccle, Brussels" only.
- **No external fonts/CDNs/assets** — glyph is inline SVG.
- **Tokens, not hex** — color via `warm`/`accent`/`fg`/`muted`/`surface-2` (+ Tailwind opacity modifiers like `bg-warm/10`). No literal hex. Dynamic opacity via inline `style={{ opacity }}` only.
- **State thresholds = `tempColor` ±2° (strict):** reuse `tempColor` so exactly +2° → neutral/close; `>2` → above; `<-2` → below. One source of truth.
- **Square corners** on all hero elements (no `rounded-*`).
- **Light + dark** via existing `.dark` tokens; tints are opacity over `bg-surface`.
- **Responsive 375 / 768 / 1280, no horizontal overflow** — glyph absolute + clipped (`overflow-hidden`), content `min-w-0`.
- **a11y** — glyph `aria-hidden`; eyebrow/banner/subline are real text; RangeBar keeps its text summary. Single-select toggles unchanged.
- **Tests pristine** — mock Recharts `ResponsiveContainer`; `afterEach(() => vi.unstubAllGlobals())` where `fetch` is stubbed; derive `mmdd` from `todayMMDD()` (no date-coupled fixtures).
- **Commit messages** end with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

## File Structure

- `src/lib/heroState.ts` (**new**) — pure state engine: `heroState()`, `bannerClass()`, `deltaLine()`, `toneText()`, types. No React.
- `src/lib/heroState.test.ts` (**new**) — unit tests for the engine.
- `src/components/WeatherGlyph.tsx` (**new**) — inline SVG sun/snowflake, decorative.
- `src/components/WeatherGlyph.test.tsx` (**new**).
- `src/components/HeroShell.tsx` (**new**) — frame + gradient + glyph + `z-10` content slot.
- `src/components/HeroShell.test.tsx` (**new**).
- `src/tabs/today/DayView.tsx` (**modify**) — rebuild hero with HeroShell; move RangeBar to own card.
- `src/tabs/today/DayView.test.tsx` (**modify**) — add state/banner/delta assertions.
- `src/tabs/today/MonthView.tsx` (**modify**) — cascade.
- `src/tabs/today/MonthView.test.tsx` (**modify**).
- `src/tabs/today/YearView.tsx` (**modify**) — cascade.
- `src/tabs/today/YearView.test.tsx` (**modify**).

---

## Task 1: State engine (`heroState.ts`)

**Files:**
- Create: `src/lib/heroState.ts`
- Test: `src/lib/heroState.test.ts`

**Interfaces:**
- Consumes: `tempColor` from `src/lib/dayStats.ts` — `tempColor(v: number|null, normal: number|null): 'text-warm'|'text-accent'|'text-fg'`.
- Produces:
  - `type HeroTone = 'warm' | 'neutral' | 'cool'`
  - `type HeroKey = 'record-hot' | 'above' | 'close' | 'below' | 'record-cold'`
  - `interface HeroState { key: HeroKey; word: string; tone: HeroTone; intensity: number; delta: number | null }`
  - `heroState(o: { value: number|null; normal: number|null; brokeHigh?: boolean; brokeLow?: boolean }): HeroState`
  - `bannerClass(key: HeroKey): string`
  - `deltaLine(s: HeroState): string | null`
  - `toneText(tone: HeroTone): 'text-warm'|'text-accent'|'text-fg'`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/heroState.test.ts
import { describe, it, expect } from 'vitest'
import { heroState, bannerClass, deltaLine, toneText } from './heroState'

describe('heroState', () => {
  it('classifies above when delta > 2 (strict)', () => {
    const s = heroState({ value: 20, normal: 15 })
    expect(s.key).toBe('above'); expect(s.tone).toBe('warm'); expect(s.delta).toBe(5)
  })
  it('treats exactly +2 as close (matches tempColor strict)', () => {
    expect(heroState({ value: 17, normal: 15 }).key).toBe('close')
  })
  it('classifies below when delta < -2', () => {
    const s = heroState({ value: 10, normal: 15 })
    expect(s.key).toBe('below'); expect(s.tone).toBe('cool'); expect(s.delta).toBe(-5)
  })
  it('record flags override a large opposite delta', () => {
    const s = heroState({ value: 1, normal: 15, brokeHigh: true })
    expect(s.key).toBe('record-hot'); expect(s.tone).toBe('warm'); expect(s.intensity).toBe(1)
  })
  it('intensity scales with |delta| and caps at 1', () => {
    expect(heroState({ value: 18, normal: 15 }).intensity).toBeCloseTo(0.3, 5)
    expect(heroState({ value: 40, normal: 15 }).intensity).toBe(1)
  })
  it('null value → close, neutral, intensity 0, delta null', () => {
    const s = heroState({ value: null, normal: 15 })
    expect(s.key).toBe('close'); expect(s.tone).toBe('neutral'); expect(s.intensity).toBe(0); expect(s.delta).toBeNull()
  })
  it('exposes the eyebrow word', () => {
    expect(heroState({ value: 20, normal: 15 }).word).toBe('Above average')
  })
})

describe('deltaLine', () => {
  it('above uses signed + above-the-average', () => {
    expect(deltaLine(heroState({ value: 23.9, normal: 15 }))).toBe('+8.9° above the 1991–2020 average')
  })
  it('below uses real minus sign + below', () => {
    expect(deltaLine(heroState({ value: 10.3, normal: 15 }))).toBe('−4.7° below the 1991–2020 average')
  })
  it('close uses vs the average', () => {
    expect(deltaLine(heroState({ value: 15.7, normal: 15 }))).toBe('+0.7° vs the average')
  })
  it('returns null when delta is null', () => {
    expect(deltaLine(heroState({ value: null, normal: 15 }))).toBeNull()
  })
})

describe('bannerClass / toneText', () => {
  it('record states are solid', () => {
    expect(bannerClass('record-hot')).toContain('bg-warm'); expect(bannerClass('record-hot')).toContain('text-white')
    expect(bannerClass('record-cold')).toContain('bg-accent'); expect(bannerClass('record-cold')).toContain('text-white')
  })
  it('above/below are tinted, close is neutral', () => {
    expect(bannerClass('above')).toBe('bg-warm/10 text-warm')
    expect(bannerClass('below')).toBe('bg-accent/10 text-accent')
    expect(bannerClass('close')).toBe('bg-surface-2 text-muted')
  })
  it('toneText maps tone to text token', () => {
    expect(toneText('warm')).toBe('text-warm'); expect(toneText('cool')).toBe('text-accent'); expect(toneText('neutral')).toBe('text-fg')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/heroState.test.ts`
Expected: FAIL — "Failed to resolve import './heroState'".

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/heroState.ts
import { tempColor } from './dayStats'

export type HeroTone = 'warm' | 'neutral' | 'cool'
export type HeroKey = 'record-hot' | 'above' | 'close' | 'below' | 'record-cold'

export interface HeroState {
  key: HeroKey
  word: string
  tone: HeroTone
  intensity: number
  delta: number | null
}

const WORD: Record<HeroKey, string> = {
  'record-hot': 'Record hot broken',
  above: 'Above average',
  close: 'Close to average',
  below: 'Below average',
  'record-cold': 'Cold record broken',
}

export function heroState({ value, normal, brokeHigh, brokeLow }: {
  value: number | null
  normal: number | null
  brokeHigh?: boolean
  brokeLow?: boolean
}): HeroState {
  const delta = value != null && normal != null ? Math.round((value - normal) * 10) / 10 : null

  let key: HeroKey
  let tone: HeroTone
  if (brokeHigh) { key = 'record-hot'; tone = 'warm' }
  else if (brokeLow) { key = 'record-cold'; tone = 'cool' }
  else {
    const c = tempColor(value, normal) // strict ±2 — single source of truth
    if (c === 'text-warm') { key = 'above'; tone = 'warm' }
    else if (c === 'text-accent') { key = 'below'; tone = 'cool' }
    else { key = 'close'; tone = 'neutral' }
  }

  const isRecord = key === 'record-hot' || key === 'record-cold'
  const intensity = isRecord ? 1 : delta == null ? 0 : Math.min(Math.abs(delta) / 10, 1)
  return { key, word: WORD[key], tone, intensity, delta }
}

export function toneText(tone: HeroTone): 'text-warm' | 'text-accent' | 'text-fg' {
  return tone === 'warm' ? 'text-warm' : tone === 'cool' ? 'text-accent' : 'text-fg'
}

export function bannerClass(key: HeroKey): string {
  switch (key) {
    case 'record-hot': return 'bg-warm text-white'
    case 'record-cold': return 'bg-accent text-white'
    case 'above': return 'bg-warm/10 text-warm'
    case 'below': return 'bg-accent/10 text-accent'
    case 'close': return 'bg-surface-2 text-muted'
  }
}

export function deltaLine(s: HeroState): string | null {
  if (s.delta == null) return null
  const sign = s.delta > 0 ? '+' : s.delta < 0 ? '−' : '' // U+2212 for negatives
  const mag = Math.abs(s.delta).toFixed(1)
  if (s.key === 'close') return `${sign}${mag}° vs the average`
  const dir = s.delta >= 0 ? 'above' : 'below'
  return `${sign}${mag}° ${dir} the 1991–2020 average`
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/heroState.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/heroState.ts src/lib/heroState.test.ts
git commit -m "feat(hero): state engine — 5-state classifier, tone/intensity, banner+delta helpers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `WeatherGlyph` component

**Files:**
- Create: `src/components/WeatherGlyph.tsx`
- Test: `src/components/WeatherGlyph.test.tsx`

**Interfaces:**
- Consumes: `HeroTone` from `src/lib/heroState.ts`.
- Produces: `default function WeatherGlyph({ tone, intensity, className? }: { tone: HeroTone; intensity: number; className?: string }): JSX.Element` — renders an `<svg aria-hidden>` (sun for warm/neutral, snowflake for cool).

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/WeatherGlyph.test.tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import WeatherGlyph from './WeatherGlyph'

describe('WeatherGlyph', () => {
  it('renders a decorative svg', () => {
    const { container } = render(<WeatherGlyph tone="warm" intensity={1} />)
    const svg = container.querySelector('svg')!
    expect(svg).toBeTruthy()
    expect(svg.getAttribute('aria-hidden')).toBe('true')
  })
  it('uses warm color for warm tone and accent for cool tone', () => {
    const warm = render(<WeatherGlyph tone="warm" intensity={1} />).container.querySelector('svg')!
    const cool = render(<WeatherGlyph tone="cool" intensity={1} />).container.querySelector('svg')!
    expect(warm.getAttribute('class')).toContain('text-warm')
    expect(cool.getAttribute('class')).toContain('text-accent')
  })
  it('scales opacity with intensity for warm tone', () => {
    const lo = render(<WeatherGlyph tone="warm" intensity={0} />).container.querySelector('svg')!
    const hi = render(<WeatherGlyph tone="warm" intensity={1} />).container.querySelector('svg')!
    expect(parseFloat(lo.style.opacity)).toBeLessThan(parseFloat(hi.style.opacity))
  })
  it('passes through className', () => {
    const svg = render(<WeatherGlyph tone="warm" intensity={1} className="absolute" />).container.querySelector('svg')!
    expect(svg.getAttribute('class')).toContain('absolute')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/WeatherGlyph.test.tsx`
Expected: FAIL — cannot resolve `./WeatherGlyph`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/WeatherGlyph.tsx
import type { HeroTone } from '../lib/heroState'

function Sun({ intensity }: { intensity: number }) {
  const t = Math.min(Math.max(intensity, 0), 1)
  const len = 14 + 14 * t // rays grow with intensity
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 * Math.PI) / 180
    const r1 = 30, r2 = 30 + len
    return (
      <line key={i} x1={50 + r1 * Math.cos(a)} y1={50 + r1 * Math.sin(a)}
        x2={50 + r2 * Math.cos(a)} y2={50 + r2 * Math.sin(a)}
        stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
    )
  })
  return <g fill="none">{rays}<circle cx={50} cy={50} r={22} fill="currentColor" fillOpacity={0.4} /></g>
}

function Snowflake() {
  const arms = Array.from({ length: 6 }, (_, i) => {
    const a = (i * 60 * Math.PI) / 180
    const tx = 50 + 40 * Math.cos(a), ty = 50 + 40 * Math.sin(a)
    // two short branches near the tip
    const bx = 50 + 28 * Math.cos(a), by = 50 + 28 * Math.sin(a)
    const b1 = a + Math.PI / 4, b2 = a - Math.PI / 4
    return (
      <g key={i}>
        <line x1={50} y1={50} x2={tx} y2={ty} stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
        <line x1={bx} y1={by} x2={bx + 10 * Math.cos(b1)} y2={by + 10 * Math.sin(b1)} stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
        <line x1={bx} y1={by} x2={bx + 10 * Math.cos(b2)} y2={by + 10 * Math.sin(b2)} stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
      </g>
    )
  })
  return <g fill="none">{arms}<circle cx={50} cy={50} r={5} fill="currentColor" /></g>
}

export default function WeatherGlyph({ tone, intensity, className = '' }: {
  tone: HeroTone; intensity: number; className?: string
}) {
  const color = tone === 'cool' ? 'text-accent' : tone === 'warm' ? 'text-warm' : 'text-muted'
  // neutral keeps a faint constant presence; warm/cool fade in with intensity
  const opacity = tone === 'neutral' ? 0.18 : 0.25 + 0.55 * Math.min(Math.max(intensity, 0), 1)
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={`${color} ${className}`} style={{ opacity }}>
      {tone === 'cool' ? <Snowflake /> : <Sun intensity={intensity} />}
    </svg>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/WeatherGlyph.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/WeatherGlyph.tsx src/components/WeatherGlyph.test.tsx
git commit -m "feat(hero): WeatherGlyph — inline SVG sun/snowflake, intensity-scaled opacity

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `HeroShell` component

**Files:**
- Create: `src/components/HeroShell.tsx`
- Test: `src/components/HeroShell.test.tsx`

**Interfaces:**
- Consumes: `WeatherGlyph` (Task 2); `HeroTone` from `src/lib/heroState.ts`.
- Produces: `default function HeroShell({ tone, intensity, children }: { tone: HeroTone; intensity: number; children: ReactNode }): JSX.Element` — bordered, square-cornered, `overflow-hidden` frame with a gradient backdrop + glyph behind a `z-10` content slot.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/HeroShell.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import HeroShell from './HeroShell'

describe('HeroShell', () => {
  it('renders its children', () => {
    render(<HeroShell tone="warm" intensity={1}><p>hello</p></HeroShell>)
    expect(screen.getByText('hello')).toBeTruthy()
  })
  it('renders a warm gradient layer for warm tone', () => {
    const { container } = render(<HeroShell tone="warm" intensity={1}><span /></HeroShell>)
    expect(container.querySelector('.from-warm')).toBeTruthy()
  })
  it('renders no gradient layer for neutral tone', () => {
    const { container } = render(<HeroShell tone="neutral" intensity={0}><span /></HeroShell>)
    expect(container.querySelector('.from-warm')).toBeNull()
    expect(container.querySelector('.from-accent')).toBeNull()
  })
  it('always renders a decorative glyph', () => {
    const { container } = render(<HeroShell tone="cool" intensity={0.5}><span /></HeroShell>)
    expect(container.querySelector('svg[aria-hidden="true"]')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/HeroShell.test.tsx`
Expected: FAIL — cannot resolve `./HeroShell`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/HeroShell.tsx
import type { ReactNode } from 'react'
import WeatherGlyph from './WeatherGlyph'
import type { HeroTone } from '../lib/heroState'

export default function HeroShell({ tone, intensity, children }: {
  tone: HeroTone; intensity: number; children: ReactNode
}) {
  const grad = tone === 'warm' ? 'from-warm' : tone === 'cool' ? 'from-accent' : ''
  return (
    <div className="relative overflow-hidden border border-border bg-surface p-5">
      {grad && (
        <div aria-hidden
          className={`pointer-events-none absolute inset-0 z-0 bg-gradient-to-l ${grad} to-transparent`}
          style={{ opacity: 0.16 * Math.min(Math.max(intensity, 0), 1) }} />
      )}
      <WeatherGlyph tone={tone} intensity={intensity}
        className="pointer-events-none absolute right-0 top-1/2 z-0 h-[150%] w-[45%] -translate-y-1/2" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/HeroShell.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/HeroShell.tsx src/components/HeroShell.test.tsx
git commit -m "feat(hero): HeroShell — bordered frame + tinted gradient + glyph behind z-10 content

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Rebuild the Day-view hero

**Files:**
- Modify: `src/tabs/today/DayView.tsx` (hero block, currently lines ~66–115)
- Test: `src/tabs/today/DayView.test.tsx`

**Interfaces:**
- Consumes: `heroState`, `deltaLine`, `bannerClass`, `toneText` (Task 1); `HeroShell` (Task 3). Existing locals: `highV`, `secondV`, `secondLabel`, `normal`, `brokeHigh`, `brokeLow`, `prevHigh`, `prevLow`, `r` (rank), `dayLabel`, `firstYear`, `isReal`, `provisional`, `live`, `todayLive`.
- Produces: no exported API change; DayView still `({ date, min, max, onChange })`.

- [ ] **Step 1: Write the failing tests (add to `DayView.test.tsx`)**

These mirror the existing test setup (mock `useThisDay`/`useTodayTemp`/`useDayNorm`, derive `mmdd` from `todayMMDD()`). Add cases asserting the new hero. Example additions:

```tsx
// In DayView.test.tsx — assuming the file's existing render helper `renderDay(series, {normal, live})`.
// If no helper exists, follow the existing mocking pattern in this file and add these expectations.

it('shows the ABOVE AVERAGE state word, delta line and rank banner for a warm past day', async () => {
  // series where viewed year's tmax is well above the normal, not a record
  // normal = 18, tmax = 26.9 → delta +8.9, above
  renderWarmPastDay({ tmax: 26.9, tmin: 14, normal: 18, rank: 26, firstYear: 1833 })
  expect(await screen.findByText(/above average/i)).toBeTruthy()
  expect(screen.getByText('+8.9° above the 1991–2020 average')).toBeTruthy()
  expect(screen.getByText(/26th warmest .* since 1833/i)).toBeTruthy()
})

it('shows the record-hot banner with a prev-record subline when the viewed year holds the record high', async () => {
  renderRecordHighDay({ tmax: 33.1, normal: 18, prevHigh: { v: 32.9, year: 1976 }, firstYear: 1833 })
  expect(await screen.findByText(/record hot broken/i)).toBeTruthy()
  expect(screen.getByText(/New record · hottest .* since 1833/i)).toBeTruthy()
  expect(screen.getByText('beat 32.9° from 1976')).toBeTruthy()
})

it('shows the CLOSE TO AVERAGE state for a typical day', async () => {
  renderWarmPastDay({ tmax: 18.7, tmin: 12, normal: 18, rank: 80, firstYear: 1833 })
  expect(await screen.findByText(/close to average/i)).toBeTruthy()
  expect(screen.getByText('+0.7° vs the average')).toBeTruthy()
  expect(screen.getByText(/A typical/i)).toBeTruthy()
})
```

> The exact `renderWarmPastDay`/`renderRecordHighDay` helpers are local conveniences — implement them with the same `vi.mock`/`vi.stubGlobal` pattern already used in `DayView.test.tsx`, deriving `mmdd` from `todayMMDD()` and putting the viewed year in `series`. Add `afterEach(() => vi.unstubAllGlobals())` if not already present.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/tabs/today/DayView.test.tsx`
Expected: FAIL — new strings ("above average", delta line, "beat 32.9° from 1976") not in the DOM.

- [ ] **Step 3: Update imports in `DayView.tsx`**

Remove the now-unused icon + color imports and add the new ones.

```tsx
// Remove this line:
import { Flame, Snowflake } from 'lucide-react'
// Change the dayStats import to drop tempColor (toneText replaces it):
import { decadeMean, previousRecordHigh, previousRecordLow } from '../../lib/dayStats'
// Add:
import HeroShell from '../../components/HeroShell'
import { heroState, deltaLine, bannerClass, toneText } from '../../lib/heroState'
```

- [ ] **Step 4: Compute state + banner (add right before the `return (`)**

```tsx
const state = heroState({ value: highV, normal, brokeHigh, brokeLow })
const dl = deltaLine(state)

const banner =
  state.key === 'record-hot' ? `New record · hottest ${dayLabel}${firstYear != null ? ` since ${firstYear}` : ''}`
  : state.key === 'record-cold' ? `New record · coldest ${dayLabel}${firstYear != null ? ` since ${firstYear}` : ''}`
  : state.key === 'above' && r ? `${ordinal(r.rank)} warmest ${dayLabel}${firstYear != null ? ` since ${firstYear}` : ''}`
  : state.key === 'below' ? `Cooler than usual for ${dayLabel}`
  : `A typical ${dayLabel}`

const bannerSub =
  state.key === 'record-hot' && prevHigh ? `beat ${prevHigh.v}° from ${prevHigh.year}`
  : state.key === 'record-cold' && prevLow ? `beat ${prevLow.v}° from ${prevLow.year}`
  : null
```

- [ ] **Step 5: Replace the hero JSX (current `{/* HERO */}` block through the `{/* WHERE TODAY SITS */}` block, lines ~68–114)**

Replace it with a `HeroShell` plus a separate "where it sits" card:

```tsx
      {/* HERO */}
      <HeroShell tone={state.tone} intensity={state.intensity}>
        <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
          <CalendarTile header={fmtMonth(mm).toUpperCase()} body={date.getDate()} footer={fmtWeekday(date).toUpperCase()}
            onClick={openPicker} ariaLabel={`Change date — ${fullLabel}`} />
          <div className="min-w-0 flex-1">
            {isReal && !live.data ? (
              <p className="text-sm text-muted">{live.error ? 'Live temperature unavailable.' : 'Fetching today…'}</p>
            ) : highV != null ? (
              <>
                <p className="text-[11px] uppercase tracking-[0.09em] text-muted">{state.word}</p>
                <div><BigTemp v={highV} className={`text-[40px] ${toneText(state.tone)}`} /></div>
                {dl && <p className="mt-1 text-sm text-muted">{dl}</p>}
                {provisional && <p className="mt-1 text-[11px] text-muted"><span aria-hidden>· </span>Provisional — may be revised</p>}
              </>
            ) : <p className="text-sm text-muted">No data for this date.</p>}
          </div>
          {secondV != null && (
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.09em] text-muted">{secondLabel}</p>
              <span className="text-2xl font-bold">{todayLive ? `${secondV.toFixed(1)}°` : fmtTemp(secondV)}</span>
            </div>
          )}
        </div>

        {highV != null && (
          <div className="mt-3">
            <span className={`inline-block px-2.5 py-1 text-xs font-semibold ${bannerClass(state.key)}`}>{banner}</span>
            {bannerSub && <p className="mt-1 text-[11px] text-muted">{bannerSub}</p>}
          </div>
        )}
      </HeroShell>

      {/* WHERE TODAY SITS — own card (kept out of the hero to avoid the glyph) */}
      {highV != null && (
        <div className="border border-border bg-surface p-5">
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
```

> The previous record-broken `<p>` line and the rank-badge `<p>` are deleted — both are now expressed by the banner (+ subline). `Flame`/`Snowflake` are no longer referenced.

- [ ] **Step 6: Run the Day tests + typecheck**

Run: `npx vitest run src/tabs/today/DayView.test.tsx && npx tsc --noEmit`
Expected: PASS, no type errors (confirms no dangling `Flame`/`Snowflake`/`tempColor` references).

- [ ] **Step 7: Commit**

```bash
git add src/tabs/today/DayView.tsx src/tabs/today/DayView.test.tsx
git commit -m "feat(today/day): state-driven hero — eyebrow + delta line + state banner + glyph; RangeBar to own card

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Cascade to the Month-view hero

**Files:**
- Modify: `src/tabs/today/MonthView.tsx` (hero block, currently lines ~26–50)
- Test: `src/tabs/today/MonthView.test.tsx`

**Interfaces:**
- Consumes: `heroState`, `deltaLine`, `bannerClass`, `toneText` (Task 1); `HeroShell` (Task 3). Existing locals: `name`, `cur` (`{ year, mean, complete }` | undefined), `complete` (array), `rank`, `data.normal`, `data.recordWarm`/`data.recordCold` (`{ v, year }` | null), `currentYear`.
- Produces: no API change; `MonthView({ mm, currentYear })`.

- [ ] **Step 1: Write the failing tests (add to `MonthView.test.tsx`)**

Follow the file's existing `useMonth` mock pattern. Add:

```tsx
it('shows the state word, delta line and rank banner for a warm complete month', async () => {
  renderMonth({ cur: { year: 2026, mean: 20.9, complete: true }, normal: 18, rank: 3, completeCount: 120 })
  expect(await screen.findByText(/above average/i)).toBeTruthy()
  expect(screen.getByText('+2.9° above the 1991–2020 average')).toBeTruthy()
  expect(screen.getByText(/3rd warmest .* in 120 years/i)).toBeTruthy()
})

it('uses an on-record banner when the current year holds the warmest month', async () => {
  renderMonth({ cur: { year: 2026, mean: 22, complete: true }, normal: 18, recordWarm: { v: 22, year: 2026 } })
  expect(await screen.findByText(/record hot broken/i)).toBeTruthy()
  expect(screen.getByText(/Warmest .* on record/i)).toBeTruthy()
})

it('shows a "so far" banner and suppresses record/rank for the incomplete current month', async () => {
  renderMonth({ cur: { year: 2026, mean: 19, complete: false }, normal: 18, recordWarm: { v: 19, year: 2026 } })
  expect(await screen.findByText(/so far/i)).toBeTruthy()
  expect(screen.queryByText(/on record/i)).toBeNull()
})
```

> Implement `renderMonth(opts)` with the same `vi.mock('../../data/useMonth', ...)` shape already in the file. Build `data.series` so the viewed year matches `cur` and `complete.length` matches `completeCount`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/tabs/today/MonthView.test.tsx`
Expected: FAIL — new strings not present.

- [ ] **Step 3: Update imports in `MonthView.tsx`**

```tsx
import HeroShell from '../../components/HeroShell'
import { heroState, deltaLine, bannerClass, toneText } from '../../lib/heroState'
```

- [ ] **Step 4: Compute state + banner (after the existing `warmingDelta` line)**

```tsx
const complete_ = cur?.complete === true
const state = heroState({
  value: cur ? cur.mean : null,
  normal: data.normal,
  brokeHigh: complete_ && data.recordWarm?.year === currentYear,
  brokeLow: complete_ && data.recordCold?.year === currentYear,
})
const dl = deltaLine(state)
const banner = !cur ? null
  : !complete_ ? `${name} so far`
  : state.key === 'record-hot' ? `Warmest ${name} on record`
  : state.key === 'record-cold' ? `Coldest ${name} on record`
  : state.key === 'above' && rank ? `${ordinal(rank)} warmest ${name} in ${complete.length} years`
  : state.key === 'below' ? `Cooler than usual`
  : `A typical ${name}`
const bannerKey = complete_ ? state.key : 'close' // incomplete → neutral pill
```

- [ ] **Step 5: Replace the hero `<div className="border ... p-5"> … </div>` block (lines ~26–50)**

```tsx
      <HeroShell tone={state.tone} intensity={state.intensity}>
        <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
          <CalendarTile header={name.toUpperCase()} body={currentYear} />
          <div className="min-w-0 flex-1">
            {cur ? (
              <>
                <p className="text-[11px] uppercase tracking-[0.09em] text-muted">{state.word}</p>
                <div><BigTemp v={cur.mean} className={`text-[40px] ${toneText(state.tone)}`} /></div>
                {dl && <p className="mt-1 text-sm text-muted">{dl}</p>}
              </>
            ) : <p className="text-sm text-muted">No data for {name} {currentYear} yet.</p>}
          </div>
        </div>
        {banner && (
          <div className="mt-3">
            <span className={`inline-block px-2.5 py-1 text-xs font-semibold ${bannerClass(bannerKey)}`}>{banner}</span>
          </div>
        )}
      </HeroShell>

      {cur && data.recordCold && data.recordWarm && (
        <div className="border border-border bg-surface p-5">
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
```

> The old rank-badge `<p>` is removed (banner replaces it).

- [ ] **Step 6: Run the Month tests + typecheck**

Run: `npx vitest run src/tabs/today/MonthView.test.tsx && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/tabs/today/MonthView.tsx src/tabs/today/MonthView.test.tsx
git commit -m "feat(today/month): adopt state-driven hero (eyebrow + delta + banner + glyph), RangeBar to own card

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Cascade to the Year-view hero

**Files:**
- Modify: `src/tabs/today/YearView.tsx` (hero block, currently lines ~40–64)
- Test: `src/tabs/today/YearView.test.tsx`

**Interfaces:**
- Consumes: `heroState`, `deltaLine`, `bannerClass`, `toneText` (Task 1); `HeroShell` (Task 3). Existing locals (per the grep): `a` (annual record `{ year, mean, incomplete }` | undefined), `normal`, `rank`, `total`, `recordWarm`/`recordCold` (`{ year, mean }` from `summary.rankings`), `year`, `delta`.
- Produces: no API change.

- [ ] **Step 1: Write the failing tests (add to `YearView.test.tsx`)**

Follow the file's existing mock pattern (it locks the "(so far)"/rank-suppressed behavior already).

```tsx
it('shows the state word, delta line and rank banner for a warm complete year', async () => {
  renderYear({ a: { year: 2025, mean: 12.5, incomplete: false }, normal: 10, rank: 4, total: 180 })
  expect(await screen.findByText(/above average/i)).toBeTruthy()
  expect(screen.getByText('+2.5° above the 1991–2020 average')).toBeTruthy()
  expect(screen.getByText(/4th warmest year in 180 years/i)).toBeTruthy()
})

it('uses an on-record banner when the viewed year is the warmest on record', async () => {
  renderYear({ a: { year: 2025, mean: 13, incomplete: false }, normal: 10, recordWarm: { year: 2025, mean: 13 } })
  expect(await screen.findByText(/record hot broken/i)).toBeTruthy()
  expect(screen.getByText(/Warmest year on record/i)).toBeTruthy()
})

it('keeps the "(so far)"/neutral treatment and suppresses record/rank for an incomplete year', async () => {
  renderYear({ a: { year: 2026, mean: 11, incomplete: true }, normal: 10, recordWarm: { year: 2026, mean: 11 } })
  expect(screen.queryByText(/on record/i)).toBeNull()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/tabs/today/YearView.test.tsx`
Expected: FAIL — new strings not present.

- [ ] **Step 3: Update imports in `YearView.tsx`**

```tsx
import HeroShell from '../../components/HeroShell'
import { heroState, deltaLine, bannerClass, toneText } from '../../lib/heroState'
```

- [ ] **Step 4: Compute state + banner (after the existing `delta`/`deltaWord` lines)**

```tsx
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
```

> `ordinal` is already imported in `YearView.tsx` (it builds the existing rank badge). If not, add it to the `format` import.

- [ ] **Step 5: Replace the hero `<div className="border ... p-5"> … </div>` block (lines ~40–64)**

Mirror the Month layout: `CalendarTile header="YEAR" body={year}` (keep whatever header text the current tile uses — match the existing `CalendarTile` props in this file), eyebrow `state.word`, `BigTemp v={a.mean}` with `toneText(state.tone)`, delta line, then the banner `<span className={...bannerClass(bannerKey)...}>{banner}</span>`, then move the existing "Where {year} sits" RangeBar into its own `border border-border bg-surface p-5` card below the HeroShell (same transform as Tasks 4 and 5 — keep the existing RangeBar props/summary verbatim).

```tsx
      <HeroShell tone={state.tone} intensity={state.intensity}>
        <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
          {/* keep the existing CalendarTile call from this file, unchanged */}
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

      {/* move the existing "Where {year} sits" RangeBar block here, wrapped in its own card: */}
      {/* <div className="border border-border bg-surface p-5"> …existing RangeBar… </div> */}
```

- [ ] **Step 6: Run the Year tests + full suite + typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS (whole suite green), no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/tabs/today/YearView.tsx src/tabs/today/YearView.test.tsx
git commit -m "feat(today/year): adopt state-driven hero (eyebrow + delta + banner + glyph), RangeBar to own card

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Full verify, deploy, live validation

**Files:** none (verification only).

- [ ] **Step 1: Full test suite + production build**

Run: `npm test && VITE_BASE=/uccle-climate/ npm run build`
Expected: all vitest green; build succeeds with no errors.

- [ ] **Step 2: Local smoke (optional but recommended)**

Run: `npm run dev`, open Today → Day/Month/Year, toggle light/dark, check 375/768/1280 widths.
Expected: glyph + gradient render behind text; no horizontal overflow; banner colors per state; record day shows subline.

- [ ] **Step 3: Push (CI deploys to Pages)**

```bash
git push origin main
```

- [ ] **Step 4: Independent live validation**

After CI finishes, on https://jdelsoir.github.io/uccle-climate/ verify Day/Month/Year × light/dark × 375/768/1280:
- correct state word + delta line + banner for today's actual values,
- glyph/gradient present and not overlapping/clipping text,
- no horizontal overflow,
- record/incomplete states behave (record subline on Day; "(so far)" neutral pill on incomplete Month/Year).

Only then is the work complete.

---

## Self-Review

**Spec coverage:**
- State engine (spec A) → Task 1. ✓
- WeatherGlyph (spec B) → Task 2. ✓
- HeroShell + gradient (spec C) → Task 3. ✓
- Day hero content: eyebrow/BigTemp/NOW-LOW/delta/banner/prev-record subline/provisional (spec D) → Task 4. ✓
- Cascade Month/Year incl. incomplete suppression (spec E) → Tasks 5–6. ✓
- Below-hero unchanged (spec F) → preserved in Tasks 4–6 (RangeBar relocated to its own card, props verbatim; stat cards/warming strip/scatter untouched). ✓
- Constraints (no PII, no external assets, tokens-not-hex, ±2 strict, square corners, light/dark, responsive, a11y) → Global Constraints + per-task. ✓
- Tests (engine, glyph, shell, three views) → Tasks 1–6. ✓

**Note vs spec:** spec text said "delta ≥ +2 → above"; the plan uses the **strict** `tempColor` boundary (`>2`), so exactly +2 → close. This is the deliberate "one source of truth" choice flagged in Global Constraints — boundary test added in Task 1.

**Placeholder scan:** no TBD/TODO; all code blocks complete. The only prose-described edits are the Year-view CalendarTile and the RangeBar relocation in Tasks 5–6, which explicitly say "keep existing props verbatim" and mirror the fully-shown Day transform in Task 4 — intentional (avoids guessing the exact existing CalendarTile/RangeBar props in those files; the implementer copies what's there).

**Type consistency:** `heroState`/`deltaLine`/`bannerClass`/`toneText`/`HeroTone`/`HeroKey` names and signatures are identical across Tasks 1, 3, 4, 5, 6. `WeatherGlyph` and `HeroShell` prop names match their definitions and call sites.
