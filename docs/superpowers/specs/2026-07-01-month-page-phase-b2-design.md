# Month Page — Phase B2: "Highs, lows & counts" — design

**Date:** 2026-07-01
**Status:** approved (brainstorm) → ready for implementation plan
**Scope:** Phase B2 — the final parked Month-tab items. Requires small pipeline data additions (the reason it was deferred from B1's app-side-only work). No further Month phases planned after this.

## Problem

Two gaps remain on the Month tab:
1. The hero shows a single monthly **mean** (avg of daily tmean) — it doesn't reveal the month's typical **daytime high** vs **overnight low**.
2. There are no **tangible day counts** (summer days, hot days, tropical nights, frost, ice) for the month, nor how they compare to the 1991–2020 normal.

Both need data the pipeline doesn't currently emit: `month/MM.json` `series` carries only `{year, mean, complete}`, and there are no per-month normal counts.

## Goal

- **Mean high / mean low split** in the hero — decompose the mean into avg daily high and avg daily low.
- **Monthly counters vs normal** — for the viewed month, count summer/hot/tropical/frost/ice days and compare each to its month-of-year normal, showing only the counters relevant to that month.

## Non-goals

- No new threshold definitions — reuse the exact thresholds from `derive.threshold_counters` (SU tmax≥25, hot30 tmax≥30, TR tmin≥20, FD tmin<0, ID tmax<0).
- No normal high/low in the split (the hero's existing delta already frames the mean vs its normal; YAGNI on normal-high/low).
- No annual/Climate-tab changes — the existing `summary.counters` (annual) are untouched.
- No new emoji/fonts — lucide-react icons only.

## Existing code touched

- `scripts/uccle/derive.py`: `monthly_means(recs)` (averages only `tmean`); `month_data(recs, ...)` (emits `series` of `{year, mean, complete}`, plus `normal`/`thenNow`/records); `threshold_counters(recs)` (annual, defines the 5 thresholds via `_per_year`); `_per_year(recs)` groups records by year.
- `src/types.ts`: `MonthData` (interface at line 26) + its `series` item shape.
- `src/tabs/today/MonthView.tsx`: hero (`BigTemp` renders `cur.mean`, ~line 105); the 2×2 StatCard grid; the `useDaily(year)` + `monthDays(daily.data, mm)` already present from Phase A.
- `src/lib/monthDetail.ts`: month-series helpers (Phase A/B1); add `monthCounters`.
- Icon precedent: `src/tabs/Climate.tsx` imports `Sun, MoonStar, Snowflake, Flame` from `lucide-react`.

## Design

### 1. Pipeline — mean high/low (`derive.py`)

`monthly_means(recs)` currently averages `tmean`. Extend each entry to also average `tmax` and `tmin`:

```python
def monthly_means(recs):
    by = defaultdict(list)
    for r in recs:
        by[(r["date"].year, r["date"].month)].append(r)   # keep full records, not just tmean
    out = {}
    for (y, m), rs in by.items():
        dim = calendar.monthrange(y, m)[1]
        n = len(rs)
        out[(y, m)] = {
            "mean": round(sum(r["tmean"] for r in rs) / n, 2),
            "meanMax": round(sum(r["tmax"] for r in rs) / n, 2),
            "meanMin": round(sum(r["tmin"] for r in rs) / n, 2),
            "n": n,
            "complete": n >= dim - 3,
        }
    return out
```

In `month_data`, carry the split into each series entry:

```python
series = [{"year": y, "mean": info["mean"], "meanMax": info["meanMax"], "meanMin": info["meanMin"], "complete": info["complete"]} for y, info in entries]
```

(`recordWarm`/`recordCold`/`normal`/`thenNow` are unchanged — they still key off `info["mean"]`.)

### 2. Pipeline — monthly counter normals (`derive.py`)

New helper computing, for each month, the mean per-year count of each threshold over **complete** baseline years:

```python
def monthly_counter_normals(recs, baseline=(1991, 2020)):
    # group by (year, month), keep only complete month-years inside the baseline
    by = defaultdict(list)
    for r in recs:
        by[(r["date"].year, r["date"].month)].append(r)
    per_month = {m: {"SU": [], "hot30": [], "TR": [], "FD": [], "ID": []} for m in range(1, 13)}
    for (y, m), rs in by.items():
        if not (baseline[0] <= y <= baseline[1]):
            continue
        dim = calendar.monthrange(y, m)[1]
        if len(rs) < dim - 3:                 # same completeness gate as monthly_means
            continue
        per_month[m]["SU"].append(sum(1 for r in rs if r["tmax"] >= 25))
        per_month[m]["hot30"].append(sum(1 for r in rs if r["tmax"] >= 30))
        per_month[m]["TR"].append(sum(1 for r in rs if r["tmin"] >= 20))
        per_month[m]["FD"].append(sum(1 for r in rs if r["tmin"] < 0))
        per_month[m]["ID"].append(sum(1 for r in rs if r["tmax"] < 0))
    out = {}
    for m in range(1, 13):
        counts = per_month[m]
        out[f"{m:02d}"] = ({k: round(sum(v) / len(v), 1) for k, v in counts.items()}
                           if counts["SU"] else None)   # None if no complete baseline year
    return out
```

Wire into `month_data`: compute `normals = monthly_counter_normals(recs, baseline)` once, then add `"counterNormals": normals[f"{m:02d}"]` to each month's payload.

### 3. Types (`src/types.ts`)

```ts
export interface MonthData {
  mm: string
  series: { year: number; mean: number; meanMax?: number; meanMin?: number; complete: boolean }[]
  recordWarm: { year: number; v: number } | null
  recordCold: { year: number; v: number } | null
  normal: number | null
  counterNormals: { SU: number; hot30: number; TR: number; FD: number; ID: number } | null
  thenNow: { early: { from: number; to: number; mean: number | null }; recent: { from: number; to: number; mean: number | null } }
}
```

`meanMax`/`meanMin` are optional (`?`) so the type tolerates any stale cached JSON; `counterNormals` is `| null`.

### 4. Mean high/low split — hero subline (`MonthView`)

Under the `BigTemp` mean (inside the `cur` block, after the delta line `dl`), render a subline from `cur.meanMax`/`cur.meanMin`:

```tsx
{cur.meanMax != null && cur.meanMin != null && (
  <p className="mt-1 flex items-center gap-2 text-sm text-muted">
    <span className="inline-flex items-center gap-0.5"><ArrowUp size={13} aria-hidden /> avg high {cur.meanMax.toFixed(1)}°</span>
    <span aria-hidden>·</span>
    <span className="inline-flex items-center gap-0.5"><ArrowDown size={13} aria-hidden /> avg low {cur.meanMin.toFixed(1)}°</span>
  </p>
)}
```

- `ArrowUp`/`ArrowDown` from `lucide-react`, `aria-hidden`. Hidden when either value is absent (stale JSON). Lives inside `#month-capture` → appears in the share PNG.

### 5. Counters — `monthCounters` helper + `MonthCounters` component

**`src/lib/monthDetail.ts` — `monthCounters`:**

```ts
export function monthCounters(days: DailyPoint[]): { SU: number; hot30: number; TR: number; FD: number; ID: number } {
  let SU = 0, hot30 = 0, TR = 0, FD = 0, ID = 0
  for (const d of days) {
    if (d.tmax >= 25) SU++
    if (d.tmax >= 30) hot30++
    if (d.tmin >= 20) TR++
    if (d.tmin < 0) FD++
    if (d.tmax < 0) ID++
  }
  return { SU, hot30, TR, FD, ID }
}
```

(Called with `monthDays(daily.data, mm)` — the days already filtered to the viewed month.)

**`src/components/MonthCounters.tsx`** — the "This {name} by the numbers" card:

- Props: `{ name: string; counts: {SU;hot30;TR;FD;ID}; normals: {SU;hot30;TR;FD;ID} | null; soFar: boolean }`.
- A fixed ordered metadata list (warm → cold):
  ```
  [ { key:'SU',    label:'summer days',    Icon: Sun },
    { key:'hot30', label:'hot days',       Icon: Flame },
    { key:'TR',    label:'tropical nights',Icon: MoonStar },
    { key:'FD',    label:'frost days',     Icon: Snowflake },
    { key:'ID',    label:'ice days',       Icon: ThermometerSnowflake } ]
  ```
- **Relevant filter:** show row `k` when `(normals?.[k] ?? 0) >= 0.5 || counts[k] > 0`.
- If no row qualifies → the component returns `null` (card hidden).
- Header: `This {name} by the numbers`, or `This {name} so far` when `soFar` (incomplete current month).
- Each row (square card, `<ul>` `divide-y divide-border`): `Icon` (`aria-hidden`) · bold count · label · right-aligned muted `normal {normals[k].toFixed(1)}` (omitted when `normals` is `null`).
- Tokens/square corners; accessible: the row text conveys the numbers (icons decorative).

**`MonthView` wiring:** compute `const counts = monthCounters(mDays)` (reusing the existing `mDays = monthDays(daily.data, mm)`), and render after the 2×2 StatCard grid, before `WarmingStrip`:

```tsx
{daily.data && (
  <MonthCounters name={name} counts={counts} normals={data.counterNormals} soFar={!complete_} />
)}
```

(`MonthCounters` itself returns `null` if nothing qualifies, so the `daily.data` guard just avoids computing over an empty set.)

### 6. Page order (unchanged except one insert)

hero (+split) → summary → heatmap (capture) → share → RangeBar → NotableDays → 2×2 StatCards → **MonthCounters (new)** → WarmingStrip → scatter.

## Edge cases

- **Partial current month:** counts are "so far" over elapsed days; normals stay full-month. Header switches to "so far" so the comparison isn't read as full-vs-full. Counters still render (informative). The live-today datum is **not** added to counts (counts come from consolidated `daily/YYYY.json` days only; today's single day barely moves a count and avoids provisional noise).
- **No daily data for the year** (`daily.data` null / 404): counters card not rendered; hero split still shows (it comes from `month/MM.json`, not daily).
- **`counterNormals` null** (no complete baseline year for that month — shouldn't happen with real data, 1991–2020 is complete): rows show counts without the "normal N" tail; relevant filter falls back to `count > 0` only.
- **Stale cached `month/MM.json`** without `meanMax`/`meanMin`/`counterNormals`: split hidden; `counterNormals` undefined → treated as null. NetworkFirst refresh replaces it on next load.
- **meanMax/meanMin vs mean consistency:** all three are independent averages over the same days; `meanMin ≤ mean ≤ meanMax` holds by construction (tmean = (tmax+tmin)/2 per day).

## Testing

**pytest (`scripts/uccle/tests/`):**
- `monthly_means`: entry includes `meanMax`/`meanMin` = averages of tmax/tmin (known fixture, e.g. days of tmax 30/tmin 10 → meanMax 30, meanMin 10, mean 20); `complete` gate unchanged.
- `month_data`: series entries carry `meanMax`/`meanMin`; payload has `counterNormals`.
- `monthly_counter_normals`: averages per-year threshold counts over complete baseline years only (fixture with 2 complete June years having 4 and 6 summer days → SU normal 5.0); excludes incomplete/out-of-baseline years; `None` when no complete baseline year.

**vitest:**
- `monthCounters`: correct counts for a fixture of days spanning thresholds (a 30° day counts SU+hot30; a −1° tmin counts FD; etc.).
- `MonthCounters`: renders only relevant rows (`normal≥0.5 || count>0`) — a summer fixture hides frost/ice; a freak count>0 surfaces its row; `null` when nothing qualifies; "so far" header when `soFar`; omits "normal N" when `normals` null.
- `MonthView`: hero split renders `avg high`/`avg low` from `meanMax`/`meanMin` and is hidden when absent; the counters card appears after the stat grid when daily data + a relevant counter exist.
- Conventions: mock Recharts `ResponsiveContainer`; `fireEvent`; `afterEach(vi.unstubAllGlobals())`; derive fixtures from `todayMMDD()` where date-coupled.

## Conventions / constraints

- **No PII**; **tokens not hex**; **square corners** (no `rounded-*`); decorative icons/marks `aria-hidden`; every value legible as text.
- **lucide-react icons** only (no emoji, no external fonts) — `Sun, Flame, MoonStar, Snowflake, ArrowUp, ArrowDown` and `ThermometerSnowflake` (verify the last is exported by the installed lucide-react; fall back to `Snowflake` if not).
- **No new dependencies.** Pipeline **stdlib-only**; `public/data` git-ignored / CI-generated.
- Thresholds identical to `threshold_counters` (single source of the definitions).
- **Commit messages** end with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

## CI / deploy impact

Pipeline emits slightly larger `month/MM.json` (per-year `meanMax`/`meanMin` + a small `counterNormals` block) — still tiny, git-ignored, regenerated by `build_data`/`refresh.yml`. No workflow change. Standard flow: tests → commit → push → CI deploy → live-validate.
