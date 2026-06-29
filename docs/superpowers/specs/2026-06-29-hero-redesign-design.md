# Today-tab hero redesign — design spec

**Date:** 2026-06-29
**Scope:** Redesign the Today-tab hero (Day view), then cascade the same visual language to the Month and Year heroes. Content below the hero (RangeBar, stat cards, warming strip, scatter) is unchanged. Mockup: `Screenshot 2026-06-29 at 13.43.04.png` (5 weather states).

## Goal

Turn the hero from a label + temp + rank-pill block into a **state-driven** block: a one-word weather-state eyebrow, the big temp, an anomaly delta line, a state-colored banner pill, and a decorative sun/snowflake glyph with a tinted gradient backdrop whose intensity scales with the anomaly.

The five illustrative states (mockup):

| State key | Eyebrow | Tone | Glyph | Banner (Day) |
|---|---|---|---|---|
| `record-hot` | RECORD HOT BROKEN | warm | full sun | New record · hottest {day} since {firstYear} |
| `above` | ABOVE AVERAGE | warm | sun, mid | {Nth} warmest {day} since {firstYear} |
| `close` | CLOSE TO AVERAGE | neutral | faint gray sun | A typical {day} |
| `below` | BELOW AVERAGE | cool | snowflake, mid | Cooler than usual for {day} |
| `record-cold` | COLD RECORD BROKEN | cool | full snowflake | New record · coldest {day} since {firstYear} |

## Decisions (from brainstorm)

- **Scope:** Day hero first, then cascade Month/Year heroes. Below-hero content unchanged.
- **State thresholds:** record flags override; else `delta ≥ +2` → above, `delta ≤ −2` → below, else close. Reuses the existing `tempColor` ±2° convention — one source of truth for color, word, and glyph.
- **Glyph/gradient intensity:** continuous, `min(|delta| / 10, 1)`, capped at ±10°; record states forced to full (1). Faint gray when within ±2.
- **Banner:** exact mockup phrasing. **On record days, add a small subline** under the banner: `beat {prev}° from {prevYear}` (preserves the previous-record fact the mockup banner drops). Below-average stays the generic "Cooler than usual" (no cold rank).
- **No new color hex:** tints via Tailwind opacity modifiers on existing tokens (`bg-warm/12`, `bg-accent/12`). Solid record banners use `bg-warm`/`bg-accent` + white text.
- **Square corners** throughout (existing Today-tab decision).

## Components

### A. State engine — `src/lib/heroState.ts` (new, pure)

```ts
type HeroTone = 'warm' | 'neutral' | 'cool'
type HeroKey  = 'record-hot' | 'above' | 'close' | 'below' | 'record-cold'
interface HeroState { key: HeroKey; word: string; tone: HeroTone; intensity: number; delta: number | null }

heroState({ value, normal, brokeHigh, brokeLow }): HeroState
```

Logic:
- `delta = value − normal` (rounded 0.1), or `null` if either missing.
- `brokeHigh` → `record-hot` (warm, intensity 1). `brokeLow` → `record-cold` (cool, intensity 1). (High wins if both, but that cannot occur.)
- else by delta: `≥ +2` → `above`/warm; `≤ −2` → `below`/cool; else `close`/neutral.
- `intensity = key is record ? 1 : min(|delta| / 10, 1)`; `0` when `delta == null`.
- `word`: the eyebrow text from the table.

Words live here so Day/Month/Year stay consistent. Banner/subline text is built by the view (phrasing differs Day vs Month/Year), not by `heroState`.

**Tests:** boundary at exactly ±2 (→ above/below, not close); record override beats large opposite delta; intensity cap at |delta|≥10; sign→tone; `delta == null` → neutral, intensity 0.

### B. `src/components/WeatherGlyph.tsx` (new)

Inline SVG, no external assets (CSP/offline). `aria-hidden` (decorative — state is conveyed by real text). Props: `{ tone: HeroTone; intensity: number; className? }`.

- `tone === 'cool'` → **snowflake** (6-fold spokes + branches), color `text-accent`.
- else → **sun** (central disk + radiating rays), color `text-warm`; **neutral** renders desaturated/gray (`text-muted`) at low opacity.
- Opacity and ray-length (or stroke emphasis) scale with `intensity`. At `intensity 0` the glyph is barely visible (matches the faint gray sun in the "close" mockup state).
- Uses `currentColor` so the color comes from the className token; opacity from `intensity`.

**Tests:** renders `<svg aria-hidden>`; sun vs snowflake selected by tone; intensity drives opacity (e.g. 1 vs 0 differ).

### C. `src/components/HeroShell.tsx` (new)

The reusable frame that gives the cascade. Props: `{ tone, intensity, children }`.

- Outer: `relative overflow-hidden border border-border bg-surface p-5` — **square corners**.
- Absolute backdrop layer (`z-0`, `pointer-events-none`): a gradient tint from the right, color by tone (`warm`/`accent`/none), opacity ∝ `intensity` (none within ±2 / neutral).
- `WeatherGlyph` pinned right (`z-0`, `pointer-events-none`), sized to ~40% width, vertically centered, clipped by `overflow-hidden`.
- `children` wrapped in a `relative z-10` layer so text/temps always sit above the glyph.
- Dark mode: opacity-based tints over `bg-surface` adapt automatically.

### D. Hero content (composed inside HeroShell)

Day view (`DayView.tsx`):
- Calendar tile (left, unchanged).
- **Eyebrow = `state.word`** (replaces the "TODAY'S HIGH" / "HIGH" label). Today still shows the high as the big number and NOW as the secondary.
- `BigTemp v={highV}` colored by tone (warm→`text-warm`, cool→`text-accent`, neutral→`text-fg`). Reuse `tempColor` where equivalent.
- **NOW/LOW** top-right (Day only): label + value (today = live `now`, past = `Low`).
- **Delta line** under the big temp — the **signed** delta + descriptor (delta already carries its sign; do not re-negate):
  - above / record-hot → `{+delta}° above the 1991–2020 average` (e.g. `+8.9° above…`)
  - below / record-cold → `{delta}° below the 1991–2020 average` (delta already negative → e.g. `−4.7° below…`)
  - close → `{±delta}° vs the average` (e.g. `+0.7° vs the average`)
  - Use a real minus sign (`−`, U+2212) for negative values, `+` prefix for positive.
- **Banner pill** (square, `z-10`): per state table. Styling by tone:
  - record → `bg-warm` / `bg-accent` + white text (solid)
  - above / below → `bg-warm/12 text-warm` / `bg-accent/12 text-accent`
  - close → neutral `bg-fg/5 text-muted`
- **Prev-record subline** (record days only): `beat {prevHigh.v}° from {prevHigh.year}` (or low). Uses existing `previousRecordHigh/Low`.
- **Provisional marker** preserved (small muted note).

The current rank pill and the separate record-broken text line are **removed** — their information now lives in the banner (+ subline).

### E. Cascade — Month & Year

`MonthView.tsx` / `YearView.tsx` reuse `HeroShell` + `heroState` + `WeatherGlyph`:
- `value` = monthly/annual `mean`; `normal` = that view's `normal`.
- `brokeHigh` = `recordWarm.year === currentYear` (and the year/month is complete); `brokeLow` = `recordCold.year === currentYear`.
- No NOW/LOW slot (no live datum) — top-right omitted.
- Banner phrasing (matches existing "in N years" style, not "since YYYY"):
  - record-hot → `Warmest {name} on record` (Year: `Warmest year on record`)
  - above → `{Nth} warmest {name} in {N} years`
  - close → `A typical {name}` (Year: `A typical year`)
  - below → `Cooler than usual` (kept generic, parallel to Day)
  - record-cold → `Coldest {name} on record`
- Incomplete current month/year: keep the existing "(so far)" treatment; suppress record/rank banner when incomplete (show a neutral "(so far)" state), matching current behavior.
- Eyebrow: the state word.

### F. Below the hero — unchanged

RangeBar "where it sits", 2×2 stat cards, WarmingStrip, PeriodScatter stay exactly as they are in all three views.

## Constraints honored

- **No PII** anywhere (org policy) — derived stats + "Uccle, Brussels" only.
- **No external fonts/CDNs/assets** — glyph is inline SVG.
- **Tokens, not hex** — color via `warm`/`accent`/`fg`/`muted` (+ opacity modifiers); no new literal hex.
- **Light + dark** via existing `.dark` tokens; tints are opacity over `bg-surface`.
- **Responsive 375 / 768 / 1280, no horizontal overflow** — glyph is absolute + clipped, content `min-w-0`, NOW wraps on narrow widths. Verified live light + dark per standing workflow.
- **a11y** — glyph `aria-hidden`; eyebrow/banner/subline are real text; RangeBar keeps its text summary.

## Testing

- `heroState` unit tests (boundaries, override, cap, tone, null).
- `WeatherGlyph` render test (tone→shape, aria-hidden, intensity→opacity).
- `HeroShell` render test (renders children, applies tone class).
- Update `DayView.test.tsx`, `MonthView.test.tsx`, `YearView.test.tsx`: assert state word, delta line wording, banner per state, prev-record subline on record days, NOW/LOW for today/past, incomplete suppression. Derive mmdd from `todayMMDD()` (no date-coupled fixtures).
- Keep test output pristine (mock Recharts `ResponsiveContainer`; `vi.unstubAllGlobals()` after fetch stubs).

## Out of scope / non-goals

- No change to data pipeline, JSON shapes, or below-hero components.
- No new color tokens unless an opacity modifier genuinely cannot express a tint (default: avoid).
- Records/extremes provisional-blindness unchanged (existing known fast-follow).

## Standing workflow

Per CLAUDE.md: tests → commit → `git push origin main` (CI deploys to Pages) → independently verify on the live site (Day/Month/Year × light/dark × 375/768/1280, no overflow) before calling it done.
