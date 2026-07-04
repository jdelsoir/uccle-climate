import { tempColor } from '../lib/dayStats'
import { fmtMonth } from '../lib/format'
import type { YearData } from '../types'
import WeatherGlyph from './WeatherGlyph'

const TINT: Record<string, string> = { 'text-warm': 'bg-warm/15', 'text-accent': 'bg-accent/15', 'text-fg': 'bg-surface-2' }

export default function MonthGrid({ year, months, onPickMonth }: {
  year: number; months: YearData
  onPickMonth: (year: number, month: number) => void
}) {
  const byMm = new Map(months.map(e => [e.mm, e]))
  return (
    <div className="border border-border bg-surface p-4">
      <p className="mb-2 text-[11px] uppercase tracking-[0.09em] text-muted">{year} month by month</p>
      <div role="grid" aria-label={`${year} monthly means`} className="grid grid-cols-3 gap-1 text-center">
        {Array.from({ length: 12 }).map((_, i) => {
          const m = i + 1
          const mm = String(m).padStart(2, '0')
          const name = fmtMonth(mm)
          const e = byMm.get(mm)
          if (!e) {
            return <div key={mm} role="gridcell" aria-label={`${name} ${year} — no data`} className="min-h-[64px] bg-surface-2/40" />
          }
          const recHi = !!e.recHi, recLo = !!e.recLo
          const recClause = recHi ? `, warmest ${name} on record` : recLo ? `, coldest ${name} on record` : ''
          const tint = TINT[tempColor(e.mean, e.normal)]
          return (
            <button key={mm} type="button" role="gridcell" onClick={() => onPickMonth(year, m)}
              aria-label={`${name} ${year} — mean ${e.mean.toFixed(1)}°${recClause}. Open this month`}
              className={`relative min-h-[64px] overflow-hidden ${tint} p-2 text-left transition-colors hover:ring-1 hover:ring-border`}>
              {(recHi || recLo) && (
                <WeatherGlyph tone={recHi ? 'warm' : 'cool'} intensity={0.5} className="absolute inset-0 z-0 h-full w-full" />
              )}
              <span className="relative z-10 block text-[11px] font-bold text-fg">{name.slice(0, 3).toUpperCase()}</span>
              <span className="relative z-10 block text-[13px] text-muted">{Math.round(e.mean)}°</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
