# Day-hero Share Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a discreet Share control at the bottom of the Day-view hero that shares a self-contained PNG of the hero (with a baked footer: state sentence · "Uccle, Brussels" · app URL) plus a caption sentence + app link — tentative wording for today (forecast), affirmative for a consolidated past day.

**Architecture:** A pure `shareSentence` helper builds the state-driven caption from existing DayView locals. `lib/share.ts` gains an optional `text` arg passed to the Web Share API (with a clipboard fallback). `DayView` wraps its hero in a capture container, renders a footer strip only during capture (a `capturing` flag), and a discreet ghost button triggers capture → `shareNode`.

**Tech Stack:** React 18 + TS, `html-to-image` (already a dependency), Web Share API, Tailwind v4 tokens, Vitest + @testing-library/react.

## Global Constraints

- **No PII** — caption = date + derived stat + "Uccle, Brussels" + app URL only. No names/PII.
- **No external fonts/CDN/network** — `html-to-image` is bundled and client-side; no new dependency.
- **Tokens, not hex** — `border`/`surface`/`muted`/`fg` tokens; no literal hex.
- **Square corners** — button is text-only (no corners); footer matches the hero's square border.
- **a11y** — button accessible name **"Share this day"**; icon `aria-hidden`; disabled while capturing.
- **App URL** (verbatim): `https://jdelsoir.github.io/uccle-climate/`.
- **Today voice** = `is forecast to be` / `is forecast to break`; **consolidated** = `was` / `broke`.
- **Tests pristine** — `afterEach(() => vi.unstubAllGlobals())` where globals stubbed; mock Recharts `ResponsiveContainer` where charts render.
- **Commits** end with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

## File Structure

- `src/lib/shareText.ts` (**new**) — pure caption builder: `shareSentence`, `shareCaption`, `APP_URL`.
- `src/lib/shareText.test.ts` (**new**).
- `src/lib/share.ts` (**modify**) — add optional `{ text }` to `shareNode`.
- `src/lib/share.test.ts` (**new**).
- `src/tabs/today/DayView.tsx` (**modify**) — capture wrapper + footer + discreet button + handler.
- `src/tabs/today/DayView.test.tsx` (**modify**) — share-button test.

---

## Task 1: `shareText.ts` — state-driven caption

**Files:**
- Create: `src/lib/shareText.ts`
- Test: `src/lib/shareText.test.ts`

**Interfaces:**
- Consumes: `fmtWeekday`, `fmtMonth`, `ordinal` from `src/lib/format.ts`; `HeroKey` from `src/lib/heroState.ts`.
- Produces:
  - `const APP_URL = 'https://jdelsoir.github.io/uccle-climate/'`
  - `shareSentence(i: { date: Date; key: HeroKey; rank: number | null; firstYear: number | null; prevRecord: { v: number; year: number } | null; isToday: boolean }): string`
  - `shareCaption(sentence: string): string` → `` `${sentence}\n${APP_URL}` ``

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/shareText.test.ts
import { describe, it, expect } from 'vitest'
import { shareSentence, shareCaption, APP_URL } from './shareText'

const D = new Date(2026, 5, 29) // Monday June 29 2026
const base = { date: D, rank: null, firstYear: 1833, prevRecord: null, isToday: true } as const

describe('shareSentence', () => {
  it('above / today is tentative with rank', () => {
    expect(shareSentence({ ...base, key: 'above', rank: 26 }))
      .toBe('Monday June 29 2026 is forecast to be the 26th warmest June 29 since 1833.')
  })
  it('above / consolidated is affirmative', () => {
    expect(shareSentence({ ...base, key: 'above', rank: 26, isToday: false }))
      .toBe('Monday June 29 2026 was the 26th warmest June 29 since 1833.')
  })
  it('record-hot today with a previous record', () => {
    expect(shareSentence({ ...base, key: 'record-hot', prevRecord: { v: 32.6, year: 1957 } }))
      .toBe('Monday June 29 2026 is forecast to break the 1957 record — the hottest June 29 since 1833.')
  })
  it('record-hot consolidated with a previous record', () => {
    expect(shareSentence({ ...base, key: 'record-hot', prevRecord: { v: 32.6, year: 1957 }, isToday: false }))
      .toBe('Monday June 29 2026 broke the 1957 record — the hottest June 29 since 1833.')
  })
  it('record-hot with no previous record', () => {
    expect(shareSentence({ ...base, key: 'record-hot', isToday: false }))
      .toBe('Monday June 29 2026 was the hottest June 29 on record.')
  })
  it('record-cold today with a previous record', () => {
    expect(shareSentence({ ...base, key: 'record-cold', prevRecord: { v: 1.2, year: 1900 } }))
      .toBe('Monday June 29 2026 is forecast to break the 1900 cold record for June 29.')
  })
  it('close', () => {
    expect(shareSentence({ ...base, key: 'close' }))
      .toBe('Monday June 29 2026 is forecast to be a typical June 29.')
  })
  it('below / consolidated', () => {
    expect(shareSentence({ ...base, key: 'below', isToday: false }))
      .toBe('Monday June 29 2026 was cooler than usual for June 29.')
  })
  it('above with null rank falls back to warmer-than-usual', () => {
    expect(shareSentence({ ...base, key: 'above', rank: null }))
      .toBe('Monday June 29 2026 is forecast to be warmer than usual for June 29.')
  })
})

describe('shareCaption', () => {
  it('appends the app URL on a new line', () => {
    expect(shareCaption('X')).toBe(`X\n${APP_URL}`)
    expect(APP_URL).toBe('https://jdelsoir.github.io/uccle-climate/')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/shareText.test.ts`
Expected: FAIL — cannot resolve `./shareText`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/shareText.ts
import { fmtWeekday, fmtMonth, ordinal } from './format'
import type { HeroKey } from './heroState'

export const APP_URL = 'https://jdelsoir.github.io/uccle-climate/'

interface ShareSentenceInput {
  date: Date
  key: HeroKey
  rank: number | null
  firstYear: number | null
  prevRecord: { v: number; year: number } | null
  isToday: boolean
}

export function shareSentence({ date, key, rank, firstYear, prevRecord, isToday }: ShareSentenceInput): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const day = date.getDate()
  const D = `${fmtWeekday(date)} ${fmtMonth(mm)} ${day} ${date.getFullYear()}`
  const L = `${fmtMonth(mm)} ${day}`
  const since = firstYear != null ? ` since ${firstYear}` : ''

  switch (key) {
    case 'record-hot':
      return prevRecord
        ? `${D} ${isToday ? 'is forecast to break' : 'broke'} the ${prevRecord.year} record — the hottest ${L}${since}.`
        : `${D} ${isToday ? 'is forecast to be' : 'was'} the hottest ${L} on record.`
    case 'record-cold':
      return prevRecord
        ? `${D} ${isToday ? 'is forecast to break' : 'broke'} the ${prevRecord.year} cold record for ${L}.`
        : `${D} ${isToday ? 'is forecast to be' : 'was'} the coldest ${L} on record.`
    case 'above':
      return rank != null
        ? `${D} ${isToday ? 'is forecast to be' : 'was'} the ${ordinal(rank)} warmest ${L}${since}.`
        : `${D} ${isToday ? 'is forecast to be' : 'was'} warmer than usual for ${L}.`
    case 'below':
      return `${D} ${isToday ? 'is forecast to be' : 'was'} cooler than usual for ${L}.`
    case 'close':
    default:
      return `${D} ${isToday ? 'is forecast to be' : 'was'} a typical ${L}.`
  }
}

export function shareCaption(sentence: string): string {
  return `${sentence}\n${APP_URL}`
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/shareText.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/shareText.ts src/lib/shareText.test.ts
git commit -m "feat(share): state-driven Day caption (forecast vs affirmative) + app-link helper

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: extend `shareNode` to carry caption text

**Files:**
- Modify: `src/lib/share.ts`
- Test: `src/lib/share.test.ts`

**Interfaces:**
- Consumes: `toPng` from `html-to-image` (existing).
- Produces: `shareNode(node: HTMLElement, filename: string, opts?: { text?: string }): Promise<void>` — passes `text` to `navigator.share({ files, title, text })` when `navigator.canShare({files})`; otherwise best-effort `navigator.clipboard.writeText(text)` + download. Backward-compatible (third arg optional, so the existing Me-tab call `shareNode(node, 'uccle-climate.png')` is unaffected).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/share.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('html-to-image', () => ({ toPng: vi.fn().mockResolvedValue('data:image/png;base64,AAAA') }))
import { shareNode } from './share'

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

function stubFetchBlob() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ blob: async () => new Blob(['x'], { type: 'image/png' }) }))
}

describe('shareNode', () => {
  it('passes caption text to navigator.share when files can be shared', async () => {
    stubFetchBlob()
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { canShare: () => true, share })
    await shareNode(document.createElement('div'), 'x.png', { text: 'hello\nurl' })
    expect(share).toHaveBeenCalledTimes(1)
    expect(share.mock.calls[0][0].text).toBe('hello\nurl')
    expect(Array.isArray(share.mock.calls[0][0].files)).toBe(true)
  })

  it('falls back to clipboard + download when files cannot be shared', async () => {
    stubFetchBlob()
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } }) // no canShare
    const click = vi.fn()
    const realCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = realCreate(tag)
      if (tag === 'a') (el as HTMLAnchorElement).click = click
      return el
    })
    await shareNode(document.createElement('div'), 'x.png', { text: 'cap' })
    expect(writeText).toHaveBeenCalledWith('cap')
    expect(click).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/share.test.ts`
Expected: FAIL — current `shareNode` ignores a third arg, so `share` is called without `text` (first assertion fails), and the fallback never calls `clipboard.writeText`.

- [ ] **Step 3: Update the implementation**

Replace the contents of `src/lib/share.ts` with:
```ts
import { toPng } from 'html-to-image'

export async function shareNode(node: HTMLElement, filename: string, opts?: { text?: string }) {
  const dataUrl = await toPng(node, { pixelRatio: 2 })
  const blob = await (await fetch(dataUrl)).blob()
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Uccle Climate', ...(opts?.text ? { text: opts.text } : {}) })
    return
  }
  if (opts?.text) {
    try { await navigator.clipboard?.writeText(opts.text) } catch { /* clipboard may be unavailable */ }
  }
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/share.test.ts`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/share.ts src/lib/share.test.ts
git commit -m "feat(share): carry optional caption text into Web Share + clipboard fallback

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: wire the discreet Share button into DayView

**Files:**
- Modify: `src/tabs/today/DayView.tsx`
- Test: `src/tabs/today/DayView.test.tsx`

**Interfaces:**
- Consumes: `shareSentence`, `shareCaption` (Task 1); `shareNode` (Task 2); existing DayView locals `date`, `state` (`heroState` result), `r` (warm rank `{ rank }` | null), `firstYear`, `prevHigh`, `prevLow`, `isReal`, `highV`.
- Produces: no exported API change.

- [ ] **Step 1: Write the failing test (add to `DayView.test.tsx`)**

At the top of `src/tabs/today/DayView.test.tsx`, add a mock of the share lib (just below the existing `vi.mock('recharts', …)` line):
```tsx
vi.mock('../../lib/share', () => ({ shareNode: vi.fn().mockResolvedValue(undefined) }))
import { shareNode } from '../../lib/share'
```
Then append this test:
```tsx
test('discreet Share button shares the day with a caption', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () => routeFetch(u) })))
  renderDay(TODAY)
  const btn = await screen.findByRole('button', { name: /share this day/i })
  fireEvent.click(btn)
  await waitFor(() => expect(shareNode).toHaveBeenCalled())
  const call = (shareNode as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]
  expect(call[1]).toBe('uccle-day.png')
  expect((call[2] as { text: string }).text).toMatch(/is forecast to be/) // today → tentative voice
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/tabs/today/DayView.test.tsx -t "Share button"`
Expected: FAIL — no "Share this day" button exists yet.

- [ ] **Step 3: Update imports + add hooks/handler in `DayView.tsx`**

Change the React import (line 1):
```tsx
import { useRef, useState } from 'react'
```
Add to the `lucide-react`-less import area (DayView currently imports no lucide; add it) and the lib imports — insert after the `heroState` import line (line 16):
```tsx
import { Share2 } from 'lucide-react'
import { shareNode } from '../../lib/share'
import { shareSentence, shareCaption } from '../../lib/shareText'
```
Add state + busy ref right after `const inputRef = useRef<HTMLInputElement>(null)` (line 19):
```tsx
  const [capturing, setCapturing] = useState(false)
  const busy = useRef(false)
```
After the `bannerSub` block (line 66), add the caption + handler:
```tsx
  const sentence = shareSentence({
    date, key: state.key, rank: r?.rank ?? null, firstYear,
    prevRecord: state.key === 'record-cold' ? prevLow : prevHigh, isToday: isReal,
  })
  const handleShare = async () => {
    if (busy.current) return
    busy.current = true
    setCapturing(true)
    try {
      await new Promise<void>(res => requestAnimationFrame(() => requestAnimationFrame(() => res())))
      const node = document.getElementById('day-hero-capture')
      if (node) await shareNode(node, 'uccle-day.png', { text: shareCaption(sentence) })
    } finally {
      setCapturing(false)
      busy.current = false
    }
  }
```

- [ ] **Step 4: Wrap the hero in a capture container + add the button**

Replace the hero block — from the `{/* HERO */}` comment and its `<HeroShell …>…</HeroShell>` (lines 84–115) — with the same HeroShell wrapped in a capture `<div>` plus the footer and the button row. Keep the HeroShell children exactly as they are; only the wrapper, footer, and button are new:
```tsx
      {/* HERO (capture target) */}
      <div id="day-hero-capture">
        <HeroShell tone={state.tone} intensity={state.intensity}>
          {/* …existing HeroShell children unchanged… */}
        </HeroShell>
        {capturing && highV != null && (
          <div className="border border-t-0 border-border bg-surface px-5 py-3 text-[11px] text-muted">
            <p className="text-fg">{sentence}</p>
            <p className="mt-0.5">Uccle, Brussels · jdelsoir.github.io/uccle-climate</p>
          </div>
        )}
      </div>

      {highV != null && (
        <div className="flex justify-end">
          <button type="button" aria-label="Share this day" disabled={capturing} onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-muted transition-colors hover:text-fg disabled:opacity-40">
            <Share2 size={14} aria-hidden /> Share
          </button>
        </div>
      )}
```
(The "WHERE TODAY SITS" card and everything below stay unchanged, now following the button row.)

- [ ] **Step 5: Run the Day tests + full suite**

Run: `npx vitest run src/tabs/today/DayView.test.tsx && npx vitest run`
Expected: the new test + all existing Day tests PASS; full suite green.

- [ ] **Step 6: Commit**

```bash
git add src/tabs/today/DayView.tsx src/tabs/today/DayView.test.tsx
git commit -m "feat(today/day): discreet hero Share button — self-contained PNG + state caption

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: verify, deploy, live-validate

**Files:** none (verification only).

- [ ] **Step 1: Full suite + production build**

Run: `npm test && VITE_BASE=/uccle-climate/ npm run build`
Expected: all vitest green; build succeeds.

- [ ] **Step 2: Push (CI deploys to Pages)**

```bash
git push origin main
```

- [ ] **Step 3: Live validation**

On https://jdelsoir.github.io/uccle-climate/#/today (Day view):
- A discreet "Share" button sits at the bottom of the hero block.
- Tapping it opens the OS share sheet (on a device/secure context) with a PNG of the hero + a baked footer (sentence · "Uccle, Brussels" · app URL); the caption text carries the sentence + app link. On desktop/unsupported, the PNG downloads and the caption is copied to the clipboard.
- Today reads "…is forecast to be…"; a past consolidated day reads "…was…".
- Light + dark × 375/768/1280, no horizontal overflow; the footer is absent from the live (non-capturing) hero.

> Note: the OS share sheet needs a real device/secure context; the automated gate is the build/deploy + the button present in the deployed bundle. The share-sheet behavior itself is device-verified by the user.

---

## Self-Review

**Spec coverage:**
- Discreet bottom-of-hero button (name "Share this day") → Task 3. ✓
- Self-contained image (hero + baked footer: sentence · "Uccle, Brussels" · app URL), footer only during capture → Task 3. ✓
- `shareNode` carries caption text + clipboard fallback → Task 2. ✓
- State-driven sentence, today tentative / consolidated affirmative, all 5 states + record-with/without-prev + rank-null fallback → Task 1. ✓
- Share text = sentence + app URL → `shareCaption` (Task 1), used in Task 3. ✓
- Constraints (no PII, no new dep / no external network, tokens, square, a11y, light/dark) → Global Constraints + per-task. ✓
- Tests (caption, share-text-passing + fallback, DayView button) → Tasks 1–3. ✓

**Placeholder scan:** none — all code shown in full; the Task-3 JSX explicitly says the HeroShell children are unchanged (they are not re-listed to avoid drift, but the surrounding wrapper/footer/button are complete).

**Type consistency:** `shareSentence` input object matches the call site in Task 3 (`key`/`rank`/`firstYear`/`prevRecord`/`isToday`); `prevRecord` is `prevLow` for `record-cold` else `prevHigh` (both `{v,year}|null` from `previousRecordHigh/Low`); `shareNode(node, filename, { text })` matches Task 2's signature; `shareCaption` wraps the sentence with `APP_URL`.

**Note:** the DayView test mocks `../../lib/share`, so the real `html-to-image`/canvas path never runs in jsdom — the test asserts the wiring (filename + caption text), not the pixel output. `share.test.ts` (Task 2) covers the `shareNode` branching with `html-to-image` mocked.
