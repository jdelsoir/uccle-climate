# Uccle Climate

**A climate-awareness web app built on Belgium's longest temperature record — daily observations at the Uccle (Ukkel) reference station near Brussels, 1833 to today.**

🌡️ **Live app: https://jdelsoir.github.io/uccle-climate/**

Most weather apps tell you today's temperature. This one puts today in context against nearly two centuries of data, so you can *see* climate change rather than just read about it: how today compares to the historical average for this date, the all-time records, the long-term warming trend, and how much the climate has shifted within your own lifetime.

It's a **static Progressive Web App** — no backend, no accounts, and **no data collection of any kind** (no cookies, no analytics, no tracking). It installs to your home screen and works offline.

## What you can do

| Tab | What it shows |
|-----|----------------|
| **Today** | Today's temperature (live) — or any past day/month/year — set against its historical average, where it ranks all-time, records broken, and a "then vs now" warming comparison. Share any day as an image. |
| **Trends** | The annual warming trend since 1833, drawn as warming stripes and an anomaly chart. |
| **Records** | The top-10 hottest and coldest days on record, each linking back to that day. |
| **Climate** | Decadal averages and the climate "normals" the anomalies are measured against. |
| **Me** | Your lifetime of warming — the temperature stripes from your birth year to now. |
| **About** | Why Uccle, where the numbers come from, and the privacy stance, in plain language. |

## Why Uccle?

Uccle has **Belgium's longest continuous instrumental temperature record** — daily readings since **1833**, maintained by the national weather service (RMI/KMI). It is Belgium's official climate reference station. Nearly two centuries of data is what makes a genuine climate signal (not just weather noise) visible.

## Tech stack

**Frontend**
- **React 18** + **TypeScript 5** + **Vite 6**
- **Tailwind CSS v4** (`@tailwindcss/vite`; design tokens in `src/index.css`, light + dark)
- **react-router-dom 6** with `HashRouter` (GitHub Pages has no SPA fallback)
- **Recharts** for charts, **lucide-react** for icons
- **vite-plugin-pwa** (Workbox) — installable, offline app shell; data served network-first
- **html-to-image** for client-side "share this day" image rendering
- No external fonts or CDNs (system font stack) — strict CSP, fully offline-capable

**Data pipeline**
- **Python 3.11, standard library only** (`scripts/uccle/`: `parser.py` → `derive.py` → `build_data.py`); Pillow only for app-icon generation
- Emits static JSON to `public/data/` (annual summary, day-of-year normals, per-day and per-month series)

**Quality & delivery**
- Tests: **Vitest** (frontend) + **pytest** (pipeline), test-driven throughout
- CI/CD: **GitHub Actions → GitHub Pages**; a daily cron refreshes recent data without a code push

## Data sources & method

Temperatures are assembled with a clear precedence — **GHCN-Daily > ERA5 reanalysis > short-range forecast**:

- **NOAA GHCN-Daily**, station Uccle `BE000006447` — the authoritative deep-history record (1833+).
- **Copernicus ERA5** (via Open-Meteo archive) fills gaps in the station's recent daily min/max (notably ~2000–2024) so no decade is missing (1940+ only; pre-1940 stays GHCN-only).
- **Open-Meteo forecast** fills the last few days before ERA5 finalizes them; those days are flagged **provisional**.
- **Live Open-Meteo** provides today's value, fetched client-side.

Anomalies use **WMO normals** (1991–2020 by default, 1961–1990 alternative). Years/months with too few valid days are excluded from trends, rankings and records. Caveat: mixing station and reanalysis data adds minor inhomogeneity, and Uccle carries a documented **urban heat island** warm bias, so its local trend runs slightly above rural Belgium.

## Privacy

There is no server of ours behind the app: **no accounts, no login, no cookies, no analytics, no tracking, no personal data collected**. The only thing the app stores is the optional birth year you enter on the *Me* tab — kept in your browser's `localStorage` and never transmitted. Today's temperature is fetched by your browser directly from Open-Meteo.

## Run locally

```bash
# 1. Install JavaScript dependencies
npm install

# 2. Fetch and build the climate data (network; writes to public/data/)
python3 -m scripts.uccle.build_data

# 3. Start the dev server
npm run dev
```

The app serves at `http://localhost:5173/uccle-climate/` by default.

**Python requirements:** Python 3.11+; `build_data` needs no packages beyond the standard library. `pip install -r requirements-dev.txt` adds pytest for the test suite.

### Tests

```bash
npm test                                   # Vitest (frontend)
python3 -m pytest scripts/uccle/tests/ -q  # pytest (pipeline)
```

## Build for production

```bash
VITE_BASE=/uccle-climate/ npm run build    # output: dist/
```

## How it deploys

Pushing to `main` triggers `.github/workflows/deploy.yml`, which:

1. Checks out the repository.
2. Runs `python3 -m scripts.uccle.build_data` to fetch the latest GHCN + ERA5 data.
3. Builds the Vite/React app with `VITE_BASE=/uccle-climate/`.
4. Uploads `dist/` as a GitHub Pages artifact and deploys it.

A second workflow (`.github/workflows/refresh.yml`) re-runs the deploy on a **daily** cron (05:00 UTC) to keep recent days fresh without a code push.

## Attribution

| Source | License / terms |
|--------|----------------|
| **NOAA GHCN-Daily** (Global Historical Climatology Network — Daily) | Public domain. Menne et al. (2012). [doi:10.1175/JTECH-D-11-00103.1](https://doi.org/10.1175/JTECH-D-11-00103.1) |
| **Copernicus ERA5** (via Open-Meteo archive) | Copernicus Climate Change Service (C3S) data; free use with attribution. |
| **Open-Meteo** ([open-meteo.com](https://open-meteo.com)) | Free for non-commercial use; attribution required. |
| **RMI / KMI Belgium** — Uccle reference station | Historical observations contributed to GHCN; Uccle (station `BE000006447`) is the official Belgian climate reference. |

> Open-Meteo is used under its free non-commercial tier. For a high-traffic or commercial deployment, review [Open-Meteo's licensing](https://open-meteo.com/en/terms).
