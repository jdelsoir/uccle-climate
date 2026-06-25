# Uccle Climate PWA — Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply a full "Scientific & Clean" visual design (light + dark, responsive, Lucide icons, designed app icon, themed charts, motion) to the existing Uccle Climate PWA without changing app behavior.

**Architecture:** Tailwind CSS v4 (`@tailwindcss/vite`) with design tokens as CSS custom properties in `src/index.css`; dark mode via a `.dark` class on `<html>` (custom variant), driven by a tiny theme controller (system default + persisted toggle, no-flash inline snippet). Components keep their logic and asserted text; only markup/classes change. Charts theme via CSS `var()` in SVG attributes so they flip with the theme. The PWA app icon is regenerated (warming stripes + rising white line) by a committed Python/Pillow script.

**Tech Stack:** React 18, Vite 6, TypeScript, Tailwind CSS v4, lucide-react, Recharts (existing), vite-plugin-pwa (existing), Vitest + Testing Library, Python/Pillow (icon generation, dev-time only).

## Global Constraints

- **No behavior changes**: data, routes (HashRouter), and component logic stay identical. Restyle only. Existing tests must stay green; update a test ONLY when the markup it asserts genuinely changes (the colorScale output format is the one intended behavior change).
- **Direction = "Scientific & Clean".** Tokens (light / dark): `--bg` `#f6f8fa`/`#0f141b`, `--surface` `#ffffff`/`#161d27`, `--surface-2` `#f8fafc`/`#0f141b`, `--fg` `#1f2933`/`#e6edf3`, `--muted` `#64748b`/`#8b98a9`, `--border` `#e5e9f0`/`#232d3a`, `--accent` `#2563eb`/`#3b82f6`, `--accent-soft` `#eff4ff`/`rgba(59,130,246,.14)`, `--warm` `#dc2626`/`#f87171`, `--badge-bg` `#fee2e2`/`rgba(248,113,113,.14)`, `--badge-fg` `#b91c1c`/`#fca5a5`.
- **Stripe ramp (shared, both themes), 16 steps:** `#4575b4 #5a8cc2 #74add1 #9ec9e2 #c6e0ec #e7f1f3 #fff7d6 #ffe9a8 #fdcf87 #fbb267 #f79050 #ef6d43 #e24a35 #d12f27 #b8211f #9e0142`.
- **Dark mode** = `class` strategy (`.dark` on `<html>`), default = system, override persisted in `localStorage['uccle.theme']` (`'light'|'dark'|'system'`). No flash on load.
- **No external fonts/CDNs** (CSP + offline). System sans stack only.
- **Responsive, mobile-first**: centered content `max-width: 680px`; Climate cards 1-col `<640px` → 2-col `≥640px`; nav = fixed bottom bar `<1024px`, centered top bar `≥1024px`; no horizontal page scroll; tap targets `≥44px`; honor `prefers-reduced-motion`.
- **App icon** = stripes + rising white trend line, maskable, 192 + 512 PNG in `public/icons/` (committed; `public/icons` is NOT gitignored). App-icon favicon reuses `icons/icon-192.png` via a relative href.
- **Vite `base`** stays `/uccle-climate/`; all asset hrefs base-relative.
- PWA stays installable + offline (SW precache still excludes `data/thisday/**`).

---

## File Structure

```
src/index.css            # NEW: @import tailwindcss, tokens, @theme inline, dark variant, motion keyframes
src/main.tsx             # MODIFY: import './index.css'
index.html               # MODIFY: no-flash snippet, theme-color metas, favicon link
vite.config.ts           # MODIFY: add @tailwindcss/vite plugin; test.css=false
src/lib/theme.ts         # NEW: theme controller (pref get/resolve/apply)
src/lib/ramp.ts          # NEW: RAMP constant
src/lib/colorScale.ts    # MODIFY: anomalyColor → interpolate RAMP (hex out)
src/lib/colorScale.test.ts # MODIFY: assert ramp-based output
src/setupTests.ts        # MODIFY: matchMedia polyfill
src/components/ThemeToggle.tsx  # NEW
src/components/Header.tsx        # NEW (title + ThemeToggle)
src/components/Nav.tsx           # NEW (responsive nav, Lucide icons) — replaces BottomNav
src/components/BottomNav.tsx     # DELETE
src/components/States.tsx        # NEW (Loading, ErrorState)
src/App.tsx              # MODIFY: shell, layout container, Header + Nav
src/components/Stripes.tsx       # MODIFY: ramp colors (via anomalyColor, unchanged call)
src/components/DotColumn.tsx     # MODIFY: token colors
src/components/Sparkline.tsx     # MODIFY: token colors + themed axes
src/tabs/Today.tsx       # MODIFY: restyle + chart theming + States
src/tabs/Trends.tsx      # MODIFY: restyle + chart theming + States
src/tabs/Climate.tsx     # MODIFY: restyle + responsive grid + States
src/tabs/Me.tsx          # MODIFY: restyle + States
src/tabs/About.tsx       # MODIFY: restyle
scripts/gen_icons.py     # NEW: generate maskable PNG icons
requirements-dev.txt     # MODIFY: add pillow
public/icons/icon-192.png, icon-512.png  # REGENERATE (committed)
```

Tests already present that must stay green (update only where noted): `App.test.tsx`, `tabs/{Today,Trends,Climate,Me,About}.test.tsx`, `components/{Stripes,DotColumn}.test.tsx`, `lib/{stats,colorScale}.test.ts`, `lib/format.test.ts`, `data/*` tests.

---

## Phase 0 — Tooling & tokens

### Task 1: Install Tailwind v4 + lucide; tokens; theme bootstrap

**Files:**
- Modify: `package.json` (deps), `vite.config.ts`, `src/main.tsx`, `index.html`
- Create: `src/index.css`
- Test: existing suite must stay green (no new test)

**Interfaces:**
- Produces: Tailwind utilities + semantic color classes (`bg-bg`, `bg-surface`, `text-fg`, `text-muted`, `border-border`, `bg-accent`, `text-accent`, `bg-accent-soft`, `text-warm`, `bg-badge-bg`, `text-badge-fg`); `.fade-in` animation; `.dark` class flips tokens. `lucide-react` available.

- [ ] **Step 1: Install deps**

```bash
npm install tailwindcss @tailwindcss/vite lucide-react
```

- [ ] **Step 2: Add the Tailwind Vite plugin + disable CSS in tests**

Edit `vite.config.ts`: add `import tailwindcss from '@tailwindcss/vite'` after the other imports, put `tailwindcss()` as the FIRST entry in `plugins`, and add `css: false` to the `test` block.
```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.VITE_BASE ?? '/uccle-climate/'

export default defineConfig({
  base,
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['.nojekyll', 'icons/*'],
      manifest: {
        name: 'Uccle Climate', short_name: 'Uccle Climate',
        description: 'How Brussels temperature changed since 1833',
        theme_color: '#2563eb', background_color: '#f6f8fa',
        display: 'standalone', start_url: base, scope: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,json,png,svg,webmanifest}'],
        globIgnores: ['**/data/thisday/**'],
        runtimeCaching: [
          { urlPattern: /\/data\/thisday\/.*\.json$/, handler: 'CacheFirst', options: { cacheName: 'thisday' } },
          { urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/, handler: 'NetworkFirst', options: { cacheName: 'open-meteo', networkTimeoutSeconds: 5 } },
        ],
      },
    }),
  ],
  test: { environment: 'jsdom', globals: true, setupFiles: './src/setupTests.ts', css: false },
})
```

- [ ] **Step 3: Create `src/index.css` (tokens + theme + motion)**

```css
@import "tailwindcss";

/* Dark mode driven by a .dark class on <html> (not the media default). */
@custom-variant dark (&:where(.dark, .dark *));

:root {
  --bg:#f6f8fa; --surface:#ffffff; --surface-2:#f8fafc; --fg:#1f2933; --muted:#64748b;
  --border:#e5e9f0; --accent:#2563eb; --accent-soft:#eff4ff; --warm:#dc2626;
  --badge-bg:#fee2e2; --badge-fg:#b91c1c;
}
.dark {
  --bg:#0f141b; --surface:#161d27; --surface-2:#0f141b; --fg:#e6edf3; --muted:#8b98a9;
  --border:#232d3a; --accent:#3b82f6; --accent-soft:rgba(59,130,246,.14); --warm:#f87171;
  --badge-bg:rgba(248,113,113,.14); --badge-fg:#fca5a5;
}

/* `inline` makes the generated utilities reference the vars at runtime, so they flip with .dark. */
@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-fg: var(--fg);
  --color-muted: var(--muted);
  --color-border: var(--border);
  --color-accent: var(--accent);
  --color-accent-soft: var(--accent-soft);
  --color-warm: var(--warm);
  --color-badge-bg: var(--badge-bg);
  --color-badge-fg: var(--badge-fg);
}

html, body { background: var(--bg); color: var(--fg); }
body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }

@keyframes fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.fade-in { animation: fade-in .25s ease both; }

@media (prefers-reduced-motion: reduce) {
  .fade-in { animation: none; }
  *, *::before, *::after { transition-duration: .001ms !important; animation-duration: .001ms !important; }
}
```

- [ ] **Step 4: Import the stylesheet in `src/main.tsx`**

Add `import './index.css'` (after the `import './pwa'` line):
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './pwa'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 5: Update `index.html` (no-flash, theme-color, favicon)**

Replace the `<head>` contents:
```html
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <link rel="icon" type="image/png" href="icons/icon-192.png" />
    <meta name="theme-color" content="#f6f8fa" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#0f141b" media="(prefers-color-scheme: dark)" />
    <title>Uccle Climate</title>
    <script>
      (function () {
        try {
          var p = localStorage.getItem('uccle.theme');
          var dark = p === 'dark' || ((p === null || p === 'system') &&
            window.matchMedia('(prefers-color-scheme: dark)').matches);
          document.documentElement.classList.toggle('dark', dark);
        } catch (e) {}
      })();
    </script>
  </head>
```

- [ ] **Step 6: Verify build + tests**

Run: `npm test` → all existing tests still pass (24).
Run: `VITE_BASE=/uccle-climate/ npm run build` → clean; `dist/assets/*.css` exists.
Expected: no TypeScript/build errors; tests green.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "build: Tailwind v4 + lucide + design tokens + theme bootstrap"
```

---

## Phase 1 — Theme controller & color ramp

### Task 2: Theme controller + toggle + matchMedia test polyfill

**Files:**
- Create: `src/lib/theme.ts`, `src/components/ThemeToggle.tsx`, `src/lib/theme.test.ts`
- Modify: `src/setupTests.ts`

**Interfaces:**
- Produces: `type ThemePref = 'light'|'dark'|'system'`; `getStoredTheme(): ThemePref`; `resolve(pref): 'light'|'dark'`; `applyTheme(pref): void` (sets localStorage + toggles `.dark`). `<ThemeToggle />` default export.

- [ ] **Step 1: Add matchMedia polyfill to `src/setupTests.ts`**

```ts
import '@testing-library/jest-dom'

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false, media: query, onchange: null,
    addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false },
  }) as unknown as MediaQueryList
}
```

- [ ] **Step 2: Write the failing test `src/lib/theme.test.ts`**

```ts
import { applyTheme, getStoredTheme, resolve } from './theme'

beforeEach(() => { localStorage.clear(); document.documentElement.classList.remove('dark') })

test('applyTheme("dark") adds .dark and persists', () => {
  applyTheme('dark')
  expect(document.documentElement.classList.contains('dark')).toBe(true)
  expect(localStorage.getItem('uccle.theme')).toBe('dark')
})
test('applyTheme("light") removes .dark', () => {
  document.documentElement.classList.add('dark')
  applyTheme('light')
  expect(document.documentElement.classList.contains('dark')).toBe(false)
})
test('getStoredTheme defaults to system', () => {
  expect(getStoredTheme()).toBe('system')
})
test('resolve("system") returns light when matchMedia is false', () => {
  expect(resolve('system')).toBe('light')
})
```

- [ ] **Step 3: Run to verify fail**

Run: `npm test -- theme` → FAIL (module not found).

- [ ] **Step 4: Implement `src/lib/theme.ts`**

```ts
export type ThemePref = 'light' | 'dark' | 'system'
const KEY = 'uccle.theme'

export function getStoredTheme(): ThemePref {
  const v = localStorage.getItem(KEY)
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
}

export function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolve(pref: ThemePref): 'light' | 'dark' {
  return pref === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : pref
}

export function applyTheme(pref: ThemePref): void {
  localStorage.setItem(KEY, pref)
  document.documentElement.classList.toggle('dark', resolve(pref) === 'dark')
}
```

- [ ] **Step 5: Implement `src/components/ThemeToggle.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { applyTheme, getStoredTheme, resolve, type ThemePref } from '../lib/theme'

export default function ThemeToggle() {
  const [pref, setPref] = useState<ThemePref>(() => getStoredTheme())
  useEffect(() => { applyTheme(pref) }, [pref])
  const isDark = resolve(pref) === 'dark'
  return (
    <button
      type="button"
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => setPref(isDark ? 'light' : 'dark')}
      className="grid h-10 w-10 place-items-center rounded-lg text-muted transition-colors hover:bg-accent-soft hover:text-accent"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
```

- [ ] **Step 6: Run to verify pass**

Run: `npm test -- theme` → PASS. Run full `npm test` → all green.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(theme): theme controller + toggle + matchMedia test polyfill"
```

### Task 3: Color ramp + anomalyColor rewrite

**Files:**
- Create: `src/lib/ramp.ts`
- Modify: `src/lib/colorScale.ts`, `src/lib/colorScale.test.ts`

**Interfaces:**
- Produces: `RAMP: string[]` (16 hex); `anomalyColor(v: number, span?: number): string` returns a ramp hex (positive→warmer end, negative→cooler end, clamped to ±span).

- [ ] **Step 1: Rewrite the test `src/lib/colorScale.test.ts`**

```ts
import { anomalyColor } from './colorScale'
import { RAMP } from './ramp'

test('zero anomaly maps to the neutral middle of the ramp', () => {
  expect(anomalyColor(0)).toBe(RAMP[Math.round((RAMP.length - 1) / 2)])
})
test('positive anomaly is warmer (later in ramp) than negative', () => {
  expect(RAMP.indexOf(anomalyColor(2))).toBeGreaterThan(RAMP.indexOf(anomalyColor(-2)))
})
test('clamps beyond span to the ramp ends', () => {
  expect(anomalyColor(99)).toBe(RAMP[RAMP.length - 1])
  expect(anomalyColor(-99)).toBe(RAMP[0])
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- colorScale` → FAIL (`ramp` missing / old rgb output).

- [ ] **Step 3: Implement `src/lib/ramp.ts`**

```ts
// Shared diverging cool→warm data scale (Ed-Hawkins-style), 16 steps.
export const RAMP: string[] = [
  '#4575b4', '#5a8cc2', '#74add1', '#9ec9e2', '#c6e0ec', '#e7f1f3', '#fff7d6', '#ffe9a8',
  '#fdcf87', '#fbb267', '#f79050', '#ef6d43', '#e24a35', '#d12f27', '#b8211f', '#9e0142',
]
```

- [ ] **Step 4: Rewrite `src/lib/colorScale.ts`**

```ts
import { RAMP } from './ramp'

// Map a temperature anomaly (°C) to the diverging ramp, clamped to ±span.
export function anomalyColor(v: number, span = 2.6): string {
  const t = Math.max(-1, Math.min(1, v / span))       // -1 (cool) .. 1 (warm)
  const idx = Math.round(((t + 1) / 2) * (RAMP.length - 1))
  return RAMP[idx]
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npm test -- colorScale` → PASS. Run full `npm test` → all green (Stripes/DotColumn still pass — they don't assert color).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(color): shared ramp; anomalyColor interpolates it"
```

---

## Phase 2 — Shell, nav, shared states

### Task 4: App shell + Header + responsive Nav + States

**Files:**
- Create: `src/components/Header.tsx`, `src/components/Nav.tsx`, `src/components/States.tsx`
- Modify: `src/App.tsx`
- Delete: `src/components/BottomNav.tsx`
- Test: existing `src/App.test.tsx` must stay green (asserts heading "This Day in History" + a "Trends" link)

**Interfaces:**
- Consumes: `ThemeToggle` (Task 2); lucide icons.
- Produces: `<Header/>`, `<Nav/>` (renders the 5 tab NavLinks with labels Today/Trends/Climate/Me/About), `Loading`, `ErrorState` (named exports from States).

- [ ] **Step 1: Create `src/components/States.tsx`**

```tsx
export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <div className="flex items-center justify-center py-16 text-sm text-muted animate-pulse">{label}</div>
}

export function ErrorState({ label = 'Something went wrong.' }: { label?: string }) {
  return <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">{label}</div>
}
```

- [ ] **Step 2: Create `src/components/Header.tsx`**

```tsx
import ThemeToggle from './ThemeToggle'

export default function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[680px] items-center justify-between px-4">
        <span className="text-[15px] font-extrabold tracking-tight">Uccle Climate</span>
        <ThemeToggle />
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Create `src/components/Nav.tsx`**

```tsx
import { NavLink } from 'react-router-dom'
import { Sun, TrendingUp, Thermometer, User, Info } from 'lucide-react'

const tabs = [
  { to: '/today', label: 'Today', Icon: Sun },
  { to: '/trends', label: 'Trends', Icon: TrendingUp },
  { to: '/climate', label: 'Climate', Icon: Thermometer },
  { to: '/me', label: 'Me', Icon: User },
  { to: '/about', label: 'About', Icon: Info },
]

export default function Nav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-border bg-surface/95 backdrop-blur
                 pb-[env(safe-area-inset-bottom)]
                 lg:static lg:mx-auto lg:max-w-[680px] lg:justify-center lg:gap-1 lg:border-t-0 lg:bg-transparent lg:pb-0 lg:pt-2"
    >
      {tabs.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 px-3 py-2 text-[11px] transition-colors
             lg:min-h-0 lg:flex-row lg:gap-2 lg:rounded-lg lg:px-3 lg:py-2 lg:text-sm
             ${isActive ? 'text-accent lg:bg-accent-soft' : 'text-muted hover:text-fg'}`
          }
        >
          <Icon size={19} strokeWidth={2} aria-hidden />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 4: Rewrite `src/App.tsx`**

```tsx
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header'
import Nav from './components/Nav'
import Today from './tabs/Today'
import Trends from './tabs/Trends'
import Climate from './tabs/Climate'
import Me from './tabs/Me'
import About from './tabs/About'

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-dvh bg-bg text-fg">
        <Header />
        <Nav />
        <main className="mx-auto max-w-[680px] px-4 pb-28 pt-4 lg:pb-12">
          <Routes>
            <Route path="/today" element={<Today />} />
            <Route path="/trends" element={<Trends />} />
            <Route path="/climate" element={<Climate />} />
            <Route path="/me" element={<Me />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<Navigate to="/today" replace />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
```

- [ ] **Step 5: Delete the old nav**

```bash
git rm src/components/BottomNav.tsx
```

- [ ] **Step 6: Run tests + build**

Run: `npm test` → all green (App.test still finds "This Day in History" heading + "Trends" nav link).
Run: `VITE_BASE=/uccle-climate/ npm run build` → clean.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(shell): header + responsive nav (lucide) + shared states"
```

---

## Phase 3 — Restyle components & tabs

### Task 5: Restyle Stripes, DotColumn, Sparkline

**Files:**
- Modify: `src/components/Stripes.tsx`, `src/components/DotColumn.tsx`, `src/components/Sparkline.tsx`
- Test: existing `Stripes.test.tsx` (rect count) + `DotColumn.test.tsx` (circle count) must stay green

**Interfaces:** unchanged props. DotColumn/Sparkline now use token `var()` colors.

- [ ] **Step 1: Restyle `src/components/DotColumn.tsx`** (token colors; keep circle-per-value + highlight)

```tsx
export default function DotColumn({ values, height = 200 }:
  { values: { year: number; value: number; highlight?: boolean }[]; height?: number }) {
  const vs = values.map(v => v.value)
  const min = Math.min(...vs), max = Math.max(...vs), span = max - min || 1
  return (
    <svg viewBox={`0 0 100 ${height}`} width="100%" height={height} role="img" aria-label="Each year on this date" className="block">
      {values.map((v, i) => (
        <circle key={v.year} cx={(i / Math.max(values.length - 1, 1)) * 100}
          cy={height - ((v.value - min) / span) * height}
          r={v.highlight ? 3 : 1.5}
          fill={v.highlight ? 'var(--warm)' : 'var(--muted)'} />
      ))}
    </svg>
  )
}
```

- [ ] **Step 2: Restyle `src/components/Sparkline.tsx`** (accent line, themed axis hidden)

```tsx
import { LineChart, Line, ResponsiveContainer, XAxis } from 'recharts'
import type { CounterPoint } from '../types'

export default function Sparkline({ data }: { data: CounterPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={72}>
      <LineChart data={data} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
        <XAxis dataKey="year" hide />
        <Line dataKey="n" dot={false} stroke="var(--accent)" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 3: Confirm `src/components/Stripes.tsx`** uses `anomalyColor` (ramp) — add `className="block rounded-md"` for crisp corners; keep rect-per-point.

```tsx
import { anomalyColor } from '../lib/colorScale'
export default function Stripes({ points, height = 120 }: { points: { year: number; v: number }[]; height?: number }) {
  const w = 100 / Math.max(points.length, 1)
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" width="100%" height={height}
      role="img" aria-label="Warming stripes" className="block rounded-md">
      {points.map((p, i) => (
        <rect key={p.year} x={i * w} y={0} width={w + 0.3} height={height} fill={anomalyColor(p.v)} />
      ))}
    </svg>
  )
}
```

- [ ] **Step 4: Run tests + build**

Run: `npm test` → Stripes (rect count) + DotColumn (circle count) still pass; full suite green.
Run: `VITE_BASE=/uccle-climate/ npm run build` → clean.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "style(viz): token colors for stripes/dots/sparkline"
```

### Task 6: Restyle Today tab

**Files:**
- Modify: `src/tabs/Today.tsx`
- Test: existing `src/tabs/Today.test.tsx` must stay green (asserts /warmest/i and the record-high value `34.8`)

**Interfaces:** unchanged data/logic. Keep heading "This Day in History"; keep the badge text containing "warmest"; keep rendering `recordHigh.v`; keep year-picker.

- [ ] **Step 1: Rewrite `src/tabs/Today.tsx`** (logic identical; Tailwind cards, themed chart, States)

```tsx
import { useState } from 'react'
import { Scatter, XAxis, YAxis, ResponsiveContainer, ComposedChart, CartesianGrid, Tooltip } from 'recharts'
import { useThisDay } from '../data/useThisDay'
import { useTodayTemp } from '../data/useTodayTemp'
import { useDayNorm } from '../data/useDayNorm'
import { todayMMDD, fmtTemp } from '../lib/format'
import { rankOf } from '../lib/stats'
import DotColumn from '../components/DotColumn'
import { Loading, ErrorState } from '../components/States'

const tooltipStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--fg)', fontSize: 12 }

export default function Today() {
  const mmdd = todayMMDD()
  const { data, loading, error } = useThisDay(mmdd)
  const live = useTodayTemp()
  const dayNorm = useDayNorm()
  if (loading) return <Loading label="Loading today…" />
  if (error || !data) return <ErrorState label="Could not load this date." />
  const maxima = data.series.map(s => s.tmax)
  const todayTmax = live.data?.tmax
  const r = todayTmax != null ? rankOf(todayTmax, maxima) : null
  const norms = dayNorm.data?.['1991-2020']
  const entry = norms?.find(n => n.mmdd === mmdd)

  return (
    <section className="fade-in space-y-4">
      <h2 className="text-2xl font-extrabold tracking-tight">This Day in History</h2>

      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Today · Uccle, Brussels</p>
        {live.error ? (
          <p className="mt-1 text-sm text-muted">Live temperature unavailable — showing records only.</p>
        ) : live.loading ? (
          <p className="mt-1 text-sm text-muted">Fetching today…</p>
        ) : (
          <div className="mt-1 flex items-end gap-3">
            <span className="text-[46px] font-extrabold leading-none">{fmtTemp(live.data!.temp)}</span>
            <span className="pb-1.5 text-sm text-muted">max {fmtTemp(live.data!.tmax)}</span>
          </div>
        )}
        {r && (
          <p className="mt-3 inline-block rounded-full bg-badge-bg px-3 py-1 text-xs font-semibold text-badge-fg">
            {ordinal(r.rank)} warmest on this date in {r.total} years · {ordinal(Math.round(r.pct))} percentile
          </p>
        )}
        {entry?.normal != null && todayTmax != null && (() => {
          const diff = Math.round((todayTmax - entry.normal) * 10) / 10
          return (
            <p className="mt-3 text-sm text-muted">
              <strong className="text-fg">{Math.abs(diff)} °C {diff >= 0 ? 'above' : 'below'}</strong> the 1991–2020 normal ({entry.normal} °C) for this date.
            </p>
          )
        })()}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Record high</p>
          <p className="mt-1 text-lg font-bold text-warm">{fmtTemp(data.recordHigh.v)}</p>
          <p className="text-xs text-muted">{data.recordHigh.year}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Record low</p>
          <p className="mt-1 text-lg font-bold text-accent">{fmtTemp(data.recordLow.v)}</p>
          <p className="text-xs text-muted">{data.recordLow.year}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Then vs now</p>
        <p className="mt-1 text-sm">
          {fmtTemp(data.thenNow.early.mean)} <span className="text-muted">({data.thenNow.early.from}–{data.thenNow.early.to})</span>
          {' → '}
          <strong>{fmtTemp(data.thenNow.recent.mean)}</strong> <span className="text-muted">({data.thenNow.recent.from}–{data.thenNow.recent.to})</span>
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="mb-2 text-[11px] uppercase tracking-[0.09em] text-muted">Every year on this date</p>
        <DotColumn values={data.series.map(s => ({ year: s.year, value: s.tmax, highlight: s.year === new Date().getFullYear() }))} />
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={data.series} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="year" tick={{ fill: 'var(--muted)', fontSize: 11 }} stroke="var(--border)" />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} stroke="var(--border)" />
            <Tooltip contentStyle={tooltipStyle} />
            <Scatter dataKey="tmax" fill="var(--warm)" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <YearPicker series={data.series} />
    </section>
  )
}

function YearPicker({ series }: { series: { year: number; tmax: number; tmin: number }[] }) {
  const [sel, setSel] = useState<number>(series[0]?.year)
  const s = series.find(x => x.year === sel)
  return (
    <details className="rounded-xl border border-border bg-surface p-4">
      <summary className="cursor-pointer text-sm font-semibold">Time machine — pick a year</summary>
      <select
        value={sel}
        onChange={e => setSel(Number(e.target.value))}
        className="mt-3 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
      >
        {series.map(x => <option key={x.year} value={x.year}>{x.year}</option>)}
      </select>
      {s && <p className="mt-2 text-sm text-muted">{s.year}: max {s.tmax} °C, min {s.tmin} °C</p>}
    </details>
  )
}

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
```

- [ ] **Step 2: Run tests + build**

Run: `npm test -- Today` → PASS (badge still contains "warmest"; `34.8` record high still rendered). Full `npm test` green.
Run: `VITE_BASE=/uccle-climate/ npm run build` → clean.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "style(today): card layout, themed chart, states"
```

### Task 7: Restyle Trends tab

**Files:**
- Modify: `src/tabs/Trends.tsx`
- Test: existing `src/tabs/Trends.test.tsx` stays green (asserts /per decade/i)

**Interfaces:** unchanged logic; keep heading "Warming Trends"; keep headline containing "per decade".

- [ ] **Step 1: Rewrite `src/tabs/Trends.tsx`**

```tsx
import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, CartesianGrid, Tooltip } from 'recharts'
import { useSummary } from '../data/useSummary'
import Stripes from '../components/Stripes'
import { anomalyColor } from '../lib/colorScale'
import { Loading, ErrorState } from '../components/States'
import type { Baseline } from '../types'

const tooltipStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--fg)', fontSize: 12 }

export default function Trends() {
  const { summary, loading, error } = useSummary()
  const [base, setBase] = useState<Baseline>('1991-2020')
  if (loading) return <Loading label="Loading trends…" />
  if (error || !summary) return <ErrorState label="Could not load data." />
  const incompleteYears = new Set(summary.annual.filter(a => a.incomplete).map(a => a.year))
  const anom = summary.anomaly[base].filter(a => !incompleteYears.has(a.year))
  return (
    <section className="fade-in space-y-4">
      <h2 className="text-2xl font-extrabold tracking-tight">Warming Trends</h2>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="mb-2 text-[11px] uppercase tracking-[0.09em] text-muted">Warming stripes · every year since 1833</p>
        <Stripes points={anom.map(a => ({ year: a.year, v: a.v }))} />
        <div className="mt-2 flex justify-between text-xs text-muted"><span>{anom[0]?.year}</span><span>{anom[anom.length - 1]?.year}</span></div>
      </div>

      {summary.warmingRate.full != null && (
        <div className="rounded-xl border border-border bg-accent-soft p-5">
          <p className="text-sm">
            Uccle is warming <strong className="text-accent">{summary.warmingRate.full} °C per decade</strong>
            {summary.warmingRate.last30 != null && <span className="text-muted"> (last 30 yrs: {summary.warmingRate.last30} °C/decade)</span>}.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Annual anomaly vs normal</p>
          <select
            value={base}
            onChange={e => setBase(e.target.value as Baseline)}
            className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs"
            aria-label="Baseline period"
          >
            <option value="1991-2020">1991–2020</option>
            <option value="1961-1990">1961–1990</option>
          </select>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={anom} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="year" tick={{ fill: 'var(--muted)', fontSize: 11 }} stroke="var(--border)" />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} stroke="var(--border)" />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="v">{anom.map(a => <Cell key={a.year} fill={anomalyColor(a.v)} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Run tests + build**

Run: `npm test -- Trends` → PASS (/per decade/). Full suite green. Build clean.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "style(trends): stripes/anomaly cards, themed chart, states"
```

### Task 8: Restyle Climate tab (responsive grid)

**Files:**
- Modify: `src/tabs/Climate.tsx`
- Test: existing `src/tabs/Climate.test.tsx` stays green (asserts /summer days/i and /tropical nights/i)

**Interfaces:** unchanged logic; keep heading "Climate Impact" and the META card titles.

- [ ] **Step 1: Rewrite `src/tabs/Climate.tsx`**

```tsx
import { Sun, MoonStar, Snowflake, Flame, Sprout } from 'lucide-react'
import { useSummary } from '../data/useSummary'
import Sparkline from '../components/Sparkline'
import { Loading, ErrorState } from '../components/States'
import type { CounterPoint } from '../types'

const META: { k: 'SU' | 'TR' | 'FD' | 'heatwaveDays' | 'gsl'; title: string; blurb: string; Icon: typeof Sun }[] = [
  { k: 'SU', title: 'Summer days (≥25 °C)', blurb: 'Days warm enough to feel like summer.', Icon: Sun },
  { k: 'TR', title: 'Tropical nights (≥20 °C)', blurb: 'Nights that no longer cool down — once near zero.', Icon: MoonStar },
  { k: 'FD', title: 'Frost days (<0 °C)', blurb: 'Freezing days — winter is retreating.', Icon: Snowflake },
  { k: 'heatwaveDays', title: 'Heatwave days', blurb: 'Days inside a heatwave (RMI definition).', Icon: Flame },
  { k: 'gsl', title: 'Growing-season length', blurb: 'Days suitable for plant growth.', Icon: Sprout },
]

export default function Climate() {
  const { summary, loading, error } = useSummary()
  if (loading) return <Loading label="Loading climate impact…" />
  if (error || !summary) return <ErrorState label="Could not load data." />
  return (
    <section className="fade-in space-y-4">
      <h2 className="text-2xl font-extrabold tracking-tight">Climate Impact</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {META.map(({ k, title, blurb, Icon }) => {
          const series = summary.counters[k] as CounterPoint[]
          const last = series[series.length - 1]
          return (
            <article key={k} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center gap-2 text-muted">
                <Icon size={16} aria-hidden />
                <h3 className="text-sm font-semibold text-fg">{title}</h3>
              </div>
              <p className="mt-2 text-2xl font-extrabold">
                {last ? last.n : '—'} {last && <span className="text-sm font-normal text-muted">in {last.year}</span>}
              </p>
              <p className="mt-1 text-xs text-muted">{blurb}</p>
              <div className="mt-2"><Sparkline data={series} /></div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Run tests + build**

Run: `npm test -- Climate` → PASS. Full suite green. Build clean.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "style(climate): responsive counter-card grid with icons"
```

### Task 9: Restyle Me + About tabs

**Files:**
- Modify: `src/tabs/Me.tsx`, `src/tabs/About.tsx`, `src/components/ShareButton.tsx`
- Test: existing `src/tabs/Me.test.tsx` (birth-year input → /since you were born/i; share-card has no PII) + `src/tabs/About.test.tsx` (/GHCN-Daily/i, /urban heat island/i) stay green

**Interfaces:** unchanged logic; `#share-card` content unchanged (stats + "Uccle, Brussels"); keep headings "Your Climate" / "About & Methods".

- [ ] **Step 1: Restyle `src/components/ShareButton.tsx`** (accent button + icon; same behavior)

```tsx
import { useRef } from 'react'
import { Share2 } from 'lucide-react'
import { shareNode } from '../lib/share'

export default function ShareButton({ targetId }: { targetId: string }) {
  const busy = useRef(false)
  return (
    <button
      type="button"
      onClick={async () => {
        if (busy.current) return
        busy.current = true
        try {
          const node = document.getElementById(targetId)
          if (node) await shareNode(node, 'uccle-climate.png')
        } finally {
          busy.current = false
        }
      }}
      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
    >
      <Share2 size={16} /> Share
    </button>
  )
}
```

- [ ] **Step 2: Rewrite `src/tabs/Me.tsx`** (logic identical; styled card; share-card content unchanged)

```tsx
import { useEffect, useState } from 'react'
import { useSummary } from '../data/useSummary'
import Stripes from '../components/Stripes'
import ShareButton from '../components/ShareButton'
import { Loading, ErrorState } from '../components/States'

const KEY = 'uccle.birthYear'

export default function Me() {
  const { summary, loading, error } = useSummary()
  const [year, setYear] = useState<number | ''>(() => {
    const v = localStorage.getItem(KEY)
    return v ? Number(v) : ''
  })
  useEffect(() => { if (year) localStorage.setItem(KEY, String(year)) }, [year])
  if (loading) return <Loading label="Loading…" />
  if (error || !summary) return <ErrorState label="Could not load data." />

  const maxYear = summary.annual.filter(a => !a.incomplete).reduce((m, a) => Math.max(m, a.year), 1833)
  const incompleteYears = new Set(summary.annual.filter(a => a.incomplete).map(a => a.year))
  const anom = summary.anomaly['1991-2020'].filter(a => year !== '' && a.year >= year && !incompleteYears.has(a.year))
  const annual = summary.annual

  let warming: number | null = null
  if (year !== '') {
    const a0 = annual.find(a => a.year >= (year as number) && !a.incomplete)
    const a1 = [...annual].reverse().find(a => !a.incomplete)
    if (a0 && a1) warming = Math.round((a1.mean - a0.mean) * 10) / 10
  }

  return (
    <section className="fade-in space-y-4">
      <h2 className="text-2xl font-extrabold tracking-tight">Your Climate</h2>
      <div className="rounded-xl border border-border bg-surface p-5">
        <label className="block text-sm font-medium">
          Birth year
          <input
            type="number" min={1833} max={maxYear} value={year}
            onChange={e => setYear(e.target.value ? Number(e.target.value) : '')}
            placeholder="e.g. 1990"
            className="mt-2 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
          />
        </label>
      </div>
      {year !== '' && (
        <div id="share-card" className="rounded-xl border border-border bg-surface p-5">
          <Stripes points={anom.map(a => ({ year: a.year, v: a.v }))} />
          {warming != null && (
            <p className="mt-3 text-sm">
              Uccle warmed about <strong className="text-warm">{warming} °C</strong> since you were born — Uccle, Brussels.
            </p>
          )}
        </div>
      )}
      {year !== '' && <ShareButton targetId="share-card" />}
    </section>
  )
}
```

- [ ] **Step 3: Rewrite `src/tabs/About.tsx`** (styled prose; same content incl. GHCN-Daily + UHI)

```tsx
export default function About() {
  return (
    <section className="fade-in space-y-4">
      <h2 className="text-2xl font-extrabold tracking-tight">About &amp; Methods</h2>
      <div className="space-y-3 rounded-xl border border-border bg-surface p-5 text-sm leading-relaxed text-muted">
        <p>Historical data: <strong className="text-fg">NOAA GHCN-Daily</strong>, station Uccle (BE000006447), 1833–present. Today's value: <strong className="text-fg">Open-Meteo</strong>. Reference station operated by RMI/KMI/IRM Belgium.</p>
        <p>Anomalies use WMO normals (1991–2020 default; 1961–1990 alternative). Years with fewer than 330 valid days are excluded from trends.</p>
        <p><em>Caveat:</em> the Uccle record carries a documented <strong className="text-fg">urban heat island</strong> warm bias and is not homogenized; local trends slightly exceed rural Belgium.</p>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run tests + build**

Run: `npm test -- Me About` → PASS (warming readout; no-PII card; GHCN-Daily + urban heat island). Full suite green. Build clean.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "style(me,about): styled cards, share button, prose"
```

---

## Phase 4 — App icon & final verification

### Task 10: Generate the designed app icon

**Files:**
- Create: `scripts/gen_icons.py`
- Modify: `requirements-dev.txt`
- Regenerate (committed): `public/icons/icon-192.png`, `public/icons/icon-512.png`

**Interfaces:** none (build asset). Produces maskable PNGs (stripes + rising white line).

- [ ] **Step 1: Add Pillow to `requirements-dev.txt`**

Append a line: `pillow`

- [ ] **Step 2: Create `scripts/gen_icons.py`**

```python
"""Generate maskable PWA icons: warming stripes + rising white trend line."""
from PIL import Image, ImageDraw

RAMP = [
    (69, 117, 180), (90, 140, 194), (116, 173, 209), (158, 201, 226), (198, 224, 236),
    (231, 241, 243), (255, 247, 214), (255, 233, 168), (253, 207, 135), (251, 178, 103),
    (247, 144, 80), (239, 109, 67), (226, 74, 53), (209, 47, 39), (184, 33, 31), (158, 1, 66),
]

def make(size: int, out: str) -> None:
    img = Image.new("RGB", (size, size))
    d = ImageDraw.Draw(img)
    n = len(RAMP)
    for i, c in enumerate(RAMP):
        x0 = round(i * size / n)
        x1 = round((i + 1) * size / n)
        d.rectangle([x0, 0, x1, size], fill=c)
    # Rising trend line, kept inside the maskable safe zone (~10–90%).
    pts = [(0.16, 0.78), (0.40, 0.60), (0.62, 0.46), (0.84, 0.22)]
    px = [(x * size, y * size) for x, y in pts]
    lw = max(2, round(size * 0.06))
    d.line([(x + lw * 0.18, y + lw * 0.18) for x, y in px], fill=(0, 0, 0), width=lw, joint="curve")
    d.line(px, fill=(255, 255, 255), width=lw, joint="curve")
    r = lw * 0.75
    cx, cy = px[-1]
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255))
    img.save(out)

if __name__ == "__main__":
    make(512, "public/icons/icon-512.png")
    make(192, "public/icons/icon-192.png")
    print("icons written")
```

- [ ] **Step 3: Generate the icons**

Run: `python3 -m pip install pillow >/dev/null 2>&1; python3 scripts/gen_icons.py`
Expected: prints `icons written`; `public/icons/icon-512.png` and `icon-192.png` updated.

- [ ] **Step 4: Verify in the build**

Run: `VITE_BASE=/uccle-climate/ npm run build`
Run: `ls -la dist/icons/ && grep -o 'icons/icon-[0-9]*\.png' dist/manifest.webmanifest | sort -u`
Expected: both PNGs in `dist/icons/`; manifest references both.

- [ ] **Step 5: Commit**

```bash
git add scripts/gen_icons.py requirements-dev.txt public/icons/icon-192.png public/icons/icon-512.png
git commit -m "feat(icon): designed maskable app icon (stripes + rising line)"
```

### Task 11: Motion polish + responsive verification + deploy

**Files:** none new (verification + deploy). Motion (`.fade-in`, reduced-motion) was added in Task 1 and applied to each tab `<section>` in Tasks 6–9.

- [ ] **Step 1: Full test + pristine check**

Run: `npm test` → all green, output pristine (no console warnings; Recharts ResponsiveContainer mocked in tab tests).
Run: `python3 -m pytest scripts/uccle/tests/ -q` → 16 passing (pipeline untouched).

- [ ] **Step 2: Production build sanity**

Run: `VITE_BASE=/uccle-climate/ npm run build`
Run: `grep -o '/uccle-climate/[^"]*' dist/index.html | head -3` (base-prefixed assets)
Run: `grep -c 'revision' dist/sw.js` (precache count small — thisday excluded)
Expected: clean build; CSS asset emitted; icons present; precache ~12.

- [ ] **Step 3: Responsive verification (run the preview, resize)**

Run: `npm run preview -- --port 4173` (background), then load `http://localhost:4173/uccle-climate/`.
Verify, in BOTH light and dark (toggle in header), at viewport widths **360px, 768px, 1280px**:
- No horizontal page scroll at any width.
- Nav is a fixed bottom bar `<1024px` and a centered top bar `≥1024px`.
- Climate cards: 1 column `<640px`, 2 columns `≥640px`.
- Today/Trends charts + warming stripes resize to their container (no overflow).
- Tap targets (nav items, toggle, share) ≥44px.
- Content stays in the centered ≤680px column on wide screens.
Record the result (pass/fail per width) in the task report. (Pixel-level visual confirmation is the human reviewer's gate on the live site.)

- [ ] **Step 4: Commit any fixes from Step 3**, then deploy

```bash
git add -A && git commit -m "polish: responsive + motion verification fixes"   # only if Step 3 found issues
git push origin <branch>
```
Then merge to `main` (deploy trigger). After CI: load `https://jdelsoir.github.io/uccle-climate/`, confirm light/dark + responsive on the live site, and that the new app icon installs.

---

## Self-Review

**Spec coverage:**
- §3 direction (Scientific & Clean) → all restyle tasks. ✓
- §4 tokens + ramp → Task 1 (tokens), Task 3 (ramp/anomalyColor). ✓
- §5 icons (Lucide nav + contextual) + app icon → Task 4 (nav), 8 (climate icons), 9 (share icon), 10 (app icon). ✓
- §6 theming (Tailwind v4, .dark class, toggle, no-flash) → Task 1 (css/no-flash), Task 2 (controller/toggle). ✓
- §7 component restyle → Tasks 4–9 (every component/tab; `#share-card` content preserved in Task 9). ✓
- §8 responsive → Task 4 (nav/layout), Task 8 (grid), Task 11 (verify). ✓
- §9 testing/verification (tests green, theme test, responsive step, PWA intact, deploy) → Task 2 (theme test), each task keeps suite green, Task 11 (responsive + pytest + build + deploy). ✓
- §10 out of scope → not implemented (correct). ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code; no "similar to Task N". The one intended behavior change (anomalyColor output format) has its test rewritten in Task 3.

**Type consistency:** `ThemePref` (Task 2) used in ThemeToggle. `RAMP`/`anomalyColor` (Task 3) consumed by Stripes (Task 5), Trends (Task 7). `Loading`/`ErrorState` (Task 4) imported in Tasks 6–9. Semantic color utilities (`bg-surface`, `text-muted`, `border-border`, `bg-accent-soft`, `text-warm`, `bg-badge-bg`, `text-badge-fg`) defined in Task 1 `@theme inline` and used in Tasks 4–9. Nav labels (Today/Trends/Climate/Me/About) and tab headings preserved so existing tests pass.

**Fix applied inline:** none needed.
