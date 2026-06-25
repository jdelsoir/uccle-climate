import { useState } from 'react'
import { Flame, Snowflake } from 'lucide-react'
import { useSummary } from '../data/useSummary'
import { Loading, ErrorState } from '../components/States'
import { fmtTemp, fmtDate } from '../lib/format'

type Mode = 'warm' | 'cold'

export default function Records() {
  const { summary, loading, error } = useSummary()
  const [mode, setMode] = useState<Mode>('warm')
  if (loading) return <Loading label="Loading records…" />
  if (error || !summary) return <ErrorState label="Could not load data." />

  const warm = mode === 'warm'
  const list = warm ? summary.extremes.warmest : summary.extremes.coldest
  const accent = warm ? 'text-warm' : 'text-accent'

  return (
    <section className="fade-in space-y-4">
      <h2 className="text-2xl font-extrabold tracking-tight">Records</h2>

      <div className="inline-flex rounded-lg border border-border bg-surface p-1 text-sm" role="group" aria-label="Record type">
        <button
          type="button"
          aria-pressed={warm}
          onClick={() => setMode('warm')}
          className={`flex items-center gap-1 rounded-md px-3 py-1.5 ${warm ? 'bg-warm/10 font-semibold text-warm' : 'text-muted'}`}
        >
          <Flame size={14} aria-hidden /> Warmest
        </button>
        <button
          type="button"
          aria-pressed={!warm}
          onClick={() => setMode('cold')}
          className={`flex items-center gap-1 rounded-md px-3 py-1.5 ${!warm ? 'bg-accent/10 font-semibold text-accent' : 'text-muted'}`}
        >
          <Snowflake size={14} aria-hidden /> Coldest
        </button>
      </div>

      <p className="text-xs text-muted">
        Top 10 {warm ? 'hottest days' : 'coldest days'} on record at Uccle (daily {warm ? 'maximum' : 'minimum'}).
      </p>

      <ol className="space-y-2">
        {list.map((rec, i) => (
          <li
            key={rec.date}
            className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="w-5 text-right text-sm font-bold text-muted">{i + 1}</span>
              <span className="text-sm">{fmtDate(rec.date)}</span>
            </div>
            <span className={`text-lg font-bold ${accent}`}>{fmtTemp(rec.v)}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
