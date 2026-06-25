import { anomalyColor } from '../lib/colorScale'
export default function Stripes({ points, height = 120 }: { points: { year: number; v: number }[]; height?: number }) {
  const w = 100 / Math.max(points.length, 1)
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" width="100%" height={height}
      role="img" aria-label="Warming stripes" className="block rounded-md">
      {points.map((p, i) => (
        <rect key={p.year} x={i * w} y={0} width={w + 0.3} height={height} fill={anomalyColor(p.v)} />
      ))}
    </svg>
  )
}
