# Day-hero share button — design spec

**Date:** 2026-06-29
**Scope:** Add a discreet Share control at the bottom of the Day-view hero block that shares a self-contained PNG of the hero (plus a baked footer with the sentence, "Uccle, Brussels", and the app URL) together with a caption sentence + app link. Day view only.

## Goal

One-tap share of "today/this day" as an image + caption. The caption is tentative for today (live forecast) and affirmative for a consolidated past day, derived from the hero's state.

## Decisions (from brainstorm)

- **Day hero only** (sentences are day-specific). Month/Year share is a future follow-up.
- **Self-contained image:** capture the hero block + a footer strip baked into the image (sentence · "Uccle, Brussels" · app URL). Link **also** in the share text.
- **Today voice:** "is forecast to be" / "is forecast to break". **Consolidated:** "was" / "broke".
- Reuse existing `lib/share.ts` (`html-to-image` + Web Share API), extended to carry caption text. The existing `ShareButton` (Me tab) is untouched.

## Components / files

### A. `src/lib/shareText.ts` (new, pure)

```ts
import { fmtWeekday, fmtMonth } from './format'
import { ordinal } from './format'
import type { HeroKey } from './heroState'

interface ShareSentenceInput {
  date: Date
  key: HeroKey
  rank: number | null
  firstYear: number | null
  prevRecord: { v: number; year: number } | null
  isToday: boolean
}
export function shareSentence(i: ShareSentenceInput): string
export const APP_URL = 'https://jdelsoir.github.io/uccle-climate/'
export function shareCaption(sentence: string): string // `${sentence}\n${APP_URL}`
```

Date prefix `D = "${fmtWeekday(date)} ${fmtMonth(mm)} ${day} ${year}"` → e.g. `Monday June 29 2026`. Day label `L = "${fmtMonth(mm)} ${day}"` → `June 29`. `mm = String(date.getMonth()+1).padStart(2,'0')`.

Sentence by `key` (today / consolidated):
- **record-hot:**
  - prevRecord present, today: `${D} is forecast to break the ${prevRecord.year} record — the hottest ${L} since ${firstYear}.`
  - prevRecord present, consolidated: `${D} broke the ${prevRecord.year} record — the hottest ${L} since ${firstYear}.`
  - prevRecord null: `${D} ${isToday ? 'is forecast to be' : 'was'} the hottest ${L} on record.`
- **above** (rank present): `${D} ${isToday ? 'is forecast to be' : 'was'} the ${ordinal(rank)} warmest ${L} since ${firstYear}.`
  - rank null fallback: `${D} ${isToday ? 'is forecast to be' : 'was'} warmer than usual for ${L}.`
- **close:** `${D} ${isToday ? 'is forecast to be' : 'was'} a typical ${L}.`
- **below:** `${D} ${isToday ? 'is forecast to be' : 'was'} cooler than usual for ${L}.`
- **record-cold:**
  - prevRecord present: `${D} ${isToday ? 'is forecast to break' : 'broke'} the ${prevRecord.year} cold record for ${L}.`
  - prevRecord null: `${D} ${isToday ? 'is forecast to be' : 'was'} the coldest ${L} on record.`

`firstYear` null (shouldn't happen with data) → drop the "since {firstYear}" clause (omit gracefully).

### B. `src/lib/share.ts` (extend)

Change `shareNode(node, filename)` → `shareNode(node, filename, opts?: { text?: string })`:
- `navigator.share({ files: [file], title: 'Uccle Climate', ...(opts?.text ? { text: opts.text } : {}) })` when `navigator.canShare?.({ files: [file] })`.
- Download fallback unchanged, plus best-effort `if (opts?.text) try { await navigator.clipboard?.writeText(opts.text) } catch {}` so the caption isn't lost when only the file downloads.
- Existing `ShareButton`/Me-tab call (`shareNode(node, 'uccle-climate.png')`) keeps working (third arg optional).

### C. `src/tabs/today/DayView.tsx` (modify)

- Add `useState` `capturing` (default false) and `busy` ref (mirror existing ShareButton busy guard).
- Compute the sentence when `highV != null`:
  ```ts
  const sentence = shareSentence({
    date, key: state.key, rank: r?.rank ?? null, firstYear,
    prevRecord: state.key === 'record-cold' ? prevLow : prevHigh, isToday: isReal,
  })
  ```
  (`prevHigh`/`prevLow` already computed in DayView; `r` is the warm rank; `firstYear`, `state` already present.)
- Wrap the hero in a capture container:
  ```tsx
  <div id="day-hero-capture">
    <HeroShell …>…</HeroShell>
    {capturing && (
      <div className="border border-t-0 border-border bg-surface px-5 py-3 text-[11px] text-muted">
        <p className="text-fg">{sentence}</p>
        <p className="mt-0.5">Uccle, Brussels · jdelsoir.github.io/uccle-climate</p>
      </div>
    )}
  </div>
  ```
- Discreet button row (only when `highV != null`), directly under the capture container and before the "where it sits" card:
  ```tsx
  <div className="flex justify-end">
    <button type="button" aria-label="Share this day" disabled={capturing}
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-muted transition-colors hover:text-fg disabled:opacity-40">
      <Share2 size={14} aria-hidden /> Share
    </button>
  </div>
  ```
- Handler:
  ```ts
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
- Import `Share2` from `lucide-react`, `shareNode` from `../../lib/share`, `shareSentence`/`shareCaption` from `../../lib/shareText`.

## Testing

- `src/lib/shareText.test.ts`: for a fixed date (e.g. `new Date(2026,5,29)` → "Monday June 29 2026"): each `key` × `isToday true/false`; record-hot/cold with and without `prevRecord`; `above` ordinal (26 → "26th"); `above` rank-null fallback. Pure string assertions. `shareCaption` appends the URL on a new line.
- `src/lib/share.test.ts`: mock `html-to-image` (`vi.mock('html-to-image', () => ({ toPng: vi.fn().mockResolvedValue('data:image/png;base64,x') }))`) and stub `fetch` (dataUrl→blob), `navigator.canShare`/`navigator.share`. Assert (1) when `canShare` true, `navigator.share` is called with an object whose `text` equals the passed text; (2) when `canShare` absent, no throw and (best-effort) `navigator.clipboard.writeText` called with the text. `afterEach(vi.unstubAllGlobals)`.
- `src/tabs/today/DayView.test.tsx` (add): mock `../../lib/share` (`vi.mock` → `shareNode: vi.fn()`); the discreet "Share this day" button renders when data is present; clicking it eventually calls `shareNode` with a `text` arg containing the expected sentence (e.g. for today fixture, `/is forecast to be/`). Keep existing tests green.

## Constraints honored

- **No PII** — caption = date + derived stat + "Uccle, Brussels" + app URL. No names/PII.
- **No external fonts/CDN/network** — `html-to-image` is bundled and runs client-side; captured image uses system fonts; the only runtime fetch remains Open-Meteo (unchanged). CSP-safe.
- **Tokens, not hex** — footer + button use `border`/`surface`/`muted`/`fg` tokens; no hex.
- **Square corners** — button is text-only; footer matches the hero's square border.
- **a11y** — button has accessible name "Share this day"; icon `aria-hidden`; disabled state during capture.
- **Light + dark**; the captured PNG reflects the current theme.

## Out of scope / non-goals

- Month/Year hero share.
- No change to `ShareButton` or the Me-tab share card.
- No server-side/OG image generation (client capture only).
- No new dependency (reuse bundled `html-to-image`).

## Standing workflow

Per CLAUDE.md: tests → commit → `git push origin main` (CI deploys) → confirm shipped on the live site before calling it done. (Web Share with files needs a real device/secure context — note that the live check of the share sheet itself is device-dependent; the build/deploy + bundle presence is the automated gate.)
