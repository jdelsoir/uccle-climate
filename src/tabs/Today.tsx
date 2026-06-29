import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import DayView from './today/DayView'
import MonthView from './today/MonthView'
import YearView from './today/YearView'
import { useSummary } from '../data/useSummary'
import { isoOf } from '../lib/format'

type Mode = 'day' | 'month' | 'year'
const MODES: Mode[] = ['day', 'month', 'year']
const HEADINGS: Record<Mode, string> = { day: 'This Day in History', month: 'This Month in History', year: 'This Year in History' }
const NOUN: Record<Mode, string> = { day: 'day', month: 'month', year: 'year' }
const MIN_DATE = new Date(1833, 0, 1)
const midnight = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }

export default function Today() {
  const { summary } = useSummary()
  const now = new Date()
  const [mode, setMode] = useState<Mode>('day')
  const [date, setDate] = useState<Date>(() => midnight(new Date()))
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState<number | null>(null)

  const years = summary?.annual?.map(a => a.year) ?? []
  const minYear = years.length ? Math.min(...years) : 1833
  const maxYear = years.length ? Math.max(...years) : now.getFullYear()
  const selYear = year ?? maxYear
  const mm = String(month).padStart(2, '0')
  const maxDate = midnight(now)

  const stepDay = (d: number) => { const x = new Date(date); x.setDate(x.getDate() + d); if (isoOf(x) >= isoOf(MIN_DATE) && isoOf(x) <= isoOf(maxDate)) setDate(midnight(x)) }
  const stepMonth = (d: number) => setMonth(((month - 1 + d + 12) % 12) + 1)
  const stepYear = (d: number) => setYear(Math.min(maxYear, Math.max(minYear, selYear + d)))

  let onPrev = () => {}, onNext = () => {}, onToday = () => {}, prevDisabled = false, nextDisabled = false, todayDisabled = false
  if (mode === 'day') {
    onPrev = () => stepDay(-1); onNext = () => stepDay(1)
    prevDisabled = isoOf(date) <= isoOf(MIN_DATE); nextDisabled = isoOf(date) >= isoOf(maxDate)
    onToday = () => setDate(midnight(new Date())); todayDisabled = isoOf(date) >= isoOf(maxDate)
  } else if (mode === 'month') {
    onPrev = () => stepMonth(-1); onNext = () => stepMonth(1)
    onToday = () => setMonth(now.getMonth() + 1); todayDisabled = month === now.getMonth() + 1
  } else {
    onPrev = () => stepYear(-1); onNext = () => stepYear(1)
    prevDisabled = selYear <= minYear; nextDisabled = selYear >= maxYear
    onToday = () => setYear(now.getFullYear()); todayDisabled = selYear === maxYear
  }

  return (
    <section className="fade-in space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-2xl font-extrabold tracking-tight">{HEADINGS[mode]}</h2>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onToday} disabled={todayDisabled} aria-label="Go to today"
            className="border border-border px-3 py-1 text-xs font-medium text-muted transition-colors hover:text-fg disabled:opacity-40 disabled:hover:text-muted">Today</button>
          <button type="button" onClick={onPrev} disabled={prevDisabled} aria-label={`Previous ${NOUN[mode]}`}
            className="grid h-9 w-9 place-items-center border border-border text-muted transition-colors hover:text-fg disabled:opacity-40"><ChevronLeft size={18} aria-hidden /></button>
          <button type="button" onClick={onNext} disabled={nextDisabled} aria-label={`Next ${NOUN[mode]}`}
            className="grid h-9 w-9 place-items-center border border-border text-muted transition-colors hover:text-fg disabled:opacity-40"><ChevronRight size={18} aria-hidden /></button>
        </div>
      </div>

      <div role="radiogroup" aria-label="Granularity" className="flex gap-6 border-b border-border">
        {MODES.map(m => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
            className={`-mb-px border-b-2 pb-2 text-sm capitalize transition-colors ${mode === m ? 'border-warm font-semibold text-fg' : 'border-transparent text-muted hover:text-fg'}`}>{m}</button>
        ))}
      </div>

      {mode === 'day' && <DayView date={date} min={MIN_DATE} max={maxDate} onChange={setDate} />}
      {mode === 'month' && <MonthView mm={mm} currentYear={now.getFullYear()} />}
      {mode === 'year' && <YearView year={selYear} />}
    </section>
  )
}
