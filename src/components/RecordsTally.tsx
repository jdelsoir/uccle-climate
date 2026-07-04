import { useState } from 'react'
import { fmtMonth } from '../lib/format'
import type { DailyPoint } from '../types'

export default function RecordsTally({ year, days, onPickDay }: {
  year: number; days: DailyPoint[]; onPickDay: (iso: string) => void
}) {
  const [warm, setWarm] = useState(true)
  const highs = days.filter(d => d.recHi).sort((a, b) => b.tmax - a.tmax)
  const lows = days.filter(d => d.recLo).sort((a, b) => a.tmin - b.tmin)
  if (!highs.length && !lows.length) return null
  const list = warm ? highs : lows
  const accent = warm ? 'text-warm' : 'text-accent'
  return (
    <div className="border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Daily records set in {year}</p>
        <div role="radiogroup" aria-label="Record type" className="inline-flex border border-border text-sm">
          <button type="button" role="radio" aria-checked={warm} onClick={() => setWarm(true)}
            className={`px-3 py-1.5 font-semibold transition-colors ${warm ? 'bg-warm text-white' : 'text-muted hover:text-fg'}`}>{highs.length} highs</button>
          <button type="button" role="radio" aria-checked={!warm} onClick={() => setWarm(false)}
            className={`px-3 py-1.5 font-semibold transition-colors ${!warm ? 'bg-accent text-white' : 'text-muted hover:text-fg'}`}>{lows.length} lows</button>
        </div>
      </div>
      <ol className="mt-3 border-t border-border divide-y divide-border">
        {list.map(d => {
          const v = warm ? d.tmax : d.tmin
          const mm = d.mmdd.slice(0, 2), dd = d.mmdd.slice(2)
          const name = fmtMonth(mm)
          const iso = `${year}-${mm}-${dd}`
          return (
            <li key={d.mmdd}>
              <button type="button" onClick={() => onPickDay(iso)}
                aria-label={`${Number(dd)} ${name} ${year} — record ${warm ? 'high' : 'low'} ${v.toFixed(1)}°. Open this day`}
                className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-surface-2">
                <span className="flex-1 text-sm">{Number(dd)} {name.slice(0, 3)}</span>
                <span className={`text-lg font-bold ${accent}`}>{v.toFixed(1)}<span className="ml-0.5 text-xs">°C</span></span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
