import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  const [params] = useSearchParams()
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
    mo >= 1 && mo <= 12 && y >= 1833 && (y < now.getFullYear() || (y === now.getFullYear() && mo <= now.getMonth() + 1))
  const [month, setMonth] = useState(() => (mMatch && inMonthRange(+mMatch[1], +mMatch[2]) ? +mMatch[2] : now.getMonth() + 1))
  const [monthYear, setMonthYear] = useState(() => (mMatch && inMonthRange(+mMatch[1], +mMatch[2]) ? +mMatch[1] : now.getFullYear()))
  const [year, setYear] = useState<number | null>(null)

  const years = summary?.annual?.map(a => a.year) ?? []
  const minYear = years.length ? Math.min(...years) : 1833
  const maxYear = years.length ? Math.max(...years) : now.getFullYear()
  const selYear = year ?? maxYear
  const mm = String(month).padStart(2, '0')
  const maxDate = midnight(now)

  const stepDay = (d: number) => { const x = new Date(date); x.setDate(x.getDate() + d); if (isoOf(x) >= isoOf(MIN_DATE) && isoOf(x) <= isoOf(maxDate)) setDate(midnight(x)) }
  const monthIdx = monthYear * 12 + (month - 1)
  const MONTH_LO = 1833 * 12 + 0
  const MONTH_HI = now.getFullYear() * 12 + now.getMonth()
  const stepMonth = (d: number) => {
    const idx = monthIdx + d
    if (idx < MONTH_LO || idx > MONTH_HI) return
    setMonthYear(Math.floor(idx / 12)); setMonth((idx % 12) + 1)
  }
  const stepYear = (d: number) => setYear(Math.min(maxYear, Math.max(minYear, selYear + d)))

  let onPrev = () => {}, onNext = () => {}, onToday = () => {}, prevDisabled = false, nextDisabled = false, todayDisabled = false
  if (mode === 'day') {
    onPrev = () => stepDay(-1); onNext = () => stepDay(1)
    prevDisabled = isoOf(date) <= isoOf(MIN_DATE); nextDisabled = isoOf(date) >= isoOf(maxDate)
    onToday = () => setDate(midnight(new Date())); todayDisabled = isoOf(date) >= isoOf(maxDate)
  } else if (mode === 'month') {
    onPrev = () => stepMonth(-1); onNext = () => stepMonth(1)
    prevDisabled = monthIdx <= MONTH_LO; nextDisabled = monthIdx >= MONTH_HI
    onToday = () => { setMonthYear(now.getFullYear()); setMonth(now.getMonth() + 1) }
    todayDisabled = monthIdx >= MONTH_HI
  } else {
    onPrev = () => stepYear(-1); onNext = () => stepYear(1)
    prevDisabled = selYear <= minYear; nextDisabled = selYear >= maxYear
    onToday = () => setYear(now.getFullYear()); todayDisabled = selYear === maxYear
  }

  const openDay = (iso: string) => { setDate(midnight(new Date(iso + 'T00:00:00'))); setMode('day') }
  const openMonth = (y: number, mo: number) => { if (inMonthRange(y, mo)) { setMonthYear(y); setMonth(mo) } }

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
      {mode === 'month' && <MonthView year={monthYear} mm={mm} onPickDay={openDay} onPickMonth={openMonth} />}
      {mode === 'year' && <YearView year={selYear} />}
    </section>
  )
}
