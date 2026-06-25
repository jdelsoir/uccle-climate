# Uccle Climate PWA — Visual Redesign Design Spec

**Date:** 2026-06-25
**Status:** Approved (brainstorming) — ready for implementation plan
**Owner:** Julien Delsoir
**Builds on:** the shipped app (`2026-06-25-uccle-climate-pwa-design.md`). This spec adds the visual layer; it does not change data, routes, or behavior.

## 1. Overview

The shipped Uccle Climate PWA is functionally complete but has **no CSS** — components reference class hooks (`.card`, `.badge`, `.headline`, `.today`, `.bottom-nav`, …) that are never styled, so it renders on raw browser defaults, and the app icon is a placeholder. This project applies a full visual design: a token-based design system in light + dark, real iconography, modern responsive layout, themed charts, motion, and designed app icons — without changing app behavior.

## 2. Goals / Non-goals

**Goals**
- A cohesive "Scientific & Clean" visual system (light + dark, auto + manual toggle).
- Real iconography (Lucide) and a designed PWA app icon (warming-stripes + rising trend line).
- Modern, responsive, mobile-first layout that also looks right on tablet/desktop.
- Charts themed to flip cleanly with dark mode.
- Subtle motion; designed loading/empty/error states.
- Existing tests stay green; PWA stays installable & offline-capable.

**Non-goals**
- No new screens/features, no data-pipeline changes, no routing changes.
- No new backlog tabs (records ratio, calendar heatmap, etc.) — visual only.
- No external fonts/CDNs (CSP + offline must remain intact).

## 3. Design direction
**"Scientific & Clean"** (chosen over warm-editorial and vibrant-dark): neutral grays, crisp surfaces, restrained blue accent, red reserved for "warm/record" data. Calm, precise, dashboard-like, data-forward.

## 4. Design tokens

Defined once as CSS custom properties; dark overrides under a `.dark` class on `<html>`.

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#f6f8fa` | `#0f141b` |
| `--surface` | `#ffffff` | `#161d27` |
| `--surface-2` (insets) | `#f8fafc` | `#0f141b` |
| `--text` | `#1f2933` | `#e6edf3` |
| `--muted` | `#64748b` | `#8b98a9` |
| `--border` | `#e5e9f0` | `#232d3a` |
| `--accent` | `#2563eb` | `#3b82f6` |
| `--accent-soft` | `#eff4ff` | `rgba(59,130,246,.14)` |
| `--warm` | `#dc2626` | `#f87171` |
| `--badge-bg` | `#fee2e2` | `rgba(248,113,113,.14)` |
| `--badge-text` | `#b91c1c` | `#fca5a5` |

**Stripe ramp (shared, both themes)** — the single diverging data scale, blue→pale→red, 16 steps:
`#4575b4 #5a8cc2 #74add1 #9ec9e2 #c6e0ec #e7f1f3 #fff7d6 #ffe9a8 #fdcf87 #fbb267 #f79050 #ef6d43 #e24a35 #d12f27 #b8211f #9e0142`. This supersedes the current `anomalyColor()` ad-hoc scale (which produced a cyan-ish zero); `anomalyColor` is reimplemented to interpolate this ramp by anomaly value, neutral≈pale near zero.

**Type:** system sans stack (`-apple-system, "Segoe UI", Roboto, sans-serif`) — no web-font download. Scale: 11 (caption/label), 13 (body-sm), 15 (body), 18 (h3), 24 (h2), 46 (hero number). Weights 400 / 600 / 800. Uppercase `.label` with `.09em` letter-spacing.

**Shape & space:** radius 12px (cards), 999px (pills/badges), 6–10px (insets). Spacing on a 4px base. Shadows: soft, low-opacity (`0 8px 24px rgba(20,30,50,.08)` light; deeper, darker in dark).

**Motion:** 150–250ms ease for hover/active/theme transitions; subtle fade+translate(8px) on tab/content mount; honor `prefers-reduced-motion: reduce` (disable transforms/transitions).

## 5. Iconography
- **UI icons:** `lucide-react` (MIT, tree-shaken). Nav: `Sun` (Today), `TrendingUp` (Trends), `Thermometer` (Climate), `User` (Me), `Info` (About). Plus contextual icons (e.g., `Share2` on share button, `Trophy`/`Flame` for records, `Calendar`).
- **App icon (chosen: option 3 — stripes + rising line):** full-bleed warming stripes with a white upward trend line + end dot, drawn safely within the maskable safe zone. Generated as `public/icons/icon-192.png` and `icon-512.png` (maskable, replacing the current placeholders) and a matching `favicon`. Generation is a small script (Pillow if available, else stdlib PNG) committed under `scripts/` so it's reproducible.

## 6. Theming mechanism
- **Tailwind CSS v4** via `@tailwindcss/vite`; tokens declared in an `@theme`/`:root` block and `.dark` overrides. Dark mode = `class` strategy.
- **Theme controller:** a small `useTheme` hook + toggle. Default = system (`prefers-color-scheme`); user override persisted in `localStorage` key `uccle.theme` (`'light' | 'dark' | 'system'`). Applies/removes `.dark` on `document.documentElement`. Toggle control in a lightweight app header.
- **No flash:** an inline pre-hydration snippet in `index.html` sets the initial `.dark` class from localStorage/system before first paint.

## 7. Component restyle (existing files, behavior unchanged)
- **App shell / header:** new compact header (app title + theme toggle). On ≥1024px the nav renders as a centered top bar; below that, the existing bottom tab bar.
- **BottomNav:** surface bg, Lucide icons + labels, accent active state, `≥44px` tap targets, safe-area padding (`env(safe-area-inset-bottom)`).
- **Today / Trends / Climate / Me / About:** restyle the existing markup — cards, hero number, badges, then-vs-now, dot column, year picker, counter cards, birthday stripes, share card, About prose — using tokens. The `#share-card` keeps its no-PII content unchanged (stats + "Uccle, Brussels" only).
- **Stripes & DotColumn (SVG):** consume the shared ramp / token colors; ensure legible in both themes.
- **Charts (Recharts):** axis ticks/grid use `--muted`/`--border`; bars/cells use the ramp; tooltip uses `--surface`/`--text`/`--border`. Driven by CSS vars (read at render) so they flip with the theme.
- **States:** designed **loading** (skeleton blocks/spinner), **empty**, and **error** (the existing "Live temperature unavailable" fallback) — consistent, themed.

## 8. Responsive design (mobile-first)
- **Breakpoints:** mobile `<640`, tablet `640–1024`, desktop `>1024`.
- **Content column:** centered, `max-width ≈ 680px`, horizontal padding 16px — never full-bleed stretch on desktop.
- **Grids:** Climate counter cards 1-col mobile → 2-col `≥640px`. Today sub-cards stack on mobile, may pair up on wider screens.
- **Nav:** bottom tab bar on mobile/tablet; centered top bar on `≥1024px`.
- **Rules:** no horizontal **page** scroll at any width; wide content (charts, any wide table) scrolls inside its own `overflow-x:auto` container; charts via `ResponsiveContainer` reflow to container width; tap targets `≥44px`.

## 9. Testing & verification
- **Unit/component tests stay green:** restyle must not change behavior. Update only assertions tied to markup that genuinely changes (e.g., if a heading wraps in an icon). Keep test output pristine; mock Recharts `ResponsiveContainer` as already established.
- **Theme test:** a test that toggling theme adds/removes `.dark` on the root and persists `uccle.theme`.
- **Responsive verification (explicit step):** after build, verify the running app at **360px, 768px, and 1280px** widths, in **both light and dark**: (a) no horizontal page scroll; (b) bottom-nav↔top-bar switch at the breakpoint; (c) cards/grids reflow (Climate 1→2 col); (d) charts + warming stripes resize to container; (e) tap targets ≥44px. Verify on the **live Pages URL** too after deploy.
- **PWA intact:** rebuild → confirm installable (manifest + real maskable icons), SW precache still excludes `thisday/*`, offline still works.
- **Deploy:** push → GitHub Actions → confirm live light/dark + responsive.

## 10. Out of scope / backlog
- New screens (records ratio, calendar heatmap, climate spiral), code-splitting the Recharts bundle, animated stripe reveal beyond the subtle mount transition, internationalization.

## 11. Open questions
None blocking. App-icon generation uses Pillow when present, else a stdlib PNG writer (decided in the plan).
