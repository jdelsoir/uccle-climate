import { useState } from 'react'
import { Sun, MoonStar, Snowflake, Flame, Sprout } from 'lucide-react'
import { useSummary } from '../data/useSummary'
import Sparkline from '../components/Sparkline'
import { Loading, ErrorState } from '../components/States'
import type { CounterPoint } from '../types'

const META: { k: 'SU' | 'TR' | 'FD' | 'heatwaveDays' | 'gsl'; title: string; blurb: string; Icon: typeof Sun }[] = [
  { k: 'SU', title: 'Summer days (≥25 °C)', blurb: 'Days warm enough to feel like summer.', Icon: Sun },
  { k: 'TR', title: 'Tropical nights (≥20 °C)', blurb: 'Nights that no longer cool down — once near zero.', Icon: MoonStar },
  { k: 'FD', title: 'Frost days (<0 °C)', blurb: 'Freezing days — winter is retreating.', Icon: Snowflake },
  { k: 'heatwaveDays', title: 'Heatwave days', blurb: 'Days inside a heatwave (RMI definition).', Icon: Flame },
  { k: 'gsl', title: 'Growing-season length', blurb: 'Days suitable for plant growth.', Icon: Sprout },
]

const GRAPH_START = 1950  // trend graphs start here for readability

export default function Climate() {
  const { summary, loading, error } = useSummary()
  const [picked, setPicked] = useState<number | null>(null)
  if (loading) return <Loading label="Loading climate impact…" />
  if (error || !summary) return <ErrorState label="Could not load data." />

  const years = summary.annual.map(a => a.year)
  const latest = years.length ? Math.max(...years) : 0
  const selected = picked ?? latest
  const incompleteYears = new Set(summary.annual.filter(a => a.incomplete).map(a => a.year))
  const partial = incompleteYears.has(selected)

  return (
    <section className="fade-in space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-extrabold tracking-tight">Climate Impact</h2>
        <select
          value={selected}
          onChange={e => setPicked(Number(e.target.value))}
          aria-label="Year"
          className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-sm"
        >
          {[...years].sort((a, b) => b - a).map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {META.map(({ k, title, blurb, Icon }) => {
          const all = summary.counters[k] as CounterPoint[]
          const sel = all.find(p => p.year === selected)
          const graph = all.filter(p => p.year >= GRAPH_START && !incompleteYears.has(p.year))
          return (
            <article key={k} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center gap-2 text-muted">
                <Icon size={16} aria-hidden />
                <h3 className="text-sm font-semibold text-fg">{title}</h3>
              </div>
              <p className="mt-2 text-2xl font-extrabold">
                {sel ? sel.n : '—'}{' '}
                <span className="text-sm font-normal text-muted">in {selected}{partial ? ' (so far)' : ''}</span>
              </p>
              <p className="mt-1 text-xs text-muted">{blurb}</p>
              <div className="mt-2"><Sparkline data={graph} /></div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
