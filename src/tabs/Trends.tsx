import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, CartesianGrid, Tooltip } from 'recharts'
import { useSummary } from '../data/useSummary'
import Stripes from '../components/Stripes'
import { anomalyColor } from '../lib/colorScale'
import { Loading, ErrorState } from '../components/States'
import type { Baseline } from '../types'

const tooltipStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--fg)', fontSize: 12 }

export default function Trends() {
  const { summary, loading, error } = useSummary()
  const [base, setBase] = useState<Baseline>('1991-2020')
  if (loading) return <Loading label="Loading trends…" />
  if (error || !summary) return <ErrorState label="Could not load data." />
  const incompleteYears = new Set(summary.annual.filter(a => a.incomplete).map(a => a.year))
  const anom = summary.anomaly[base].filter(a => !incompleteYears.has(a.year))
  return (
    <section className="fade-in space-y-4">
      <h2 className="text-2xl font-extrabold tracking-tight">Warming Trends</h2>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="mb-2 text-[11px] uppercase tracking-[0.09em] text-muted">Warming stripes · every year since {`${anom[0]?.year ?? 1833}`}</p>
        <Stripes points={anom.map(a => ({ year: a.year, v: a.v }))} />
        <div className="mt-2 flex justify-between text-xs text-muted"><span>{anom[0]?.year}</span><span>{anom[anom.length - 1]?.year}</span></div>
      </div>

      {summary.warmingRate.full != null && (
        <div className="rounded-xl border border-border bg-accent-soft p-5">
          <p className="text-sm">
            Uccle is warming <strong className="text-accent">{summary.warmingRate.full} °C per decade</strong>
            {summary.warmingRate.last30 != null && <span className="text-muted"> (last 30 yrs: {summary.warmingRate.last30} °C/decade)</span>}.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Annual anomaly vs normal</p>
          <select
            value={base}
            onChange={e => setBase(e.target.value as Baseline)}
            className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs"
            aria-label="Baseline period"
          >
            <option value="1991-2020">1991–2020</option>
            <option value="1961-1990">1961–1990</option>
          </select>
        </div>
        <div role="img" aria-label="Annual temperature anomaly by year (red warmer, blue cooler)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={anom} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="year" tick={{ fill: 'var(--muted)', fontSize: 11 }} stroke="var(--border)" />
              <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} stroke="var(--border)" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="v">{anom.map(a => <Cell key={a.year} fill={anomalyColor(a.v)} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}
