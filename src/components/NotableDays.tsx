import { useState } from 'react'
import { fmtMonth } from '../lib/format'
import type { DailyPoint } from '../types'

export default function NotableDays({ warmest, coldest, year, mm, onPick }: {
  warmest: DailyPoint[]; coldest: DailyPoint[]; year: number; mm: string; onPick: (iso: string) => void
}) {
  const [warm, setWarm] = useState(true)
  if (!warmest.length && !coldest.length) return null
  const list = warm ? warmest : coldest
  const accent = warm ? 'text-warm' : 'text-accent'
  const name = fmtMonth(mm)

  return (
    <div className="border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Notable days</p>
        <div role="radiogroup" aria-label="Notable day type" className="inline-flex border border-border text-sm">
          <button type="button" role="radio" aria-checked={warm} onClick={() => setWarm(true)}
            className={`px-3 py-1.5 font-semibold transition-colors ${warm ? 'bg-warm text-white' : 'text-muted hover:text-fg'}`}>Warmest</button>
          <button type="button" role="radio" aria-checked={!warm} onClick={() => setWarm(false)}
            className={`px-3 py-1.5 font-semibold transition-colors ${!warm ? 'bg-accent text-white' : 'text-muted hover:text-fg'}`}>Coldest</button>
        </div>
      </div>
      <ol className="mt-3 border-t border-border divide-y divide-border">
        {list.map((d, i) => {
          const v = warm ? d.tmax : d.tmin
          const rec = warm ? d.recHi : d.recLo
          const dnum = Number(d.mmdd.slice(2))
          const iso = `${year}-${mm}-${d.mmdd.slice(2)}`
          return (
            <li key={d.mmdd}>
              <button type="button" onClick={() => onPick(iso)}
                aria-label={`${dnum} ${name} ${year} — ${v.toFixed(1)}°${rec ? ', record' : ''}, rank ${i + 1}. Open this day`}
                className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-surface-2">
                <span className="flex-1 text-sm">{dnum} {name.slice(0, 3)}{rec ? ' · record' : ''}</span>
                <span className={`text-lg font-bold ${accent}`}>{v.toFixed(1)}<span className="ml-0.5 text-xs">°C</span></span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
