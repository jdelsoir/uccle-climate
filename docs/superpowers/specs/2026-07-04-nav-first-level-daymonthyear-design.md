# Navigation restructure — Day/Month/Year as first-level tabs

*Design spec. 2026-07-04. Promote Day/Month/Year from an in-content sub-tab to first-level navigation; remove Trends and Climate; park (keep but unroute) Me. No backward-compat/legacy route — the app has not been shared, so URLs can change freely.*

## Goal

Today the bottom nav is `Today · Trends · Records · Climate · Me · About`, and Day/Month/Year live as an in-content `role=radiogroup` inside `Today.tsx` (which owns one instance with per-mode cursors and does cross-navigation via internal `setMode`). Make Day/Month/Year the primary nav; drop Trends/Climate; park Me for later reuse.

**New bottom nav (5 tabs):** `Day · Month · Year · Records · About`.

**Switch model:** each of Day/Month/Year is its own route; switching tabs opens the **current** period (today / this month / this year). Cross-links carry their target period as a deep-link param.

## Routing (`App.tsx`)

- `/day` → `<Today mode="day" />`
- `/month` → `<Today mode="month" />`
- `/year` → `<Today mode="year" />`
- `/records` → `<Records />` (unchanged)
- `/about` → `<About />` (unchanged)
- `/` and `*` → `<Navigate to="/day" replace />`
- **Remove** the `/trends`, `/climate`, `/me` routes and their imports.
- **No `/today` route** (no legacy alias; nothing has been shared yet).

## Nav (`components/Nav.tsx`)

`tabs` becomes:
```ts
const tabs = [
  { to: '/day',     label: 'Day',     Icon: Sun },
  { to: '/month',   label: 'Month',   Icon: CalendarDays },
  { to: '/year',    label: 'Year',    Icon: CalendarRange },
  { to: '/records', label: 'Records', Icon: Trophy },
  { to: '/about',   label: 'About',   Icon: Info },
]
```
Import `Sun, CalendarDays, CalendarRange, Trophy, Info` from `lucide-react`; drop `TrendingUp, Thermometer, User`. Layout/classes unchanged (bottom bar mobile, centered desktop). `NavLink` active state works per route.

## `Today.tsx`

`Today` takes the mode from the route instead of owning switchable mode state:

```ts
export default function Today({ mode }: { mode: 'day' | 'month' | 'year' }) { … }
```

- **Remove** the in-content granularity `role=radiogroup` block entirely (the bottom nav is the switcher now).
- **Keep** the header: heading `HEADINGS[mode]`, the **Today** button, and the **◀▶** stepper — all operating the active mode's cursor via local state (unchanged stepper logic for the active mode).
- **Deep-link param is per-mode** (no cross-mode precedence): `day` reads `?d=YYYY-MM-DD`, `month` reads `?m=YYYY-MM`, `year` reads `?y=YYYY`. Each is regex-validated + range-clamped exactly as today, read in the mount-time `useState` initializers. With no param, the cursor defaults to the current period.
- **Cross-navigation becomes route navigation** via `useNavigate` — replacing the old internal `setMode`+cursor setters:
  - `openDay(iso)` → `navigate(\`/day?d=\${iso}\`)`
  - `openMonth(year, month)` → range-check via `inMonthRange`, then `navigate(\`/month?m=\${year}-\${mm}\`)`
  These are passed to `DayView`/`MonthView`/`YearView` (`onPickDay`/`onPickMonth`) and drive `MonthHeatmap` cells, `NotableDays`, `RecordsTally`, and `MonthGrid` tiles. Because the target is a **different route**, the destination `Today` remounts and its initializer reads the param — no manual remount key needed.
  - **Within-mode** cursor changes stay local state (no navigation, no remount): the ◀▶ stepper, the **Today** button, and the native date/month pickers in Day/Month views (`openPicker` → `setDate`/`setMonth`). Only cross-*mode* jumps navigate.
- The `Mode` type and the three cursor states may remain (only the active mode's cursor is exercised); minimize churn — the required changes are: `mode` from prop, delete the radiogroup JSX, per-mode param read, `openDay`/`openMonth` → `navigate`.

## Links & shares

- `tabs/Records.tsx`: the leaderboard row `Link` `to={\`/today?d=\${rec.date}\`}` → `to={\`/day?d=\${rec.date}\`}`.
- `lib/shareText.ts`: `dayShareUrl` → `\`\${APP_URL}#/day?d=\${isoOf(date)}\``; `monthShareUrl` → `\`\${APP_URL}#/month?m=\${year}-\${mm}\``; `yearShareUrl` → `\`\${APP_URL}#/year?y=\${year}\``.

## Removal / parking

- **Delete:** `src/tabs/Trends.tsx`, `src/tabs/Trends.test.tsx`, `src/tabs/Climate.tsx`, `src/tabs/Climate.test.tsx`. Remove their `App.tsx` imports/routes and `Nav.tsx` entries.
- **Park (keep, do not delete):** `src/tabs/Me.tsx` + `src/tabs/Me.test.tsx` remain in the repo for later reuse, but Me is removed from `App.tsx` routes and `Nav.tsx`. It becomes an unrouted, unimported module (tree-shaken from the bundle); its unit test keeps it green. Add a note in CLAUDE.md that Me is parked.

## Testing

- **`Today.test.tsx` — rewrite to the route-driven model** (the radiogroup it clicked is gone). Provide a small harness that mounts the relevant routes so cross-nav can land, e.g.:
  ```tsx
  const app = (initial: string) => render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/day" element={<Today mode="day" />} />
        <Route path="/month" element={<Today mode="month" />} />
        <Route path="/year" element={<Today mode="year" />} />
      </Routes>
    </MemoryRouter>
  )
  ```
  Cover: `/day` shows the Day view (date picker present); `/day?d=2019-07-25` opens 25 Jul 2019 (finds `JULY` + `25`); `/month?m=2019-06` opens June 2019 (`JUNE`, `2019`); out-of-range `/month?m=2019-13` falls back to current (no `2019`); `/year?y=2015` opens 2015; the ◀▶ stepper moves the active day off "today" (Today button enables); **cross-nav** — from `/year`, clicking a June month tile navigates to Month view showing `JUNE` (assert the Month view rendered, replacing the old "radio aria-checked" assertion). Drop the `?d` vs `?m` precedence test (no longer applicable — params are per-route).
- **`tabs/Records.test.tsx`**: update the expected `Link` href from `/today?d=` to `/day?d=`.
- **`lib/shareText.test.ts`**: update expected URLs to `#/day?d=`, `#/month?m=`, `#/year?y=`.
- **`App.test.tsx`**: update to the new routes — default renders Day; `/records`, `/about` reachable; no Trends/Climate/Me routes. (Read the current file and adapt its assertions.)
- **`components/Nav`**: if a Nav test exists, update to the 5 tabs; otherwise optional — the App test covers reachability.
- Keep `Me.test.tsx` and any Day/Month/Year view tests unchanged (they render views directly).

## Non-goals

No visual redesign of the views themselves (the recent density pass stands). No change to Records/About content. No data/pipeline change. Me's feature set is unchanged — only unrouted.

## Conventions honored

Square corners; tokens not hex; a11y (NavLink accessible names, `aria-label="Main"` nav, skip-link intact); HashRouter; no new deps (icons already in `lucide-react`); TDD.
