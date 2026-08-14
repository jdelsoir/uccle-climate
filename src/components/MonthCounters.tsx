import { useState } from 'react'
import { COUNTER_ROWS, type CounterKey } from '../lib/counterRows'
import CounterRow from './CounterRow'

type Counts = Record<CounterKey, number>

export default function MonthCounters({ name, counts, normals, soFar }: {
  name: string; counts: Counts; normals: Counts | null; soFar: boolean
}) {
  const [open, setOpen] = useState<CounterKey | null>(null)
  const shown = COUNTER_ROWS.filter(r => (normals?.[r.key] ?? 0) >= 0.5 || counts[r.key] > 0)
  if (!shown.length) return null
  return (
    <div className="border border-border bg-surface p-4">
      <p className="mb-2 text-[11px] uppercase tracking-[0.09em] text-muted">This {name} {soFar ? 'so far' : 'by the numbers'}</p>
      <ul className="border-t border-border divide-y divide-border">
        {shown.map(({ key, ...row }) => (
          <CounterRow key={key} {...row} count={counts[key]} normal={normals ? normals[key] : null}
            open={open === key} onToggle={() => setOpen(open === key ? null : key)} />
        ))}
      </ul>
    </div>
  )
}
