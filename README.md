# Uccle Climate

A Progressive Web App (PWA) visualising how Brussels temperature has changed since 1833, using data from the Uccle reference station.

- **1833+ years of daily records** from NOAA GHCN-Daily
- **Live conditions** refreshed via Open-Meteo (no backend required)
- **No server** — pure static build deployed to GitHub Pages
- **Installable** as a PWA (Add to Home Screen / Install App)

## Tabs

| Tab | Description |
|-----|-------------|
| Today | Live temperature + daily historical records |
| Trends | Annual warming trend since 1833 |
| Climate | Decadal averages and climate normals |
| Me | Your lifetime warming — birthday stripes |
| About | Data sources and methods |

## Run locally

```bash
# 1. Install JavaScript dependencies
npm install

# 2. Fetch and build the climate data (writes to public/data/)
python -m scripts.uccle.build_data

# 3. Start the dev server
npm run dev
```

The app is served at `http://localhost:5173/uccle-climate/` by default.

**Python requirements:** Python 3.11+; no extra packages beyond the standard library are needed for `build_data`. Run `pip install -r requirements-dev.txt` to get pytest for the test suite.

## Build for production

```bash
VITE_BASE=/uccle-climate/ npm run build
# Output: dist/
```

## How it deploys

Pushing to `main` triggers the GitHub Actions workflow (`.github/workflows/deploy.yml`) which:

1. Checks out the repository
2. Runs `python -m scripts.uccle.build_data` to fetch the latest GHCN data
3. Builds the Vite/React app with `VITE_BASE=/uccle-climate/`
4. Uploads the `dist/` folder as a GitHub Pages artifact and deploys it

A second workflow (`.github/workflows/refresh.yml`) re-runs the full deploy every Monday at 05:00 UTC to keep the climate data fresh without a code push.

## Attribution

| Source | License / terms |
|--------|----------------|
| **NOAA GHCN-Daily** (Global Historical Climatology Network — Daily) | Public domain. Menne et al. (2012). [doi:10.1175/JTECH-D-11-00103.1](https://doi.org/10.1175/JTECH-D-11-00103.1) |
| **Open-Meteo** ([open-meteo.com](https://open-meteo.com)) | Free for non-commercial use; attribution required. |
| **RMI / KMI Belgium** — Uccle reference station | Historical observations contributed to GHCN; Uccle (station ID BE000006447) is the official Belgian climate reference. |

> Open-Meteo API is used under its free non-commercial tier. If you deploy a high-traffic or commercial service, review [Open-Meteo's licensing](https://open-meteo.com/en/terms).
