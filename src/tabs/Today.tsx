import { useState } from 'react'
import DayView from './today/DayView'
import MonthView from './today/MonthView'
import YearView from './today/YearView'
import Stepper from '../components/Stepper'
import { useSummary } from '../data/useSummary'
import { todayMMDD, fmtDayLabel, fmtMonth } from '../lib/format'

type Mode = 'day' | 'month' | 'year'
const MODES: Mode[] = ['day', 'month', 'year']
const HEADINGS: Record<Mode, string> = { day: 'This Day in History', month: 'This Month in History', year: 'This Year in History' }

// 366 calendar mmdd strings (leap year), for day stepping.
const CAL: string[] = (() => {
  const out: string[] = []
  const d = new Date(Date.UTC(2000, 0, 1))
  for (let i = 0; i < 366; i++) { out.push(`${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`); d.setUTCDate(d.getUTCDate() + 1) }
  return out
})()

export default function Today() {
  const { summary } = useSummary()
  const now = new Date()
  const realToday = todayMMDD()
  const [mode, setMode] = useState<Mode>('day')
  const [mmdd, setMmdd] = useState(realToday)
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState<number | null>(null)

  const minYear = summary?.annual?.[0]?.year ?? 1833
  const maxYear = summary?.annual?.length ? summary.annual[summary.annual.length - 1].year : now.getFullYear()
  const selYear = year ?? maxYear

  const stepDay = (d: number) => { const i = CAL.indexOf(mmdd); setMmdd(CAL[(i + d + 366) % 366]) }
  const stepMonth = (d: number) => setMonth(((month - 1 + d + 12) % 12) + 1)
  const stepYear = (d: number) => setYear(Math.min(maxYear, Math.max(minYear, selYear + d)))

  const stepper = mode === 'day'
    ? <Stepper label={fmtDayLabel(mmdd)} onPrev={() => stepDay(-1)} onNext={() => stepDay(1)} />
    : mode === 'month'
      ? <Stepper label={fmtMonth(String(month).padStart(2, '0'))} onPrev={() => stepMonth(-1)} onNext={() => stepMonth(1)} />
      : <Stepper label={String(selYear)} onPrev={() => stepYear(-1)} onNext={() => stepYear(1)} prevDisabled={selYear <= minYear} nextDisabled={selYear >= maxYear} />

  return (
    <section className="fade-in space-y-4">
      <h2 className="text-2xl font-extrabold tracking-tight">{HEADINGS[mode]}</h2>

      <div className="inline-flex rounded-lg border border-border bg-surface p-1 text-sm" role="group" aria-label="Granularity">
        {MODES.map(m => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
            className={`rounded-md px-3 py-1.5 capitalize ${mode === m ? 'bg-accent-soft font-semibold text-accent' : 'text-muted'}`}>{m}</button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface p-2">{stepper}</div>

      {mode === 'day' && <DayView mmdd={mmdd} isToday={mmdd === realToday} />}
      {mode === 'month' && <MonthView mm={String(month).padStart(2, '0')} currentYear={now.getFullYear()} />}
      {mode === 'year' && <YearView year={selYear} />}
    </section>
  )
}
