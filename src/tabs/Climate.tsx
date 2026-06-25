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

export default function Climate() {
  const { summary, loading, error } = useSummary()
  if (loading) return <Loading label="Loading climate impact…" />
  if (error || !summary) return <ErrorState label="Could not load data." />
  // Only count years with complete data — partial/incomplete years (the current
  // year, or coverage-gap years) would understate the counters.
  const completeYears = new Set(summary.annual.filter(a => !a.incomplete).map(a => a.year))
  return (
    <section className="fade-in space-y-4">
      <h2 className="text-2xl font-extrabold tracking-tight">Climate Impact</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {META.map(({ k, title, blurb, Icon }) => {
          const series = (summary.counters[k] as CounterPoint[]).filter(p => completeYears.has(p.year))
          const last = series[series.length - 1]
          return (
            <article key={k} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center gap-2 text-muted">
                <Icon size={16} aria-hidden />
                <h3 className="text-sm font-semibold text-fg">{title}</h3>
              </div>
              <p className="mt-2 text-2xl font-extrabold">
                {last ? last.n : '—'} {last && <span className="text-sm font-normal text-muted">in {last.year}</span>}
              </p>
              <p className="mt-1 text-xs text-muted">{blurb}</p>
              <div className="mt-2"><Sparkline data={series} /></div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
