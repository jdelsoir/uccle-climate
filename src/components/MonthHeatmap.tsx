import { tempColor } from '../lib/dayStats'
import { fmtMonth, todayISO } from '../lib/format'
import type { DailyPoint } from '../types'

const WD = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const TINT: Record<string, string> = { 'text-warm': 'bg-warm/15', 'text-accent': 'bg-accent/15', 'text-fg': 'bg-surface-2' }

export default function MonthHeatmap({ year, mm, days, normalFor, liveToday, onPick }: {
  year: number; mm: string; days: DailyPoint[]
  normalFor: (mmdd: string) => number | null
  liveToday?: { mmdd: string; tmax: number } | null
  onPick: (iso: string) => void
}) {
  const m = Number(mm)
  const dim = new Date(year, m, 0).getDate()                 // last day of month
  const lead = (new Date(year, m - 1, 1).getDay() + 6) % 7   // Monday-start leading blanks
  const byMmdd = new Map(days.map(d => [d.mmdd, d]))
  const todayI = todayISO()
  const name = fmtMonth(mm)

  return (
    <div className="border border-border bg-surface p-5">
      <p className="mb-3 text-[11px] uppercase tracking-[0.09em] text-muted">{name} {year} day by day</p>
      <div role="grid" aria-label={`${name} ${year} daily highs`} className="grid grid-cols-7 gap-1 text-center">
        {WD.map(w => <div key={w} role="columnheader" className="pb-1 text-[10px] font-medium text-muted">{w}</div>)}
        {Array.from({ length: lead }).map((_, i) => <div key={`b${i}`} aria-hidden />)}
        {Array.from({ length: dim }).map((_, i) => {
          const dnum = i + 1
          const dd = String(dnum).padStart(2, '0')
          const mmdd = mm + dd
          const iso = `${year}-${mm}-${dd}`
          const stored = byMmdd.get(mmdd) ?? null
          const live = !stored && liveToday?.mmdd === mmdd
          const tmax = stored ? stored.tmax : live ? liveToday!.tmax : null
          const rec = !!stored && (stored.recHi || stored.recLo)
          const future = iso > todayI
          const tint = !future && tmax != null ? TINT[tempColor(tmax, normalFor(mmdd))] : 'bg-surface-2/40'
          const label = tmax != null
            ? `${name} ${dnum}, ${year} — high ${tmax.toFixed(1)}°${rec ? ', record' : ''}${live ? ', today' : ''}`
            : `${name} ${dnum}, ${year} — no data`
          if (tmax == null || future) { // future days inert even if data leaked in (pipeline strips dates >= today)
            return <div key={dnum} role="gridcell" aria-label={label} className={`min-h-[52px] ${tint}`} />
          }
          return (
            <button key={dnum} type="button" role="gridcell" onClick={() => onPick(iso)} aria-label={`${label}. Open this day`}
              className={`min-h-[52px] ${tint} p-1 text-left transition-colors hover:ring-1 hover:ring-border`}>
              <span className="block text-[11px] font-bold text-fg">{dnum}{rec && <span className="ml-0.5 text-warm" aria-hidden>•</span>}</span>
              <span className="block text-[11px] text-muted">{Math.round(tmax)}°</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
