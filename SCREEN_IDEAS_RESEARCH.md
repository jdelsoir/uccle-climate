# Uccle Climate PWA — Screen Ideas (research synthesis)

> Source: 5 parallel research agents (on-this-day apps, climate-viz patterns, trend/stat indices, engagement/storytelling, best-in-class product inventory). 2026-06-25.
> Context: React PWA, no backend, public climate-awareness, Uccle daily Tmin/Tmax 1833+ (GHCN-Daily `BE000006447`) + live today (Open-Meteo). Deduped into 7 modules.

## Cross-cutting build facts
- **No-backend pattern:** precompute all aggregates from GHCN-Daily into static JSON **at build time** (Python script). Browser loads small JSON. Only the full daily calendar-heatmap (~70k rows) needs the raw series client-side.
- **Live data blend:** deep history = GHCN-Daily (lags ~45–60 days); recent ~2-month gap fill = Open-Meteo archive (ERA5, ~5-day lag); today = Open-Meteo current+forecast.
- **Baseline:** `1991–2020` WMO normal for "what's normal now"; `1961–1990` for dramatic climate-change anomaly. Offer both.
- **Share-card infra** (canvas / html2canvas + Web Share API) is the enabler for every viral feature. ⚠ **Org policy: NO PII in share cards** — no user name, no precise location; only derived stats + "Uccle, Brussels".
- **Push notifications** need a server (VAPID) → out of scope for no-backend. Degrade to in-app local notifications or drop.
- ⚠ **Credibility footnote:** Uccle has a documented urban-heat-island warm bias (~0.8 °C summer; Tmin warms faster than Tmax). Surface a small data note.

---

## Module A — Today / "This Day in History" (CORE, user-requested)
Live today vs the same calendar day in every year since 1833.
- **A1 Rank/percentile badge** — "Today is the 4th-warmest June 25 in 193 years (91st pct)." [Tmax/Tmin] — shareable headline.
- **A2 Record high/low for the date** — "Hottest June 25: 34.8 °C (1947). Today 26 °C." [max(Tmax), min(Tnin)]
- **A3 Strip/dot column** — one dot per year for today's date, today highlighted; hover for year. [Tmax]
- **A4 Anomaly readout** — "today is X° above the date's normal." [vs baseline]
- **A5 Scatter + trend line** — "June 25ths are warming at +X °C/century." [Tmax per year + regression]
- **A6 Then-vs-now split** — "1833–1900 avg 16.1 °C → 1995–2025 avg 18.4 °C." [date window means]
- **A7 Year-picker time machine** — spin to any year, see that date's Tmin/Tmax. [lookup]
- **A8 Min–max range band per year** — diurnal swing on this date over time. [Tmin+Tmax]
- **A9 This-date warming stripes** — 193 colored bars for this calendar day. [daily mean]

## Module B — Warming trends spine (user's "compare trends over time")
- **B1 Warming Stripes (hero/landing)** — one stripe/year, blue→red, no axes. [annual mean anomaly] — the iconic, zero-numeracy hook.
- **B2 Anomaly bars vs 1991–2020 normal** — diverging bars + trend line. [yearly anomaly]
- **B3 Decadal warming rate** — headline °C/decade, full-record vs recent-30yr (shows acceleration). [regression slope]
- **B4 Anomaly series w/ selectable smoothing** (5/10/20-yr) — the rigorous "is it really warming" view. [running means]

## Module C — Records & rankings
- **C1 Hottest/coldest years leaderboard** — "most warm years are recent." [annual mean rank]
- **C2 Record highs vs lows ratio by decade** — stable climate ≈ 1:1; warming pulls highs ahead. [per-day records binned]
- **C3 All-time records timeline (TXx/TNn)** — when standing records were set; recent clustering. [extremes]

## Module D — Climate-impact counters (lived experience)
- **D1 Summer days** Tmax ≥ 25 °C/yr (ETCCDI SU). 
- **D2 Hot days** Tmax ≥ 30 °C/yr.
- **D3 Tropical nights** Tmin ≥ 20 °C/yr (TR) — strong European signal, ~0 → several.
- **D4 Frost days** Tmin < 0 °C & **ice days** Tmax < 0 °C (FD/ID) — vanishing winters.
- **D5 Heatwave days/length/intensity** — most newsworthy; Belgian heatwaves lengthening.
- **D6 Growing-season length** (GSL) — relatable to gardeners; positive-framed change.
- **D7 Heating vs cooling degree days** (HDD/CDD) — ties climate to energy/cost.

## Module E — Distribution & heatmaps (exploratory depth)
- **E1 Calendar heatmap** year × day-of-year, colored by anomaly — warming creeps across the calendar. [needs raw daily]
- **E2 Decade ridgeline / distribution shift** — whole distribution slides right, hot tail fattens.
- **E3 Month × year heatmap** — blue→red over 190 yrs, undeniable.
- **E4 Seasonal trends** (DJF/MAM/JJA/SON small multiples) — which season warms fastest.
- **E5 Day/night gap** (Tmin vs Tmax trends, DTR) — nights warming faster = greenhouse fingerprint.

## Module F — Personal / viral (no backend)
- **F1 Birthday stripes** — enter birth year → personalized lifetime stripes + "warmed X °C since you were born." (viral hero)
- **F2 "The day you were born" card** — actual Uccle temp that exact date vs today's normal for the date. (daily archive makes this uniquely possible)
- **F3 Summer days at age 10 vs now** — memory-anchored count contrast.
- **F4 Guess-the-year game** — unlabeled year curve/stripe, guess decade; Wordle-style shareable score; daily replay.
- **F5 Generational comparison** — your cohort's stripes vs parents'/children's.
- **F6 Mini climate quiz** — 5 Uccle-specific Q&A, shareable score.
- **F7 Share-card generator** — canvas → 1200×630 PNG → Web Share. (infra for F1–F6, A1–A2) ⚠ no PII.
- **F8 PWA install + offline** — cache 190-yr archive in service worker; "works on a plane."

## Module G — Signature animation
- **G1 Climate spiral** — animated radial, monthly temps spiraling out, reddening. (most-shared climate visual)
- **G2 Cumulative anomaly "climate debt"** — hockey-stick finale.
- **G3 Scrollytelling intro** (XKCD-style vertical timeline with Belgian milestones).

---

## Recommended v1 narrative spine
Landing **B1 warming stripes** → core **Module A** (this day in history, user's ask) → **B2/B3** trends → a few **D** counters (D1/D3/D4) → **F1+F7** birthday stripes + share. Backlog: C, E, G, rest of D/F.
