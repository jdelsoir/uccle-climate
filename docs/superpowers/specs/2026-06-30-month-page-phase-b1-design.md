# Month Page — Phase B1: "How this month is changing" — design

**Date:** 2026-06-30
**Status:** approved (brainstorm) → ready for implementation plan
**Scope:** Phase B1 only (app-side climate-signal). Phase B2 ("Highs, lows & counts" — mean-high/low split + monthly counters vs normal, both needing pipeline data additions) is a separate later spec.

## Problem

The Month view tells the within-month story (Phase A) and shows a per-year scatter, but it does not quantify or visualize **how the month is changing across the record**. The "warming" is implicit in the scatter dots; there is no stated rate, no fitted line, and the then-vs-now strip uses fixed windows (1833–1900 vs 1996–2025) that don't track the viewed year the way the Day view's then-vs-now does.

## Goal

For the viewed month, surface the long-term climate signal:
- a **per-month warming rate** (full-record °/decade) as a headline stat;
- an **OLS trend line** on the existing scatter that fits whatever period is shown;
- **then-vs-now parity** with the Day view — viewed-year-relative comparison windows instead of fixed ones.

All computed app-side from data already loaded (`month/MM.json` `series`). No pipeline change.

## Non-goals (B1)

- Mean-high / mean-low split in the hero (Phase B2 — needs monthly mean tmax/tmin in the pipeline).
- Monthly counters vs normal (Phase B2 — needs pipeline normal counts).
- A second (last-30-year) warming rate. Decided: a single full-record rate only.
- Trend line on the Day or Year scatter (the new `trendKey` prop is opt-in; only Month uses it in B1).
- Labelling the trend line's own slope on the chart (the headline °/decade lives in the StatCard; the line is purely visual).

## Existing code touched

- `src/components/PeriodScatter.tsx` — shared scatter (`ComposedChart`), consumed by `MonthView` (single `mean` series), `DayView` (two series: `tmax`+`tmin`), `YearView` (single `mean` series). Has a period `<select>` (`PERIODS`: All time / 2001–Now / 1951–2000 / 1901–1950 / 1833–1900). Filters `data` to `shown` by year. A trend line must be **opt-in** so Day's two-series chart is unaffected.
- `src/tabs/today/MonthView.tsx` — renders the 2×2 StatCard grid, the `WarmingStrip` (currently from `data.thenNow`), and `PeriodScatter` (`title="Every {name} mean"`, `series=[{key:'mean',…}]`).
- `src/lib/monthDetail.ts` — month-series-derived helpers (Phase A).
- `MonthData.series` = `{ year, mean, complete }[]` (no tmax/tmin — that's B2).
- `WarmingStrip` props: `{ label, then:{mean,from,to}, recent:{mean,from,to}, delta }`.
- Day's relative windows (reference): recent `[Y-11, Y-1]`, then `[Y-111, Y-101]`, via `dayStats.decadeMean`, hidden when either window empty.

## Design

### 1. `src/lib/trend.ts` (new)

Pure, dependency-free linear regression — the JS analogue of the pipeline's `ols_slope_per_decade`.

```ts
export interface Line { slope: number; intercept: number }   // y = slope*x + intercept (x = year)

export function linregress(points: { x: number; y: number }[]): Line | null {
  const n = points.length
  if (n < 2) return null
  let sx = 0, sy = 0, sxx = 0, sxy = 0
  for (const { x, y } of points) { sx += x; sy += y; sxx += x * x; sxy += x * y }
  const denom = n * sxx - sx * sx
  if (denom === 0) return null
  const slope = (n * sxy - sx * sy) / denom
  return { slope, intercept: (sy - slope * sx) / n }
}

export const perDecade = (slope: number): number => slope * 10
```

- `linregress` returns `null` for <2 points or a degenerate (all-same-x) set.
- `perDecade` converts the per-year slope to °/decade (matches the pipeline convention `slope * 10`).

### 2. Warming-rate StatCard (`MonthView`)

- `const completePts = complete.map(s => ({ x: s.year, y: s.mean }))` (where `complete = data.series.filter(s => s.complete)`, already computed).
- `const fit = linregress(completePts)`.
- `const ratePerDecade = fit ? Math.round(perDecade(fit.slope) * 100) / 100 : null`.
- `const firstComplete = complete.length ? Math.min(...complete.map(s => s.year)) : null`.
- Render in the StatCard grid (after the existing four; grid `grid-cols-1 sm:grid-cols-2` reflows to 2+2+1):
  ```tsx
  {ratePerDecade != null && (
    <StatCard label="Warming"
      value={`${ratePerDecade > 0 ? '+' : ''}${ratePerDecade.toFixed(2)} °C/decade`}
      sub={firstComplete != null ? `since ${firstComplete}` : 'full record'}
      valueClass={ratePerDecade > 0 ? 'text-warm' : ratePerDecade < 0 ? 'text-accent' : 'text-fg'} />
  )}
  ```
- Hidden when `<2` complete years (`fit` null).

### 3. Trend line on `PeriodScatter`

- Add optional prop: `trendKey?: string`.
- When `trendKey` is set, after computing `shown`:
  ```ts
  let withTrend = shown
  if (trendKey) {
    const pts = shown
      .filter(d => typeof d[trendKey] === 'number')
      .map(d => ({ x: d.year, y: d[trendKey] as number }))
    const fit = linregress(pts)
    if (fit) withTrend = shown.map(d => ({ ...d, __trend: fit.intercept + fit.slope * d.year }))
  }
  ```
  Render `withTrend` as the chart data. Add the line **after** the `<Scatter>`s:
  ```tsx
  {trendKey && withTrend.some(d => '__trend' in d) && (
    <Line type="linear" dataKey="__trend" name="trend · shown period"
      stroke="var(--muted)" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
  )}
  ```
- Import `Line` from recharts (already importing from recharts). Re-fits automatically when the period `<select>` changes `shown`.
- `MonthView` passes `trendKey="mean"`. `DayView`/`YearView` omit it → unchanged (no line).
- The trend line slope reflects the **shown** period and may differ from the full-record StatCard — intended (sub-period eras read their own slope).

### 4. Then-vs-now parity (`MonthView`)

- Add to `src/lib/monthDetail.ts`:
  ```ts
  export function windowMean(series: { year: number; mean: number; complete: boolean }[], from: number, to: number): number | null {
    const vals = series.filter(s => s.complete && s.year >= from && s.year <= to).map(s => s.mean)
    if (!vals.length) return null
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
  }
  ```
- In `MonthView`, replace the `data.thenNow`-based strip with viewed-year-relative windows:
  ```ts
  const recentFrom = year - 11, recentTo = year - 1, thenFrom = year - 111, thenTo = year - 101
  const recentMean = windowMean(data.series, recentFrom, recentTo)
  const thenMean = windowMean(data.series, thenFrom, thenTo)
  ```
  Render `WarmingStrip` only when both are non-null:
  ```tsx
  {thenMean != null && recentMean != null && (
    <WarmingStrip label={`A warming ${name}`}
      then={{ mean: thenMean, from: thenFrom, to: thenTo }}
      recent={{ mean: recentMean, from: recentFrom, to: recentTo }}
      delta={Math.round((recentMean - thenMean) * 10) / 10} />
  )}
  ```
- This matches the Day view's window math exactly (`[Y-11,Y-1]` vs `[Y-111,Y-101]`, hidden when either empty). `data.thenNow` (pipeline `month_data`) is no longer consumed by the app — left emitted (harmless); noted as a future cleanup.

## Edge cases

- **<2 complete years** for the month (only the current partial year, or a near-empty month): warming StatCard hidden (`fit` null); trend line absent (linregress null). Scatter still renders the dots.
- **Recent/then window empty** (e.g. viewing 1850 → no `[1739,1749]` data, or current year → `[year-11,year-1]` may be sparse but usually present): WarmingStrip hidden, matching Day.
- **Degenerate regression** (all points same year — impossible here since years are distinct): `linregress` denom guard returns null.
- **Incomplete current year** already excluded from `complete`, so it never skews the fit or the trend line (the scatter already plots `complete` only via `data={complete.map(...)}`).
- **Provisional data** is irrelevant here — B1 works off consolidated yearly monthly means.

## Testing

**vitest:**
- `lib/trend.ts`: `linregress` recovers a known slope/intercept (e.g. points on `y = 2x + 1`); returns `null` for 0/1 points; `perDecade` multiplies by 10. A real-ish warming fixture → expected °/decade.
- `PeriodScatter`: with `trendKey="mean"` a trend line renders (assert a path/line element or the `__trend`-bearing data); without `trendKey` no trend line; line re-fits when the period changes (optional — assert presence is sufficient).
- `MonthView`: warming StatCard shows the signed °/decade with `since {year}` sub for a multi-year fixture; hidden for a single-complete-year fixture; then-now WarmingStrip uses viewed-year-relative windows (assert the rendered window years e.g. for `year=2026` → recent `2015–2025`, then `1915–1925`) and is hidden when the then window has no data.
- Conventions: mock Recharts `ResponsiveContainer`; `fireEvent` (not userEvent); `afterEach(vi.unstubAllGlobals())`; derive fixtures without coupling to the real current date where possible (the relative-window test may pass an explicit `year`).

## Conventions / constraints

- **No PII**; tokens not hex (trend line uses `var(--muted)`); square corners on UI; decorative chart marks `aria-hidden`/`role="img"` as already done in `PeriodScatter`.
- **No new dependencies** (recharts `Line` is already part of the recharts package).
- `tempColor` stays the single source of truth for warm/cool (unchanged; B1 adds no color classification).
- **Commit messages** end with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

## CI / deploy impact

None beyond the standard frontend build. No pipeline/data change, so no new files, no `refresh.yml`/`build_data` impact. Standard workflow: tests → commit → push → CI deploy → live-validate.
