# About page update — design spec

**Date:** 2026-06-29
**Scope:** Rewrite the About tab content in plain language, add a "Why Uccle" section (longest dataset) and a "Privacy — we collect nothing" section, keeping the existing methods facts accurate. Single file (`src/tabs/About.tsx`) + its test. No data/pipeline change.

## Goal

Make About explain, for a general visitor: what the app is, **why Uccle** (Belgium's longest continuous record), how the numbers work (plain language), and that **no data is collected**.

## Decisions (from brainstorm)

- **Plain-language rewrite** of the methods text, but keep the credible terms `GHCN-Daily`, `Copernicus ERA5`, `urban heat island` (also keeps the existing test green).
- **One card**, broken into four labeled sections using the app's small uppercase muted label style (`text-[11px] uppercase tracking-[0.09em] text-muted`), consistent with the rest of the UI. Keep the card's current visual style (do not restyle corners — out of scope).
- New **Why Uccle** + **Privacy** sections; keep the methods facts (sources, normals, ERA5 fill, provisional, UHI caveat, completeness gate).
- Privacy copy must be **accurate**: no accounts/cookies/analytics/tracking; the only persisted state is the optional birth-year on the Me tab (browser `localStorage`, never transmitted); today's value is fetched by the browser directly from Open-Meteo.

## Component — `src/tabs/About.tsx` (rewrite)

Keep the outer `<section className="fade-in space-y-4">` and the `<h2>About &amp; Methods</h2>`. Replace the single muted paragraph block with one card containing four labeled sub-sections. Each section: a label `<p className="text-[11px] uppercase tracking-[0.09em] text-muted">…</p>` followed by body text. Card keeps its existing classes (`space-y-… rounded-xl border border-border bg-surface p-5 text-sm leading-relaxed text-muted`); use `text-fg` `<strong>`/emphasis on key terms as today.

Sections + copy (verbatim):

**What this is**
> A simple way to see how the climate is changing where you live, through the long temperature record of Uccle (Ukkel), near Brussels.

**Why Uccle**
> Uccle has Belgium's **longest continuous temperature record** — daily readings since **1833**, kept by the national weather service (RMI). Nearly two centuries of data lets us show real climate change, not just this week's weather. It's also Belgium's official reference station, so its numbers are widely trusted.

**Where the numbers come from** (may be 2–3 short paragraphs)
> Historical temperatures come from NOAA's global climate archive (**GHCN-Daily**), for the official Uccle station; today's value is fetched live from **Open-Meteo**.
>
> Each day is compared to the 1991–2020 average (the standard climate "normal" — you can switch to 1961–1990). Incomplete years are left out of trends, rankings and records.
>
> A few gaps in the station's recent record (~2000–2024) are filled with **Copernicus ERA5**, a high-quality weather reconstruction, so no decade is missing. The last few days are estimates marked *provisional* until finalized (about five days).
>
> Two honest caveats: mixing station and reconstructed data adds minor inconsistency, and cities run warmer than the countryside (the **urban heat island** effect), so Uccle's local warming reads a little above rural Belgium.

**Privacy — we collect nothing**
> This is a static website with no server of ours behind it: no accounts, no login, no cookies, no analytics, no tracking. We have nowhere to send your data — and we don't.
>
> The one thing the app remembers — the birth year you can enter on the "Me" tab — stays in your browser and never leaves your device.
>
> To show today's temperature, your browser asks Open-Meteo directly for Uccle's reading; that request tells them nothing about you beyond a normal web visit.

Emphasis (`<strong className="text-fg">…</strong>`) on: "longest continuous temperature record", "1833", "GHCN-Daily", "Open-Meteo", "Copernicus ERA5", "urban heat island". Italic (`<em>`) on "provisional".

## Testing — `src/tabs/About.test.tsx`

Keep both existing assertions and add two:
```tsx
test('cites sources and UHI caveat', () => {
  render(<About />)
  expect(screen.getByText(/GHCN-Daily/i)).toBeInTheDocument()
  expect(screen.getByText(/urban heat island/i)).toBeInTheDocument()
})

test('explains why Uccle and that no data is collected', () => {
  render(<About />)
  expect(screen.getByText(/longest/i)).toBeInTheDocument()       // Why Uccle
  expect(screen.getByText(/collect nothing/i)).toBeInTheDocument() // Privacy heading
  expect(screen.getByText(/no analytics|no tracking|no cookies/i)).toBeInTheDocument()
})
```
Note: matched text may be split across `<strong>`/`<em>` children, so phrase assertions target a single text node where possible (e.g. "urban heat island" inside one `<strong>`; "longest continuous temperature record" inside one `<strong>`). If a target phrase spans tags, assert on a contiguous sub-phrase that lives in one node, or use a function matcher on `textContent`.

## Constraints honored

- **No PII**; the privacy claims are factually accurate to the codebase (no analytics/cookies/tracking; Me-tab birth-year is `localStorage`-only; runtime network = GitHub Pages origin + Open-Meteo).
- **Tokens, not hex** — `text-fg`/`text-muted`/`border`/`bg-surface` only.
- **No external fonts/CDN**; content-only change, no new dependency, no data/pipeline change.
- **a11y** — semantic headings via the existing label pattern; readable contrast (unchanged tokens). Light + dark unaffected.

## Out of scope / non-goals

- No restyle of the card (corners/shadow) — content only.
- No change to data sources, JSON, or other tabs.
- No new privacy/cookie banner (there is nothing to consent to).

## Standing workflow

Per CLAUDE.md: tests → commit → `git push origin main` (CI deploys) → confirm the new copy shipped on the live About page before calling it done.
