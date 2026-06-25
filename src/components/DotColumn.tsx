export default function DotColumn({ values, height = 200 }:
  { values: { year: number; value: number; highlight?: boolean }[]; height?: number }) {
  const vs = values.map(v => v.value)
  const min = Math.min(...vs), max = Math.max(...vs), span = max - min || 1
  return (
    <svg viewBox={`0 0 100 ${height}`} width="100%" height={height} role="img" aria-label="Each year on this date" className="block">
      {values.map((v, i) => (
        <circle key={v.year} cx={(i / Math.max(values.length - 1, 1)) * 100}
          cy={height - ((v.value - min) / span) * height}
          r={v.highlight ? 3 : 1.5}
          fill={v.highlight ? 'var(--warm)' : 'var(--muted)'} />
      ))}
    </svg>
  )
}
