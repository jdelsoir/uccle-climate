import { useMonth } from '../../data/useMonth'
import { fmtTemp, fmtMonth, ordinal } from '../../lib/format'
import { Loading, ErrorState } from '../../components/States'
import CalendarTile from '../../components/CalendarTile'
import RangeBar from '../../components/RangeBar'
import StatCard from '../../components/StatCard'
import WarmingStrip from '../../components/WarmingStrip'
import PeriodScatter from '../../components/PeriodScatter'

export default function MonthView({ mm, currentYear }: { mm: string; currentYear: number }) {
  const { data, loading, error } = useMonth(mm)
  if (loading) return <Loading label="Loading month…" />
  if (error || !data) return <ErrorState label="Could not load this month." />

  const name = fmtMonth(mm)
  const cur = data.series.find(s => s.year === currentYear)
  const complete = data.series.filter(s => s.complete)
  const rank = cur ? complete.filter(s => s.mean > cur.mean).length + 1 : null
  const delta = cur && data.normal != null ? Math.round((cur.mean - data.normal) * 10) / 10 : null
  const deltaWord = delta == null ? '' : delta > 0 ? 'warmer than normal' : delta < 0 ? 'cooler than normal' : 'at normal'
  const tn = data.thenNow
  const warmingDelta = tn.early.mean != null && tn.recent.mean != null ? Math.round((tn.recent.mean - tn.early.mean) * 10) / 10 : null

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
          <CalendarTile header={name.toUpperCase()} body={currentYear} />
          <div className="min-w-0 flex-1">
            {cur ? (
              <>
                <p className="text-[11px] uppercase tracking-[0.09em] text-muted">{name} mean{cur.complete ? '' : ' (so far)'}</p>
                <span className="text-[40px] font-extrabold leading-none">{fmtTemp(cur.mean)}</span>
                {rank && cur.complete && <p className="mt-2 inline-block rounded-full bg-badge-bg px-3 py-1 text-xs font-semibold text-badge-fg">{ordinal(rank)} warmest {name} in {complete.length} years</p>}
              </>
            ) : <p className="text-sm text-muted">No data for {name} {currentYear} yet.</p>}
          </div>
        </div>

        {cur && data.recordCold && data.recordWarm && (
          <div className="mt-5">
            <p className="mb-2 text-[11px] uppercase tracking-[0.09em] text-muted">Where {currentYear} sits</p>
            <RangeBar
              min={{ v: data.recordCold.v, label: `${data.recordCold.v}° coldest` }}
              max={{ v: data.recordWarm.v, label: `${data.recordWarm.v}° warmest` }}
              markers={[
                ...(data.normal != null ? [{ v: data.normal, label: `normal ${data.normal}°`, kind: 'tick' as const }] : []),
                { v: cur.mean, label: `${currentYear} ${cur.mean}°`, kind: 'dot' as const },
              ]}
              summary={`${name} ${currentYear} mean ${cur.mean}°, normal ${data.normal ?? '—'}°, between ${data.recordCold.v}° coldest and ${data.recordWarm.v}° warmest`} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {data.normal != null && <StatCard label="Average" value={fmtTemp(data.normal)} sub="1991–2020 normal" />}
        {delta != null && <StatCard label="This year vs average" value={`${delta > 0 ? '+' : ''}${delta.toFixed(1)} °C`} sub={deltaWord} valueClass={delta > 0 ? 'text-warm' : delta < 0 ? 'text-accent' : 'text-fg'} />}
        <StatCard label={`Warmest ${name}`} value={fmtTemp(data.recordWarm?.v)} sub={data.recordWarm ? String(data.recordWarm.year) : undefined} valueClass="text-warm" />
        <StatCard label={`Coldest ${name}`} value={fmtTemp(data.recordCold?.v)} sub={data.recordCold ? String(data.recordCold.year) : undefined} valueClass="text-accent" />
      </div>

      {warmingDelta != null && (
        <WarmingStrip label={`A warming ${name}`}
          then={{ mean: tn.early.mean!, from: tn.early.from, to: tn.early.to }}
          recent={{ mean: tn.recent.mean!, from: tn.recent.from, to: tn.recent.to }}
          delta={warmingDelta} />
      )}

      <PeriodScatter title={`Every ${name} mean`} data={complete.map(s => ({ year: s.year, mean: s.mean }))}
        series={[{ key: 'mean', name: `${name} mean`, color: 'var(--accent)' }]} />
    </div>
  )
}
