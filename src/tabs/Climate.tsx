import { useSummary } from '../data/useSummary'
import Sparkline from '../components/Sparkline'
import type { CounterPoint } from '../types'

const META: { k: 'SU' | 'TR' | 'FD' | 'heatwaveDays' | 'gsl'; title: string; blurb: string }[] = [
  { k: 'SU', title: 'Summer days (≥25 °C)', blurb: 'Days warm enough to feel like summer.' },
  { k: 'TR', title: 'Tropical nights (≥20 °C)', blurb: 'Nights that no longer cool down — once near zero.' },
  { k: 'FD', title: 'Frost days (<0 °C)', blurb: 'Freezing days — winter is retreating.' },
  { k: 'heatwaveDays', title: 'Heatwave days', blurb: 'Days inside a heatwave (RMI definition).' },
  { k: 'gsl', title: 'Growing-season length', blurb: 'Days suitable for plant growth.' },
]

export default function Climate() {
  const { summary, loading, error } = useSummary()
  if (loading) return <p>Loading…</p>
  if (error || !summary) return <p>Could not load data.</p>
  return (
    <section>
      <h2>Climate Impact</h2>
      {META.map(m => {
        const series = summary.counters[m.k] as CounterPoint[]
        const last = series[series.length - 1]
        return (
          <article className="card" key={m.k}>
            <h3>{m.title}</h3>
            <p className="big">
              {last ? last.n : '—'} <span>in {last?.year}</span>
            </p>
            <p className="blurb">{m.blurb}</p>
            <Sparkline data={series} />
          </article>
        )
      })}
    </section>
  )
}
