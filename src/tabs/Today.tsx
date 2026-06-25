import { useState } from 'react'
import { Scatter, XAxis, YAxis, ResponsiveContainer, ComposedChart } from 'recharts'
import { useThisDay } from '../data/useThisDay'
import { useTodayTemp } from '../data/useTodayTemp'
import { useDayNorm } from '../data/useDayNorm'
import { todayMMDD, fmtTemp } from '../lib/format'
import { rankOf } from '../lib/stats'
import DotColumn from '../components/DotColumn'

export default function Today() {
  const mmdd = todayMMDD()
  const { data, loading, error } = useThisDay(mmdd)
  const live = useTodayTemp()
  const dayNorm = useDayNorm()
  if (loading) return <p>Loading…</p>
  if (error || !data) return <p>Could not load this date.</p>
  const maxima = data.series.map(s => s.tmax)
  const todayTmax = live.data?.tmax
  const r = todayTmax != null ? rankOf(todayTmax, maxima) : null
  return (
    <section>
      <h2>This Day in History</h2>
      <p className="today">
        {live.error ? 'Live temperature unavailable — showing records only.'
          : live.loading ? 'Fetching today…'
          : <>Today in Uccle: <strong>{fmtTemp(live.data!.temp)}</strong>
             {' '}(max {fmtTemp(live.data!.tmax)})</>}
      </p>
      {r && <p className="badge">Today is the <strong>{ordinal(r.rank)} warmest</strong> on this date in {r.total} years ({ordinal(Math.round(r.pct))} percentile).</p>}
      <p>Record high: <strong>{fmtTemp(data.recordHigh.v)}</strong> ({data.recordHigh.year}) · Record low: <strong>{fmtTemp(data.recordLow.v)}</strong> ({data.recordLow.year})</p>
      <p>Then vs now: {fmtTemp(data.thenNow.early.mean)} ({data.thenNow.early.from}–{data.thenNow.early.to}) → {fmtTemp(data.thenNow.recent.mean)} ({data.thenNow.recent.from}–{data.thenNow.recent.to})</p>
      {(() => {
        const norms = dayNorm.data?.['1991-2020']
        const entry = norms?.find(n => n.mmdd === mmdd)
        const liveTmax = live.data?.tmax
        if (entry?.normal == null || liveTmax == null) return null
        const diff = Math.round((liveTmax - entry.normal) * 10) / 10
        const dir = diff >= 0 ? 'above' : 'below'
        return (
          <p className="anomaly">
            Today is <strong>{Math.abs(diff)} °C {dir}</strong> the 1991–2020 normal ({entry.normal} °C) for this date.
          </p>
        )
      })()}
      <DotColumn values={data.series.map(s => ({ year: s.year, value: s.tmax, highlight: s.year === new Date().getFullYear() }))} />
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data.series}>
          <XAxis dataKey="year" /><YAxis />
          <Scatter dataKey="tmax" fill="#b22222" />
        </ComposedChart>
      </ResponsiveContainer>
      <YearPicker series={data.series} />
    </section>
  )
}

function YearPicker({ series }: { series: { year: number; tmax: number; tmin: number }[] }) {
  const [sel, setSel] = useState<number>(series[0]?.year)
  const s = series.find(x => x.year === sel)
  return (
    <details>
      <summary>Time machine — pick a year</summary>
      <select value={sel} onChange={e => setSel(Number(e.target.value))}>
        {series.map(x => <option key={x.year} value={x.year}>{x.year}</option>)}
      </select>
      {s && <p>{s.year}: max {s.tmax} °C, min {s.tmin} °C</p>}
    </details>
  )
}

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
