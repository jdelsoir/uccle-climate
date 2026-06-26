import { useSummary } from '../../data/useSummary'
import { fmtTemp, ordinal } from '../../lib/format'
import { Loading, ErrorState } from '../../components/States'
import PeriodScatter from '../../components/PeriodScatter'

export default function YearView({ year }: { year: number }) {
  const { summary, loading, error } = useSummary()
  if (loading) return <Loading label="Loading year…" />
  if (error || !summary) return <ErrorState label="Could not load data." />

  const a = summary.annual.find(x => x.year === year)
  const rankIdx = summary.rankings.warmest.findIndex(x => x.year === year)
  const rank = rankIdx >= 0 ? rankIdx + 1 : null
  const total = summary.rankings.warmest.length
  const anomaly = summary.anomaly['1991-2020'].find(x => x.year === year)?.v ?? null
  const recordWarm = summary.rankings.warmest[0]
  const recordCold = summary.rankings.coldest[0]

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="text-[11px] uppercase tracking-[0.09em] text-muted">{year} annual mean · Uccle, Brussels</p>
        {a ? (
          <>
            <div className="mt-1 flex items-end gap-3">
              <span className="text-[40px] font-extrabold leading-none">{fmtTemp(a.mean)}</span>
              {a.incomplete && <span className="pb-1.5 text-sm text-muted">(so far)</span>}
            </div>
            {rank && !a.incomplete && <p className="mt-3 inline-block rounded-full bg-badge-bg px-3 py-1 text-xs font-semibold text-badge-fg">
              {ordinal(rank)} warmest year in {total} years</p>}
            {anomaly != null && <p className="mt-3 text-sm text-muted">
              <strong className="text-fg">{Math.abs(anomaly).toFixed(1)} °C {anomaly > 0 ? 'above' : anomaly < 0 ? 'below' : 'equal to'}</strong> the 1991–2020 normal ({summary.baselines['1991-2020']} °C).</p>}
          </>
        ) : <p className="mt-2 text-sm text-muted">No data for {year}.</p>}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Warmest year on record</p>
          <p className="mt-1 text-lg font-bold text-warm">{fmtTemp(recordWarm?.mean)}</p>
          <p className="text-xs text-muted">{recordWarm?.year}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Coldest year on record</p>
          <p className="mt-1 text-lg font-bold text-accent">{fmtTemp(recordCold?.mean)}</p>
          <p className="text-xs text-muted">{recordCold?.year}</p>
        </div>
      </div>

      <PeriodScatter title="Annual mean by year"
        data={summary.annual.filter(x => !x.incomplete).map(x => ({ year: x.year, mean: x.mean }))}
        series={[{ key: 'mean', name: 'Annual mean', color: 'var(--accent)' }]} />
    </div>
  )
}
