import { useMonth } from '../../data/useMonth'
import { fmtTemp, fmtMonth, ordinal } from '../../lib/format'
import { Loading, ErrorState } from '../../components/States'
import PeriodScatter from '../../components/PeriodScatter'

export default function MonthView({ mm, currentYear }: { mm: string; currentYear: number }) {
  const { data, loading, error } = useMonth(mm)
  if (loading) return <Loading label="Loading month…" />
  if (error || !data) return <ErrorState label="Could not load this month." />

  const name = fmtMonth(mm)
  const cur = data.series.find(s => s.year === currentYear)
  const complete = data.series.filter(s => s.complete)
  const rank = cur ? complete.filter(s => s.mean > cur.mean).length + 1 : null
  const anomaly = cur && data.normal != null ? Math.round((cur.mean - data.normal) * 10) / 10 : null

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="text-[11px] uppercase tracking-[0.09em] text-muted">{name} mean · Uccle, Brussels</p>
        {cur ? (
          <>
            <div className="mt-1 flex items-end gap-3">
              <span className="text-[40px] font-extrabold leading-none">{fmtTemp(cur.mean)}</span>
              <span className="pb-1.5 text-sm text-muted">{currentYear}{cur.complete ? '' : ' (so far)'}</span>
            </div>
            {rank && cur.complete && <p className="mt-3 inline-block rounded-full bg-badge-bg px-3 py-1 text-xs font-semibold text-badge-fg">
              {ordinal(rank)} warmest {name} in {complete.length} years</p>}
            {anomaly != null && <p className="mt-3 text-sm text-muted">
              <strong className="text-fg">{Math.abs(anomaly).toFixed(1)} °C {anomaly > 0 ? 'above' : anomaly < 0 ? 'below' : 'equal to'}</strong> the 1991–2020 {name} normal ({data.normal} °C).</p>}
          </>
        ) : <p className="mt-2 text-sm text-muted">No data for {name} {currentYear} yet.</p>}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Warmest {name} on record</p>
          <p className="mt-1 text-lg font-bold text-warm">{fmtTemp(data.recordWarm?.v)}</p>
          <p className="text-xs text-muted">{data.recordWarm?.year}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Coldest {name} on record</p>
          <p className="mt-1 text-lg font-bold text-accent">{fmtTemp(data.recordCold?.v)}</p>
          <p className="text-xs text-muted">{data.recordCold?.year}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Then vs now</p>
        <p className="mt-1 text-sm">
          {fmtTemp(data.thenNow.early.mean)} <span className="text-muted">({data.thenNow.early.from}–{data.thenNow.early.to})</span>
          {' → '}<strong>{fmtTemp(data.thenNow.recent.mean)}</strong> <span className="text-muted">({data.thenNow.recent.from}–{data.thenNow.recent.to})</span>
        </p>
      </div>

      <PeriodScatter title={`Every ${name} mean`}
        data={complete.map(s => ({ year: s.year, mean: s.mean }))}
        series={[{ key: 'mean', name: `${name} mean`, color: 'var(--accent)' }]} />
    </div>
  )
}
