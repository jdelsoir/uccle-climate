# About Page Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the About tab in plain language with four labeled sections — what this is, why Uccle (longest dataset), where the numbers come from, and a privacy section stating no data is collected.

**Architecture:** Content-only change to one component (`src/tabs/About.tsx`) plus its test. No data, dependency, or other-file changes.

**Tech Stack:** React 18 + TS, Tailwind v4 tokens, Vitest + @testing-library/react.

## Global Constraints

- **Plain language**, but keep the credible terms verbatim: `GHCN-Daily`, `Copernicus ERA5`, `urban heat island`.
- **Privacy claims must be factually accurate** to the codebase: no accounts/cookies/analytics/tracking; the only persisted state is the optional Me-tab birth-year in browser `localStorage` (never transmitted); runtime network is the GitHub Pages origin + Open-Meteo only.
- **Tokens, not hex** — `text-fg`/`text-muted`/`border`/`bg-surface`; emphasis via `<strong className="text-fg">` / `<em>` as today.
- One card; section labels use the app pattern `text-[11px] uppercase tracking-[0.09em] text-muted`. **Do not restyle the card** (corners/shadow) — content only.
- **No PII**; no new dependency; no data/pipeline change.
- **Commits** end with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

## File Structure

- `src/tabs/About.tsx` (**modify** — rewrite the card body into four labeled sections).
- `src/tabs/About.test.tsx` (**modify** — keep existing assertions, add Why-Uccle + privacy).

---

## Task 1: Rewrite About content

**Files:**
- Modify: `src/tabs/About.tsx`
- Test: `src/tabs/About.test.tsx`

**Interfaces:**
- Consumes: nothing new (presentational component, default export `About()`).
- Produces: no API change.

- [ ] **Step 1: Update the test (failing)**

Replace the contents of `src/tabs/About.test.tsx` with:
```tsx
import { render, screen } from '@testing-library/react'
import About from './About'

test('cites sources and UHI caveat', () => {
  render(<About />)
  expect(screen.getByText(/GHCN-Daily/i)).toBeInTheDocument()
  expect(screen.getByText(/urban heat island/i)).toBeInTheDocument()
})

test('explains why Uccle and that no data is collected', () => {
  render(<About />)
  expect(screen.getByText(/longest continuous temperature record/i)).toBeInTheDocument()
  expect(screen.getByText(/we collect nothing/i)).toBeInTheDocument()
  expect(screen.getByText(/no analytics, no tracking/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/tabs/About.test.tsx`
Expected: FAIL — "longest continuous temperature record" / "we collect nothing" / "no analytics, no tracking" not present in the current About.

- [ ] **Step 3: Rewrite `src/tabs/About.tsx`**

Replace the whole file with:
```tsx
export default function About() {
  return (
    <section className="fade-in space-y-4">
      <h2 className="text-2xl font-extrabold tracking-tight">About &amp; Methods</h2>
      <div className="space-y-5 rounded-xl border border-border bg-surface p-5 text-sm leading-relaxed text-muted">

        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">What this is</p>
          <p>A simple way to see how the climate is changing where you live, through the long temperature record of Uccle (Ukkel), near Brussels.</p>
        </div>

        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Why Uccle</p>
          <p>Uccle has Belgium's <strong className="text-fg">longest continuous temperature record</strong> — daily readings since <strong className="text-fg">1833</strong>, kept by the national weather service (RMI). Nearly two centuries of data lets us show real climate change, not just this week's weather. It's also Belgium's official reference station, so its numbers are widely trusted.</p>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Where the numbers come from</p>
          <p>Historical temperatures come from NOAA's global climate archive (<strong className="text-fg">GHCN-Daily</strong>), for the official Uccle station; today's value is fetched live from <strong className="text-fg">Open-Meteo</strong>.</p>
          <p>Each day is compared to the 1991–2020 average (the standard climate "normal" — you can switch to 1961–1990). Incomplete years are left out of trends, rankings and records.</p>
          <p>A few gaps in the station's recent record (~2000–2024) are filled with <strong className="text-fg">Copernicus ERA5</strong>, a high-quality weather reconstruction, so no decade is missing. The last few days are estimates marked <em>provisional</em> until finalized (about five days).</p>
          <p>Two honest caveats: mixing station and reconstructed data adds minor inconsistency, and cities run warmer than the countryside (the <strong className="text-fg">urban heat island</strong> effect), so Uccle's local warming reads a little above rural Belgium.</p>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Privacy — we collect nothing</p>
          <p>This is a static website with no server of ours behind it: no accounts, no login, no cookies, no analytics, no tracking. We have nowhere to send your data — and we don't.</p>
          <p>The one thing the app remembers — the birth year you can enter on the "Me" tab — stays in your browser and never leaves your device.</p>
          <p>To show today's temperature, your browser asks Open-Meteo directly for Uccle's reading; that request tells them nothing about you beyond a normal web visit.</p>
        </div>

      </div>
    </section>
  )
}
```

> Note the exact strings the test depends on, all inside a single text node: `longest continuous temperature record` and `urban heat island` and `GHCN-Daily` (each within one `<strong>`), the label `Privacy — we collect nothing` (one `<p>`), and `no accounts, no login, no cookies, no analytics, no tracking` (one `<p>` — the regex `/no analytics, no tracking/i` matches a contiguous slice of it).

- [ ] **Step 4: Run the test + full suite**

Run: `npx vitest run src/tabs/About.test.tsx && npx vitest run`
Expected: About tests PASS; full suite green.

- [ ] **Step 5: Commit**

```bash
git add src/tabs/About.tsx src/tabs/About.test.tsx
git commit -m "feat(about): plain-language rewrite — why Uccle (longest record) + privacy (no data collected)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Verify, deploy, live-validate

**Files:** none (verification only).

- [ ] **Step 1: Full suite + production build**

Run: `npm test && VITE_BASE=/uccle-climate/ npm run build`
Expected: all vitest green; build succeeds.

- [ ] **Step 2: Push (CI deploys to Pages)**

```bash
git push origin main
```

- [ ] **Step 3: Live validation**

On https://jdelsoir.github.io/uccle-climate/#/about : four labeled sections render (What this is · Why Uccle · Where the numbers come from · Privacy — we collect nothing); "Why Uccle" cites the longest record since 1833; the privacy section states no accounts/cookies/analytics/tracking and the localStorage-only birth-year. Light + dark × 375/768/1280, no overflow.

---

## Self-Review

**Spec coverage:**
- Plain-language rewrite keeping GHCN-Daily / ERA5 / urban-heat-island → Task 1. ✓
- Why-Uccle (longest dataset, 1833, RMI reference) → Task 1. ✓
- Privacy / no data collected (accurate: no analytics/cookies/tracking; localStorage-only birth-year; Open-Meteo direct) → Task 1. ✓
- Four labeled sections in one card, app label style, card not restyled → Task 1. ✓
- Tests keep existing + add Why-Uccle + privacy assertions, single-node matches → Task 1. ✓
- Constraints (tokens, no PII, no new dep, no data change) → Global Constraints. ✓

**Placeholder scan:** none — full file + full test shown.

**Type consistency:** no types; the test's target phrases all exist verbatim in the rewritten component, each within one text node (verified against the JSX above).
