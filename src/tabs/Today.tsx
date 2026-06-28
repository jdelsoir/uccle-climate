import { useState } from 'react'
import DayView from './today/DayView'
import MonthView from './today/MonthView'
import YearView from './today/YearView'
import Stepper from '../components/Stepper'
import { useSummary } from '../data/useSummary'
import { fmtMonth } from '../lib/format'

type Mode = 'day' | 'month' | 'year'
const MODES: Mode[] = ['day', 'month', 'year']
const HEADINGS: Record<Mode, string> = { day: 'This Day in History', month: 'This Month in History', year: 'This Year in History' }

export default function Today() {
  const { summary } = useSummary()
  const now = new Date()
  const [mode, setMode] = useState<Mode>('day')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState<number | null>(null)

  const years = summary?.annual?.map(a => a.year) ?? []
  const minYear = years.length ? Math.min(...years) : 1833
  const maxYear = years.length ? Math.max(...years) : now.getFullYear()
  const selYear = year ?? maxYear
  const mm = String(month).padStart(2, '0')

  const stepMonth = (d: number) => setMonth(((month - 1 + d + 12) % 12) + 1)
  const stepYear = (d: number) => setYear(Math.min(maxYear, Math.max(minYear, selYear + d)))

  return (
    <section className="fade-in space-y-4">
      <h2 className="text-2xl font-extrabold tracking-tight">{HEADINGS[mode]}</h2>

      <div className="inline-flex rounded-lg border border-border bg-surface p-1 text-sm" role="radiogroup" aria-label="Granularity">
        {MODES.map(m => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
            className={`rounded-md px-3 py-1.5 capitalize ${mode === m ? 'bg-accent-soft font-semibold text-accent' : 'text-muted'}`}>{m}</button>
        ))}
      </div>

      {mode === 'month' && <div className="rounded-xl border border-border bg-surface p-2">
        <Stepper label={fmtMonth(mm)} onPrev={() => stepMonth(-1)} onNext={() => stepMonth(1)} unit="month" /></div>}
      {mode === 'year' && <div className="rounded-xl border border-border bg-surface p-2">
        <Stepper label={String(selYear)} onPrev={() => stepYear(-1)} onNext={() => stepYear(1)} prevDisabled={selYear <= minYear} nextDisabled={selYear >= maxYear} unit="year" /></div>}

      {mode === 'day' && <DayView />}
      {mode === 'month' && <MonthView mm={mm} currentYear={now.getFullYear()} />}
      {mode === 'year' && <YearView year={selYear} />}
    </section>
  )
}
