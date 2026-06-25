import { useState } from 'react'
import { Scatter, XAxis, YAxis, ResponsiveContainer, ComposedChart, CartesianGrid, Tooltip } from 'recharts'
import { Flame, Snowflake } from 'lucide-react'
import { useThisDay } from '../data/useThisDay'
import { useTodayTemp } from '../data/useTodayTemp'
import { useDayNorm } from '../data/useDayNorm'
import { useSummary } from '../data/useSummary'
import { todayMMDD, fmtTemp } from '../lib/format'
import { rankOf, meanAnomaly } from '../lib/stats'
import { Loading, ErrorState } from '../components/States'

const tooltipStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--fg)', fontSize: 12 }

// "Every year on this date" period filter — default first (2001–Now).
const PERIODS: { label: string; from: number; to: number }[] = [
  { label: '2001–Now', from: 2001, to: 9999 },
  { label: '1951–2000', from: 1951, to: 2000 },
  { label: '1901–1950', from: 1901, to: 1950 },
  { label: '1833–1900', from: 1833, to: 1900 },
  { label: 'All time', from: 0, to: 9999 },
]

export default function Today() {
  const mmdd = todayMMDD()
  const { data, loading, error } = useThisDay(mmdd)
  const live = useTodayTemp()
  const dayNorm = useDayNorm()
  const { summary } = useSummary()
  const [periodIdx, setPeriodIdx] = useState(0)
  if (loading) return <Loading label="Loading today…" />
  if (error || !data) return <ErrorState label="Could not load this date." />
  const maxima = data.series.map(s => s.tmax)
  const todayTmax = live.data?.tmax
  const r = todayTmax != null ? rankOf(todayTmax, maxima) : null
  const norms = dayNorm.data?.['1991-2020']
  const entry = norms?.find(n => n.mmdd === mmdd)

  // Is today setting a new all-time record for this calendar day?
  const isHotRecord = live.data != null && live.data.tmax > data.recordHigh.v
  const isColdRecord = live.data != null && live.data.tmin < data.recordLow.v
  const heroClass = isHotRecord
    ? 'rounded-xl border-2 border-warm bg-warm/5 p-5'
    : isColdRecord
      ? 'rounded-xl border-2 border-accent bg-accent/5 p-5'
      : 'rounded-xl border border-border bg-surface p-5'
  const recordCount = summary?.records ? (isHotRecord ? summary.records.highs : summary.records.lows) : 0
  const period = PERIODS[periodIdx]
  const shown = data.series.filter(s => s.year >= period.from && s.year <= period.to)

  return (
    <section className="fade-in space-y-4">
      <h2 className="text-2xl font-extrabold tracking-tight">This Day in History</h2>

      <div className={heroClass}>
        <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Today · Uccle, Brussels</p>
        {live.error ? (
          <p className="mt-1 text-sm text-muted">Live temperature unavailable — showing records only.</p>
        ) : live.loading ? (
          <p className="mt-1 text-sm text-muted">Fetching today…</p>
        ) : (
          <div className="mt-1 flex items-end gap-3">
            <span className="text-[46px] font-extrabold leading-none">{fmtTemp(live.data!.temp)}</span>
            <span className="pb-1.5 text-sm text-muted">max {fmtTemp(live.data!.tmax)}</span>
          </div>
        )}
        {r && (
          <p className="mt-3 inline-block rounded-full bg-badge-bg px-3 py-1 text-xs font-semibold text-badge-fg">
            {ordinal(r.rank)} warmest on this date in {r.total} years · {ordinal(Math.round(r.pct))} percentile
          </p>
        )}
        {(isHotRecord || isColdRecord) && (
          <p className={`mt-3 flex items-center gap-2 text-sm font-semibold ${isHotRecord ? 'text-warm' : 'text-accent'}`}>
            {isHotRecord ? <Flame size={16} aria-hidden /> : <Snowflake size={16} aria-hidden />}
            <span>
              {isHotRecord ? 'New record high for this date!' : 'New record low for this date!'}
              {recordCount > 0 && ` ${recordCount} ${isHotRecord ? 'heat' : 'cold'} records set in ${summary!.records.year}.`}
            </span>
          </p>
        )}
        {entry?.normal != null && live.data != null && (() => {
          const diff = meanAnomaly(live.data.tmax, live.data.tmin, entry.normal)
          return (
            <p className="mt-3 text-sm text-muted">
              Today averages <strong className="text-fg">{Math.abs(diff)} °C {diff >= 0 ? 'above' : 'below'}</strong> the 1991–2020 normal ({entry.normal} °C) for this date.
            </p>
          )
        })()}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Record high</p>
          <p className="mt-1 text-lg font-bold text-warm">{fmtTemp(data.recordHigh.v)}</p>
          <p className="text-xs text-muted">{data.recordHigh.year}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Record low</p>
          <p className="mt-1 text-lg font-bold text-accent">{fmtTemp(data.recordLow.v)}</p>
          <p className="text-xs text-muted">{data.recordLow.year}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Then vs now</p>
        <p className="mt-1 text-sm">
          {fmtTemp(data.thenNow.early.mean)} <span className="text-muted">({data.thenNow.early.from}–{data.thenNow.early.to})</span>
          {' → '}
          <strong>{fmtTemp(data.thenNow.recent.mean)}</strong> <span className="text-muted">({data.thenNow.recent.from}–{data.thenNow.recent.to})</span>
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Every year on this date</p>
          <select
            value={periodIdx}
            onChange={e => setPeriodIdx(Number(e.target.value))}
            className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs"
            aria-label="Period"
          >
            {PERIODS.map((p, i) => <option key={p.label} value={i}>{p.label}</option>)}
          </select>
        </div>
        <p className="mb-1 text-xs text-muted">
          <span className="text-warm">●</span> High <span className="ml-2 text-accent">●</span> Low (°C)
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={shown} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="year" tick={{ fill: 'var(--muted)', fontSize: 11 }} stroke="var(--border)" />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} stroke="var(--border)" />
            <Tooltip contentStyle={tooltipStyle} />
            <Scatter name="High" dataKey="tmax" fill="var(--warm)" />
            <Scatter name="Low" dataKey="tmin" fill="var(--accent)" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <YearPicker series={data.series} />
    </section>
  )
}

function YearPicker({ series }: { series: { year: number; tmax: number; tmin: number }[] }) {
  const [sel, setSel] = useState<number>(series[0]?.year)
  const s = series.find(x => x.year === sel)
  return (
    <details className="rounded-xl border border-border bg-surface p-4">
      <summary className="cursor-pointer text-sm font-semibold">Time machine — pick a year</summary>
      <select
        value={sel}
        onChange={e => setSel(Number(e.target.value))}
        className="mt-3 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
      >
        {series.map(x => <option key={x.year} value={x.year}>{x.year}</option>)}
      </select>
      {s && <p className="mt-2 text-sm text-muted">{s.year}: max {s.tmax} °C, min {s.tmin} °C</p>}
    </details>
  )
}

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
