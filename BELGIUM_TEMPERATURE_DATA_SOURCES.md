# Belgian Temperature & Meteorological Datasets — What Exists and How to Retrieve It

> Research report (2026-06-25). Scope: climate-trend analysis, current/recent weather, event/case studies. All Belgian stations + gridded/reanalysis. Free & programmatic prioritized; free manual noted; paid gaps flagged.
> Every factual claim below was extracted from primary sources and passed 3-vote adversarial verification (0 claims killed; 3 nuance corrections folded in and marked ⚠).

---

## 0. TL;DR — pick by use case

| Use case | Best free + programmatic source | Method |
|---|---|---|
| **Long climate trends (Uccle reference)** | CBT series (1767+) / GHCN-Daily `BE000006447` (1833+) | NOAA bulk file / CDO API |
| **Long trends, homogenized, multi-station** | BEL-HORNET / RMI Climate Centre (1880–2015) | ⚠ **NOT openly published except Uccle** — request from RMI/BELSPO |
| **Long trends, gridded all-Belgium** | E-OBS (0.1°/0.25°, 1950+) + ERA5-Land | CDS API / surfobs direct download |
| **Current / recent observations** | RMI `opendata.meteo.be` (AWS 10-min/hourly/daily from 2000; SYNOP hourly) | OGC WFS, or `openkmi` Python wrapper |
| **Quick recent obs, any station** | Open-Meteo archive API, Meteostat | REST (no key) / Python lib |
| **Event/case study (spatial + hourly)** | E-OBS + ERA5(-Land) for fields; SYNOP/ISD for hourly timing | CDS API + WFS/NOAA |

**The single biggest gap:** the homogenized Belgian *multi-station* long series (150+ stations) are **not openly available** — only **Uccle** is. Everything else free is either (a) recent-only, (b) gridded, or (c) global-aggregator data that is **not homogenized**.

---

## 1. The Uccle reference series — what it actually is

Belgium's canonical reference is **Uccle / Ukkel**, the RMI (KMI/IRM) national *suburban* recording station near Brussels.

- **GHCN-Daily** holds the Uccle daily record from **2 January 1833** — the **longest daily station record in the entire GHCN-Daily dataset** — station ID **`BE000006447`**, still active. [GHCNd]
- The **Central Belgium Temperature (CBT)** series is a **homogenized multi-site daily Tmin/Tmax series covering 1767 to present** — one of the longest daily homogenized records in the world. Core daily readings begun by **Adolphe Quetelet in 1833 at the Royal Observatory of Brussels**, continued under **RMI from 1913**. Pre-1833 values were merged in via linear regression from earlier scientists'/physicians' records. Source: **Demarée et al. (2002), *Climatic Change* 53:269–293**. [Springer]
- ⚠ **Urban-heat-island caveat for trend work:** Uccle's summer-mean UHI warm bias is estimated at **~0.8 °C**, and it grows **~2.5× faster on Tmin (0.15 °C/decade) than on Tmax (0.06 °C/decade)** — so it distorts Tmin- and Tmax-based trends/extremes *differently*. Account for it before drawing warming conclusions. [Adv. Sci. Res. 6:27, 2011]

**Why "homogenization" matters everywhere below:** Belgian instrumental records carry non-climatic biases of magnitude *similar to the climate signal itself* — station relocations, thermometer screen changes (documented screen types A→D; Stevenson screen introduced in the 1950s), and changes in observation times. These must be detected and adjusted before any climate-change analysis. [BEL-HORNET]

---

## 2. RMI homogenized multi-station series — the crown jewels (mostly NOT free)

### BEL-HORNET (BELSPO project)
Quality-controlled and **homogenized monthly + daily TX/TN and precipitation for Belgium, 1880–2015**, from RMI/IRM/KMI archives (lower station density before mid-20th century). [BELSPO final report, 2018]
- Temperature: **61 long series (1954–2015)** + **16 historical series starting before 1931**, of which **8 cover the full 1880–2015**.
- Precipitation: **149 long series (1951–2015)** + **23 centennial series**.
- Monthly homogenization with **HOMER** software (Mestre et al. 2013). **Three** daily-homogenized temperature versions produced: Vincent interpolation, SPLIDHOM cubic-spline regression, and the **PM method** — authors recommend **using only the PM version for analyses of extremes** (candidate–reference correlations rarely exceeded 0.9).
- Background: before BEL-HORNET, easily accessible digital Belgian data were largely post-1950, with only one long daily series (1767–1998, Demarée 2002 = CBT). BELSPO digitization added **239 daily extreme-temperature + 623 daily precipitation series for 1880–1953 (~5 million daily values)**.

### Belgian Climate Centre / RMIB homogenization project
- **150+ locations** with monthly temperature & precipitation series, longest 100+ years. Station data sourced from **RMIB + Skeyes (air-traffic) + Belgian Defence Air Component** networks. [climatecentre.be]
- ⚠ **THE GAP:** "Aside from the Uccle climatological series, the homogenized Belgian time series are currently **not accessible in a user-friendly way**" (i.e. not openly published). Planned future distribution via **Copernicus C3S Climate Data Store** and the **RMIB / Belgian Climate Centre open-data platforms** — not there yet.

**Net:** for homogenized Belgian station history beyond Uccle today, you must **request data directly from RMI/BELSPO**, or wait for the planned C3S release. This is the main thing lost by staying free-only.

---

## 3. RMI open data portal — `opendata.meteo.be` (the free, programmatic, official route)

Recent observations, **CC BY 4.0**, no registration/key. Served via **OGC WFS 2.0.0** (`GetFeature`), output formats: **JSON, CSV, GML, KML, Excel, Shapefile**. Feature types include AWS, SYNOP, LIDAR, app observations, thermal mapping. [opendata.meteo.be]

### Automatic Weather Stations (AWS) — ~17 stations
- Resolutions: **`aws:aws_10min`, `aws:aws_1hour`, `aws:aws_1day`** + metadata `aws:aws_station`.
- Daily (`aws_1day`) temperature fields: **`temp_min`, `temp_max`, `temp_avg`** (plus grass + soil temps at 5/10/20/50 cm). Base 10-min variable: **`TEMP_DRY_SHELTER_AVG`** (avg dry-bulb under shielded hut).
- Also: precipitation, wind (10 m & 30 m, direction, gust), RH, station-level pressure, solar radiation, sunshine.
- ⚠ **Daily AWS series begins in 2000** (earliest record 2000-02-27) — this is a **recent-observations product, NOT the long Uccle climate series**.
- Completeness rules: hourly allows ≤1 of 6 missing 10-min; daily allows ≤10% of 144 expected.

### SYNOP — ~22 synoptic stations
- **Hourly air temperature at 1.5 m**, plus daily Tmin/Tmax and grass-min. Standard synoptic hours (00–23 UT).
- Also precip, wind, RH, pressure (MSL + station), weather type, sunshine, radiation, cloud cover.

### `openkmi` — Python wrapper (recommended entry point)
- `pip install openkmi` — **MIT**, **unofficial** (not from RMI). Wraps the `opendata.meteo.be` WFS/WMS into **pandas DataFrames** with date filtering; **no key/registration**. Classes: **`Synop`, `AWS`, `Alaro`** (Alaro = raw ALARO NWP output, uncorrected). [github.com/TimFranken/openkmi, PyPI v0.7.0]
- ⚠ Station counts (~22 SYNOP / ~17 AWS) are approximate and may drift as the network changes — confirm against `aws:aws_station` / portal docs.

---

## 4. European station archive — ECA&D (+ KNMI Climate Explorer)

**ECA&D** (European Climate Assessment & Dataset, `ecad.eu`): daily station observations across Europe + Mediterranean (T, precip, pressure) — includes Belgian stations. [ecad.eu, climexp.knmi.nl]
- **Four download products:** custom query (ASCII) · predefined subsets (ASCII) · aggregated climate-indices (ASCII) · **E-OBS gridded version (netCDF)**.
- Series categories: **blended** (includes GTS data — more up-to-date but **less reliable**) vs **non-blended**; and **downloadable** vs **non-downloadable** (the latter require direct inquiry to the data provider).
- ⚠ **Free but only part of the dataset, and free access is restricted to non-commercial research & education.**
- Full dataset (more metadata: averaging periods, relocations; daily updates) from **`eca.knmi.nl`**. ASCII station products kept current (updated to May 31 2026); E-OBS gridded lags (Dec 31 2025).
- **KNMI Climate Explorer** (`climexp.knmi.nl`) re-serves ECA&D as **'pure'** (no GTS) vs **'blended'** series, refreshed ~monthly.

---

## 5. Gridded daily observations — E-OBS (best all-Belgium gridded obs)

**E-OBS** = gridded daily observational dataset for Europe, derived from station data. [surfobs.climate.copernicus.eu; CDS `insitu-gridded-observations-europe`]
- Resolutions **0.1°** and **0.25°** (both cover all Belgium); **NetCDF-4** (CF-1.4).
- Variables (8 daily): **TG/TN/TX (mean/min/max temp)**, precip, sea-level pressure, RH, global radiation, wind speed.
- Coverage **1950–present** (wind from 1980); **monthly updates**; new version every 6 months (current ~v33.0e, May 2026).
- **Ensemble** product: ensemble **mean** ("best guess") + ensemble **spread** (5th–95th pct, 90% uncertainty).
- Access: full files or **15-year chunks**, via the surfobs/ECA&D page **or** via the **CDS**.
- ⚠ **Registration:** the **CDS route requires a (free) account**; the direct surfobs/ECA&D download may also require a registration/form — do **not** assume zero-registration. License: **non-commercial research/education only**.
- ⚠ Limitation: the **24-hour aggregation window is not standardized** across regions/providers (midnight–midnight vs morning–morning) — matters for precise daily extremes.

---

## 6. Reanalysis — ERA5 & ERA5-Land via Copernicus CDS (best spatial/physical fields)

Gridded model reanalysis covering all Belgium continuously. **CC-BY** (free with attribution). [CDS; ECMWF Confluence]

| | ERA5 single-levels | ERA5-Land |
|---|---|---|
| Period | **1940–present** | **1950–present** |
| Temporal res | hourly | hourly (+ monthly aggregations) |
| **Served** grid | **0.25°×0.25°** | **0.1°×0.1°** |
| ⚠ **Native** res | **~31 km / 0.28° (T639)** — 0.25° is *regridded* | **~9 km (TCo1279)** — 0.1° is *regridded* |
| Format | GRIB (default) + NetCDF | GRIB + NetCDF |
| Latency | ~5-day (ERA5T early release, revised in final 2–3 mo later) | ~2–3 months for consolidated |
| Uncertainty | EDA-based | ⚠ none native — derive from ERA5 EDA (62 km) |
| DOI | `10.24381/cds.adbb2d47` | — |

> ⚠ Correction folded in: the **0.25° / 0.1°** figures are the **regridded regular lat-lon grids the CDS serves**, *not* the native model resolution (~31 km / ~9 km on reduced Gaussian grids). Use the served grid for retrieval; cite native res for physics.

### Access — the `cdsapi` Python client
1. Free **CDS account** → personal access token from `https://cds.climate.copernicus.eu/profile`.
2. `pip install "cdsapi>=0.7.7"` (Apache-2.0).
3. Create `~/.cdsapirc`:
   ```
   url: https://cds.climate.copernicus.eu/api
   key: <your-personal-access-token>
   ```
4. **Accept each dataset's Terms of Use** (once per dataset, web or API).
5. Retrieve:
   ```python
   import cdsapi
   c = cdsapi.Client()
   c.retrieve("reanalysis-era5-land", {
       "variable": "2m_temperature",
       "year": "2023", "month": "07",
       "day":  [f"{d:02d}" for d in range(1, 32)],
       "time": [f"{h:02d}:00" for h in range(24)],
       "area": [51.6, 2.5, 49.4, 6.5],   # N, W, S, E  — Belgium bbox
       "data_format": "netcdf",
   }, "era5land_belgium_2023-07.nc")
   ```
   ⚠ Some ERA5 requests come off MARS tape (not spinning disk) and can take **hours to days**.

---

## 7. Global aggregators with Belgian coverage (easiest APIs)

### NOAA GHCN-Daily
- Holds **Uccle from 1833** (`BE000006447`, longest in dataset, active). Variables: Tmax, Tmin, precip, snowfall, snow depth; 100k+ stations. [NCEI]
- Retrieve: per-station ASCII `.dly` (e.g. `https://www.ncei.noaa.gov/pub/data/ghcn/daily/all/BE000006447.dly`), full GZIP TAR of all stations, or **CDO search** (`https://www.ncei.noaa.gov/cdo-web/search?datasetid=GHCND`).
- ⚠ Rebuilt weekly; real-time replaced by archive-quality only **45–60 days after month end**. **QC'd but NOT homogenized** — not suitable for unadjusted long-term trends.

### NOAA ISD (Integrated Surface Database)
- **Global hourly/synoptic** surface obs (air temp + dew point); 35,000+ stations, Belgium well covered; **1901–present**. [NCEI]
- Retrieve: HTTPS bulk (`global-hourly`, `global-summary-of-the-day` dirs) + CDO Web Services + Access Data Service API.
- ⚠ Individual station records often have gaps.

### Meteostat
- Free/open. **Three methods: Python library, JSON API, bulk CSV** (`bulk.meteostat.net`; station dump `full.json.gz`, ~1 MB). [dev.meteostat.net]
- Granularities: **daily, monthly, and climate normals**; fields `temp`, `tmin`, `tmax` (°C).
- ⚠ Accuracy/completeness disclaimed; not for safety-critical use.

### Open-Meteo Historical/Archive API (no key for non-commercial)
- Endpoint `https://archive-api.open-meteo.com/v1/archive`. Serves **ERA5 + ERA5-Land + "Best Match"** seamlessly. [open-meteo.com]
- Hourly + daily incl. T2m, Tmax, Tmin; **1940–present** (~5-day delay). Output JSON/CSV/XLSX.
- Example (Uccle ≈ 50.80 N, 4.36 E):
  ```
  https://archive-api.open-meteo.com/v1/archive?latitude=50.8&longitude=4.36
    &start_date=2000-01-01&end_date=2023-12-31
    &daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean
    &timezone=Europe/Brussels
  ```
- ⚠ Free for **non-commercial**; commercial use needs an API key.

---

## 8. Free vs paid — what you lose by staying free-only

| Want | Free path | Gap / paid alternative |
|---|---|---|
| Long **Uccle** series | ✅ GHCN-Daily / CBT (literature) | none material (Uccle is open) |
| Long **homogenized multi-station** Belgian series | ❌ only Uccle is open | **Request from RMI/BELSPO**, or await C3S release (BEL-HORNET / Climate Centre, 150+ stations) |
| Recent Belgian obs (AWS/SYNOP) | ✅ `opendata.meteo.be` (CC BY 4.0) | none — but only from ~2000 (AWS) |
| Gridded daily obs / reanalysis | ✅ E-OBS, ERA5/ERA5-Land (CC-BY) | E-OBS is **non-commercial only** → commercial use needs licensing |
| ECA&D non-downloadable series | ❌ | inquire directly to provider |
| Commercial use of E-OBS/ECA&D/Open-Meteo | ❌ | licensed/commercial agreement |

---

## 9. Recommended retrieval plan per use case

**Climate-trend analysis**
- Uccle anchor: **CBT (1767+)** or **GHCN-Daily `BE000006447` (1833+)**. For *homogenized* extremes use **BEL-HORNET PM-version** (request from RMI/BELSPO).
- Spatial trends: **E-OBS** (1950+) for obs-based grids; **ERA5-Land** for physically consistent fields.
- Always correct/annotate the **Uccle UHI bias** (Tmin ≠ Tmax).

**Current / recent weather**
- Official: **`opendata.meteo.be`** AWS (10-min/hourly/daily) + SYNOP (hourly) via **`openkmi`**.
- Quick/any station: **Open-Meteo** or **Meteostat**; **ISD** for hourly history.

**Event / case studies**
- Spatial reconstruction: **E-OBS** + **ERA5/ERA5-Land** (CDS API).
- Fine timing at stations: **SYNOP** (hourly) or **ISD**.
- Quick pulls + records: **GHCN-Daily**, **Meteostat normals**, **Open-Meteo**.

---

## Sources (all primary, verified)
- BELSPO BEL-HORNET final report (2018) — `belspo.be/.../BEL_HORNET_FinRep.pdf`
- Demarée et al. (2002), *Climatic Change* 53:269–293 — `link.springer.com/article/10.1023/A:1014931211466`
- Belgian Climate Centre homogenization — `climatecentre.be/projects/belgian-time-series-homogenization`
- Uccle UHI — *Adv. Sci. Res.* 6:27 (2011) — `asr.copernicus.org/articles/6/27/2011/`
- RMI open data — `opendata.meteo.be/` + `/documentation/?dataset=aws` + `?dataset=synop`
- openkmi — `github.com/TimFranken/openkmi`
- ECA&D — `ecad.eu/dailydata/` ; KNMI Climate Explorer — `climexp.knmi.nl/help/ecad.shtml`
- E-OBS — `surfobs.climate.copernicus.eu/dataaccess/access_eobs.php` ; CDS `insitu-gridded-observations-europe`
- ERA5 / ERA5-Land — CDS `reanalysis-era5-single-levels`, `reanalysis-era5-land` ; ECMWF Confluence "How to download ERA5", "ERA5-Land documentation"
- cdsapi — `github.com/ecmwf/cdsapi` ; `cds.climate.copernicus.eu/how-to-api`
- NOAA GHCN-Daily / ISD — `ncei.noaa.gov/products/land-based-station/...`
- Meteostat — `dev.meteostat.net/` , `/bulk/stations.html`
- Open-Meteo — `open-meteo.com/en/docs/historical-weather-api`
