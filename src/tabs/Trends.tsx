import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts'
import { useSummary } from '../data/useSummary'
import Stripes from '../components/Stripes'
import { anomalyColor } from '../lib/colorScale'
import type { Baseline } from '../types'

export default function Trends() {
  const { summary, loading, error } = useSummary()
  const [base, setBase] = useState<Baseline>('1991-2020')
  if (loading) return <p>Loading…</p>
  if (error || !summary) return <p>Could not load data.</p>
  const anom = summary.anomaly[base]
  return (
    <section>
      <h2>Warming Trends</h2>
      <Stripes points={anom.map(a => ({ year: a.year, v: a.v }))} />
      <p className="headline">Uccle is warming <strong>{summary.warmingRate.full} °C per decade</strong> (last 30 yrs: {summary.warmingRate.last30}).</p>
      <label>Baseline:
        <select value={base} onChange={e => setBase(e.target.value as Baseline)}>
          <option value="1991-2020">1991–2020</option>
          <option value="1961-1990">1961–1990</option>
        </select>
      </label>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={anom}>
          <XAxis dataKey="year" /><YAxis />
          <Bar dataKey="v">{anom.map(a => <Cell key={a.year} fill={anomalyColor(a.v)} />)}</Bar>
        </BarChart>
      </ResponsiveContainer>
    </section>
  )
}
