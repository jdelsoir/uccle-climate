import { useState } from 'react'
import { Scatter, XAxis, YAxis, ResponsiveContainer, ComposedChart, CartesianGrid, Tooltip } from 'recharts'

const tooltipStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--fg)', fontSize: 12 }

export const PERIODS: { label: string; from: number; to: number }[] = [
  { label: '2001–Now', from: 2001, to: 9999 },
  { label: '1951–2000', from: 1951, to: 2000 },
  { label: '1901–1950', from: 1901, to: 1950 },
  { label: '1833–1900', from: 1833, to: 1900 },
  { label: 'All time', from: 0, to: 9999 },
]

type Row = { year: number } & Record<string, number | undefined>

export default function PeriodScatter({ data, series, title }: {
  data: Row[]; series: { key: string; name: string; color: string }[]; title: string
}) {
  const [idx, setIdx] = useState(0)
  const p = PERIODS[idx]
  const shown = data.filter(d => d.year >= p.from && d.year <= p.to)
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.09em] text-muted">{title}</p>
        <select value={idx} onChange={e => setIdx(Number(e.target.value))} aria-label="Period"
          className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs">
          {PERIODS.map((pp, i) => <option key={pp.label} value={i}>{pp.label}</option>)}
        </select>
      </div>
      <p className="mb-1 text-xs text-muted">
        {series.map(s => <span key={s.key} className="mr-3"><span style={{ color: s.color }}>●</span> {s.name}</span>)} (°C)
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={shown} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="year" tick={{ fill: 'var(--muted)', fontSize: 11 }} stroke="var(--border)" />
          <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} stroke="var(--border)" />
          <Tooltip contentStyle={tooltipStyle} />
          {series.map(s => <Scatter key={s.key} name={s.name} dataKey={s.key} fill={s.color} />)}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
