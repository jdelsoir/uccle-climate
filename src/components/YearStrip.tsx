import { anomalyColor } from '../lib/colorScale'
import type { DailyPoint } from '../types'

const H = 48

export default function YearStrip({ year, days, normalFor }: {
  year: number; days: DailyPoint[]; normalFor: (mmdd: string) => number | null
}) {
  if (!days.length) return null
  const w = 100 / days.length
  let warm = 0, cool = 0
  const rects = days.map((d, i) => {
    const normal = normalFor(d.mmdd)
    const anom = normal == null ? null : (d.tmax + d.tmin) / 2 - normal
    if (anom != null) { if (anom > 0) warm++; else if (anom < 0) cool++ }
    const fill = anom == null ? 'var(--surface-2)' : anomalyColor(anom)
    return <rect key={d.mmdd} x={i * w} y={0} width={w + 0.3} height={H} fill={fill} />
  })
  return (
    <div className="border border-border bg-surface p-5">
      <p className="mb-3 text-[11px] uppercase tracking-[0.09em] text-muted">{year} day by day</p>
      <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" width="100%" height={H} className="block"
        role="img" aria-label={`${year}: ${warm} days warmer, ${cool} days cooler than the 1991–2020 normal`}>
        {rects}
      </svg>
    </div>
  )
}
