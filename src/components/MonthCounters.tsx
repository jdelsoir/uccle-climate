import { Sun, Flame, MoonStar, Snowflake, ThermometerSnowflake } from 'lucide-react'

type Key = 'SU' | 'hot30' | 'TR' | 'FD' | 'ID'
type Counts = Record<Key, number>

const ROWS: { key: Key; label: string; Icon: typeof Sun }[] = [
  { key: 'SU', label: 'summer days', Icon: Sun },
  { key: 'hot30', label: 'hot days', Icon: Flame },
  { key: 'TR', label: 'tropical nights', Icon: MoonStar },
  { key: 'FD', label: 'frost days', Icon: Snowflake },
  { key: 'ID', label: 'ice days', Icon: ThermometerSnowflake },
]

export default function MonthCounters({ name, counts, normals, soFar }: {
  name: string; counts: Counts; normals: Counts | null; soFar: boolean
}) {
  const shown = ROWS.filter(r => (normals?.[r.key] ?? 0) >= 0.5 || counts[r.key] > 0)
  if (!shown.length) return null
  return (
    <div className="border border-border bg-surface p-5">
      <p className="mb-2 text-[11px] uppercase tracking-[0.09em] text-muted">This {name} {soFar ? 'so far' : 'by the numbers'}</p>
      <ul className="border-t border-border divide-y divide-border">
        {shown.map(({ key, label, Icon }) => (
          <li key={key} className="flex items-center gap-3 py-2.5">
            <Icon size={16} className="text-muted" aria-hidden />
            <span className="text-lg font-bold text-fg">{counts[key]}</span>
            <span className="flex-1 text-sm">{label}</span>
            {normals && <span className="text-xs text-muted">normal {normals[key].toFixed(1)}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
