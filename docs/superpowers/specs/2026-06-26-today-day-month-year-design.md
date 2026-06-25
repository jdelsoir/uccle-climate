# Today tab → Day/Month/Year + records consistency — Design Spec

**Date:** 2026-06-26
**Status:** Approved (brainstorming) — ready for implementation plan
**Builds on:** the shipped Uccle Climate PWA.

## 1. Overview

Three changes to the live app:
1. **Bug:** the Today all-time rank ("4th warmest day since 1833") disagrees with the Records tab because Today uses the live Open-Meteo value for the current day while Records uses the precomputed `summary.extremes`. Fix: one shared records/rank module; both screens merge the live "today" datum identically.
2. **Feature:** the Today tab gains a **Day | Month | Year** granularity toggle. Month and Year views work on **averages** (mean temperature) with rank + anomaly + records.
3. **Feature:** each mode gets **◀ / ▶ time-travel** to view another day / month / year (same screen, different period).

Then (item 4) a **verification pass** checks 200+ screen states for data consistency, accessibility, and layout.

## 2. Goals / Non-goals

**Goals**
- Today/Records all-time rank consistent (single source of truth).
- Day/Month/Year toggle on the Today tab; Month/Year use mean temp.
- Prev/next stepping for each mode (default current; back to 1833).
- New monthly pipeline data; reuse existing annual data for Year.
- All existing tests stay green; new logic is TDD'd.

**Non-goals**
- No month-of-a-specific-year drill (Month/Day steppers browse calendar position, always highlighting the current year's instance; Year stepper browses years).
- No Playwright/visual-screenshot harness in this spec (verification is data + code/markup + a few live-render spot checks; Playwright is a noted follow-up).
- No new nav tabs (toggle lives on Today).

## 3. Navigation model (confirmed)
- **Day:** stepper moves the **calendar day** (MMDD). Wraps Dec 31 ↔ Jan 1. Default = today. Loads `thisday/MMDD.json`. Highlighted instance = the live today value **only when the selected day == actual today**; otherwise the day is shown from history alone.
- **Month:** stepper moves the **calendar month** (1–12), wraps. Default = current month. Loads `month/MM.json`. Highlighted instance = the current year's month mean (flagged "(so far)" if the month is still partial).
- **Year:** stepper moves the **year** (minYear..maxYear), clamps at ends. Default = current year. Uses `summary` (annual/anomaly/rankings). Highlighted instance = the selected year.

Stepper label: Day → "26 June", Month → "June", Year → "2026". Heading: "This Day / Month / Year in History".

## 4. Per-mode content

**Day** (selected calendar day, across all years) — current behavior generalized:
- Record high/low (+years), then-vs-now, per-year **high+low scatter** with the existing period selector, anomaly.
- Live block (current temp, "new record" line, all-time-rank line, anomaly-vs-today) renders **only when selected day == actual today**.

**Month** (selected month, across all years):
- Headline: current year's **month mean** (e.g. "June 2026: 18.2 °C", "(so far)" if partial).
- Rank of that month-year among all complete years' same-month means; anomaly vs the month's 1991–2020 normal; warmest/coldest year on record for that month; per-year **scatter of monthly means**; then-vs-now.

**Year** (selected year, across all years):
- Headline: that year's **annual mean** + "(so far)" if incomplete.
- Rank among all complete years; anomaly vs 1991–2020 normal; warmest/coldest year on record; per-year **scatter of annual means**.

## 5. Pipeline data

### 5.1 Monthly aggregates (new)
- **Monthly mean** for each (year, month) = mean of daily `tmean` in that month. A month-year is **complete** when `valid_days ≥ days_in_month − 3` (excludes the running current month; tolerates small gaps).
- **`month/MM.json`** (MM = `01`..`12`), per calendar month:
  ```jsonc
  { "mm": "06",
    "series": [ { "year": 1833, "mean": 16.1, "complete": true } ],   // all years that have any data; complete flag
    "recordWarm": { "year": 2003, "v": 22.7 },   // among complete months
    "recordCold": { "year": 1923, "v": 12.1 },
    "normal": 17.0,                               // mean of complete 1991-2020 month means
    "thenNow": { "early": {"from":1833,"to":1900,"mean":15.8}, "recent": {"from":1996,"to":2025,"mean":17.4} } }
  ```
- Records/normal/thenNow computed over **complete** months only; `series` includes the partial current month flagged `complete:false` so the headline can show "(so far)".
- ERA5-filled like the daily series (uses the merged `recs`).

### 5.2 Year data (reuse)
`summary.annual` ({year,mean,tmin,tmax,incomplete}), `summary.anomaly`, `summary.rankings`, `summary.extremes`. No new file.

## 6. Records consistency (`src/lib/records.ts`, new)
- `type DayExtreme = { date: string; v: number }`
- `allTimeRank(values: number[], value: number, dir: 'warm'|'cold'): number` — `warm`: count(v' > value)+1; `cold`: count(v' < value)+1 (ties share rank).
- `mergeLiveExtreme(list: DayExtreme[], live: DayExtreme | null, dir): DayExtreme[]` — insert the live datum, sort (`warm` desc by v / `cold` asc), dedupe by date (live wins), return.
- **Today (Day mode, when today)** computes the all-time line via `allTimeRank(extremesValues + liveValue…)`; **Records tab** renders `mergeLiveExtreme(summary.extremes.warmest|coldest, liveToday)` (top 10), highlighting today if present. Both consume the live `{date: todayISO, v: tmax|tmin}` → guaranteed agreement. Records tab gains `useTodayTemp`.

## 7. Components / files
- `src/tabs/Today.tsx` → orchestrator: mode state, stepper, renders one of:
  - `src/tabs/today/DayView.tsx` (current Day content; live overlay only when today)
  - `src/tabs/today/MonthView.tsx`
  - `src/tabs/today/YearView.tsx`
  - `src/components/PeriodScatter.tsx` (shared scatter w/ period filter + high/low or mean series)
  - `src/components/Stepper.tsx` (◀ label ▶)
- `src/data/useMonth.ts` + loader `loadMonth(mm)`; `src/data/loader.ts` adds `month/MM.json`.
- `src/lib/records.ts` (consistency); `src/lib/format.ts` add month/day label helpers if needed.
- `src/tabs/Records.tsx` → use `mergeLiveExtreme` + `useTodayTemp`.
- Pipeline: `scripts/uccle/derive.py` add `monthly_means`, `month_series`/records/normal/thenNow; `build_data.py` emits `public/data/month/MM.json`; `types.ts` adds `MonthData`.

## 8. Testing
- **Pipeline (pytest):** monthly_means + completeness gate; month record/normal/thenNow; existing suite green.
- **lib (vitest):** `records.ts` (allTimeRank ties, mergeLiveExtreme dedupe/sort); month/day label formatters.
- **components (vitest):** Today mode toggle + stepper (default current, step changes label/data); DayView (today vs non-today); MonthView/YearView headline+rank; Records uses merged live (today appears at expected rank). Keep `App.test` ("This Day in History" default) green. Charts mock ResponsiveContainer; tests pristine.

## 9. Verification (item 4) — post-build workflow
A multi-agent workflow checks **≥200 screen states** (Day × sampled dates incl. all 12 month-1sts + extremes dates, Month × 12, Year × sampled incl. record years + recent + 1833):
- **Data consistency cross-screen:** Records #1 warm == that date's Day record high == all-time line; Month headline mean == its scatter point == recordWarm where applicable; Year rank == rankings; Today live rank == Records merged rank.
- **Accessibility:** every control has a label/role; toggle/stepper keyboard-reachable; color not sole signal (icons + text).
- **Layout:** responsive classes present; wide content scrolls in-container; no fixed widths forcing overflow; check at 360/768/1280 class behavior.
- Output: a report of mismatches/violations → fix wave. ⚠️ Pixel-true rendering is out of scope (no Playwright); the audit is data + markup + a few live-render spot checks.

## 10. Open questions
None blocking. Month-of-specific-year drill and Playwright visual harness are explicit non-goals / follow-ups.
