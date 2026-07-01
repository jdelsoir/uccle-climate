# Month Page — Phase B2 "Highs, lows & counts" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mean-high/mean-low split to the Month hero and a "This {month} by the numbers" counters card (summer/hot/tropical/frost/ice days vs the 1991–2020 normal), backed by two small pipeline data additions.

**Architecture:** `derive.monthly_means` also averages tmax/tmin (→ `meanMax`/`meanMin` per month-year in `month_data.series`); a new `derive.monthly_counter_normals` emits per-month baseline threshold-day averages (`month_data.counterNormals`). App-side: the hero reads `meanMax`/`meanMin`; a new `monthCounters` helper counts the viewed month's days from the Phase-A `daily/YYYY.json`, and a new `MonthCounters` component compares counts to normals, showing only in-season/occurred counters.

**Tech Stack:** Python 3.11 stdlib (pipeline), React 18 + TypeScript + Vite, lucide-react icons, Vitest + pytest.

## Global Constraints

- **No PII**; **tokens not hex** (`text-warm`/`text-muted`/`bg-surface`/`border-border`/`divide-border`); **square corners** (no `rounded-*`); decorative icons/marks `aria-hidden`; every value legible as text.
- **lucide-react icons only** (no emoji, no external fonts). `Sun, Flame, MoonStar, Snowflake` are already used in `Climate.tsx`; add `ArrowUp, ArrowDown`, and `ThermometerSnowflake` (verify `ThermometerSnowflake` is exported by the installed lucide-react; if not, fall back to `Snowflake` for ice days).
- **No new dependencies.** Pipeline **stdlib-only**. `public/data` is git-ignored / CI-generated.
- **Thresholds** identical to `derive.threshold_counters`: SU `tmax>=25`, hot30 `tmax>=30`, TR `tmin>=20`, FD `tmin<0`, ID `tmax<0`.
- **Completeness gate** for baseline months: `len(days) >= days_in_month - 3` (same as `monthly_means`).
- **Tests:** mock Recharts `ResponsiveContainer`; `fireEvent` (NOT `userEvent`); `fetch`-stubbing tests add `afterEach(() => vi.unstubAllGlobals())`; pytest helpers `day(y,m,d,tmax,tmin)`, `month_recs(y,m,n,tmean)` (produces `tmax=tmean+5, tmin=tmean-5`), `recs_for` live in `scripts/uccle/tests/test_derive.py`.
- **Commit messages** end with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: Pipeline — monthly mean high/low

**Files:**
- Modify: `scripts/uccle/derive.py` (`monthly_means` ~line 181; `month_data` series build ~line 199)
- Test: `scripts/uccle/tests/test_derive.py` (update 2 existing assertions)

**Interfaces:**
- Produces: `monthly_means(recs)` entries gain `"meanMax"` and `"meanMin"` (2dp) alongside `mean`/`n`/`complete`; `month_data(...)` `series` entries gain `"meanMax"`/`"meanMin"`.

- [ ] **Step 1: Update the failing assertions**

In `scripts/uccle/tests/test_derive.py`, update the exact-equality assertions that adding keys will break.

`test_monthly_means_and_completeness` (currently `mm[(2000, 6)] == {"mean": 18.0, "n": 30, "complete": True}`):

```python
    assert mm[(2000, 6)] == {"mean": 18.0, "meanMax": 23.0, "meanMin": 13.0, "n": 30, "complete": True}
```

(`month_recs(2000,6,30,18.0)` → tmax 23.0, tmin 13.0.)

`test_month_data_records_normal_thennow` (currently `{"year": 2020, "mean": 20.0, "complete": True} in june["series"]`):

```python
    assert {"year": 2020, "mean": 20.0, "meanMax": 25.0, "meanMin": 15.0, "complete": True} in june["series"]
```

(`month_recs(2020,6,30,20.0)` → tmax 25.0, tmin 15.0.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `python3 -m pytest scripts/uccle/tests/test_derive.py -k "monthly_means_and_completeness or records_normal_thennow" -q`
Expected: FAIL — actual dicts lack `meanMax`/`meanMin`.

- [ ] **Step 3: Implement**

In `scripts/uccle/derive.py`, replace `monthly_means`:

```python
def monthly_means(recs):
    by = defaultdict(list)
    for r in recs:
        by[(r["date"].year, r["date"].month)].append(r)
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

In `month_data`, update the `series` comprehension (currently `{"year": y, "mean": info["mean"], "complete": info["complete"]}`):

```python
        series = [{"year": y, "mean": info["mean"], "meanMax": info["meanMax"], "meanMin": info["meanMin"], "complete": info["complete"]} for y, info in entries]
```

(`recordWarm`/`recordCold`/`normal`/`thenNow` still read `info["mean"]` / the `complete` tuples — unchanged.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `python3 -m pytest scripts/uccle/tests/test_derive.py -q`
Expected: PASS (all derive tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/uccle/derive.py scripts/uccle/tests/test_derive.py
git commit -m "feat(pipeline): monthly_means + month_data series carry meanMax/meanMin

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Pipeline — monthly counter normals

**Files:**
- Modify: `scripts/uccle/derive.py` (add `monthly_counter_normals`; wire into `month_data`)
- Test: `scripts/uccle/tests/test_derive.py`

**Interfaces:**
- Consumes: nothing new.
- Produces: `monthly_counter_normals(recs, baseline=(1991,2020)) -> {"01".."12": {"SU","hot30","TR","FD","ID"} | None}` — per-month mean per-year threshold-day count over **complete** baseline years (1dp), `None` when no complete baseline year. `month_data(...)` each month payload gains `"counterNormals"` = the matching entry.

- [ ] **Step 1: Write the failing tests**

Add to `scripts/uccle/tests/test_derive.py` (import `monthly_counter_normals` — add it to the existing `from scripts.uccle.derive import ...` line):

```python
def test_monthly_counter_normals_averages_complete_baseline_years():
    # 1991: 4 summer days (tmax>=25); 1992: 6 summer days → SU normal 5.0
    y1 = month_recs(1991, 6, 30, 10.0)          # base tmax 15 (<25), tmin 5
    for r in y1[:4]:
        r["tmax"] = 26.0
    y2 = month_recs(1992, 6, 30, 10.0)
    for r in y2[:6]:
        r["tmax"] = 26.0
    partial = month_recs(1993, 6, 20, 30.0)     # incomplete (20 < 27) → excluded
    outside = month_recs(2050, 6, 30, 30.0)     # out of baseline → excluded
    normals = monthly_counter_normals(y1 + y2 + partial + outside, baseline=(1991, 2020))
    assert normals["06"]["SU"] == 5.0
    assert normals["06"]["FD"] == 0.0           # tmin 5 → never <0
    assert normals["06"]["hot30"] == 0.0        # tmax 26 < 30

def test_monthly_counter_normals_none_when_no_complete_baseline_year():
    normals = monthly_counter_normals(month_recs(2050, 6, 30, 20.0), baseline=(1991, 2020))
    assert normals["06"] is None

def test_month_data_includes_counter_normals():
    from scripts.uccle.derive import month_data
    md = month_data(month_recs(2000, 6, 30, 26.0), baseline=(1991, 2020))   # tmax 31 → SU & hot30 all 30 days
    # 2000 is in baseline and complete → June counterNormals present
    assert md["06"]["counterNormals"]["SU"] == 30.0
    assert md["06"]["counterNormals"]["hot30"] == 30.0
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python3 -m pytest scripts/uccle/tests/test_derive.py -k "counter_normals" -q`
Expected: FAIL — `monthly_counter_normals` not defined / `counterNormals` missing.

- [ ] **Step 3: Implement**

Add to `scripts/uccle/derive.py` (near `month_data`):

```python
def monthly_counter_normals(recs, baseline=(1991, 2020)):
    by = defaultdict(list)
    for r in recs:
        by[(r["date"].year, r["date"].month)].append(r)
    per_month = {m: {"SU": [], "hot30": [], "TR": [], "FD": [], "ID": []} for m in range(1, 13)}
    for (y, m), rs in by.items():
        if not (baseline[0] <= y <= baseline[1]):
            continue
        dim = calendar.monthrange(y, m)[1]
        if len(rs) < dim - 3:
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
                           if counts["SU"] else None)
    return out
```

Wire into `month_data` — compute once before the month loop and attach per month. Immediately after `mm = monthly_means(recs)` add:

```python
    counter_normals = monthly_counter_normals(recs, baseline)
```

and add to the per-month `out[f"{m:02d}"]` dict a new key:

```python
            "counterNormals": counter_normals[f"{m:02d}"],
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python3 -m pytest scripts/uccle/tests/test_derive.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/uccle/derive.py scripts/uccle/tests/test_derive.py
git commit -m "feat(pipeline): monthly_counter_normals + month_data counterNormals

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Types — `MonthData` split + counterNormals

**Files:**
- Modify: `src/types.ts` (`MonthData` interface, ~line 26)

**Interfaces:**
- Produces: `MonthData.series` items gain `meanMax?: number; meanMin?: number`; `MonthData` gains `counterNormals: { SU; hot30; TR; FD; ID } | null`.

- [ ] **Step 1: Update the interface**

Replace the `MonthData` interface in `src/types.ts` with:

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

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no NEW app-code errors (repo has pre-existing test-global tsc noise + 1 pre-existing DayView error). `MonthView.tsx` still type-checks (it reads `data.series`/`normal`/`recordWarm` etc., all still present; the new fields are additive).

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat(types): MonthData — meanMax/meanMin series fields + counterNormals

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: `lib/monthDetail.ts` — `monthCounters`

**Files:**
- Modify: `src/lib/monthDetail.ts` (append)
- Test: `src/lib/monthDetail.test.ts` (append)

**Interfaces:**
- Consumes: `DailyPoint` (`src/types.ts`).
- Produces: `monthCounters(days: DailyPoint[]): { SU: number; hot30: number; TR: number; FD: number; ID: number }` — integer counts over the given days.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/monthDetail.test.ts` (add `monthCounters` to the existing import from `./monthDetail`):

```ts
describe('monthCounters', () => {
  const d = (mmdd: string, tmax: number, tmin: number): DailyPoint => ({ mmdd, tmax, tmin })
  it('counts each threshold over the days', () => {
    const days = [
      d('0601', 31, 21),   // SU, hot30, TR
      d('0602', 26, 12),   // SU
      d('0603', 20, -1),   // FD
      d('0604', -2, -5),   // FD, ID
    ]
    expect(monthCounters(days)).toEqual({ SU: 2, hot30: 1, TR: 1, FD: 2, ID: 1 })
  })
  it('returns all-zero for no qualifying days', () => {
    expect(monthCounters([d('0610', 18, 8)])).toEqual({ SU: 0, hot30: 0, TR: 0, FD: 0, ID: 0 })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/monthDetail.test.ts`
Expected: FAIL — `monthCounters` not exported.

- [ ] **Step 3: Implement**

Append to `src/lib/monthDetail.ts`:

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

(`DailyPoint` is already imported at the top of `monthDetail.ts`.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/monthDetail.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/monthDetail.ts src/lib/monthDetail.test.ts
git commit -m "feat(lib): monthDetail — monthCounters threshold-day counts

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: `MonthCounters` component

**Files:**
- Create: `src/components/MonthCounters.tsx`
- Test: `src/components/MonthCounters.test.tsx`

**Interfaces:**
- Consumes: lucide-react icons.
- Produces: `MonthCounters` default export with props
  `{ name: string; counts: {SU;hot30;TR;FD;ID}; normals: {SU;hot30;TR;FD;ID} | null; soFar: boolean }`.
  Renders a card with one row per **relevant** counter (`(normals?.[k] ?? 0) >= 0.5 || counts[k] > 0`); returns `null` when no row qualifies.

- [ ] **Step 1: Write the failing tests**

Create `src/components/MonthCounters.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MonthCounters from './MonthCounters'

const normals = { SU: 7, hot30: 1, TR: 0.4, FD: 0, ID: 0 }

it('shows only relevant counters (in-season or occurred) with the normal', () => {
  render(<MonthCounters name="June" counts={{ SU: 12, hot30: 2, TR: 1, FD: 0, ID: 0 }} normals={normals} soFar={false} />)
  expect(screen.getByText('This June by the numbers')).toBeInTheDocument()
  expect(screen.getByText('summer days')).toBeInTheDocument()
  expect(screen.getByText('tropical nights')).toBeInTheDocument()   // normal 0.4 >= ... no; but count 1 > 0 → shown
  expect(screen.queryByText('frost days')).not.toBeInTheDocument()  // normal 0, count 0 → hidden
  expect(screen.getByText(/normal 7/)).toBeInTheDocument()
})

it('surfaces an off-season counter when it actually occurred', () => {
  render(<MonthCounters name="June" counts={{ SU: 0, hot30: 0, TR: 0, FD: 2, ID: 0 }} normals={normals} soFar={false} />)
  expect(screen.getByText('frost days')).toBeInTheDocument()        // count 2 > 0 → shown despite normal 0
})

it('uses a "so far" header for an incomplete month', () => {
  render(<MonthCounters name="June" counts={{ SU: 3, hot30: 0, TR: 0, FD: 0, ID: 0 }} normals={normals} soFar={true} />)
  expect(screen.getByText('This June so far')).toBeInTheDocument()
})

it('omits the normal when normals is null', () => {
  render(<MonthCounters name="June" counts={{ SU: 3, hot30: 0, TR: 0, FD: 0, ID: 0 }} normals={null} soFar={false} />)
  expect(screen.getByText('summer days')).toBeInTheDocument()
  expect(screen.queryByText(/normal/)).not.toBeInTheDocument()
})

it('renders nothing when no counter qualifies', () => {
  const { container } = render(<MonthCounters name="June" counts={{ SU: 0, hot30: 0, TR: 0, FD: 0, ID: 0 }} normals={{ SU: 0, hot30: 0, TR: 0, FD: 0, ID: 0 }} soFar={false} />)
  expect(container).toBeEmptyDOMElement()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/MonthCounters.test.tsx`
Expected: FAIL — cannot resolve `./MonthCounters`.

- [ ] **Step 3: Implement**

Create `src/components/MonthCounters.tsx`:

```tsx
import { Sun, Flame, MoonStar, Snowflake, ThermometerSnowflake } from 'lucide-react'
import type { ComponentType } from 'react'

type Key = 'SU' | 'hot30' | 'TR' | 'FD' | 'ID'
type Counts = Record<Key, number>

const ROWS: { key: Key; label: string; Icon: ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }> }[] = [
  { key: 'SU', label: 'summer days', Icon: Sun },
  { key: 'hot30', label: 'hot days', Icon: Flame },
  { key: 'TR', label: 'tropical nights', Icon: MoonStar },
  { key: 'FD', label: 'frost days', Icon: Snowflake },
  { key: 'ID', label: 'ice days', Icon: ThermometerSnowflake },
]

export default function MonthCounters({ name, counts, normals, soFar }: {
  name: string; counts: Counts; normals: Counts | null; soFar: boolean
}) {
  const shown = ROWS.filter(r => (normals?.[r.key] ?? 0) >= 0.5 || counts[r.key] > 0)
  if (!shown.length) return null
  return (
    <div className="border border-border bg-surface p-5">
      <p className="mb-2 text-[11px] uppercase tracking-[0.09em] text-muted">This {name} {soFar ? 'so far' : 'by the numbers'}</p>
      <ul className="border-t border-border divide-y divide-border">
        {shown.map(({ key, label, Icon }) => (
          <li key={key} className="flex items-center gap-3 py-2.5">
            <Icon size={16} className="text-muted" aria-hidden />
            <span className="text-lg font-bold text-fg">{counts[key]}</span>
            <span className="flex-1 text-sm">{label}</span>
            {normals && <span className="text-xs text-muted">normal {normals[key].toFixed(1)}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

If `ThermometerSnowflake` is not exported by the installed lucide-react (the import errors at build/typecheck), replace it with `Snowflake` in both the import and the `ID` row.

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run src/components/MonthCounters.test.tsx`
Expected: PASS (5 tests).
Run: `npx tsc --noEmit`
Expected: no new app-code errors (confirms the icon imports resolve).

- [ ] **Step 5: Commit**

```bash
git add src/components/MonthCounters.tsx src/components/MonthCounters.test.tsx
git commit -m "feat(component): MonthCounters — in-season day counts vs normal

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: `MonthView` — hero split + counters card

**Files:**
- Modify: `src/tabs/today/MonthView.tsx`
- Test: `src/tabs/today/MonthView.test.tsx`

**Interfaces:**
- Consumes: `monthCounters` (Task 4), `MonthCounters` (Task 5), `ArrowUp`/`ArrowDown` (lucide-react), `MonthData.series` `meanMax`/`meanMin` + `data.counterNormals` (Tasks 1–3).
- Produces: no new exports.

- [ ] **Step 1: Write the failing test**

In `src/tabs/today/MonthView.test.tsx`, add a B2 test. It reuses the `stubFetch`/`month` fixture in the `describe('existing MonthView behaviour')` block. First extend that `month` fixture's 2026 series entry with `meanMax`/`meanMin` and add `counterNormals`, then add the test.

Update the `month` fixture (add split fields to the current-year entry and a `counterNormals` block):

```ts
  const month = {
    mm: '06', normal: 17.0,
    series: [{ year: 1920, mean: 15, complete: true }, { year: 2000, mean: 16, complete: true }, { year: 2020, mean: 21, complete: true }, { year: 2026, mean: 18.4, meanMax: 23.1, meanMin: 13.7, complete: true }],
    recordWarm: { year: 2020, v: 21 }, recordCold: { year: 2000, v: 16 },
    counterNormals: { SU: 7, hot30: 1, TR: 0.4, FD: 0, ID: 0 },
    thenNow: { early: { from: 1833, to: 1900, mean: 16.1 }, recent: { from: 1996, to: 2025, mean: 18.0 } },
  }
```

Add the test inside that block:

```tsx
  it('B2: shows the hero high/low split and the counters card', async () => {
    stubFetch({
      'month/06.json': month,
      'daynorm.json': { '1991-2020': [], '1961-1990': [] },
      'daily/2026.json': [
        { mmdd: '0601', tmax: 31, tmin: 21 },   // SU, hot30, TR
        { mmdd: '0602', tmax: 26, tmin: 12 },   // SU
      ],
    })
    render(<MonthView mm="06" year={2026} onPickDay={vi.fn()} onPickMonth={vi.fn()} />)
    // hero high/low split from meanMax/meanMin
    expect(await screen.findByText(/avg high 23\.1°/)).toBeInTheDocument()
    expect(screen.getByText(/avg low 13\.7°/)).toBeInTheDocument()
    // counters card: 2 summer days (normal 7), 1 hot day (normal 1)
    expect(screen.getByText('This June by the numbers')).toBeInTheDocument()
    expect(screen.getByText('summer days')).toBeInTheDocument()
    expect(screen.getByText(/normal 7/)).toBeInTheDocument()
    expect(screen.queryByText('frost days')).not.toBeInTheDocument()
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/tabs/today/MonthView.test.tsx`
Expected: FAIL — no "avg high" subline; no counters card.

- [ ] **Step 3: Implement the MonthView changes**

Edit `src/tabs/today/MonthView.tsx`:

(a) Add imports (merge `monthCounters` into the existing `monthDetail` import; add the component + icons):

```tsx
import { monthDays, dayMix, recordsBroken, topWarmest, topColdest, windowMean, monthCounters } from '../../lib/monthDetail'
import MonthCounters from '../../components/MonthCounters'
import { Share2, ArrowUp, ArrowDown } from 'lucide-react'
```

(The existing lucide import line is `import { Share2 } from 'lucide-react'` — replace it with the line above.)

(b) Compute counts next to the existing `mDays` derivations (after the `const summary = ...` line):

```tsx
  const counts = monthCounters(mDays)
```

(c) Add the hero high/low subline — immediately after the delta-line `{dl && <p className="mt-1 text-sm text-muted">{dl}</p>}` (inside the `cur ? (...)` fragment):

```tsx
                  {cur.meanMax != null && cur.meanMin != null && (
                    <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                      <span className="inline-flex items-center gap-0.5"><ArrowUp size={13} aria-hidden /> avg high {cur.meanMax.toFixed(1)}°</span>
                      <span aria-hidden>·</span>
                      <span className="inline-flex items-center gap-0.5"><ArrowDown size={13} aria-hidden /> avg low {cur.meanMin.toFixed(1)}°</span>
                    </p>
                  )}
```

(d) Add the counters card after the 2×2 StatCard grid's closing `</div>` and before the `WarmingStrip` block:

```tsx
      {daily.data && (
        <MonthCounters name={name} counts={counts} normals={data.counterNormals} soFar={!complete_} />
      )}
```

- [ ] **Step 4: Run the focused test + full suite + typecheck**

Run: `npx vitest run src/tabs/today/MonthView.test.tsx`
Expected: PASS (all MonthView tests, incl. the new B2 test).
Run: `npm test`
Expected: PASS (full vitest suite).
Run: `npx tsc --noEmit`
Expected: no new app-code errors.

- [ ] **Step 5: Commit**

```bash
git add src/tabs/today/MonthView.tsx src/tabs/today/MonthView.test.tsx
git commit -m "feat(month): hero mean high/low split + counters-vs-normal card

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Full verification + ship

**Files:** none (verification only)

- [ ] **Step 1: Full suites**

Run: `npm test`
Expected: PASS (all vitest).
Run: `python3 -m pytest scripts/uccle/tests/ -q`
Expected: PASS (all pytest).

- [ ] **Step 2: Prod build (CI parity)**

Run: `VITE_BASE=/uccle-climate/ npm run build`
Expected: builds, no type errors.

- [ ] **Step 3: Ship per the standing workflow**

Merge the branch to `main`, push (CI deploys — it regenerates data so `month/MM.json` gets the new fields), then validate on the live site: the Month hero shows the "avg high / avg low" subline, and the "This {month} by the numbers" card shows the in-season counters with their normals. Bundle hash matches a fresh build from `main` HEAD.

---

## Self-Review

**Spec coverage** (spec → task):
- `monthly_means` meanMax/meanMin + `month_data` series propagation → Task 1 ✓
- `monthly_counter_normals` + `month_data.counterNormals` → Task 2 ✓
- `MonthData` type (meanMax/meanMin optional, counterNormals `|null`) → Task 3 ✓
- `monthCounters` helper → Task 4 ✓
- `MonthCounters` component (relevant filter `normal≥0.5 || count>0`, `so far` header, `null` when empty, omit-normal-when-null) → Task 5 ✓
- Hero high/low subline (hidden when absent, inside `#month-capture`) → Task 6 ✓
- Counters card placement (after 2×2 grid, before WarmingStrip) → Task 6 ✓
- Thresholds identical to `threshold_counters` → Tasks 2 & 4 use the same comparisons ✓
- Conventions (tokens, lucide not emoji, no new deps, stdlib pipeline, square corners) → enforced per task + Global Constraints ✓
- Partial-month "so far", no-daily-data hide, counterNormals-null → Tasks 5/6 handle ✓

**Placeholder scan:** none — every code/test step has concrete content. The `ThermometerSnowflake` fallback is an explicit conditional instruction, not a TBD.

**Type consistency:** `Counts = Record<'SU'|'hot30'|'TR'|'FD'|'ID', number>` matches the pipeline keys and `monthCounters`' return shape and `MonthData.counterNormals`; `monthCounters(days: DailyPoint[])` signature matches the Task 6 call `monthCounters(mDays)`; `MonthCounters` props `{name, counts, normals, soFar}` match the Task 6 render; `meanMax`/`meanMin` optional in the type match the `cur.meanMax != null` guard in the hero; `data.counterNormals` (`|null`) matches `MonthCounters` `normals: Counts | null`.
