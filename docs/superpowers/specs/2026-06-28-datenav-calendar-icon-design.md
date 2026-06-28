# DateNav calendar-icon redesign — design

**Date:** 2026-06-28
**Status:** approved (brainstorm)

## Problem / goal

Rework the Day-view date navigator (`src/components/DateNav.tsx`) so the date is shown as a
3D-style daily-calendar icon (red month header + big day number, like a tear-off calendar),
built entirely in CSS (no image assets), responsive across smartphone / tablet / desktop.

Requirements (from the user):
- Calendar-icon "card" on the **right** part of the nav block.
- Prev / next arrows **below** that card.
- Still show the date as text.
- Built in CSS — no image assets.
- Works on multiple screen sizes (smartphone, tablet, desktop).
- Clicking the card opens the date picker.
- Easy to change month / year / day and to go back to today.

## Decisions (locked in brainstorm)

- **Picker:** OS-**native** date picker (`showPicker()` with focus/click fallback) — gives
  month/year/day navigation for free, responsive, accessible, zero-dependency. A separate
  **Today** button covers jump-to-today (native pickers have no "today" shortcut).
- **Layout:** calendar card on the right; full date text + Today button on the left; prev/next
  arrows directly below the card.
- **No custom popover**, no separate month/year selectors, no skeuomorphic long shadow (YAGNI).

## Component

Rework `src/components/DateNav.tsx` **only**. Props are **unchanged** —
`{ date: Date; min: Date; max: Date; onChange: (d: Date) => void }` — so `DayView` and the
existing call site need no changes. One color token is added to `src/index.css`.

"Today" target = `max`: in `DayView`, `max = midnight(new Date())` is today, so jumping to today
means `onChange(max)`. No new prop needed.

## Layout (responsive)

Block is a flex row, `items-start justify-between`, wrap-friendly:

```
┌──────────────────────────────┐
│ Saturday            ┌──────┐  │
│ 27 June 2026        │ JUNE │  │   ← red header (month)
│ [Today]             │  27  │  │   ← white body (day number)
│                     └──────┘  │
│                       ◀   ▶   │   ← arrows below card
└──────────────────────────────┘
```

- **Left column** (`flex flex-col gap-1`): weekday (`text-muted`, e.g. "Saturday"); the date
  line `27 June 2026` (`text-fg`, semibold); the **Today** button (small pill).
- **Right column** (`flex flex-col items-center gap-2`): the calendar card, then the arrows row.
- The card is fixed (~80 px); the left text flexes. Verified targets: **320 / 768 / 1024 px**.
  `flex-wrap` lets the left column drop above the card if the viewport is extremely narrow.

## CSS calendar card (no images)

A `<button>`, ~80 px square, `rounded-xl shadow-md border border-border`, `overflow-visible`:

- **Binding tabs:** two ~6×12 px `rounded` bars, `bg-muted`, absolutely positioned straddling
  the top edge (decorative, `aria-hidden`).
- **Header** (~38 % height): `bg-cal-header` (red), `text-white`, the month name uppercase,
  bold, centered, `tracking-wide`, small (~11 px) so the longest month ("September") fits the
  fixed width.
- **Body:** `bg-surface`, the day-of-month number large (`text-3xl`-ish) `text-fg` extrabold,
  centered.
- Reflects the **currently viewed** date; updates as the user navigates.
- **Open the picker** on click / Enter / Space: call the hidden input's `showPicker()`, falling
  back to `focus()` + `click()`. The button has `aria-label="Change date — Saturday 27 June 2026"`
  (full viewed date) and `aria-haspopup`.
- The hidden `<input type="date">` is retained (`sr-only`, `aria-hidden`, `tabIndex=-1`), with
  `value=iso`, `min`/`max`, and an `onChange` that clamps the typed value into `[min, max]` before
  calling `onChange` — same mechanism as today.

## Arrows

- ◀ ▶ in a row centered below the card. `aria-label` "Previous day" / "Next day".
- Disabled at bounds via the existing `step(delta)` + `prevDisabled`/`nextDisabled` logic
  (a single day step, clamped to `[min, max]`).

## Today button

- Label "Today", `aria-label="Go to today"`. `onClick={() => onChange(max)}`.
- Disabled when `isoOf(date) === isoOf(max)` (already on today).

## Tokens / theme

- Add `--cal-header:#dc2626` to both `:root` and `.dark` in `src/index.css`, plus
  `--color-cal-header: var(--cal-header)` in the `@theme inline` block → `bg-cal-header` utility.
- White text on `#dc2626` = 4.5:1 contrast (AA). Body/number/border/tabs use existing tokens
  (`surface` / `fg` / `border` / `muted`), so the card flips with theme: light = white body,
  dark = dark body, red header in both. Only literal hex stays in the token definition (consistent
  with the project's "tokens, not hex" rule — hex lives in `index.css` token defs).

## a11y

- Card button has the full-date accessible name; decorative binding tabs `aria-hidden`.
- Arrows and Today have accessible names; disabled states reflected.
- Hidden date input stays `aria-hidden` / `tabIndex=-1` (not a duplicate tab stop).

## Testing (`src/components/DateNav.test.tsx`)

Keep:
- "Next day" disabled when `date === max`.
- Click "Previous day" → `onChange` called with the previous day (28 → 27).
- Changing the hidden `input[type="date"]` → `onChange` with the parsed/clamped date (year 2000).

Update for the new structure:
- The date text assertion → weekday + `27 June 2026` (new format, not the old `·`-separated label).
- The picker control's accessible name → the new `aria-label` (`/Change date/`).
- The card shows the month (`JUNE`) and the day (`28`).

Add:
- **Today** button calls `onChange(max)` and is **disabled** when `date === max`.
- Clicking the card opens the picker (assert the hidden `input[type="date"]` is present and the
  card click path runs — `showPicker` is undefined in jsdom, so assert the focus/click fallback
  doesn't throw and the input exists).

`DayView.test.tsx` already queries `input[type="date"]` directly (still present) — no change needed
there.

## Out of scope (YAGNI)

Custom date-picker popover; separate month/year dropdowns; skeuomorphic long drop-shadow;
animation; changing `DateNav`'s props or `DayView`.
