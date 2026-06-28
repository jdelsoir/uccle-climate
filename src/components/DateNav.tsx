import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { fmtWeekday, ordinalDay, fmtMonth, isoOf } from '../lib/format'
import { useRef } from 'react'

export default function DateNav({ date, min, max, onChange }: {
  date: Date; min: Date; max: Date; onChange: (d: Date) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const iso = isoOf(date)
  const prevDisabled = iso <= isoOf(min)
  const nextDisabled = iso >= isoOf(max)
  const step = (delta: number) => {
    const d = new Date(date); d.setDate(d.getDate() + delta)
    if (isoOf(d) >= isoOf(min) && isoOf(d) <= isoOf(max)) onChange(d)
  }
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const label = `${fmtWeekday(date)} · ${ordinalDay(date.getDate())} · ${fmtMonth(mm)} · ${date.getFullYear()}`
  const openPicker = () => {
    const el = inputRef.current
    if (!el) return
    if (typeof el.showPicker === 'function') { try { el.showPicker(); return } catch { /* fall through */ } }
    el.focus(); el.click()
  }
  const clampIso = (v: string) => (v < isoOf(min) ? isoOf(min) : v > isoOf(max) ? isoOf(max) : v)
  return (
    <div className="flex items-center justify-between gap-2">
      <button type="button" aria-label="Previous day" onClick={() => step(-1)} disabled={prevDisabled}
        className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:text-fg disabled:opacity-40">
        <ChevronLeft size={18} />
      </button>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{label}</span>
        <div className="relative">
          <button type="button" aria-label="Pick a date" onClick={openPicker}
            className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:text-fg">
            <Calendar size={16} aria-hidden />
          </button>
          <input ref={inputRef} type="date" tabIndex={-1} aria-hidden className="sr-only"
            value={iso} min={isoOf(min)} max={isoOf(max)}
            onChange={e => { if (e.target.value) onChange(new Date(clampIso(e.target.value) + 'T00:00:00')) }} />
        </div>
      </div>
      <button type="button" aria-label="Next day" onClick={() => step(1)} disabled={nextDisabled}
        className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:text-fg disabled:opacity-40">
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
