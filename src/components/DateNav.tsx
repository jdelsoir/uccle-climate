import { ChevronLeft, ChevronRight } from 'lucide-react'
import { fmtWeekday, fmtMonth, isoOf } from '../lib/format'
import { useRef } from 'react'

export default function DateNav({ date, min, max, onChange }: {
  date: Date; min: Date; max: Date; onChange: (d: Date) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const iso = isoOf(date)
  const prevDisabled = iso <= isoOf(min)
  const nextDisabled = iso >= isoOf(max)
  const onToday = iso >= isoOf(max)            // max = today (DayView passes midnight(now))
  const step = (delta: number) => {
    const d = new Date(date); d.setDate(d.getDate() + delta)
    if (isoOf(d) >= isoOf(min) && isoOf(d) <= isoOf(max)) onChange(d)
  }
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const month = fmtMonth(mm)
  const dateText = `${date.getDate()} ${month} ${date.getFullYear()}`
  const fullLabel = `${fmtWeekday(date)} ${dateText}`
  const openPicker = () => {
    const el = inputRef.current
    if (!el) return
    if (typeof el.showPicker === 'function') { try { el.showPicker(); return } catch { /* fall through */ } }
    el.focus(); el.click()
  }
  const clampIso = (v: string) => (v < isoOf(min) ? isoOf(min) : v > isoOf(max) ? isoOf(max) : v)

  return (
    <div className="flex items-start justify-between gap-3">
      {/* Left: date text + Today */}
      <div className="flex flex-col items-start gap-1.5">
        <span className="text-sm text-muted">{fmtWeekday(date)}</span>
        <span className="text-lg font-semibold leading-tight text-fg">{dateText}</span>
        <button type="button" aria-label="Go to today" onClick={() => onChange(max)} disabled={onToday}
          className="mt-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted transition-colors hover:text-fg disabled:cursor-default disabled:opacity-40 disabled:hover:text-muted">
          Today
        </button>
      </div>

      {/* Right: calendar-icon card, prev/next below */}
      <div className="flex shrink-0 flex-col items-center gap-2">
        <button type="button" onClick={openPicker} aria-haspopup="dialog"
          aria-label={`Change date — ${fullLabel}`}
          className="relative w-20 transition-transform hover:-translate-y-0.5 focus-visible:-translate-y-0.5">
          {/* binding tabs (decorative) */}
          <span aria-hidden className="absolute -top-1 left-[34%] z-10 h-3 w-1.5 -translate-x-1/2 rounded-full bg-muted" />
          <span aria-hidden className="absolute -top-1 left-[66%] z-10 h-3 w-1.5 -translate-x-1/2 rounded-full bg-muted" />
          <span className="block overflow-hidden rounded-xl border border-border shadow-md">
            <span className="block bg-cal-header py-1 text-center text-[11px] font-bold leading-none tracking-wide text-white">{month.toUpperCase()}</span>
            <span className="block bg-surface py-2 text-center text-3xl font-extrabold leading-none text-fg">{date.getDate()}</span>
          </span>
        </button>

        <div className="flex items-center gap-3">
          <button type="button" aria-label="Previous day" onClick={() => step(-1)} disabled={prevDisabled}
            className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:text-fg disabled:opacity-40">
            <ChevronLeft size={18} aria-hidden />
          </button>
          <button type="button" aria-label="Next day" onClick={() => step(1)} disabled={nextDisabled}
            className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:text-fg disabled:opacity-40">
            <ChevronRight size={18} aria-hidden />
          </button>
        </div>
      </div>

      <input ref={inputRef} type="date" tabIndex={-1} aria-hidden className="sr-only"
        value={iso} min={isoOf(min)} max={isoOf(max)}
        onChange={e => { if (e.target.value) onChange(new Date(clampIso(e.target.value) + 'T00:00:00')) }} />
    </div>
  )
}
