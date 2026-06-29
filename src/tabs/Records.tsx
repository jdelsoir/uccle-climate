import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSummary } from '../data/useSummary'
import { useTodayTemp } from '../data/useTodayTemp'
import { Loading, ErrorState } from '../components/States'
import { fmtTemp, fmtDate, todayISO } from '../lib/format'
import { mergeLiveExtreme } from '../lib/records'

type Mode = 'warm' | 'cold'

export default function Records() {
  const { summary, loading, error } = useSummary()
  const live = useTodayTemp()
  const [mode, setMode] = useState<Mode>('warm')
  if (loading) return <Loading label="Loading records…" />
  if (error || !summary) return <ErrorState label="Could not load data." />

  const warm = mode === 'warm'
  const today = todayISO()
  const liveDatum = live.data ? { date: today, v: warm ? live.data.tmax : live.data.tmin } : null
  const list = mergeLiveExtreme(warm ? summary.extremes.warmest : summary.extremes.coldest, liveDatum, warm ? 'warm' : 'cold').slice(0, 10)
  const accent = warm ? 'text-warm' : 'text-accent'

  return (
    <section className="fade-in space-y-4">
      <div className="border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-extrabold tracking-tight">Records</h2>
          <div role="radiogroup" aria-label="Record type" className="inline-flex border border-border text-sm">
            <button
              type="button" role="radio" aria-checked={warm} onClick={() => setMode('warm')}
              className={`px-3 py-1.5 font-semibold transition-colors ${warm ? 'bg-warm text-white' : 'text-muted hover:text-fg'}`}
            >Warmest</button>
            <button
              type="button" role="radio" aria-checked={!warm} onClick={() => setMode('cold')}
              className={`px-3 py-1.5 font-semibold transition-colors ${!warm ? 'bg-accent text-white' : 'text-muted hover:text-fg'}`}
            >Coldest</button>
          </div>
        </div>

        <p className="mt-3 text-xs text-muted">
          Top 10 {warm ? 'hottest days' : 'coldest days'} on record at Uccle (daily {warm ? 'maximum' : 'minimum'}; today included live).
        </p>

        <ol className="mt-2 border-t border-border divide-y divide-border">
          {list.map((rec, i) => (
            <li key={rec.date}>
              <Link
                to={`/today?d=${rec.date}`}
                aria-label={`${fmtDate(rec.date)} — ${fmtTemp(rec.v)}, rank ${i + 1}. Open this day`}
                className="flex items-center gap-3 py-3 transition-colors hover:bg-surface-2"
              >
                <span className="w-6 text-right text-sm font-bold text-muted">{i + 1}</span>
                <span className="flex-1 text-sm">{fmtDate(rec.date)}{rec.date === today ? ' · today' : ''}</span>
                <span className={`text-lg font-bold ${accent}`}>{rec.v.toFixed(1)}<span className="ml-0.5 text-xs">°C</span></span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
