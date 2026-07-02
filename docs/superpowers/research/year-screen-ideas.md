# Year screen — research: 10 creative, minimalistic display ideas

*Deep-research run 2026-07-01/02 (5 search angles · 20 sources · 86 claims extracted · 25 adversarially verified → 24 confirmed, 1 refuted). Ranked most→least recommended. All feasible client-side from existing `daily/YYYY.json` (per-day tmax/tmin + `recHi`/`recLo`) + `daynorm.json` + `summary.json`; most need no pipeline change.*

## The 10 ideas

### 1. Daily-anomaly year strip ("the year as a barcode")
365 thin vertical bars, one per day, colored by `tempColor` ramp vs that day's normal. No axes, no labels — Hawkins-stripes minimalism at daily resolution.
- Reading Uni on why stripes work: "no words. No numbers. No graphs" — 1M+ downloads in launch week ([reading.ac.uk](https://www.reading.ac.uk/planet/climate-resources/climate-stripes))
- C3S used a per-day anomaly band for its 2023 year report ([climate.copernicus.eu](https://climate.copernicus.eu/copernicus-2023-hottest-year-record))
- Trivial: 365 `<rect>`s, existing ramp, existing data. Strongest signal-per-pixel candidate.

### 2. Full-year calendar heatmap (12 mini MonthHeatmaps)
GitHub-contribution-style grid, cells tinted by anomaly, tap → Day/Month.
- Pattern packaged in [cal-heatmap](https://github.com/wa0x6e/cal-heatmap), [react-calendar-heatmap](https://www.npmjs.com/package/react-calendar-heatmap), [@uiw/react-heat-map](https://github.com/uiwjs/react-heat-map) (pure SVG, custom `panelColors` — proves ~365 rects cheap on mobile)
- Zero new deps: reuse our `MonthHeatmap` + `lib/monthDetail`. Direct design parity with Month tab.

### 3. "You are here" all-record stripe timeline
Classic 1833→now warming stripes (one bar per year from `summary` anomalies) with the viewed year marked; tap a year → move cursor.
- Institution-endorsed: Berkeley Earth ships ShowYourStripes-based visuals ([berkeleyearth.org](https://berkeleyearth.org/data-visualization/))
- Vega shows it's just rect marks + linear year scale + diverging color scale ([vega.github.io](https://vega.github.io/vega/examples/warming-stripes/))
- 193 years of context in ~40px of height.

### 4. "This year by the numbers" counters card
Year-level `MonthCounters`: summer/hot/tropical/frost/ice day counts vs 1991–2020 annual normals + one summary line ("X of 365 days ran warm").
- C3S summarized 2023 exactly this way: "close to 50% of days were more than 1.5°C warmer" ([copernicus](https://climate.copernicus.eu/copernicus-2023-hottest-year-record))
- Reuse `monthCounters` logic + thresholds; annual counter normals = sum of the 12 monthly `counterNormals`.

### 5. Records tally — highs vs lows fell this year
Two-number card: record-hot vs record-cold days set in the viewed year (count `recHi`/`recLo` in `daily/YYYY.json`; provisional-aware already). Rows/taps → Day.
- Berkeley Earth uses the record-high vs record-low ratio as a headline climate indicator ([berkeleyearth.org](https://berkeleyearth.org/data-visualization/))
- Tiny, potent: modern years show lopsided ratios.

### 6. Shifting-distribution histogram ("the climate jellyfish")
This year's daily-anomaly distribution as a minimal histogram/area, 1991–2020 baseline curve ghosted behind — mean shift + fatter warm tail at a glance.
- NASA SVS canonical pattern: distribution "shifts right and broadens" ([svs.gsfc.nasa.gov/5613](https://svs.gsfc.nasa.gov/5613/))
- Berkeley Earth does the same with summer daily highs ([berkeleyearth.org](https://berkeleyearth.org/data-visualization/))
- Pure client-side binning; Recharts AreaChart.

### 7. Radial year plot
365 rects clockwise around a circle, each spanning tmin→tmax radially, colored by anomaly.
- Illinois Temperature Radials — default coloring is difference-from-historical-normal, i.e. our `tempColor` ([d7.cs.illinois.edu](https://d7.cs.illinois.edu/projects/Temperature-Radials/))
- Ed Hawkins' climate spiral proves radial-year credibility ([climate-visuals](https://ed-hawkins.github.io/climate-visuals/spirals.html))
- Recharts has RadialBar/Polar natively (verified 2-0). Most "wow"; best as share-card visual. Ranked lower: seasons-as-angles less instantly readable than the strip.

### 8. 12 month sparklines (small multiples)
Grid of tiny per-month anomaly sparklines or mean-vs-normal deltas, tap → Month view.
- Recharts ships Tiny Line/Area/Bar variants for exactly this (verified 2-0, [recharts examples](https://recharts.github.io/en-US/examples/))
- Gives the Year screen a navigation role: "which month made this year hot?"

### 9. Notable days of the year
Reuse `NotableDays` at year scope: top-5 warmest/coldest days, rows → Day.
- Quantified-self year-in-review pattern (highlight moments, not just aggregates)
- Zero new components — feed it the whole-year `daily/YYYY.json`.

### 10. Year share card
Fills a known gap: Year hero has no share button (Day + Month do). Capture hero + year strip (#1) + attribution footer → PNG, caption deep-link `?y=YYYY`.
- Stripes' viral history is the argument: a minimal year graphic is the most-shared climate visual ever made ([reading.ac.uk](https://www.reading.ac.uk/planet/climate-resources/climate-stripes))

## Recommended Phase C scope
**#1 + #2 + #4 + #5** form a coherent "Year in detail" mirroring Month Phase A/B2, near-all code reuse. **#10** rides free once #1 exists. **#3** is a cheap standalone. **#6/#7** are distinctive share-worthy visuals with more design risk.

## Verification notes
- 1 claim refuted (3-0): a specific "17-color Hawkins palette (#67000D…#08306B, domainMid 0)" detail — do not cite exact palette specs from that source.
- 2 Recharts claims verified 2-0 (third vote lost to a session limit, not a refutation).
- Sources rated: 13 primary, 2 secondary, 4 blog, 2 unreliable (NYT paywall + uxdesign.cc yielded no verifiable claims and contributed nothing above).
