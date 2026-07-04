import { anomalyColor } from '../lib/colorScale'
import type { DailyPoint } from '../types'

const H = 48
const CUM = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334] // days before each month (non-leap)

export default function YearStrip({ year, days, normalFor }: {
  year: number; days: DailyPoint[]; normalFor: (mmdd: string) => number | null
}) {
  if (!days.length) return null
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  const daysInYear = leap ? 366 : 365
  const w = 100 / daysInYear                                  // full-year width → a partial year fills only "up to now"
  const doyOf = (mmdd: string) => {
    const m = Number(mmdd.slice(0, 2)), day = Number(mmdd.slice(2))
    return CUM[m - 1] + day + (leap && m > 2 ? 1 : 0)         // 1..daysInYear
  }
  let warm = 0, cool = 0
  const rects = days.map(d => {
    const normal = normalFor(d.mmdd)
    const anom = normal == null ? null : (d.tmax + d.tmin) / 2 - normal
    if (anom != null) { if (anom > 0) warm++; else if (anom < 0) cool++ }
    const fill = anom == null ? 'var(--surface-2)' : anomalyColor(anom)
    return <rect key={d.mmdd} x={(doyOf(d.mmdd) - 1) * w} y={0} width={w + 0.3} height={H} fill={fill} />
  })
  return (
    <div className="border border-border bg-surface p-4">
      <p className="mb-2 text-[11px] uppercase tracking-[0.09em] text-muted">{year} day by day</p>
      <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" width="100%" height={H} className="block"
        role="img" aria-label={`${year}: ${warm} days warmer, ${cool} days cooler than the 1991–2020 normal`}>
        {rects}
      </svg>
    </div>
  )
}
