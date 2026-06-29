# Records tab rework — design spec

**Date:** 2026-06-29
**Scope:** Rework the Records tab into a flat, divided leaderboard with a solid-fill Warmest/Coldest toggle and rows that link to the corresponding Day view. Mockup: `Screenshot 2026-06-29 at 15.16.43.png`. Data layer unchanged.

## Goal

Replace the per-row "cards" leaderboard with a flat divided list inside one square panel, give the Warmest/Coldest toggle a solid selected fill (red for Warmest, **blue for Coldest**), and make each row a link that opens the Today → Day view at that record's date.

## Decisions (from brainstorm)

- **Square corners** (match the Today-tab aesthetic), not the mockup's rounded card. No `rounded-*`, no shadow on the panel; the toggle and rows are square too.
- **No per-row cards** — flat `<ol>` with hairline dividers; rank · date · temp on each row.
- **Toggle** — square segmented control, **icons dropped** (no Flame/Snowflake). Selected segment is solid-filled: Warmest `bg-warm text-white`, Coldest `bg-accent text-white`. Unselected `text-muted hover:text-fg`.
- **Row → Day** — React-Router `<Link to={"/today?d=YYYY-MM-DD"}>`; `Today.tsx` reads the `d` query param at mount and starts in Day mode at that date.
- **Data unchanged** — keep `useSummary`, `useTodayTemp`, `mergeLiveExtreme`; today's live datum still merges in.

## Components / files

### A. `src/tabs/Records.tsx` (rewrite presentation)

Structure:
- `<section className="fade-in space-y-4">`
- One square panel: `<div className="border border-border bg-surface p-5">` containing:
  - **Header row:** `<div className="flex items-center justify-between gap-3">` → `<h2 className="text-2xl font-extrabold tracking-tight">Records</h2>` + the toggle.
  - **Toggle:** `<div role="radiogroup" aria-label="Record type" className="inline-flex border border-border text-sm">` with two buttons:
    - Warmest: `role="radio" aria-checked={warm}`, class `px-3 py-1.5 font-semibold ${warm ? 'bg-warm text-white' : 'text-muted hover:text-fg'}`, label `Warmest` (no icon).
    - Coldest: `aria-checked={!warm}`, class `px-3 py-1.5 font-semibold ${!warm ? 'bg-accent text-white' : 'text-muted hover:text-fg'}`, label `Coldest`.
  - **Intro:** `<p className="mt-3 text-xs text-muted">Top 10 {warm ? 'hottest days' : 'coldest days'} on record at Uccle (daily {warm ? 'maximum' : 'minimum'}; today included live).</p>`
  - **List:** `<ol className="mt-2 border-t border-border divide-y divide-border">`, one `<li>` per record (max 10). Each `<li>` holds a single `<Link>`:
    ```tsx
    <Link
      to={`/today?d=${rec.date}`}
      aria-label={`${fmtDate(rec.date)} — ${fmtTemp(rec.v)}, rank ${i + 1}. Open this day`}
      className="flex items-center gap-3 py-3 transition-colors hover:bg-fg/[0.03]"
    >
      <span className="w-6 text-right text-sm font-bold text-muted">{i + 1}</span>
      <span className="flex-1 text-sm">{fmtDate(rec.date)}{rec.date === today ? ' · today' : ''}</span>
      <span className={`text-lg font-bold ${accent}`}>
        {rec.v.toFixed(1)}<span className="ml-0.5 text-xs">°C</span>
      </span>
    </Link>
    ```
  - `accent = warm ? 'text-warm' : 'text-accent'`.

Logic kept verbatim from the current file: `mode` state (`'warm'|'cold'`), `warm`, `today = todayISO()`, `liveDatum`, `list = mergeLiveExtreme(...).slice(0, 10)`. Import `Link` from `react-router-dom`. Remove the `Flame`/`Snowflake` imports.

### B. `src/tabs/Today.tsx` (read `d` query param)

- Import `useSearchParams` from `react-router-dom`.
- `const [params] = useSearchParams()`.
- Parse helper: `d = params.get('d')`; if it matches `^\d{4}-\d{2}-\d{2}$`, build `new Date(d + 'T00:00:00')` and clamp to `[MIN_DATE, maxDate]` via `isoOf`; else `null`.
- Initialize the date cursor from it: `const [date, setDate] = useState<Date>(() => paramDate ?? midnight(new Date()))`. Mode already defaults to `'day'`, so no mode change is required (Day is the default view).
- No effect / no cleanup: `Today` remounts on each navigation to `/today` (React Router swaps the route element), so the lazy initializer reads the param fresh each mount. The Nav "Today" link (`/today`, no param) therefore always resets to today.
- `maxDate` uses `now` as today; clamping prevents a future or pre-1833 `d`.

## Testing

- `src/tabs/Records.test.tsx` (rewrite): wrap renders in `MemoryRouter`.
  - Default Warmest: first row links to `/today?d=<warmest[0].date>`; temp uses `text-warm`; Warmest button has `bg-warm`/`text-white` and `aria-checked=true`.
  - Click Coldest: rows switch to coldest data; accent becomes `text-accent`; Coldest button `bg-accent`/`text-white`, `aria-checked=true`.
  - No per-row border class (assert a row link has no `border`/`rounded` card class; list uses `divide-y`).
  - Rows are anchors (`getAllByRole('link')`); under `MemoryRouter` the rendered `href` is `/today?d=<date>` (no `#/` prefix — that hash form only appears under `HashRouter` in the live app). Assert the href contains `/today?d=<date>`.
  - Derive expected dates from the mocked summary fixture (no date-coupled hardcoding beyond the fixture).
- `src/tabs/Today.test.tsx` (add): render `<MemoryRouter initialEntries={['/today?d=2019-07-25']}>` around the routed app/Today; assert the Day view shows 25 Jul 2019 (e.g. the calendar tile / formatted date). Mock `useSummary`/`useThisDay`/`useTodayTemp`/`useDayNorm` per existing patterns; `afterEach(() => vi.unstubAllGlobals())`.
- Keep `src/lib/records.test.ts` untouched (data logic unchanged).
- Tests pristine: mock Recharts `ResponsiveContainer` where charts render.

## Constraints honored

- **Tokens, not hex** — `warm`/`accent`/`muted`/`fg`/`surface`/`border` (+ `text-white`, `bg-fg/[0.03]`). No literal hex.
- **Square corners** — no `rounded-*` on panel, toggle, or rows.
- **a11y** — toggle keeps `role="radiogroup"`/`radio`+`aria-checked`; each row link has an accessible name; no icon-only controls.
- **No PII** — dates + temps + "Uccle" only.
- **Light + dark** via existing tokens; **responsive 375/768/1280**, no horizontal overflow (rows are flex with a `flex-1` middle).
- **No backend / data change** — pipeline, JSON, and `lib/records.ts` untouched.

## Out of scope / non-goals

- No change to `summary.extremes` shape or `mergeLiveExtreme`.
- No new route segments (query param only; no `/today/:date`).
- Provisional-blindness of records is unchanged (existing known fast-follow).

## Standing workflow

Per CLAUDE.md: tests → commit → `git push origin main` (CI deploys) → confirm the change shipped on the live site (https://jdelsoir.github.io/uccle-climate/) before calling it done.
