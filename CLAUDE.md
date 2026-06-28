# Uccle Climate PWA — project guide

Public **climate-awareness PWA** built on the **Uccle / Ukkel (Brussels) temperature record, 1833 → present** (RMI/KMI reference station).

- **Live:** https://jdelsoir.github.io/uccle-climate/
- **Repo:** https://github.com/jdelsoir/uccle-climate (public)
- **No backend.** Static site on GitHub Pages; only runtime network call is the free Open-Meteo API for today's value.

## Stack
- **Frontend:** React 18 + Vite 6 + TypeScript, **Tailwind v4** (`@tailwindcss/vite`, tokens in `src/index.css`), **HashRouter** (Pages has no SPA fallback), Recharts, `lucide-react`, `vite-plugin-pwa` (Workbox).
- **Pipeline:** Python 3.11 **stdlib only** in `scripts/uccle/` (`parser.py` → `.dly`, `derive.py`, `build_data.py`). Pillow only for icon generation (`scripts/gen_icons.py`).
- **Tests:** Vitest (frontend) + pytest (pipeline). TDD throughout; test output kept pristine.
- **CI/Deploy:** GitHub Actions → Pages (`.github/workflows/deploy.yml`) regenerates data + builds + deploys on push to `main`; weekly `refresh.yml` cron. **Vite `base=/uccle-climate/`.**

## Data
- **Sources:** NOAA **GHCN-Daily** station `BE000006447` (deep history) + **Open-Meteo ERA5 archive** (gap-fill 1940+) + **live Open-Meteo** (today). `public/data/` is **CI-generated, git-ignored**.
- **Emitted JSON:** `summary.json` (annual means/anomaly/decadal/warmingRate/counters/rankings/extremes/records), `daynorm.json` (1991-2020 & 1961-1990 day-of-year mean normals + p10/p90), `thisday/MMDD.json` (per-year `series` {year,tmax,tmin} + all-time recordHigh/recordLow + thenNow), `month/MM.json` (per-year monthly means + records + normal + thenNow).
- **App tabs:** Today (Day/Month/Year), Records, Climate, Me, About.

## Key decisions
- **GHCN 2000–2024 coverage gap:** Uccle TMIN is sparse 2000–2024 (paired days < 330 → years flagged incomplete). Fixed by **filling from Open-Meteo ERA5** in `build_data.merge_archive` (GHCN authoritative; ERA5 fills only missing dates, 1940+). Pre-1940 stays GHCN-only. About page notes the mixed-source caveat. Only the current partial year is incomplete now.
- **Completeness gates:** year complete = ≥330 valid days; month-year complete = valid_days ≥ days_in_month−3. Incomplete years/months excluded from rankings/records/normals/trend; current partial shown flagged "(so far)".
- **Baselines:** 1991-2020 (default) and 1961-1990 (WMO normals).
- **Today ↔ Records consistency:** both merge the live "today" datum via shared `src/lib/records.ts` (`mergeLiveExtreme`, `allTimeRank`) using **local-time** dates (`todayISO`/`todayMMDD`) so they never disagree (incl. day boundaries).
- **Day view = specific-date navigator** (full Y-M-D, 1833→today), not MMDD-across-years. Hero drives nav (◀▶ + calendar picker). Two same-size temps: Max + Current (today) / Max + Min (past).
- **Temp coloring** vs the **1991-2020 mean DOY normal**, ±2° → red/neutral/blue (`tempColor`). Accepted caveat: comparing max/min to a *mean* normal skews max red / min blue (chosen over adding per-temp normals).
- **Then vs Now (Day view):** decades **100 years apart relative to the viewed year** — recent `[Y-11..Y-1]` vs then `[Y-111..Y-101]`, means from the series; hidden when either window is empty.
- **Records:** the daily-extreme top-10 (`summary.extremes`) drives the Records tab; Day-view record-broken banner fires when the viewed year == recordHigh/Low.year, with the previous record.
- **Design system:** "Scientific & Clean", light + dark via `.dark` class (`@theme inline` tokens), system sans (no external fonts — CSP/offline), shared 16-step warming-stripe ramp (`lib/ramp.ts`). Charts themed via `var()` in SVG attrs.
- **App icon:** maskable warming-stripes + rising trend line (`scripts/gen_icons.py`).

## Conventions
- **No PII anywhere** (org policy): never in UI, data, or share cards (share cards = derived stats + "Uccle, Brussels" only).
- **No external fonts/CDNs** (CSP + offline). System sans only.
- **Tokens, not hex:** color via `text-warm`/`text-accent`/`text-fg`/`bg-surface`/`border-border` etc. (the only literal hex lives in `lib/ramp.ts` + the icon script).
- **Tests:** in Vitest, mock Recharts `ResponsiveContainer` to avoid jsdom width(0) noise; test files that stub `fetch` add `afterEach(() => vi.unstubAllGlobals())`; avoid date-coupled fixtures (derive mmdd from `todayMMDD()`).
- **a11y:** single-select toggles use `role="radiogroup"`/`role="radio"`+`aria-checked`; every control has an accessible name; decorative icons `aria-hidden`; skip-to-content link in `App.tsx`.
- **Commits:** end messages with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

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
Superpowers flow: **brainstorm → design spec → implementation plan → subagent-driven execution** (implementer + reviewer per task, final whole-branch review), then deploy + independent live verification (multi-agent). Specs in `docs/superpowers/specs/`, plans in `docs/superpowers/plans/`, per-run ledger in `.superpowers/sdd/progress.md` (git-ignored scratch).

## History (shipped)
1. **Initial build** — pipeline + 4 tabs (Today/Trends/Climate/Me/About) + PWA + Pages deploy.
2. **Visual redesign** — "Scientific & Clean" design system, light+dark, Lucide icons, responsive, designed app icon.
3. **Day/Month/Year + records consistency** — Today tab granularity toggle; monthly pipeline (`month/MM.json`); shared `records.ts` fixing the Today↔Records rank disagreement. Verified by a 200+-state workflow (0 data mismatches; a11y/layout fixes applied).
4. **Today specific-date navigator** — Day view reworked into a date navigator (date display, ◀▶ + calendar picker, two colored temps, clickable records + record-broken/previous, viewed-year-relative Then-vs-Now). Independently verified from the live site (picker-a11y fix applied).

## Known fast-follows (non-blocking)
- `useSummary`/`useDayNorm`/`useTodayTemp` lack in-app fetch dedup (SW HTTP-caches; a naive module cache breaks per-test mocks).
- GitHub Actions Node 20→24 deprecation — bump action versions.
- Recharts ~600 kB bundle — code-split charts to roughly halve initial JS.
