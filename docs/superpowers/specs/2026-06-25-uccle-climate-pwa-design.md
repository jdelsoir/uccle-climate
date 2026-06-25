# Uccle Climate PWA — Design Spec

**Date:** 2026-06-25
**Status:** Approved (brainstorming) — ready for implementation plan
**Owner:** Julien Delsoir

## 1. Overview

A React Progressive Web App for **public climate awareness**, built on the **Uccle/Ukkel (Brussels) daily temperature record from 1833 to present**. It lets anyone see how today's temperature compares to the same calendar day across ~190 years, explore long-term warming trends, see tangible climate-impact counters, and generate a personalized "warming since you were born" graphic to share.

**No backend.** All historical analysis is precomputed at build time into static JSON; the only runtime network call is to the free Open-Meteo API for today's live temperature. The app is installable and works offline (full history cached).

## 2. Goals / Non-goals

**Goals**
- "This Day in History": today's live temperature vs the same calendar day every year since 1833.
- "Compare trends over time": warming stripes, anomalies vs climate normal, decadal warming rate.
- Tangible impact counters (summer days, tropical nights, frost days, heatwaves, growing season).
- Personalized, shareable "your lifetime warming" hook to drive public reach.
- Installable, offline-capable PWA. Fast, mobile-first.

**Non-goals (v1)**
- No forecasting / ML.
- No user accounts, no server, no push notifications (Web Push needs a server → backlog).
- No multi-station comparison (Uccle only).
- No precipitation-centric screens (temperature focus; precip optional later).

## 3. Audience & tone
General public, climate-awareness framing. Zero-numeracy entry points (stripes, big numbers) first; depth available on tap. Credible: cite sources, surface data caveats.

## 4. Data sources

### 4.1 Historical (build time)
- **NOAA GHCN-Daily**, station **`BE000006447`** (Uccle), daily file:
  `https://www.ncei.noaa.gov/pub/data/ghcn/daily/all/BE000006447.dly`
- Fixed-width `.dly` format. Variables used: **TMAX, TMIN** (tenths °C); PRCP/SNWD parsed but optional/unused in v1.
- Apply GHCN quality flags: drop values with a non-blank QFLAG.
- ⚠ Caveat to surface in-app: Uccle carries a documented **urban-heat-island** warm bias (~0.8 °C summer; nights warm faster than days). Not homogenized. Acceptable for awareness use with a transparency note.

### 4.2 Live (runtime, client-side)
- **Open-Meteo**, Uccle ≈ **50.80 N, 4.36 E**, no API key (non-commercial):
  - Today + recent fill (GHCN lags ~45–60 days):
    `https://api.open-meteo.com/v1/forecast?latitude=50.8&longitude=4.36&current=temperature_2m&daily=temperature_2m_max,temperature_2m_min&past_days=92&timezone=Europe/Brussels`

## 5. Data pipeline — `scripts/build_data.py`

Run pre-build / in CI. Pure transform, no runtime cost. Steps:

1. **Download & parse** the `.dly` into per-day records `{date, tmax, tmin}` (tenths → °C), dropping QC-flagged values.
2. **Derive daily mean** `Tmean = (Tmax + Tmin) / 2` (only when both present).
3. **Aggregate & derive** (definitions in §6).
4. **Emit static JSON** to `public/data/` (schemas in §7).
5. **Validate**: fail loudly if the `.dly` column layout changes, if year coverage drops unexpectedly, or if record counts fall outside sane bounds.

Output is generated artifact (regeneratable); decide commit-vs-CI in the plan.

## 6. Derived metric definitions

- **Annual mean**: mean of `Tmean` over a calendar year. Require ≥330 valid days; otherwise mark the year `incomplete` and exclude from trend/ranking (still displayable, flagged).
- **Anomaly**: `annual_mean − baseline_mean`, where `baseline_mean` is the mean of annual means over the baseline period. Two baselines: **1991–2020** (WMO "normal now") and **1961–1990** (fixed climate-change reference). Per-screen toggle.
- **Decadal mean**: mean of `Tmean` per decade (1830s … 2020s).
- **Warming rate**: OLS slope of annual mean vs year × 10 (°C/decade). Computed for full record and last 30 years (acceleration).
- **Day-of-year (DOY) normal**: for each of 366 DOY, mean of `Tmean` over baseline years within a **±7-day centered window**; same window for **10th/90th percentile** bands. Built for both baselines.
- **Per-date records**: for each `MMDD`, all-time `max(Tmax)` + year, `min(Tmin)` + year.
- **Per-date distribution**: for each `MMDD`, the full array of `{year, tmax, tmin}` (for rank, percentile, dot column, scatter+trend, then-vs-now, min–max band, time machine).
- **Rank / percentile of a value**: position within that date's historical distribution (ties handled with average rank).
- **Annual counters** (ETCCDI-style):
  - **Summer days (SU)**: count `Tmax ≥ 25 °C`
  - **Hot days**: count `Tmax ≥ 30 °C`
  - **Tropical nights (TR)**: count `Tmin ≥ 20 °C`
  - **Frost days (FD)**: count `Tmin < 0 °C`
  - **Ice days (ID)**: count `Tmax < 0 °C`
  - **Heatwave (RMI definition)**: a run of **≥5 consecutive days `Tmax ≥ 25 °C`, including ≥3 days `Tmax ≥ 30 °C`**. Report per year: heatwave-day count, number of heatwaves, longest run.
  - **Growing-season length (GSL)**: span (days) from the first 6-day run of `Tmean > 5 °C` (from Jan 1) to the first 6-day run of `Tmean < 5 °C` after Jul 1.
- **Year rankings**: annual means sorted (hottest/coldest leaderboards).

## 7. Static JSON schemas (`public/data/`)

- **`summary.json`** (loaded at boot):
  ```jsonc
  {
    "station": { "id": "BE000006447", "name": "Uccle", "lat": 50.8, "lon": 4.36 },
    "baselines": { "1991-2020": 10.9, "1961-1990": 9.8 },   // example baseline means
    "annual": [ { "year": 1833, "mean": 9.7, "tmin": 6.1, "tmax": 13.3, "incomplete": false } ],
    "anomaly": { "1991-2020": [ { "year": 1833, "v": -1.2 } ], "1961-1990": [ ... ] },
    "decadal": [ { "decade": 1830, "mean": 9.6 } ],
    "warmingRate": { "full": 0.11, "last30": 0.42 },          // °C/decade
    "counters": { "SU": [ { "year": 1833, "n": 12 } ], "TR": [...], "FD": [...], "ID": [...],
                  "hot30": [...], "heatwaveDays": [...], "gsl": [...] },
    "rankings": { "warmest": [ { "year": 2023, "mean": 12.8 } ], "coldest": [...] }
  }
  ```
- **`daynorm.json`** (loaded at boot): per-DOY normals & bands for both baselines.
  ```jsonc
  { "1991-2020": [ { "doy": 1, "mmdd": "0101", "normal": 3.4, "p10": -0.5, "p90": 7.1 } ], "1961-1990": [...] }
  ```
- **`thisday/MMDD.json`** (lazy, only viewed date):
  ```jsonc
  { "mmdd": "0625",
    "recordHigh": { "v": 34.8, "year": 1947 },
    "recordLow":  { "v": 4.1, "year": 1923 },
    "series": [ { "year": 1833, "tmax": 24.1, "tmin": 12.0 } ],   // all years
    "thenNow": { "early": { "from": 1833, "to": 1900, "mean": 16.1 },
                 "recent": { "from": 1996, "to": 2025, "mean": 18.4 } } }
  ```

## 8. App architecture

- **React + Vite + TypeScript**, mobile-first.
- **`vite-plugin-pwa`** (Workbox): manifest, icons, service worker. SW scope + manifest paths respect the Pages base path.
- **Vite `base`** set to `/<repo-name>/` (GitHub project page lives under a sub-path). All asset/data/manifest URLs use `import.meta.env.BASE_URL` so they resolve under the base.
- **React Router — `HashRouter`**: 4 tabs as hash routes (`/#/today`, `/#/trends`, `/#/climate`, `/#/me`). HashRouter is used (not BrowserRouter) because GitHub Pages has no SPA fallback — a hard refresh or shared link to `/trends` would 404. Hash routes stay deep-linkable/shareable without a server rewrite.
- **Charts**: Recharts for standard charts (anomaly bars, counter trends, scatter); hand-rolled SVG components for warming stripes and the per-year dot column.
- **Share**: `html-to-image` to render a result node → PNG; `navigator.share({ files })` (Web Share API L2) with download fallback. ⚠ **No PII** in any card — derived stats + "Uccle, Brussels" only.
- **Live fetch**: a small `useTodayTemp()` hook (network-first, cache fallback). No global state library needed.
- **Birth year**: stored in `localStorage`, used only client-side, never transmitted.

### Tabs & components

**Today** (Module A) — daily-check hero:
- Live-temp header (Open-Meteo) + date.
- Rank/percentile badge · record high/low · anomaly-vs-DOY-normal readout · per-year dot column (today highlighted) · scatter + trend line (date warming/century) · then-vs-now split · min–max range band · **year time-machine picker** · this-date warming stripes.
- Data: `thisday/MMDD.json` + `daynorm.json` + live temp.

**Trends** (Module B):
- **Warming stripes** (hero, full-bleed SVG) · anomaly bars + smoothing toggle (5/10/20-yr) · decadal-rate headline (full vs last-30) · baseline toggle (1991–2020 / 1961–1990).
- Data: `summary.json`.

**Climate** (Module D):
- Cards: summer days · tropical nights · frost/ice days · heatwaves · growing-season — each a headline number + trend chart + one-line "what it means."
- Data: `summary.json`.

**Me** (Module F):
- **Birthday stripes**: enter birth year → personalized lifetime stripes + "Uccle warmed X °C since you were born."
- "Day you were born" card: actual Uccle Tmin/Tmax that date vs the date's normal today.
- Share button on each result (PNG → Web Share, no PII).
- Data: `summary.json` + `thisday/MMDD.json`; birth year from localStorage.

## 9. Data flow
Boot → register SW → load `summary.json` + `daynorm.json` (SW-precached). Today → lazy-load `thisday/MMDD.json` + fetch Open-Meteo (network-first; offline → last cached, else latest dataset day). Me → read birth year from localStorage → compute client-side from loaded JSON.

## 10. Offline / PWA
Workbox: precache app shell + `summary.json` + `daynorm.json`; runtime cache-first for `thisday/*`; network-first (with cache fallback) for Open-Meteo. Web app manifest + maskable icons → installable. Offline: full 190-yr history works; live temp degrades to last-cached value / latest dataset day with a clear "offline" indicator.

## 11. Deployment — GitHub repository & GitHub Pages

The app is published as a static site on **GitHub Pages**, built and deployed by **GitHub Actions** (no manual build, no committed data).

### 11.1 Repository
- Create a **public** GitHub repo (e.g. `uccle-climate`) via `gh repo create`. Public is required for free GitHub Pages and acceptable here: GHCN-Daily data is public-domain and the repo contains **no PII** (org policy) and no secrets.
- Pages source: **GitHub Actions** (Settings → Pages → Build and deployment → Source = GitHub Actions).

### 11.2 Build & deploy workflow (`.github/workflows/deploy.yml`)
Triggered on push to `main` (plus manual `workflow_dispatch`). Steps:
1. `actions/checkout`.
2. `actions/setup-python` → run `scripts/build_data.py` to **fetch GHCN-Daily fresh at CI time** and emit `public/data/*.json`. (This resolves §16: data is CI-generated, not committed.)
3. `actions/setup-node` → `npm ci` → `npm run build` (Vite, with `base=/<repo-name>/`).
4. `actions/upload-pages-artifact` (path `dist/`) → `actions/deploy-pages` (needs `permissions: pages: write, id-token: write`).

### 11.3 Scheduled refresh (optional, recommended)
A second workflow on a **weekly `cron`** re-runs the build/deploy so the historical series and counters stay current as GHCN updates (GHCN lags ~45–60 days; weekly is ample). Today's value is always live via Open-Meteo regardless.

### 11.4 Pages-specific requirements (already reflected in §8)
- Vite `base = '/<repo-name>/'`; all runtime URLs via `import.meta.env.BASE_URL`.
- **HashRouter** (no SPA server fallback on Pages).
- Add `public/.nojekyll` so Pages serves files/folders starting with `_` and skips Jekyll processing.
- Service worker registered at the base scope; verify PWA installability on the live `https://<user>.github.io/<repo-name>/` URL.

### 11.5 Attribution
About/Methods page and repo README credit **NOAA GHCN-Daily** (public domain) and **Open-Meteo** (free non-commercial, attribution required). App is non-commercial.

## 12. Error handling
- Live fetch failure/timeout → banner "Live temperature unavailable — showing latest available day," fall back to most recent dataset value.
- GHCN missing/flagged days → excluded from stats; incomplete years flagged, not silently averaged.
- Lazy JSON 404/parse error → graceful per-tab error state with retry.
- Build script → hard-fail on `.dly` format drift or anomalous record counts (no silent bad data).

## 13. Testing (TDD)
- **Unit** (highest value): derivation functions — annual mean & coverage gate, anomaly, OLS warming rate, DOY normal/percentile windowing, per-date rank/percentile, each counter (SU/TR/FD/ID/hot/heatwave/GSL) — against small fixture daily series with known answers.
- **Parser**: `.dly` fixed-width parser vs a committed fixture file (incl. flagged values, missing months).
- **Component**: tabs render with fixture JSON; warming-stripes SVG snapshot; share-card node contains no PII.
- **(Later)** Playwright e2e: tab nav, offline mode, install.

## 14. Compliance & credibility
- **No PII** anywhere (org policy): no name, no precise location, none in share cards.
- "About / Methods" page: data sources (NOAA GHCN-Daily, Open-Meteo, RMI), baseline definitions, UHI caveat, "not homogenized" note.
- Attribution per source licenses (GHCN-Daily public domain; Open-Meteo non-commercial, attribute).

## 15. v1 scope vs backlog
**In v1:** the 4 tabs above (Modules A, B, D, F-core: birthday stripes + share + day-you-were-born), plus public GitHub repo + GitHub Pages deploy via GitHub Actions (§11).

**Backlog:**
- Module C — record highs-vs-lows ratio, all-time records timeline.
- Module E — calendar heatmap (year × DOY), decade ridgeline, month × year heatmap, seasonal small-multiples, day/night DTR.
- Module G — climate spiral, cumulative-anomaly finale, scrollytelling intro.
- Module F extras — guess-the-year game, generational comparison, quiz.
- Heating/cooling degree days; precipitation indices; push notifications (needs backend); multi-station compare.

## 16. Open questions
None blocking. (Pipeline output is CI-generated, not committed — resolved in §11.2.) Repo name to confirm at creation.
