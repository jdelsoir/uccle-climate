# Month Page — Phase A "The month in detail" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Month view a within-month story — a clickable calendar heatmap, a day-mix + records summary line, a warmest/coldest notable-days list, and a hero+heatmap share — all driven by a new per-year daily data layer.

**Architecture:** A new pipeline file `public/data/daily/YYYY.json` carries per-day `{mmdd, tmax, tmin, provisional?, recHi?, recLo?}` with all-time daily-record flags (suppressed on provisional days). The Month view fetches the viewed year, filters to the month, and derives the day-mix / notable days app-side using the existing `tempColor` (single source of truth) + `useDayNorm` normals. Month-mode navigation becomes year-aware so any past month-year is reachable, and a `?m=YYYY-MM` deep link opens a specific month.

**Tech Stack:** Python 3.11 stdlib (pipeline), React 18 + TypeScript + Vite, Tailwind v4 tokens, react-router HashRouter, Recharts, `html-to-image`, Vitest, pytest.

## Global Constraints

- **No PII** anywhere — UI, data, or share cards (share = derived stats + "Uccle, Brussels" + app URL only).
- **No external fonts/CDNs** — system sans only.
- **Tokens, not hex** — `text-warm`/`text-accent`/`text-fg`/`bg-surface`/`bg-surface-2`/`border-border` + opacity modifiers (`bg-warm/15`); literal hex only in `lib/ramp.ts` + icon script.
- **Square corners** on Today UI — no `rounded-*`; decorative glyph/tint layers `aria-hidden`.
- **a11y** — single-select toggles use `role="radiogroup"`/`role="radio"`+`aria-checked`; every control has an accessible name; decorative marks `aria-hidden`.
- **`tempColor`** (`src/lib/dayStats.ts`) is the single source of truth for warm/cool: `d>2 → text-warm`, `d<-2 → text-accent`, else `text-fg`.
- **Tests:** mock Recharts `ResponsiveContainer`; `fetch`-stubbing tests add `afterEach(() => vi.unstubAllGlobals())`; derive mmdd from `todayMMDD()` (no date-coupled fixtures).
- **App URL:** `https://jdelsoir.github.io/uccle-climate/` (`APP_URL` in `src/lib/shareText.ts`).
- **Commit messages** end with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **Pipeline is stdlib-only** (no new Python deps). `public/data/` is git-ignored / CI-generated.

---

### Task 1: Pipeline — `daily_data(recs)`

**Files:**
- Modify: `scripts/uccle/derive.py` (add `daily_data` near `month_data`, ~line 217)
- Test: `scripts/uccle/tests/test_derive.py`

**Interfaces:**
- Consumes: `recs` = list of `{date: datetime.date, tmax: float, tmin: float, tmean: float, provisional?: bool}` (post-`merge_fills`), as produced by `daily_records` / `merge_fills`.
- Produces: `daily_data(recs) -> dict[str, list[dict]]` keyed by 4-digit year string; each value a date-sorted list of `{"mmdd": "MMDD", "tmax": float, "tmin": float, "provisional"?: True, "recHi"?: True, "recLo"?: True}`. `recHi`/`recLo` mark the all-time daily-record holder year for that `mmdd`, **suppressed when the day is provisional**.

- [ ] **Step 1: Write the failing tests**

Add to `scripts/uccle/tests/test_derive.py` (import `daily_data` in the existing top-of-file import from `scripts.uccle.derive`):

```python
def test_daily_data_groups_by_year_sorted():
    recs = [day(2019, 6, 2, 25, 12), day(2019, 6, 1, 30, 9), day(1990, 6, 1, 20, 5)]
    out = daily_data(recs)
    assert set(out.keys()) == {"1990", "2019"}
    assert [d["mmdd"] for d in out["2019"]] == ["0601", "0602"]   # date-sorted
    assert out["2019"][0] == {"mmdd": "0601", "tmax": 30, "tmin": 9, "recHi": True}

def test_daily_data_flags_record_holder_only():
    recs = [day(1990, 6, 1, 20, 5), day(2019, 6, 1, 30, 9)]
    out = daily_data(recs)
    y1990 = {d["mmdd"]: d for d in out["1990"]}
    y2019 = {d["mmdd"]: d for d in out["2019"]}
    assert y2019["0601"]["recHi"] is True        # 2019 holds the 06-01 high (30)
    assert "recLo" not in y2019["0601"]
    assert y1990["0601"]["recLo"] is True         # 1990 holds the 06-01 low (5)
    assert "recHi" not in y1990["0601"]

def test_daily_data_suppresses_record_flag_on_provisional():
    prov = day(2019, 6, 3, 40, 0); prov["provisional"] = True
    recs = [day(1990, 6, 3, 25, 5), prov]
    out = daily_data(recs)
    y2019 = {d["mmdd"]: d for d in out["2019"]}
    assert y2019["0603"]["provisional"] is True
    assert "recHi" not in y2019["0603"]   # would be the record (40) but provisional → suppressed
    assert "recLo" not in y2019["0603"]   # tmin 0 is lowest but provisional → suppressed
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python3 -m pytest scripts/uccle/tests/test_derive.py -k daily_data -q`
Expected: FAIL — `ImportError: cannot import name 'daily_data'` (or `NameError`).

- [ ] **Step 3: Implement `daily_data`**

Add to `scripts/uccle/derive.py`:

```python
def daily_data(recs):
    by_md = defaultdict(list)
    for r in recs:
        by_md[(r["date"].month, r["date"].day)].append(r)
    rec_hi, rec_lo = {}, {}
    for md, rs in by_md.items():
        rec_hi[md] = max(rs, key=lambda r: r["tmax"])["date"].year
        rec_lo[md] = min(rs, key=lambda r: r["tmin"])["date"].year
    by_year = defaultdict(list)
    for r in recs:
        by_year[r["date"].year].append(r)
    out = {}
    for y in sorted(by_year):
        arr = []
        for r in sorted(by_year[y], key=lambda r: r["date"]):
            md = (r["date"].month, r["date"].day)
            e = {"mmdd": f"{md[0]:02d}{md[1]:02d}", "tmax": r["tmax"], "tmin": r["tmin"]}
            if r.get("provisional"):
                e["provisional"] = True
            else:
                if rec_hi[md] == y:
                    e["recHi"] = True
                if rec_lo[md] == y:
                    e["recLo"] = True
            arr.append(e)
        out[f"{y:04d}"] = arr
    return out
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python3 -m pytest scripts/uccle/tests/test_derive.py -k daily_data -q`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/uccle/derive.py scripts/uccle/tests/test_derive.py
git commit -m "feat(pipeline): daily_data — per-year daily records with provisional-aware record flags

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Pipeline — emit `daily/YYYY.json`

**Files:**
- Modify: `scripts/uccle/build_data.py:134-136` (after the `month/` emission loop)
- Test: `scripts/uccle/tests/test_build.py`

**Interfaces:**
- Consumes: `derive.daily_data(recs)` (Task 1).
- Produces: one `daily/{YYYY}.json` file per year present in `recs`, each the array from `daily_data`.

- [ ] **Step 1: Write the failing test**

Add to `scripts/uccle/tests/test_build.py`:

```python
def test_build_emits_daily_files(tmp_path):
    build(records=recs_for(2019, 365, 12.0), out_dir=str(tmp_path))
    daily = json.loads((tmp_path / "daily" / "2019.json").read_text())
    assert len(daily) == 365
    byd = {d["mmdd"]: d for d in daily}
    assert byd["0625"]["tmax"] == 17.0          # recs_for: tmax = tmean + 5
    assert byd["0625"]["recHi"] is True          # only year present → holds every record
    assert byd["0625"]["recLo"] is True
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m pytest scripts/uccle/tests/test_build.py::test_build_emits_daily_files -q`
Expected: FAIL — `FileNotFoundError` for `daily/2019.json`.

- [ ] **Step 3: Add the emission loop**

In `scripts/uccle/build_data.py`, immediately after the existing month loop (currently ending at line 136):

```python
    os.makedirs(os.path.join(out_dir, "daily"), exist_ok=True)
    for ykey, payload in derive.daily_data(recs).items():
        _write(os.path.join(out_dir, "daily", f"{ykey}.json"), payload)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python3 -m pytest scripts/uccle/tests/test_build.py -q`
Expected: PASS (all build tests, incl. the new one).

- [ ] **Step 5: Commit**

```bash
git add scripts/uccle/build_data.py scripts/uccle/tests/test_build.py
git commit -m "feat(pipeline): emit daily/YYYY.json per year

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Frontend — `DailyPoint` type, `loadDaily`, `useDaily`

**Files:**
- Modify: `src/types.ts` (append)
- Modify: `src/data/loader.ts` (append + import)
- Create: `src/data/useDaily.ts`

**Interfaces:**
- Produces:
  - `DailyPoint = { mmdd: string; tmax: number; tmin: number; provisional?: boolean; recHi?: boolean; recLo?: boolean }`
  - `DailyYear = DailyPoint[]`
  - `loadDaily(year: number) => Promise<DailyYear>`
  - `useDaily(year: number) => { data: DailyYear | null; loading: boolean; error: Error | null }`

- [ ] **Step 1: Add the type**

Append to `src/types.ts`:

```ts
export interface DailyPoint { mmdd: string; tmax: number; tmin: number; provisional?: boolean; recHi?: boolean; recLo?: boolean }
export type DailyYear = DailyPoint[]
```

- [ ] **Step 2: Add the loader**

In `src/data/loader.ts`, add `DailyYear` to the type import on line 1 and append a loader:

```ts
import type { Summary, DayNorm, ThisDay, Baseline, MonthData, DailyYear } from '../types'
```
```ts
export const loadDaily = (year: number) => loadJSON<DailyYear>(`data/daily/${year}.json`)
```

- [ ] **Step 3: Create the hook**

Create `src/data/useDaily.ts`:

```ts
import { useEffect, useState } from 'react'
import { loadDaily } from './loader'
import type { DailyYear } from '../types'

export function useDaily(year: number) {
  const [data, setData] = useState<DailyYear | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { let a = true; setLoading(true); setError(null)
    loadDaily(year).then(d => a && setData(d)).catch(e => a && setError(e)).finally(() => a && setLoading(false))
    return () => { a = false } }, [year])
  return { data, error, loading }
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no type errors).

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/data/loader.ts src/data/useDaily.ts
git commit -m "feat(data): DailyPoint type + loadDaily + useDaily hook

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: `lib/monthDetail.ts` — app-side derivations

**Files:**
- Create: `src/lib/monthDetail.ts`
- Test: `src/lib/monthDetail.test.ts`

**Interfaces:**
- Consumes: `DailyPoint` (Task 3), `tempColor` (`src/lib/dayStats.ts`).
- Produces:
  - `monthDays(daily: DailyPoint[], mm: string): DailyPoint[]`
  - `dayMix(days: DailyPoint[], normalFor: (mmdd: string) => number | null): { warm: number; cool: number; neutral: number; total: number }`
  - `recordsBroken(days: DailyPoint[]): number`
  - `topWarmest(days: DailyPoint[], n?: number): DailyPoint[]`
  - `topColdest(days: DailyPoint[], n?: number): DailyPoint[]`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/monthDetail.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { monthDays, dayMix, recordsBroken, topWarmest, topColdest } from './monthDetail'
import type { DailyPoint } from '../types'

const d = (mmdd: string, tmax: number, tmin: number, extra: Partial<DailyPoint> = {}): DailyPoint => ({ mmdd, tmax, tmin, ...extra })

describe('monthDays', () => {
  it('filters to the month by mmdd prefix', () => {
    const all = [d('0601', 20, 10), d('0701', 25, 12), d('0630', 22, 11)]
    expect(monthDays(all, '06').map(x => x.mmdd)).toEqual(['0601', '0630'])
  })
})

describe('dayMix', () => {
  it('classifies via tempColor ±2 against the per-day normal', () => {
    const normal = (_: string) => 20            // warm if tmax>22, cool if tmax<18
    const days = [d('0601', 25, 10), d('0602', 15, 5), d('0603', 20, 8)]
    expect(dayMix(days, normal)).toEqual({ warm: 1, cool: 1, neutral: 1, total: 3 })
  })
  it('treats a missing normal as neutral', () => {
    expect(dayMix([d('0601', 40, 10)], () => null)).toEqual({ warm: 0, cool: 0, neutral: 1, total: 1 })
  })
})

describe('recordsBroken', () => {
  it('counts recHi and recLo flags', () => {
    expect(recordsBroken([d('0601', 30, 9, { recHi: true }), d('0602', 5, -2, { recLo: true }), d('0603', 20, 10, { recHi: true, recLo: true })])).toBe(4)
  })
})

describe('topWarmest / topColdest', () => {
  const days = [d('0601', 30, 9), d('0602', 22, 4), d('0603', 27, 12), d('0604', 19, -1)]
  it('warmest sorts by tmax desc', () => {
    expect(topWarmest(days, 2).map(x => x.mmdd)).toEqual(['0601', '0603'])
  })
  it('coldest sorts by tmin asc', () => {
    expect(topColdest(days, 2).map(x => x.mmdd)).toEqual(['0604', '0602'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/monthDetail.test.ts`
Expected: FAIL — cannot resolve `./monthDetail`.

- [ ] **Step 3: Implement**

Create `src/lib/monthDetail.ts`:

```ts
import { tempColor } from './dayStats'
import type { DailyPoint } from '../types'

export function monthDays(daily: DailyPoint[], mm: string): DailyPoint[] {
  return daily.filter(d => d.mmdd.slice(0, 2) === mm)
}

export function dayMix(days: DailyPoint[], normalFor: (mmdd: string) => number | null) {
  let warm = 0, cool = 0, neutral = 0
  for (const d of days) {
    const c = tempColor(d.tmax, normalFor(d.mmdd))
    if (c === 'text-warm') warm++
    else if (c === 'text-accent') cool++
    else neutral++
  }
  return { warm, cool, neutral, total: days.length }
}

export function recordsBroken(days: DailyPoint[]): number {
  return days.reduce((n, d) => n + (d.recHi ? 1 : 0) + (d.recLo ? 1 : 0), 0)
}

export function topWarmest(days: DailyPoint[], n = 5): DailyPoint[] {
  return [...days].sort((a, b) => b.tmax - a.tmax).slice(0, n)
}

export function topColdest(days: DailyPoint[], n = 5): DailyPoint[] {
  return [...days].sort((a, b) => a.tmin - b.tmin).slice(0, n)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/monthDetail.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/monthDetail.ts src/lib/monthDetail.test.ts
git commit -m "feat(lib): monthDetail — day-mix, records-broken, top warmest/coldest

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: `lib/monthSummary.ts` — summary sentence

**Files:**
- Create: `src/lib/monthSummary.ts`
- Test: `src/lib/monthSummary.test.ts`

**Interfaces:**
- Produces: `monthSummary(input: { warm: number; cool: number; total: number; records: number; soFar: boolean }): string`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/monthSummary.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { monthSummary } from './monthSummary'

describe('monthSummary', () => {
  it('complete month with records', () => {
    expect(monthSummary({ warm: 12, cool: 5, total: 30, records: 2, soFar: false }))
      .toBe('12 of 30 days ran warm, 5 cool — and 2 all-time daily records fell.')
  })
  it('drops the records clause when none fell', () => {
    expect(monthSummary({ warm: 8, cool: 9, total: 28, records: 0, soFar: false }))
      .toBe('8 of 28 days ran warm, 9 cool.')
  })
  it('singular record', () => {
    expect(monthSummary({ warm: 1, cool: 0, total: 1, records: 1, soFar: false }))
      .toBe('1 of 1 day ran warm, 0 cool — and 1 all-time daily record fell.')
  })
  it('partial month says "so far"', () => {
    expect(monthSummary({ warm: 10, cool: 3, total: 18, records: 1, soFar: true }))
      .toBe('10 of 18 days so far ran warm, 3 cool — and 1 all-time daily record fell.')
  })
  it('no days yet', () => {
    expect(monthSummary({ warm: 0, cool: 0, total: 0, records: 0, soFar: true })).toBe('No days recorded yet.')
    expect(monthSummary({ warm: 0, cool: 0, total: 0, records: 0, soFar: false })).toBe('No data for this month.')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/monthSummary.test.ts`
Expected: FAIL — cannot resolve `./monthSummary`.

- [ ] **Step 3: Implement**

Create `src/lib/monthSummary.ts`:

```ts
export function monthSummary({ warm, cool, total, records, soFar }: {
  warm: number; cool: number; total: number; records: number; soFar: boolean
}): string {
  if (total === 0) return soFar ? 'No days recorded yet.' : 'No data for this month.'
  const days = `${warm} of ${total} day${total === 1 ? '' : 's'}${soFar ? ' so far' : ''} ran warm, ${cool} cool`
  const rec = records > 0 ? ` — and ${records} all-time daily record${records === 1 ? '' : 's'} fell.` : '.'
  return days + rec
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/monthSummary.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/monthSummary.ts src/lib/monthSummary.test.ts
git commit -m "feat(lib): monthSummary — day-mix + records sentence

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: `lib/shareText.ts` — month caption + url

**Files:**
- Modify: `src/lib/shareText.ts` (append)
- Test: `src/lib/shareText.test.ts` (append)

**Interfaces:**
- Consumes: `APP_URL` (already in `shareText.ts`).
- Produces:
  - `monthShareUrl(year: number, mm: string): string` → `${APP_URL}#/today?m=${year}-${mm}`
  - `monthShareCaption(sentence: string, year: number, mm: string): string` → `${sentence}\n${monthShareUrl(year, mm)}`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/shareText.test.ts`:

```ts
import { monthShareUrl, monthShareCaption } from './shareText'

describe('month share', () => {
  it('builds a ?m= deep link', () => {
    expect(monthShareUrl(2019, '06')).toBe('https://jdelsoir.github.io/uccle-climate/#/today?m=2019-06')
  })
  it('appends the deep link to the sentence', () => {
    expect(monthShareCaption('June 2019 was warm.', 2019, '06'))
      .toBe('June 2019 was warm.\nhttps://jdelsoir.github.io/uccle-climate/#/today?m=2019-06')
  })
})
```

(If `shareText.test.ts` does not already `import { describe, it, expect } from 'vitest'`, add it at the top.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/shareText.test.ts`
Expected: FAIL — `monthShareUrl` is not exported.

- [ ] **Step 3: Implement**

Append to `src/lib/shareText.ts`:

```ts
// Deep link to a specific month (HashRouter ?m= form — Today.tsx reads the param).
export function monthShareUrl(year: number, mm: string): string {
  return `${APP_URL}#/today?m=${year}-${mm}`
}

export function monthShareCaption(sentence: string, year: number, mm: string): string {
  return `${sentence}\n${monthShareUrl(year, mm)}`
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/shareText.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/shareText.ts src/lib/shareText.test.ts
git commit -m "feat(lib): month share url + caption (?m= deep link)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: `MonthHeatmap` component

**Files:**
- Create: `src/components/MonthHeatmap.tsx`
- Test: `src/components/MonthHeatmap.test.tsx`

**Interfaces:**
- Consumes: `DailyPoint` (Task 3), `tempColor` (`src/lib/dayStats.ts`), `fmtMonth` + `todayISO` (`src/lib/format.ts`).
- Produces: `MonthHeatmap` default export with props
  `{ year: number; mm: string; days: DailyPoint[]; normalFor: (mmdd: string) => number | null; liveToday?: { mmdd: string; tmax: number } | null; onPick: (iso: string) => void }`.
  Renders a Monday-start grid; populated past/today cells are `<button>`s calling `onPick("YYYY-MM-DD")`; future/gap days are inert cells.

- [ ] **Step 1: Write the failing tests**

Create `src/components/MonthHeatmap.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MonthHeatmap from './MonthHeatmap'
import type { DailyPoint } from '../types'

const day = (mmdd: string, tmax: number, tmin: number, extra: Partial<DailyPoint> = {}): DailyPoint => ({ mmdd, tmax, tmin, ...extra })

it('renders a cell per day with a record dot, and clicking calls onPick with the iso date', async () => {
  const onPick = vi.fn()
  const days = [day('0619', 34.1, 18, { recHi: true }), day('0620', 24, 14)]
  render(<MonthHeatmap year={2019} mm="06" days={days} normalFor={() => 20} liveToday={null} onPick={onPick} />)
  // 19th cell: accessible name includes the high and "record"
  const cell19 = screen.getByRole('gridcell', { name: /June 19, 2019.*high 34\.1.*record/i })
  await userEvent.click(cell19)
  expect(onPick).toHaveBeenCalledWith('2019-06-19')
})

it('marks days with no data as inert (no button)', () => {
  render(<MonthHeatmap year={2019} mm="06" days={[day('0601', 20, 10)]} normalFor={() => 20} liveToday={null} onPick={vi.fn()} />)
  // 02 June has no data → present as a gridcell but not clickable
  const cell2 = screen.getByRole('gridcell', { name: /June 2, 2019 — no data/i })
  expect(cell2.tagName).not.toBe('BUTTON')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/MonthHeatmap.test.tsx`
Expected: FAIL — cannot resolve `./MonthHeatmap`.

- [ ] **Step 3: Implement**

Create `src/components/MonthHeatmap.tsx`:

```tsx
import { tempColor } from '../lib/dayStats'
import { fmtMonth, todayISO } from '../lib/format'
import type { DailyPoint } from '../types'

const WD = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const TINT: Record<string, string> = { 'text-warm': 'bg-warm/15', 'text-accent': 'bg-accent/15', 'text-fg': 'bg-surface-2' }

export default function MonthHeatmap({ year, mm, days, normalFor, liveToday, onPick }: {
  year: number; mm: string; days: DailyPoint[]
  normalFor: (mmdd: string) => number | null
  liveToday?: { mmdd: string; tmax: number } | null
  onPick: (iso: string) => void
}) {
  const m = Number(mm)
  const dim = new Date(year, m, 0).getDate()                 // last day of month
  const lead = (new Date(year, m - 1, 1).getDay() + 6) % 7   // Monday-start leading blanks
  const byMmdd = new Map(days.map(d => [d.mmdd, d]))
  const todayI = todayISO()
  const name = fmtMonth(mm)

  return (
    <div className="border border-border bg-surface p-5">
      <p className="mb-3 text-[11px] uppercase tracking-[0.09em] text-muted">{name} {year} day by day</p>
      <div role="grid" aria-label={`${name} ${year} daily highs`} className="grid grid-cols-7 gap-1 text-center">
        {WD.map(w => <div key={w} role="columnheader" className="pb-1 text-[10px] font-medium text-muted">{w}</div>)}
        {Array.from({ length: lead }).map((_, i) => <div key={`b${i}`} aria-hidden />)}
        {Array.from({ length: dim }).map((_, i) => {
          const dnum = i + 1
          const dd = String(dnum).padStart(2, '0')
          const mmdd = mm + dd
          const iso = `${year}-${mm}-${dd}`
          const stored = byMmdd.get(mmdd) ?? null
          const live = !stored && liveToday?.mmdd === mmdd
          const tmax = stored ? stored.tmax : live ? liveToday!.tmax : null
          const rec = !!stored && (stored.recHi || stored.recLo)
          const future = iso > todayI
          const tint = !future && tmax != null ? TINT[tempColor(tmax, normalFor(mmdd))] : 'bg-surface-2/40'
          const label = tmax != null
            ? `${name} ${dnum}, ${year} — high ${tmax.toFixed(1)}°${rec ? ', record' : ''}${live ? ', today' : ''}`
            : `${name} ${dnum}, ${year} — no data`
          if (tmax == null) {
            return <div key={dnum} role="gridcell" aria-label={label} className={`min-h-[52px] ${tint}`} />
          }
          return (
            <button key={dnum} type="button" role="gridcell" onClick={() => onPick(iso)} aria-label={`${label}. Open this day`}
              className={`min-h-[52px] ${tint} p-1 text-left transition-colors hover:ring-1 hover:ring-border`}>
              <span className="block text-[11px] font-bold text-fg">{dnum}{rec && <span className="ml-0.5 text-warm" aria-hidden>•</span>}</span>
              <span className="block text-[11px] text-muted">{Math.round(tmax)}°</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/MonthHeatmap.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/MonthHeatmap.tsx src/components/MonthHeatmap.test.tsx
git commit -m "feat(component): MonthHeatmap — Monday-start tinted day grid, click→Day

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: `NotableDays` component

**Files:**
- Create: `src/components/NotableDays.tsx`
- Test: `src/components/NotableDays.test.tsx`

**Interfaces:**
- Consumes: `DailyPoint` (Task 3), `fmtMonth` (`src/lib/format.ts`).
- Produces: `NotableDays` default export with props
  `{ warmest: DailyPoint[]; coldest: DailyPoint[]; year: number; mm: string; onPick: (iso: string) => void }`.
  Warmest rows show `tmax` + `recHi` dot; Coldest rows show `tmin` + `recLo` dot. Returns `null` when both lists empty.

- [ ] **Step 1: Write the failing tests**

Create `src/components/NotableDays.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NotableDays from './NotableDays'
import type { DailyPoint } from '../types'

const day = (mmdd: string, tmax: number, tmin: number, extra: Partial<DailyPoint> = {}): DailyPoint => ({ mmdd, tmax, tmin, ...extra })

it('shows warmest by default and switches to coldest via the toggle', async () => {
  const onPick = vi.fn()
  const warmest = [day('0619', 34.1, 18, { recHi: true })]
  const coldest = [day('0603', 12, 4, { recLo: true })]
  render(<NotableDays warmest={warmest} coldest={coldest} year={2019} mm="06" onPick={onPick} />)
  expect(screen.getByText('34.1')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('radio', { name: 'Coldest' }))
  expect(screen.getByText('4.0')).toBeInTheDocument()         // tmin shown for coldest
})

it('clicking a row calls onPick with the iso date', async () => {
  const onPick = vi.fn()
  render(<NotableDays warmest={[day('0619', 34.1, 18)]} coldest={[]} year={2019} mm="06" onPick={onPick} />)
  await userEvent.click(screen.getByRole('button', { name: /19 June 2019/i }))
  expect(onPick).toHaveBeenCalledWith('2019-06-19')
})

it('renders nothing when both lists are empty', () => {
  const { container } = render(<NotableDays warmest={[]} coldest={[]} year={2019} mm="06" onPick={vi.fn()} />)
  expect(container).toBeEmptyDOMElement()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/NotableDays.test.tsx`
Expected: FAIL — cannot resolve `./NotableDays`.

- [ ] **Step 3: Implement**

Create `src/components/NotableDays.tsx`:

```tsx
import { useState } from 'react'
import { fmtMonth } from '../lib/format'
import type { DailyPoint } from '../types'

export default function NotableDays({ warmest, coldest, year, mm, onPick }: {
  warmest: DailyPoint[]; coldest: DailyPoint[]; year: number; mm: string; onPick: (iso: string) => void
}) {
  const [warm, setWarm] = useState(true)
  if (!warmest.length && !coldest.length) return null
  const list = warm ? warmest : coldest
  const accent = warm ? 'text-warm' : 'text-accent'
  const name = fmtMonth(mm)

  return (
    <div className="border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Notable days</p>
        <div role="radiogroup" aria-label="Notable day type" className="inline-flex border border-border text-sm">
          <button type="button" role="radio" aria-checked={warm} onClick={() => setWarm(true)}
            className={`px-3 py-1.5 font-semibold transition-colors ${warm ? 'bg-warm text-white' : 'text-muted hover:text-fg'}`}>Warmest</button>
          <button type="button" role="radio" aria-checked={!warm} onClick={() => setWarm(false)}
            className={`px-3 py-1.5 font-semibold transition-colors ${!warm ? 'bg-accent text-white' : 'text-muted hover:text-fg'}`}>Coldest</button>
        </div>
      </div>
      <ol className="mt-3 border-t border-border divide-y divide-border">
        {list.map((d, i) => {
          const v = warm ? d.tmax : d.tmin
          const rec = warm ? d.recHi : d.recLo
          const dnum = Number(d.mmdd.slice(2))
          const iso = `${year}-${mm}-${d.mmdd.slice(2)}`
          return (
            <li key={d.mmdd}>
              <button type="button" onClick={() => onPick(iso)}
                aria-label={`${dnum} ${name} ${year} — ${v.toFixed(1)}°${rec ? ', record' : ''}, rank ${i + 1}. Open this day`}
                className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-surface-2">
                <span className="flex-1 text-sm">{dnum} {name.slice(0, 3)}{rec ? ' · record' : ''}</span>
                <span className={`text-lg font-bold ${accent}`}>{v.toFixed(1)}<span className="ml-0.5 text-xs">°C</span></span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/NotableDays.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/NotableDays.tsx src/components/NotableDays.test.tsx
git commit -m "feat(component): NotableDays — warmest/coldest toggle list, rows→Day

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: `Today.tsx` — year-aware Month cursor, `?m=` deep link, `openDay`

**Files:**
- Modify: `src/tabs/Today.tsx`
- Test: `src/tabs/Today.test.tsx`

**Interfaces:**
- Consumes: `useSearchParams` (already imported), `MonthView` (props change in Task 10).
- Produces: Month mode tracks a `(monthYear, month)` cursor that steps across year boundaries within `[1833-01, current month]`; `?m=YYYY-MM` opens Month mode at that month-year (`?d` takes precedence if both present); `openDay(iso)` switches to Day mode at `iso`. `MonthView` is rendered as `<MonthView year={monthYear} mm={mm} onPickDay={openDay} />`.

- [ ] **Step 1: Write the failing tests**

Add to `src/tabs/Today.test.tsx`. The existing file renders `<Today/>` inside a router; mirror its setup. Add:

```tsx
import { MemoryRouter } from 'react-router-dom'

it('opens Month mode at the month-year from ?m=', async () => {
  render(<MemoryRouter initialEntries={['/today?m=2019-06']}><Today /></MemoryRouter>)
  // Month-mode radio is selected and the month heading shows
  expect(await screen.findByRole('radio', { name: 'month' })).toHaveAttribute('aria-checked', 'true')
  // MonthView renders the CalendarTile header for the deep-linked month/year
  expect(await screen.findByText(/JUNE/)).toBeInTheDocument()
  expect(await screen.findByText('2019')).toBeInTheDocument()
})

it('lets ?d= win when both ?d and ?m are present', async () => {
  render(<MemoryRouter initialEntries={['/today?d=2010-03-04&m=2019-06']}><Today /></MemoryRouter>)
  expect(await screen.findByRole('radio', { name: 'day' })).toHaveAttribute('aria-checked', 'true')
})
```

(If the existing tests stub `fetch` for the data hooks, reuse that stub so `MonthView`/`DayView` mount without network errors; add `afterEach(() => vi.unstubAllGlobals())` if not already present. The assertions above only need the CalendarTile header text, which renders before data resolves.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/tabs/Today.test.tsx`
Expected: FAIL — month mode not selected from `?m=` / "2019" not found (currently locked to current year).

- [ ] **Step 3: Implement the cursor + deep link**

Edit `src/tabs/Today.tsx`:

(a) Replace the `mode`, `date`, and `month` state declarations (lines 21–32) with parsed-from-params versions and add a Month-mode year:

```tsx
  const dParam = params.get('d')
  const mParam = params.get('m')
  const dValid = !!dParam && /^\d{4}-\d{2}-\d{2}$/.test(dParam)
  const mMatch = mParam && /^(\d{4})-(\d{2})$/.exec(mParam)

  const [mode, setMode] = useState<Mode>(() => (dValid ? 'day' : mMatch ? 'month' : 'day'))
  const [date, setDate] = useState<Date>(() => {
    if (dValid) {
      const parsed = midnight(new Date(dParam + 'T00:00:00'))
      const lo = midnight(MIN_DATE), hi = midnight(new Date())
      if (!isNaN(parsed.getTime()) && parsed >= lo && parsed <= hi) return parsed
    }
    return midnight(new Date())
  })
  const inMonthRange = (y: number, mo: number) =>
    y >= 1833 && (y < now.getFullYear() || (y === now.getFullYear() && mo <= now.getMonth() + 1))
  const [month, setMonth] = useState(() => (mMatch && inMonthRange(+mMatch[1], +mMatch[2]) ? +mMatch[2] : now.getMonth() + 1))
  const [monthYear, setMonthYear] = useState(() => (mMatch && inMonthRange(+mMatch[1], +mMatch[2]) ? +mMatch[1] : now.getFullYear()))
  const [year, setYear] = useState<number | null>(null)
```

(b) Replace `stepMonth` (line 43) with a year-crossing version and add bound helpers. Put this just after the existing `stepDay`/before `stepYear`:

```tsx
  const monthIdx = monthYear * 12 + (month - 1)
  const MONTH_LO = 1833 * 12 + 0
  const MONTH_HI = now.getFullYear() * 12 + now.getMonth()
  const stepMonth = (d: number) => {
    const idx = monthIdx + d
    if (idx < MONTH_LO || idx > MONTH_HI) return
    setMonthYear(Math.floor(idx / 12)); setMonth((idx % 12) + 1)
  }
```

(c) Update the Month branch of the nav handlers (lines 51–53) to use the new bounds and reset target:

```tsx
  } else if (mode === 'month') {
    onPrev = () => stepMonth(-1); onNext = () => stepMonth(1)
    prevDisabled = monthIdx <= MONTH_LO; nextDisabled = monthIdx >= MONTH_HI
    onToday = () => { setMonthYear(now.getFullYear()); setMonth(now.getMonth() + 1) }
    todayDisabled = monthIdx >= MONTH_HI
  } else {
```

(d) Add `openDay` (just before the `return`):

```tsx
  const openDay = (iso: string) => { setDate(midnight(new Date(iso + 'T00:00:00'))); setMode('day') }
```

(e) Update the MonthView render (line 82):

```tsx
      {mode === 'month' && <MonthView year={monthYear} mm={mm} onPickDay={openDay} />}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tabs/Today.test.tsx`
Expected: PASS. (`MonthView`'s prop change is delivered in Task 10; until then `tsc` will flag the new props — that is expected and resolved by Task 10. Run vitest, not tsc, at this step.)

- [ ] **Step 5: Commit**

```bash
git add src/tabs/Today.tsx src/tabs/Today.test.tsx
git commit -m "feat(today): year-aware Month cursor + ?m= deep link + openDay callback

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: `MonthView.tsx` — wire daily data, summary, heatmap, notable days, share

**Files:**
- Modify: `src/tabs/today/MonthView.tsx`
- Test: `src/tabs/today/MonthView.test.tsx`

**Interfaces:**
- Consumes: `useDaily` (Task 3), `useDayNorm`, `useTodayTemp`, `monthDays`/`dayMix`/`recordsBroken`/`topWarmest`/`topColdest` (Task 4), `monthSummary` (Task 5), `monthShareCaption` (Task 6), `MonthHeatmap` (Task 7), `NotableDays` (Task 8), `shareNode` (`src/lib/share.ts`), `todayMMDD`/`todayISO` (`src/lib/format.ts`).
- Produces: `MonthView` default export with **new** props `{ year: number; mm: string; onPickDay: (iso: string) => void }` (replaces `{ mm; currentYear }`).

- [ ] **Step 1: Write the failing test**

Replace the body of `src/tabs/today/MonthView.test.tsx` props usage. Keep the existing Recharts mock at the top. Add a `fetch` stub that serves `month/06.json`, `daynorm.json`, and `daily/2019.json`, then assert the summary + heatmap render. Example test (adapt the fixture to the existing mock helpers in the file):

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
// (existing recharts mock stays above)
import MonthView from './MonthView'

afterEach(() => vi.unstubAllGlobals())

function stubFetch(map: Record<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    const key = Object.keys(map).find(k => String(url).endsWith(k))
    return key
      ? Promise.resolve({ ok: true, json: () => Promise.resolve(map[key]) })
      : Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) })
  }))
}

it('renders the summary line and the day-by-day heatmap', async () => {
  stubFetch({
    'month/06.json': {
      mm: '06',
      series: [{ year: 2019, mean: 19.8, complete: true }],
      recordWarm: { year: 2019, v: 19.8 }, recordCold: { year: 1909, v: 13.0 }, normal: 17.0,
      thenNow: { early: { from: 1833, to: 1900, mean: 15.0 }, recent: { from: 1996, to: 2025, mean: 18.0 } },
    },
    'daynorm.json': { '1991-2020': [{ doy: 170, mmdd: '0619', normal: 17, p10: null, p90: null }], '1961-1990': [] },
    'daily/2019.json': [
      { mmdd: '0619', tmax: 34.1, tmin: 18, recHi: true },
      { mmdd: '0620', tmax: 18, tmin: 12 },
    ],
  })
  render(<MonthView year={2019} mm="06" onPickDay={vi.fn()} />)
  // heatmap grid present
  expect(await screen.findByRole('grid', { name: /June 2019 daily highs/i })).toBeInTheDocument()
  // summary line present (1 of 2 days ran warm — 0619 is +17 over normal; 0620 is +1 → neutral)
  expect(await screen.findByText(/1 of 2 days ran warm, 0 cool/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tabs/today/MonthView.test.tsx`
Expected: FAIL — `MonthView` does not accept `year`/`onPickDay`; no `grid` role.

- [ ] **Step 3: Rewrite `MonthView.tsx`**

Replace `src/tabs/today/MonthView.tsx` with:

```tsx
import { useRef, useState } from 'react'
import { useMonth } from '../../data/useMonth'
import { useDaily } from '../../data/useDaily'
import { useDayNorm } from '../../data/useDayNorm'
import { useTodayTemp } from '../../data/useTodayTemp'
import { fmtTemp, fmtMonth, ordinal, todayMMDD, todayISO } from '../../lib/format'
import { Loading, ErrorState } from '../../components/States'
import CalendarTile from '../../components/CalendarTile'
import BigTemp from '../../components/BigTemp'
import RangeBar from '../../components/RangeBar'
import StatCard from '../../components/StatCard'
import WarmingStrip from '../../components/WarmingStrip'
import PeriodScatter from '../../components/PeriodScatter'
import HeroShell from '../../components/HeroShell'
import MonthHeatmap from '../../components/MonthHeatmap'
import NotableDays from '../../components/NotableDays'
import { heroState, deltaLine, bannerClass, toneText } from '../../lib/heroState'
import { monthDays, dayMix, recordsBroken, topWarmest, topColdest } from '../../lib/monthDetail'
import { monthSummary } from '../../lib/monthSummary'
import { monthShareCaption } from '../../lib/shareText'
import { shareNode } from '../../lib/share'
import { Share2 } from 'lucide-react'

export default function MonthView({ year, mm, onPickDay }: { year: number; mm: string; onPickDay: (iso: string) => void }) {
  const { data, loading, error } = useMonth(mm)
  const daily = useDaily(year)
  const dayNorm = useDayNorm()
  const live = useTodayTemp()
  const [capturing, setCapturing] = useState(false)
  const busy = useRef(false)

  if (loading) return <Loading label="Loading month…" />
  if (error || !data) return <ErrorState label="Could not load this month." />

  const name = fmtMonth(mm)
  const cur = data.series.find(s => s.year === year)
  const complete = data.series.filter(s => s.complete)
  const rank = cur ? complete.filter(s => s.mean > cur.mean).length + 1 : null
  const delta = cur && data.normal != null ? Math.round((cur.mean - data.normal) * 10) / 10 : null
  const deltaWord = delta == null ? '' : delta > 0 ? 'warmer than normal' : delta < 0 ? 'cooler than normal' : 'at normal'
  const tn = data.thenNow
  const warmingDelta = tn.early.mean != null && tn.recent.mean != null ? Math.round((tn.recent.mean - tn.early.mean) * 10) / 10 : null

  const complete_ = cur?.complete === true
  const state = heroState({
    value: cur ? cur.mean : null,
    normal: data.normal,
    brokeHigh: complete_ && data.recordWarm?.year === year,
    brokeLow: complete_ && data.recordCold?.year === year,
  })
  const dl = deltaLine(state)
  const banner = !cur ? null
    : !complete_ ? `${name} so far`
    : state.key === 'record-hot' ? `Warmest ${name} on record`
    : state.key === 'record-cold' ? `Coldest ${name} on record`
    : state.key === 'above' && rank ? `${ordinal(rank)} warmest ${name} in ${complete.length} years`
    : state.key === 'below' ? `Cooler than usual`
    : `A typical ${name}`
  const bannerKey = complete_ ? state.key : 'close'

  // within-month detail (app-side; tempColor single source of truth)
  const normMap = new Map((dayNorm.data?.['1991-2020'] ?? []).map(n => [n.mmdd, n.normal]))
  const normalFor = (mmdd: string) => normMap.get(mmdd) ?? null
  const mDays = daily.data ? monthDays(daily.data, mm) : []
  const mix = dayMix(mDays, normalFor)
  const records = recordsBroken(mDays)
  const warmest = topWarmest(mDays)
  const coldest = topColdest(mDays)
  const summary = mDays.length ? monthSummary({ warm: mix.warm, cool: mix.cool, total: mix.total, records, soFar: !complete_ }) : null

  const todayMM = todayMMDD().slice(0, 2)
  const liveToday = year === new Date().getFullYear() && mm === todayMM && live.data
    ? { mmdd: todayMMDD(), tmax: live.data.tmax }
    : null

  const handleShare = async () => {
    if (busy.current) return
    busy.current = true; setCapturing(true)
    try {
      await new Promise<void>(res => requestAnimationFrame(() => requestAnimationFrame(() => res())))
      const node = document.getElementById('month-capture')
      if (node && summary) await shareNode(node, 'uccle-month.png', { text: monthShareCaption(summary, year, mm) })
    } finally { setCapturing(false); busy.current = false }
  }

  return (
    <div className="space-y-4">
      <div id="month-capture" className="space-y-4">
        <HeroShell tone={state.tone} intensity={state.intensity}>
          <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
            <CalendarTile header={name.toUpperCase()} body={year} />
            <div className="min-w-0 flex-1">
              {cur ? (
                <>
                  <p className="text-[11px] uppercase tracking-[0.09em] text-muted">{state.word}</p>
                  <div><BigTemp v={cur.mean} className={`text-[40px] ${toneText(state.tone)}`} /></div>
                  {dl && <p className="mt-1 text-sm text-muted">{dl}</p>}
                </>
              ) : <p className="text-sm text-muted">No data for {name} {year} yet.</p>}
            </div>
          </div>
          {banner && (
            <div className="mt-3">
              <span className={`inline-block px-2.5 py-1 text-xs font-semibold ${bannerClass(bannerKey)}`}>{banner}</span>
            </div>
          )}
        </HeroShell>

        {summary && <p className="text-sm text-fg">{summary}</p>}

        {daily.data && dayNorm.data && (
          <MonthHeatmap year={year} mm={mm} days={mDays} normalFor={normalFor} liveToday={liveToday} onPick={onPickDay} />
        )}

        {capturing && summary && (
          <div className="border border-border bg-surface px-5 py-3 text-[11px] text-muted">
            <p className="text-fg">{summary}</p>
            <p className="mt-0.5">Uccle, Brussels · jdelsoir.github.io/uccle-climate</p>
          </div>
        )}
      </div>

      {summary && (
        <div className="flex justify-end">
          <button type="button" aria-label="Share this month" disabled={capturing} onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-muted transition-colors hover:text-fg disabled:opacity-40">
            <Share2 size={14} aria-hidden /> Share
          </button>
        </div>
      )}

      {cur && data.recordCold && data.recordWarm && (
        <div className="border border-border bg-surface p-5">
          <p className="mb-2 text-[11px] uppercase tracking-[0.09em] text-muted">Where {year} sits</p>
          <RangeBar
            min={{ v: data.recordCold.v, label: `${data.recordCold.v}° coldest` }}
            max={{ v: data.recordWarm.v, label: `${data.recordWarm.v}° warmest` }}
            markers={[
              ...(data.normal != null ? [{ v: data.normal, label: `normal ${data.normal}°`, kind: 'tick' as const }] : []),
              { v: cur.mean, label: `${year} ${cur.mean}°`, kind: 'dot' as const },
            ]}
            summary={`${name} ${year} mean ${cur.mean}°, normal ${data.normal ?? '—'}°, between ${data.recordCold.v}° coldest and ${data.recordWarm.v}° warmest`} />
        </div>
      )}

      <NotableDays warmest={warmest} coldest={coldest} year={year} mm={mm} onPick={onPickDay} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {data.normal != null && <StatCard label="Average" value={fmtTemp(data.normal)} sub="1991–2020 normal" />}
        {delta != null && <StatCard label="This year vs average" value={`${delta > 0 ? '+' : ''}${delta.toFixed(1)} °C`} sub={deltaWord} valueClass={delta > 0 ? 'text-warm' : delta < 0 ? 'text-accent' : 'text-fg'} />}
        <StatCard label={`Warmest ${name}`} value={fmtTemp(data.recordWarm?.v)} sub={data.recordWarm ? String(data.recordWarm.year) : undefined} valueClass="text-warm" />
        <StatCard label={`Coldest ${name}`} value={fmtTemp(data.recordCold?.v)} sub={data.recordCold ? String(data.recordCold.year) : undefined} valueClass="text-accent" />
      </div>

      {warmingDelta != null && (
        <WarmingStrip label={`A warming ${name}`}
          then={{ mean: tn.early.mean!, from: tn.early.from, to: tn.early.to }}
          recent={{ mean: tn.recent.mean!, from: tn.recent.from, to: tn.recent.to }}
          delta={warmingDelta} />
      )}

      <PeriodScatter title={`Every ${name} mean`} data={complete.map(s => ({ year: s.year, mean: s.mean }))}
        series={[{ key: 'mean', name: `${name} mean`, color: 'var(--accent)' }]} />
    </div>
  )
}
```

Note `todayISO` is imported for parity with other views but unused here — drop the import if `tsc`/lint flags it; keep `todayMMDD`.

- [ ] **Step 4: Run the test + full suite + typecheck**

Run: `npx vitest run src/tabs/today/MonthView.test.tsx && npx tsc --noEmit`
Expected: PASS; `tsc` clean (Today.tsx ↔ MonthView prop contract now matches).

- [ ] **Step 5: Commit**

```bash
git add src/tabs/today/MonthView.tsx src/tabs/today/MonthView.test.tsx
git commit -m "feat(month): within-month detail — summary, heatmap, notable days, share

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Full verification + ship

**Files:** none (verification only)

- [ ] **Step 1: Full test suites**

Run: `npm test`
Expected: PASS (all vitest).
Run: `python3 -m pytest scripts/uccle/tests/ -q`
Expected: PASS (all pytest).

- [ ] **Step 2: Prod build**

Run: `VITE_BASE=/uccle-climate/ npm run build`
Expected: build succeeds, no type errors.

- [ ] **Step 3: Regenerate data + smoke-check locally (optional but recommended)**

Run: `python3 -m scripts.uccle.build_data`
Then: `npm run dev` → open Today → Month, step ◀ across a year boundary into a past month, confirm heatmap tints/dots render, click a cell → opens Day at that date, toggle Notable days warmest/coldest, click Share.
Expected: all interactions work; `public/data/daily/2019.json` (etc.) exists.

- [ ] **Step 4: Push (CI deploys) + live validation**

```bash
git push origin main
```
Then validate per the standing workflow: confirm the deploy shipped on the live site (bundle hash matches local build, or visual check of the Month tab heatmap).

---

## Self-Review

**Spec coverage** (spec → task):
- New `daily/YYYY.json` + record flags + provisional suppression → Tasks 1, 2 ✓
- `loadDaily` / `useDaily` / `DailyPoint` → Task 3 ✓
- Warm/cool tally, records-broken, notable ranking (app-side, tempColor) → Task 4 ✓
- Summary line builder → Task 5 ✓
- Share month caption + `?m=` url → Task 6; share button + capture wrapper → Task 10 ✓
- Calendar heatmap (Monday-start, day#+high+record dot, click→Day, partial/live/gap) → Task 7 + wired in Task 10 ✓
- Notable days warmest/coldest toggle, rows→Day → Task 8 + wired in Task 10 ✓
- `?m=YYYY-MM` deep link + `?d` precedence → Task 9 ✓
- Month-mode year-aware navigation (prerequisite surfaced during planning; spec assumed any month-year is viewable) → Task 9 ✓
- PWA caching: no change needed (`daily/` under `**/data/**`) → noted, no task ✓
- Conventions (no PII, tokens, square corners, a11y) → enforced in each component task ✓

**Placeholder scan:** none — every code/test step has concrete content.

**Type consistency:** `DailyPoint` shape identical across Tasks 3/4/7/8/10; `normalFor: (mmdd: string) => number | null` identical in Tasks 4/7/10; `onPick`/`onPickDay: (iso: string) => void` consistent (Today `openDay` → MonthView `onPickDay` → component `onPick`); `MonthView` props `{ year, mm, onPickDay }` match the render in Task 9 and the signature in Task 10; `monthSummary` input keys match the call site in Task 10.
