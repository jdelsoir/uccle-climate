# Today/homepage rework → specific-date navigator — Design Spec

**Date:** 2026-06-28
**Status:** Approved (brainstorming) — ready for implementation plan
**Builds on:** the shipped Uccle Climate PWA (Day/Month/Year Today tab).

## 1. Overview

Rework the Day view of the Today tab from an MMDD-across-years view into a **specific-date navigator**. The hero block drives navigation (prev/next day + calendar date-picker), clearly displays the date, shows two temperatures side-by-side colored vs the day's normal, works on any past date back to 1833 (showing record-broken + previous record), and a Then-vs-Now that compares decades 100 years apart relative to the viewed year. Month and Year modes are unchanged.

**Frontend-only.** No pipeline/data changes: `thisday/MMDD.json` (per-year `series` of {year,tmax,tmin} + all-time `recordHigh`/`recordLow`), `daynorm` (1991-2020 mean DOY normal), and the live Open-Meteo temp supply everything. Then-vs-Now decades are computed client-side from the series.

## 2. Goals / Non-goals

**Goals**
- Day view = a specific date (Y-M-D), default today; navigable 1833-01-01 → today.
- Hero drives nav: ◀/▶ step ±1 day; calendar icon → native date picker (min/max bounded).
- Date shown as weekday · ordinal day · month · year.
- Two temps, same level + same size: Max then Current (today) / Min (past dates), each colored vs the mean normal (±2°).
- Records side-by-side, clickable (navigate to that record's date); record-broken banner + previous record when the viewed date holds the record.
- Then-vs-Now: decades 100 years apart relative to viewed year; hidden if "then" empty.

**Non-goals**
- No changes to Month/Year modes or other tabs.
- No new pipeline data (deliberately using the existing mean normal — see §5 caveat).
- No future dates; no pre-1833 dates.

## 3. State & navigation
- DayView owns a `selectedDate` (a real `Date`, local), default = today. Today.tsx Day mode renders `<DayView/>` with **no external stepper** (Day nav lives in the hero). Month/Year keep their existing steppers + the mode toggle.
- Bounds: `MIN = 1833-01-01`, `MAX = today` (local). ◀ disabled at MIN, ▶ disabled at MAX. Stepping ±1 day crosses month/year boundaries.
- Calendar picker: a calendar-icon button that opens a native `<input type="date" min="1833-01-01" max={todayISO}>` (via `showPicker()` where available; the input is the labelled control). Selecting a date sets `selectedDate`.
- Deriving from `selectedDate`: `year`, `mmdd` (MM+DD), `isRealToday` (selectedDate === today). DayView loads `thisday/MMDD.json` for the current `mmdd` (re-fetch when mmdd changes).

## 4. Date display
`fmtWeekday(date)` → "Monday"; `ordinalDay(d)` → "1st"/"2nd"/"28th"; month full name; year. Rendered on one line, e.g. **"Monday · 28th · June · 2026"**, with ◀ before and ▶ + calendar icon after (or arrows flanking, calendar at the end).

## 5. Two temperatures + color
- **Source:** if `isRealToday` and live data present → Max = live forecast/observed max, second = live **Current** temp. Else (past date or no live) → look up `series.find(s => s.year === year)`; Max = that `tmax`, second = that `tmin` (**Min**). If the year is absent from the series → show "No data for this date." and omit the temp pair.
- **Layout:** two values on the same row, equal font size (e.g. `text-[40px] font-extrabold`), Max first then Current/Min, each with a small caption ("max" / "current" / "min").
- **Color (per temperature):** compare the value to the 1991-2020 **mean** DOY normal for this `mmdd` (`daynorm['1991-2020'].find(mmdd).normal`). `v − normal > 2` → red (`text-warm`); `< −2` → blue (`text-accent`); within ±2 → default (`text-fg`). If the normal is null, use default color.
- **Caveat (accepted):** comparing a max/min to a *mean* normal means Max usually reads red and Min usually reads blue; the ±2 band rarely lands neutral. This is the chosen behavior (no per-temp normals); revisit later if undesired.

## 6. Records — side by side, clickable, record-broken
- Render Record High and Record Low **next to each other** (`grid grid-cols-2 gap-3`, two columns at all widths). Each card: label, value (high=`text-warm`, low=`text-accent`), year.
- Each card is a **button/link** → navigates DayView to that record's date: `selectedDate = (recordHigh.year, mmdd)` (resp. low). Accessible name e.g. "Go to 1955-… record high".
- **Record-broken banner:** if `selectedDate`'s year `=== recordHigh.year` → the viewed date set the all-time high for this calendar day. Show a banner "Record high for this date!" plus the **previous record** = the max `tmax` among series years `< year` (with its year), e.g. "Previous: 12.1 °C (1947)". Symmetric for record low (`year === recordLow.year`, previous = min `tmin` among years `< year`). If no earlier years exist, omit "previous".

## 7. Then vs Now (100-year-apart decades, viewed-year-relative)
- `refYear = year` (the viewed date's year). Recent window = `[refYear-11 … refYear-1]`; Then window = `[refYear-111 … refYear-101]` (each 11 years inclusive; 100 years apart).
- `decadeMean(series, from, to)` = mean of `(tmax+tmin)/2` over series entries with `from ≤ year ≤ to`, rounded 1 dp; `null` if none.
- Render `then → now` with the year ranges, e.g. "1.9 °C (1915–1925) → 3.5 °C (2015–2025)". **Hide the whole row** when the Then window mean is null (no data 100 years back).

## 8. Keep
- The per-year High/Low `PeriodScatter` (unchanged) below the hero.
- A concise "Nth warmest on this date in N years" line in the hero (rank of the viewed date's tmax within `series`), kept per approval.

## 9. Components / files
- `src/tabs/today/DayView.tsx` — rewrite: owns `selectedDate`, hero with date-nav + two temps + record-broken; records grid; then-vs-now; scatter.
- `src/components/DateNav.tsx` (new) — ◀ label ▶ + calendar-icon picker; props `{ date, min, max, onChange }`.
- `src/lib/format.ts` — add `fmtWeekday(d)`, `ordinalDay(n)`, `isoOf(d)` (local YYYY-MM-DD); reuse `fmtMonth`, `fmtTemp`, `ordinal`.
- `src/lib/dayStats.ts` (new) or extend `stats.ts` — `decadeMean(series, from, to)`, `previousRecordHigh(series, year)`, `previousRecordLow(series, year)`.
- `src/tabs/Today.tsx` — Day mode: render `<DayView/>` without the external stepper (keep Month/Year steppers + mode toggle).

## 10. Testing
- **lib (vitest):** `fmtWeekday`/`ordinalDay`/`isoOf`; `decadeMean` (window math + null); `previousRecordHigh/Low` (excludes the record year, returns prior max/min + year).
- **DateNav:** renders label, ◀/▶ fire with bounds disabled, calendar input has min/max + fires onChange.
- **DayView (vitest, Recharts ResponsiveContainer mocked):**
  - real-today: shows Max + Current, colored; date line.
  - past date with data: Max + Min from series; weekday/ordinal correct.
  - record-broken: viewing the record year shows the banner + previous record; clicking a record card navigates (selectedDate changes → content updates).
  - then-vs-now: shown with correct windows; hidden when then-window empty (e.g. an early date).
  - no-data year: graceful message.
- Existing tests stay green (App.test "This Day in History"; Month/Year untouched). Tests pristine.

## 11. Open questions
None blocking. Mean-normal color caveat is accepted (§5).
