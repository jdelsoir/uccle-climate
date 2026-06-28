# Incremental Daily-Fresh Data Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the Uccle dataset fresh to *yesterday* every day via a daily GitHub Actions rebuild, filling the recent gap from Open-Meteo forecast `past_days` and flagging the most-recent days as provisional.

**Architecture:** Stateless full rebuild, run daily instead of weekly. A new recent-days source (Open-Meteo *forecast* `past_days`) joins GHCN and ERA5-archive under precedence GHCN > ERA5 > forecast. The build cuts off at yesterday (the app keeps owning "today" via its live fetch). Filled days within the ERA5 finalization lag (5 days) are tagged `provisional` and surfaced with a subtle Day-view marker.

**Tech Stack:** Python 3.11 stdlib only (pipeline), React 18 + TypeScript + Tailwind v4 (frontend), Vitest + pytest (tests), GitHub Actions + Pages (CI/deploy).

## Global Constraints

- **Python: stdlib only** in `scripts/uccle/` (no third-party imports).
- **No PII** anywhere (UI, data, commits).
- **No external fonts/CDNs**; **tokens not hex** in frontend (`text-muted`, `bg-surface`, etc.).
- **Tests kept pristine** — no noisy output; pytest injects data (no real network); vitest stubs `fetch` and adds `afterEach(() => vi.unstubAllGlobals())`.
- **Commits** end with: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **Provisional rule:** a *filled* (non-GHCN) day with `date >= today - 5` is provisional; GHCN days never are; cutoff drops any fill date `>= today` (today belongs to the live app).
- **Precedence:** GHCN authoritative > ERA5-archive > forecast `past_days`.

---

### Task 1: `merge_fills` — precedence, cutoff, provisional tagging

Replaces `merge_archive` with a richer merge that also takes the forecast `recent` dict, a `today` cutoff, and a `lag`. Pure function, fully unit-tested.

**Files:**
- Modify: `scripts/uccle/build_data.py` (`merge_archive` → `merge_fills`, lines 18-33; `build` signature + call site, lines 51-56)
- Test: `scripts/uccle/tests/test_build.py` (import line 3; replace `test_merge_archive_keeps_ghcn_and_fills_gaps`, lines 28-41; add new tests)

**Interfaces:**
- Produces: `merge_fills(recs, archive=None, recent=None, today=None, lag=5) -> list[dict]` where each record is `{"date": date, "tmax": float, "tmin": float, "tmean": float, ("provisional": True)}`. `build(text=None, records=None, archive=None, recent=None, today=None, out_dir="public/data")`.
- Consumes: GHCN `recs` from `daily_records` (`{date,tmax,tmin,tmean}`); `archive`/`recent` are `{date: {"tmax","tmin"}}`.

- [ ] **Step 1: Update the test import and rewrite the merge test**

In `scripts/uccle/tests/test_build.py`, change the import on line 3:

```python
from scripts.uccle.build_data import build, merge_fills
```

Replace `test_merge_archive_keeps_ghcn_and_fills_gaps` (lines 28-41) with:

```python
def test_merge_fills_keeps_ghcn_and_fills_gaps():
    recs = [{"date": dt.date(2010, 1, 1), "tmax": 5.0, "tmin": 1.0, "tmean": 3.0}]
    archive = {
        dt.date(2010, 1, 1): {"tmax": 9.9, "tmin": 9.9},   # overlap → GHCN wins
        dt.date(2010, 1, 2): {"tmax": 6.0, "tmin": 2.0},    # gap → filled
        dt.date(2010, 1, 3): {"tmax": None, "tmin": 3.0},   # incomplete → skipped
    }
    m = merge_fills(recs, archive)
    byd = {r["date"]: r for r in m}
    assert byd[dt.date(2010, 1, 1)]["tmax"] == 5.0                       # GHCN authoritative
    assert byd[dt.date(2010, 1, 2)]["tmax"] == 6.0
    assert byd[dt.date(2010, 1, 2)]["tmean"] == 4.0                      # filled mean computed
    assert dt.date(2010, 1, 3) not in byd                               # None skipped
    assert [r["date"] for r in m] == sorted(byd)                        # sorted by date
    assert "provisional" not in byd[dt.date(2010, 1, 2)]                # no today → never provisional


def test_merge_fills_precedence_archive_over_recent():
    recs = []
    archive = {dt.date(2010, 1, 2): {"tmax": 6.0, "tmin": 2.0}}
    recent = {dt.date(2010, 1, 2): {"tmax": 99.0, "tmin": 99.0},        # same date → archive wins
              dt.date(2010, 1, 4): {"tmax": 8.0, "tmin": 3.0}}          # archive lacks → forecast fills
    m = merge_fills(recs, archive, recent)
    byd = {r["date"]: r for r in m}
    assert byd[dt.date(2010, 1, 2)]["tmax"] == 6.0                      # ERA5 beats forecast
    assert byd[dt.date(2010, 1, 4)]["tmax"] == 8.0                      # forecast fills the rest


def test_merge_fills_cutoff_drops_today_and_future():
    today = dt.date(2026, 6, 28)
    recent = {dt.date(2026, 6, 27): {"tmax": 30.0, "tmin": 18.0},       # yesterday → kept
              dt.date(2026, 6, 28): {"tmax": 31.0, "tmin": 19.0}}       # today → dropped
    m = merge_fills([], None, recent, today=today)
    dates = {r["date"] for r in m}
    assert dt.date(2026, 6, 27) in dates
    assert dt.date(2026, 6, 28) not in dates                           # today belongs to live app


def test_merge_fills_tags_recent_days_provisional():
    today = dt.date(2026, 6, 28)
    ghcn = [{"date": dt.date(2026, 6, 25), "tmax": 1.0, "tmin": 1.0, "tmean": 1.0}]  # GHCN, recent
    recent = {
        dt.date(2026, 6, 27): {"tmax": 30.0, "tmin": 18.0},  # within lag → provisional
        dt.date(2026, 6, 20): {"tmax": 25.0, "tmin": 15.0},  # 8 days back → final
    }
    m = merge_fills(ghcn, None, recent, today=today, lag=5)
    byd = {r["date"]: r for r in m}
    assert byd[dt.date(2026, 6, 27)]["provisional"] is True            # filled & within lag
    assert "provisional" not in byd[dt.date(2026, 6, 20)]              # filled but older than lag
    assert "provisional" not in byd[dt.date(2026, 6, 25)]             # GHCN never provisional
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `python3 -m pytest scripts/uccle/tests/test_build.py -q`
Expected: FAIL — `ImportError: cannot import name 'merge_fills'`.

- [ ] **Step 3: Implement `merge_fills` and update `build`**

In `scripts/uccle/build_data.py`, replace `merge_archive` (lines 18-33) with:

```python
def merge_fills(recs, archive=None, recent=None, today=None, lag=5):
    """GHCN records are authoritative; fill remaining dates from ERA5 archive,
    then from the forecast `recent` dict. Precedence: GHCN > archive > recent.

    With `today` set: drop any fill date >= today (the live app owns today), and
    tag a filled day `provisional=True` when date >= today - lag (ERA5 lag window).
    GHCN days are never provisional.
    """
    have = {r["date"] for r in recs}
    merged = list(recs)
    fills = {}
    for src in (archive or {}, recent or {}):       # archive first → wins ties
        for d, v in src.items():
            if d in have or d in fills:
                continue
            if today is not None and d >= today:    # cutoff: only up to yesterday
                continue
            tmax, tmin = v.get("tmax"), v.get("tmin")
            if tmax is None or tmin is None:
                continue
            entry = {"date": d, "tmax": tmax, "tmin": tmin, "tmean": (tmax + tmin) / 2}
            if today is not None and d >= today - dt.timedelta(days=lag):
                entry["provisional"] = True
            fills[d] = entry
    merged.extend(fills.values())
    merged.sort(key=lambda r: r["date"])
    return merged
```

In the same file, update `build` (lines 51-56) — change the signature and the merge call:

```python
def build(text=None, records=None, archive=None, recent=None, today=None, out_dir="public/data"):
    recs = records if records is not None else daily_records(parse_dly(text))
    if not recs:
        raise SystemExit("No records parsed — aborting (format drift?)")
    if archive or recent:
        recs = merge_fills(recs, archive, recent, today)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `python3 -m pytest scripts/uccle/tests/test_build.py -q`
Expected: PASS (all build tests green).

- [ ] **Step 5: Commit**

```bash
git add scripts/uccle/build_data.py scripts/uccle/tests/test_build.py
git commit -m "feat(pipeline): merge_fills with forecast recent-days source, cutoff + provisional tagging

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `per_date` propagates `provisional` onto the daily series

The per-date series entries gain an optional `provisional` flag so the Day view can mark recent provisional days.

**Files:**
- Modify: `scripts/uccle/derive.py` (`per_date` series builder, line 167)
- Test: `scripts/uccle/tests/test_derive.py` (add unit test)
- Test: `scripts/uccle/tests/test_build.py` (add end-to-end test — exercises the `build(recent=…, today=…)` path from Task 1 through `per_date`)

**Interfaces:**
- Consumes: `recs` records may carry `"provisional": True` (from Task 1's `merge_fills`); `build(... recent=…, today=…)` from Task 1.
- Produces: `per_date(recs)[mmdd]["series"]` entries are `{"year", "tmax", "tmin", ("provisional": True)}` — key emitted only when the underlying record is provisional.

- [ ] **Step 1: Write the failing tests**

Add to `scripts/uccle/tests/test_derive.py`:

```python
def test_per_date_propagates_provisional():
    recs = [
        {"date": dt.date(2024, 6, 28), "tmax": 28.0, "tmin": 16.0, "tmean": 22.0},
        {"date": dt.date(2026, 6, 28), "tmax": 30.0, "tmin": 18.0, "tmean": 24.0,
         "provisional": True},
    ]
    series = per_date(recs)["0628"]["series"]
    by_year = {e["year"]: e for e in series}
    assert by_year[2026]["provisional"] is True       # provisional record → flagged
    assert "provisional" not in by_year[2024]          # normal record → key omitted
```

Add to `scripts/uccle/tests/test_build.py` (the end-to-end path: `build` merges `recent` with `today`, `per_date` propagates the flag into the emitted `thisday` JSON):

```python
def test_build_flags_recent_provisional_in_thisday(tmp_path):
    ghcn = recs_for(2026, 100, 18.0)  # 2026-01-01 .. 2026-04-10 (06-27 absent from GHCN)
    recent = {dt.date(2026, 6, 27): {"tmax": 33.0, "tmin": 22.0}}
    build(records=ghcn, recent=recent, today=dt.date(2026, 6, 28), out_dir=str(tmp_path))
    thisday = json.loads((tmp_path / "thisday" / "0627.json").read_text())
    entry = next(e for e in thisday["series"] if e["year"] == 2026)
    assert entry["tmax"] == 33.0
    assert entry["provisional"] is True
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `python3 -m pytest scripts/uccle/tests/test_derive.py::test_per_date_propagates_provisional scripts/uccle/tests/test_build.py::test_build_flags_recent_provisional_in_thisday -v`
Expected: FAIL — `per_date`/`thisday` series entries lack the `provisional` key (`KeyError`/`StopIteration` on the assertion).

- [ ] **Step 3: Implement the propagation**

In `scripts/uccle/derive.py`, replace the `series` list-comprehension in `per_date` (line 167):

```python
            "series": [_series_entry(r) for r in rs],
```

And add a module-level helper just above `per_date` (after line 154):

```python
def _series_entry(r):
    e = {"year": r["date"].year, "tmax": r["tmax"], "tmin": r["tmin"]}
    if r.get("provisional"):
        e["provisional"] = True
    return e
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `python3 -m pytest scripts/uccle/tests/test_derive.py scripts/uccle/tests/test_build.py -q`
Expected: PASS (derive + build tests green, including the end-to-end provisional emission).

- [ ] **Step 5: Commit**

```bash
git add scripts/uccle/derive.py scripts/uccle/tests/test_derive.py scripts/uccle/tests/test_build.py
git commit -m "feat(pipeline): per_date series carries provisional flag end-to-end

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `fetch_recent` + `main` wiring (cutoff at yesterday)

Adds the forecast `past_days` fetch and wires `main` to clamp the archive at yesterday, fetch recent days best-effort, and pass `today` through. This is network I/O glue — like the existing untested `fetch_archive`, it has no unit test; the merge/cutoff/provisional logic it feeds is already covered by Tasks 1-2. Verification is the regression suite plus an optional live smoke check.

**Files:**
- Modify: `scripts/uccle/build_data.py` (add `RECENT_URL` + `fetch_recent`; rewrite `main`, lines 122-133)

**Interfaces:**
- Consumes: `build(... recent=..., today=...)` and `merge_fills` from Task 1.
- Produces: `fetch_recent(days=7) -> {date: {"tmax","tmin"}}`.

- [ ] **Step 1: Add `fetch_recent` and rewrite `main`**

In `scripts/uccle/build_data.py`, add after the `ARCHIVE_START` constant (line 15):

```python
# Open-Meteo forecast past_days — recent-days fill (covers the gap before ERA5 finalizes).
RECENT_URL = (
    "https://api.open-meteo.com/v1/forecast?latitude=50.8&longitude=4.36"
    "&daily=temperature_2m_max,temperature_2m_min&timezone=Europe/Brussels"
    "&past_days={days}&forecast_days=1"
)
```

Add this function next to `fetch_archive` (after line 48):

```python
def fetch_recent(days=7):
    """Fetch Open-Meteo forecast recent days into {date: {tmax, tmin}}."""
    url = RECENT_URL.format(days=days)
    with urllib.request.urlopen(url, timeout=60) as resp:
        j = json.loads(resp.read())
    daily = j["daily"]
    out = {}
    for i, dstr in enumerate(daily["time"]):
        out[dt.date.fromisoformat(dstr)] = {
            "tmax": daily["temperature_2m_max"][i],
            "tmin": daily["temperature_2m_min"][i],
        }
    return out
```

Replace `main` (lines 122-133) with:

```python
def main():
    with urllib.request.urlopen(DLY_URL, timeout=120) as resp:
        text = resp.read().decode("utf-8", "replace")
    today = dt.date.today()
    end = (today - dt.timedelta(days=1)).isoformat()   # cutoff: live app owns today
    try:
        archive = fetch_archive(ARCHIVE_START, end)
        print(f"Fetched {len(archive)} archive days {ARCHIVE_START}..{end}")
    except Exception as e:  # best-effort enhancement; never fail the build on it
        archive = None
        print(f"WARNING: archive fetch failed ({e}); building without ERA5 fill")
    try:
        recent = fetch_recent()
        print(f"Fetched {len(recent)} recent forecast days")
    except Exception as e:  # best-effort; degrade to archive/GHCN only
        recent = None
        print(f"WARNING: recent fetch failed ({e}); building without forecast fill")
    build(text=text, archive=archive, recent=recent, today=today)
    print("Wrote public/data/")
```

- [ ] **Step 2: Run the full pytest suite (regression — no new test, glue only)**

Run: `python3 -m pytest scripts/uccle/tests/ -q`
Expected: PASS (all pytest green; nothing should have regressed).

- [ ] **Step 3: Optional live smoke check (network)**

Run: `python3 -c "from scripts.uccle.build_data import fetch_recent; r = fetch_recent(); print(len(r), 'days', min(r), '..', max(r))"`
Expected: prints ~8 days ending at today's date (confirms the forecast endpoint + parser). Skip if offline.

- [ ] **Step 4: Commit**

```bash
git add scripts/uccle/build_data.py
git commit -m "feat(pipeline): fetch_recent forecast source; main clamps to yesterday + best-effort recent fill

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Frontend — `provisional` type + Day-view marker

Adds the optional type field and a subtle marker in the Day view when viewing a past day whose series entry is provisional.

**Files:**
- Modify: `src/types.ts` (`ThisDay.series`, line 23)
- Modify: `src/tabs/today/DayView.tsx` (compute flag near line 30; render marker after the average line, ~line 80)
- Test: `src/tabs/today/DayView.test.tsx` (add two tests)

**Interfaces:**
- Consumes: `ThisDay.series[i].provisional?: boolean` (emitted by Task 2).
- Produces: a marker element with accessible text `Provisional — may be revised`.

- [ ] **Step 1: Write the failing tests**

Add to `src/tabs/today/DayView.test.tsx`:

```javascript
// thisday whose 2024 entry is provisional (recent-fill flag)
const thisdayProv = { mmdd: '0628', recordHigh: { v: 34.8, year: 1955 }, recordLow: { v: 4.1, year: 1923 },
  series: [
    { year: 2020, tmax: 31, tmin: 17 },
    { year: 2024, tmax: 29, tmin: 15, provisional: true },
  ],
  thenNow: { early: { from: 1833, to: 1900, mean: 18 }, recent: { from: 1996, to: 2025, mean: 21 } } }

test('provisional past day shows a subtle marker', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) =>
    Promise.resolve({ ok: true, json: async () => (u.includes('open-meteo') ? live : u.includes('daynorm') ? daynorm : thisdayProv) })))
  const { container } = render(<DayView />)
  await waitFor(() => expect(container.querySelector('input[type="date"]')).toBeTruthy())
  const input = container.querySelector('input[type="date"]') as HTMLInputElement
  fireEvent.change(input, { target: { value: '2024-06-28' } })  // provisional entry, not today
  await waitFor(() => expect(screen.getByText(/Provisional/i)).toBeInTheDocument())
})

test('non-provisional day shows no marker', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) =>
    Promise.resolve({ ok: true, json: async () => (u.includes('open-meteo') ? live : u.includes('daynorm') ? daynorm : thisdayProv) })))
  const { container } = render(<DayView />)
  await waitFor(() => expect(container.querySelector('input[type="date"]')).toBeTruthy())
  const input = container.querySelector('input[type="date"]') as HTMLInputElement
  fireEvent.change(input, { target: { value: '2020-06-28' } })   // 2020 entry has no provisional
  await waitFor(() => expect(screen.getByText('31.0 °C')).toBeInTheDocument())
  expect(screen.queryByText(/Provisional/i)).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/tabs/today/DayView.test.tsx`
Expected: FAIL — `Unable to find an element with the text: /Provisional/i`.

- [ ] **Step 3: Add the type field**

In `src/types.ts`, change line 23:

```typescript
  series: { year: number; tmax: number; tmin: number; provisional?: boolean }[]
```

- [ ] **Step 4: Compute the flag and render the marker**

In `src/tabs/today/DayView.tsx`, just after the `entry` line (line 30), add:

```typescript
  const provisional = !!entry?.provisional && !isReal
```

Then, immediately after the average-line block (the `{normal != null && (…)}` paragraph, ~line 80) and before the record-broken block, add:

```tsx
        {provisional && (
          <p className="mt-1 text-[11px] text-muted">
            <span aria-hidden>· </span>Provisional — may be revised
          </p>
        )}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/tabs/today/DayView.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/tabs/today/DayView.tsx src/tabs/today/DayView.test.tsx
git commit -m "feat(dayview): subtle provisional marker for recent forecast-sourced days

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Daily cron + About caveat

Flips the refresh schedule weekly→daily and documents the provisional recent-days caveat in About.

**Files:**
- Modify: `.github/workflows/refresh.yml` (cron line)
- Modify: `src/tabs/About.tsx` (add one paragraph after line 8)
- Test: `src/tabs/About.test.tsx` (verify it still passes; no change expected)

**Interfaces:** none (config + copy).

- [ ] **Step 1: Flip the refresh cron to daily**

In `.github/workflows/refresh.yml`, change the schedule line:

```yaml
name: Daily data refresh
on:
  schedule: [{ cron: '0 5 * * *' }]   # daily 05:00 UTC (yesterday settled; GitHub may delay)
  workflow_dispatch:                  # manual run also re-enables a cron auto-disabled after 60d idle
permissions: { contents: read, pages: write, id-token: write }
jobs:
  rebuild:
    uses: ./.github/workflows/deploy.yml
```

- [ ] **Step 2: Add the About caveat paragraph**

In `src/tabs/About.tsx`, add after line 8 (the ERA5 paragraph):

```tsx
        <p>The most recent days are filled from Open-Meteo's short-range model and shown as <em>provisional</em> until ERA5 reanalysis finalizes them (about five days); provisional values may be revised slightly in later daily updates.</p>
```

- [ ] **Step 3: Run the About test to confirm nothing broke**

Run: `npx vitest run src/tabs/About.test.tsx`
Expected: PASS.

- [ ] **Step 4: Run the full suites**

Run: `npx vitest run && python3 -m pytest scripts/uccle/tests/ -q`
Expected: PASS (both green).

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/refresh.yml src/tabs/About.tsx
git commit -m "feat(ci): daily data refresh; document provisional recent-days caveat

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Final: deploy + live verification

Per project workflow (public data, safe to auto-publish):

- [ ] **Push to main:** `git push origin main`
- [ ] **Watch the deploy:** `gh run watch <id> --exit-status` until success.
- [ ] **Validate live:** confirm the deployed bundle/About reflect changes (e.g. About mentions "provisional"; a recent day in the Day view renders). Note: the daily cron's effect (yesterday's data appearing without a code push) can only be fully confirmed on the next scheduled run, but a manual `workflow_dispatch` of "Daily data refresh" validates the path immediately.
```
