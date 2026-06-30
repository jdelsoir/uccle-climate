# Uccle Climate PWA — project guide

Public **climate-awareness PWA** built on the **Uccle / Ukkel (Brussels) temperature record, 1833 → present** (RMI/KMI reference station).

- **Live:** https://jdelsoir.github.io/uccle-climate/
- **Repo:** https://github.com/jdelsoir/uccle-climate (public)
- **No backend.** Static site on GitHub Pages; only runtime network call is the free Open-Meteo API for today's value.

## Stack
- **Frontend:** React 18 + Vite 6 + TypeScript, **Tailwind v4** (`@tailwindcss/vite`, tokens in `src/index.css`), **HashRouter** (Pages has no SPA fallback), Recharts, `lucide-react`, `vite-plugin-pwa` (Workbox), `html-to-image` (share).
- **Pipeline:** Python 3.11 **stdlib only** in `scripts/uccle/` (`parser.py` → `.dly`, `derive.py`, `build_data.py`). Pillow only for icon generation (`scripts/gen_icons.py`).
- **Tests:** Vitest (frontend) + pytest (pipeline). TDD throughout; test output kept pristine.
- **CI/Deploy:** GitHub Actions → Pages (`deploy.yml`) regenerates data + builds + deploys on push to `main`; **daily** `refresh.yml` cron (05:00 UTC) keeps recent days fresh. **Vite `base=/uccle-climate/`.**

## Data
- **Sources (precedence GHCN > ERA5 > forecast):** NOAA **GHCN-Daily** station `BE000006447` (deep history, authoritative) + **Open-Meteo ERA5 archive** (gap-fill 1940+, `end`=yesterday) + **Open-Meteo forecast `past_days`** (recent-days fill before ERA5 finalizes) + **live Open-Meteo** (today, app-side). `build_data.merge_fills` applies precedence, drops dates ≥ today (app owns today), flags filled days within the 5-day ERA5 lag `provisional`. `public/data/` is **CI-generated, git-ignored**.
- **Emitted JSON:** `summary.json` (annual means/anomaly/decadal/warmingRate/counters/rankings/extremes/records), `daynorm.json` (1991-2020 & 1961-1990 day-of-year mean normals + p10/p90), `thisday/MMDD.json` (per-year `series` {year,tmax,tmin,provisional?} + all-time recordHigh/recordLow + thenNow), `month/MM.json` (per-year monthly means + records + normal + thenNow), `daily/YYYY.json` (per-year `[{mmdd,tmax,tmin,provisional?,recHi?,recLo?}]`; `recHi`/`recLo` = all-time daily-record holder year, **suppressed on provisional days**; ~193 files, lazy-fetched per viewed year by the Month tab).
- **App tabs:** Today (Day/Month/Year), Trends, Records, Climate, Me, About.

## Key decisions

### Data / methods
- **GHCN 2000–2024 gap:** Uccle TMIN sparse 2000–2024 → **ERA5 fill** in `build_data.merge_archive` (GHCN authoritative; ERA5 fills only missing dates, 1940+; pre-1940 GHCN-only). Only the current partial year is incomplete now.
- **Completeness gates:** year complete = ≥330 valid days; month-year complete = valid_days ≥ days_in_month−3. Incomplete years/months excluded from rankings/records/normals/trend; current partial shown flagged "(so far)".
- **Baselines:** 1991-2020 (default) + 1961-1990 (WMO normals).
- **`tempColor`:** value vs the 1991-2020 mean DOY normal, **strict ±2°** → red/neutral/blue. Single source of truth for warm/cool classification. Accepted caveat: comparing max/min to a *mean* normal skews max red / min blue (chosen over per-temp normals).
- **Then vs Now (Day view):** decades 100 yr apart relative to the viewed year — recent `[Y-11..Y-1]` vs then `[Y-111..Y-101]`; hidden when either window empty.
- **Today ↔ Records consistency:** both merge the live "today" datum via shared `src/lib/records.ts` (`mergeLiveExtreme`, `allTimeRank`) using **local-time** dates (`todayISO`/`todayMMDD`) so they never disagree.

### Today tab (current design)
- **One shared layout across Day/Month/Year.** `Today.tsx` owns the cursor for all three modes + the shared header: heading · **Today** button · **◀▶** (steps the active unit) · underline Day/Month/Year tabs (`role=radiogroup`); each view is controlled. **Square corners throughout** (no `rounded-*`); responsive 375/768/1280, light+dark. `Today.tsx` also reads a **`?d=YYYY-MM-DD` deep link** (`useSearchParams`, regex-validated + clamped to [1833-01-01, today]) to open Day at a date, plus a **`?m=YYYY-MM` deep link** (regex-validated, month clamped to 1–12 + range [1833-01, current month]; `?d` wins if both present) to open Month at a month-year. Deep links are read in mount-time `useState` initializers (remounts per Nav nav, so the param-less link resets to today); they target **external/cold-load** opens (share captions, Records→Day) — an in-app `Link` to `/today?m=…` would not move the cursor without a remount key.
- **State-driven hero** (`lib/heroState.ts` → 5 states `record-hot`/`above`/`close`/`below`/`record-cold`, reusing `tempColor`'s ±2 → `{key,word,tone,intensity,delta}` + `bannerClass`/`deltaLine`/`toneText`). Hero shows: **eyebrow = state word**, tone-colored `BigTemp`, **delta line** ("+8.9° above the 1991–2020 average" / "vs the average" for close), and a **state-colored banner pill** (solid `bg-warm`/`bg-accent` for records, `/10` tints for above/below, neutral `bg-surface-2` for close); Day adds NOW (today) / LOW (past) and a "beat X° from YYYY" subline on record days. Built from `HeroShell` (square frame + tone gradient + `WeatherGlyph` inline-SVG sun/snowflake on `z-0`, content `z-10`, `overflow-hidden`). The "where it sits" `RangeBar` lives in its **own card** below the hero (avoids the glyph). Month/Year cascade the same hero (value = mean; record/rank suppressed + neutral "(so far)" pill when incomplete).
- **Shared components** (`src/components/`): `CalendarTile` (calendar card — red `bg-cal-header` header / big day body / footer weekday-abbrev·**year** e.g. `THU · 2019`; opens native date picker on click; no binding-tab nubs; Month=`JUNE/2026`, Year=`YEAR/2026`), `BigTemp` (big number + small trailing `°C`), `RangeBar` (record-low→high warm-tinted track, `role="img"`+summary; avg/normal tick **below**, now/high dot/diamond **above**, staggered 2 rows so close values don't overlap), `StatCard` (2×2 grid, optional `onClick`→jump; 1-col on mobile), `WarmingStrip` (then→now + Δ badge), `HeroShell` + `WeatherGlyph`.
- **Share (Day hero):** discreet "Share this day" ghost button captures `#day-hero-capture` (HeroShell + a capture-only footer: sentence · "Uccle, Brussels" · app URL) to PNG via `html-to-image` and shares it (`lib/share.ts` `shareNode(node, file, {text?})` → Web Share API, clipboard+download fallback). `lib/shareText.ts` `shareSentence` builds the line from the same hero locals (caption ↔ hero never disagree; tentative "is forecast to…" for today, affirmative "was/broke" for consolidated days); `shareCaption(sentence, date)` appends a **per-day deep link** (`dayShareUrl` → `…/#/today?d=YYYY-MM-DD`) so a shared day opens to that day.
- **Month detail ("the month in detail").** Below the Month hero+summary: a **calendar heatmap** (`MonthHeatmap`, Monday-start grid, each cell = day#·rounded high·record dot, tinted by `tempColor` vs that day's 1991-2020 normal; cells click → Day via `Today.openDay`; today's cell uses live temp, future/gap cells inert), a **`monthSummary` line** ("X of N days ran warm, Y cool — and Z all-time daily records fell"; warm/cool = `tempColor`, records = `recHi`+`recLo` counts), and a **`NotableDays`** panel (warmest-by-tmax ↔ coldest-by-tmin solid-fill toggle, top-5, rows → Day). All derived app-side (`lib/monthDetail.ts`) from `daily/YYYY.json` + `useDayNorm` so `tempColor` stays the single source of truth. **Month share** ("Share this month") captures `#month-capture` (hero + summary + heatmap + attribution-only footer) → PNG; caption via `monthShareCaption` → `…/#/today?m=YYYY-MM`.
- **Month climate signal (Phase B1).** App-side only (`lib/trend.ts` `linregress`/`perDecade`). **Warming StatCard** = full-record OLS °/decade over complete-year monthly means (`since {first complete year}`, warm/accent by sign, hidden <2 yrs). **Trend line** on `PeriodScatter` via opt-in `trendKey` prop — fits the *currently-shown* period (re-fits on the period select), dashed `var(--muted)`, legend "trend · shown period"; Month passes `trendKey="mean"`, Day/Year omit it. **Then-now parity with Day**: `WarmingStrip` now uses viewed-year-relative windows (recent `[Y-11,Y-1]` vs then `[Y-111,Y-101]`) via `monthDetail.windowMean`, hidden when either empty — replaced the old fixed-window `data.thenNow` source (now unused by the app).

### Other tabs
- **Records:** `summary.extremes` top-10 drives a **flat divided leaderboard** in one square panel (no per-row cards; `<ol>` `divide-y`), **solid-fill Warmest/Coldest toggle** (red/blue + `text-white`, no icons, radiogroup a11y); **each row `<Link to={"/today?d=…"}>`** to Day. Day-view record-broken banner fires when viewed year == recordHigh/Low.year.
- **About:** plain-language, four labeled sections (What this is · **Why Uccle** = longest continuous record since 1833 · Where the numbers come from · **Privacy — we collect nothing**), keeping the credible terms (GHCN-Daily, ERA5, urban heat island).

### System
- **Design system:** "Scientific & Clean", light + dark via `.dark` (`@theme inline` tokens), system sans (no external fonts — CSP/offline), shared 16-step warming-stripe ramp (`lib/ramp.ts`); charts themed via `var()` in SVG attrs.
- **App icon:** maskable warming-stripes + rising trend line (`scripts/gen_icons.py`).
- **PWA caching:** precache the **app shell only** (`globIgnores: ['**/data/**']`); all `/data/*.json` served **NetworkFirst** (`climate-data` cache, 5s timeout, offline fallback, 400-entry/30-day). (Earlier `CacheFirst` on `thisday/*.json` froze recent days in installed apps; NetworkFirst keeps daily-refreshed data fresh.) `registerType:'autoUpdate'` swaps SW on next online open (skipWaiting+claim).

## Conventions
- **No PII anywhere** (org policy): never in UI, data, or share cards (share = derived stats + "Uccle, Brussels" only). The app collects nothing — no cookies/analytics/tracking; only local state is the Me-tab birth-year in `localStorage`, never sent.
- **No external fonts/CDNs** (CSP + offline). System sans only.
- **Tokens, not hex:** color via `text-warm`/`text-accent`/`text-fg`/`bg-surface`/`border-border` etc. (+ opacity modifiers like `bg-warm/10`). Only literal hex lives in `lib/ramp.ts` + the icon script.
- **Square corners** on Today/Records UI (no `rounded-*`); decorative glyph/gradient `aria-hidden`.
- **Tests:** mock Recharts `ResponsiveContainer` (jsdom width(0) noise); `fetch`-stubbing tests add `afterEach(() => vi.unstubAllGlobals())`; avoid date-coupled fixtures (derive mmdd from `todayMMDD()`).
- **a11y:** single-select toggles use `role="radiogroup"`/`role="radio"`+`aria-checked`; every control has an accessible name; decorative icons `aria-hidden`; skip-to-content link in `App.tsx`.
- **Commits:** end messages with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **Autonomy / publishing:** early-dev project on **public data only** — safe to auto-commit and publish without asking. Standing workflow per change: run tests → commit → `git push origin main` (CI deploys) → **validate it shipped on the live site** (bundle hash matches local build, or visual check) before calling it done.

## Build / verify / deploy
```bash
npm install
python3 -m scripts.uccle.build_data        # fetch GHCN + ERA5 → public/data/ (network)
npm run dev                                  # local
VITE_BASE=/uccle-climate/ npm run build      # prod build (matches CI)
npm test                                     # vitest
python3 -m pytest scripts/uccle/tests/ -q    # pytest
git push origin main                         # → GitHub Actions → Pages
```

## Workflow (how this project is built)
Superpowers flow: **brainstorm → design spec → implementation plan → subagent-driven execution** (implementer + reviewer per task, opus final whole-branch review), then deploy + independent live verification. Specs in `docs/superpowers/specs/`, plans in `docs/superpowers/plans/`, per-run ledger in `.superpowers/sdd/progress.md` (git-ignored scratch). Trivial doc/one-line tweaks skip the full ceremony.

## History (shipped, newest last)
1. **Initial build** — pipeline + tabs + PWA + Pages deploy.
2. **Visual redesign** — "Scientific & Clean" design system, light+dark, Lucide icons, designed app icon.
3. **Day/Month/Year + Today↔Records consistency** — granularity toggle, monthly pipeline (`month/MM.json`), shared `records.ts` fixing the rank disagreement.
4. **Today date-navigator** *(superseded by #7)*.
5. **Incremental daily-fresh pipeline** — forecast `past_days` recent-fill via `merge_fills` (GHCN>ERA5>forecast, `provisional` flag), `refresh.yml` weekly→daily. Follow-up: all data → NetworkFirst (installed PWAs were frozen on `CacheFirst`).
6. **DateNav calendar-card redesign** *(superseded by #7)*.
7. **Today tab full redesign** — one shared layout (CalendarTile/RangeBar/StatCard/WarmingStrip), `Today.tsx` owns cursors + header, DayView controlled, `DateNav` removed.
8. **State-driven hero (Day/Month/Year)** — `heroState` + `WeatherGlyph` + `HeroShell`; eyebrow/delta/state banner replaced the rank badge + record-broken line; RangeBar to its own card. Follow-up: removed CalendarTile binding-tab nubs; added year to the Day tile footer.
9. **Records tab rework** — flat divided leaderboard, solid-fill toggle, rows deep-link to Day via `?d=` (Today.tsx consumes the param).
10. **Day-hero share button** — `#day-hero-capture` → PNG + caption; `lib/shareText.ts` + `shareNode({text})`. Follow-up: caption deep-links to the shared day (`dayShareUrl`).
11. **About rewrite + README overhaul** — plain-language About (Why Uccle + Privacy/no-collection); README given a human-readable overview, live link, full stack + data/privacy.
12. **Month page Phase A — "the month in detail"** — new per-year `daily/YYYY.json` layer (provisional-aware record flags) → `MonthHeatmap` calendar (click→Day) + `monthSummary` day-mix/records line + `NotableDays` warmest/coldest toggle + hero+heatmap share + year-aware Month cursor & `?m=` deep link. Spec/plan in `docs/superpowers/`.
13. **Month Phase B1 — "how this month is changing"** — app-side climate signal: `lib/trend.ts` (OLS) → full-record **Warming** °/decade StatCard + opt-in OLS **trend line** on `PeriodScatter` (fits shown period) + **then-now parity** with Day (viewed-year-relative windows via `windowMean`). No pipeline change. (Phase B2 still parked: mean high/low split + monthly counters vs normal — both need pipeline data.)

## Known fast-follows (non-blocking)
- `useSummary`/`useDayNorm`/`useTodayTemp` lack in-app fetch dedup (SW HTTP-caches; a naive module cache breaks per-test mocks).
- Recharts ~600 kB bundle — code-split charts to roughly halve initial JS.
- **`summary.extremes`/`summary.records` are still provisional-blind:** a hot recent forecast-filled day can transiently top them (and fire the Day record-broken banner) until ERA5 finalizes; next daily rebuild self-corrects. (The new `daily/YYYY.json` `recHi`/`recLo` flags ARE provisional-aware, so the Month heatmap/summary don't show false records — only the Records tab + Day banner remain blind.)
- **Year hero has no share button** (Day + Month now do).
- **Month Phase B2 (parked):** mean-high/mean-low split in the hero (needs monthly mean tmax/tmin in the pipeline) + monthly counters vs normal (summer/frost/tropical/ice days — viewed month from `daily/YYYY.json`, normals need per-month pipeline computation). (B1 — warming rate, trend line, then-now parity — shipped.)
- **`thenNow` is now dead data:** `month_data.thenNow` (pipeline) is no longer read by the app after B1's relative-window switch; could drop the field + emission in a cleanup.
- Month `recordsBroken` counts a both-records day as 2; legacy MonthView tests stub `daily/2019.json` regardless of the viewed year (pass anyway).

## CI
- Actions pinned to Node24-runtime majors (checkout@v7, setup-python@v6, setup-node@v6, upload-pages-artifact@v5, deploy-pages@v5; build node 22). `deploy.yml` on push/dispatch/call; `refresh.yml` daily cron; `keepalive.yml` monthly heartbeat commit (`.github/keepalive`, `[skip ci]`) so scheduled workflows survive 60-day dev-quiet windows. Keepalive uses `GITHUB_TOKEN` (doesn't trigger deploy); fallback to a `KEEPALIVE_PAT` if GitHub stops counting bot commits as activity.
