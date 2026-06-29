import { useSummary } from '../../data/useSummary'
import { fmtTemp, ordinal } from '../../lib/format'
import { Loading, ErrorState } from '../../components/States'
import CalendarTile from '../../components/CalendarTile'
import BigTemp from '../../components/BigTemp'
import RangeBar from '../../components/RangeBar'
import StatCard from '../../components/StatCard'
import WarmingStrip from '../../components/WarmingStrip'
import PeriodScatter from '../../components/PeriodScatter'

type Annual = { year: number; mean: number; incomplete: boolean }
function yearWindowMean(annual: Annual[], from: number, to: number): number | null {
  const v = annual.filter(a => a.year >= from && a.year <= to && !a.incomplete).map(a => a.mean)
  return v.length ? Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 10) / 10 : null
}

export default function YearView({ year }: { year: number }) {
  const { summary, loading, error } = useSummary()
  if (loading) return <Loading label="Loading year…" />
  if (error || !summary) return <ErrorState label="Could not load data." />

  const a = summary.annual.find(x => x.year === year)
  const rankIdx = summary.rankings.warmest.findIndex(x => x.year === year)
  const rank = rankIdx >= 0 ? rankIdx + 1 : null
  const total = summary.rankings.warmest.length
  const normal = summary.baselines['1991-2020']
  const recordWarm = summary.rankings.warmest[0]
  const recordCold = summary.rankings.coldest[0]
  const delta = a && normal != null ? Math.round((a.mean - normal) * 10) / 10 : null
  const deltaWord = delta == null ? '' : delta > 0 ? 'warmer than normal' : delta < 0 ? 'cooler than normal' : 'at normal'

  const recentFrom = year - 11, recentTo = year - 1, thenFrom = year - 111, thenTo = year - 101
  const recentMean = yearWindowMean(summary.annual, recentFrom, recentTo)
  const thenMean = yearWindowMean(summary.annual, thenFrom, thenTo)

  return (
    <div className="space-y-4">
      <div className="border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
          <CalendarTile header="YEAR" body={year} />
          <div className="min-w-0 flex-1">
            {a ? (
              <>
                <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Annual mean{a.incomplete ? ' (so far)' : ''}</p>
                <div><BigTemp v={a.mean} className="text-[40px] text-fg" /></div>
                {rank && !a.incomplete && <p className="mt-2 inline-block rounded-sm bg-badge-bg px-2.5 py-1 text-xs font-semibold text-badge-fg">{ordinal(rank)} warmest year in {total} years</p>}
              </>
            ) : <p className="text-sm text-muted">No data for {year}.</p>}
          </div>
        </div>

        {a && recordWarm && recordCold && (
          <div className="mt-5 border-t border-border pt-4">
            <p className="mb-2 text-[11px] uppercase tracking-[0.09em] text-muted">Where {year} sits</p>
            <RangeBar
              min={{ v: recordCold.mean, label: `${recordCold.mean}° coldest` }}
              max={{ v: recordWarm.mean, label: `${recordWarm.mean}° warmest` }}
              markers={[
                ...(normal != null ? [{ v: normal, label: `normal ${normal}°`, kind: 'tick' as const }] : []),
                { v: a.mean, label: `${year} ${a.mean}°`, kind: 'dot' as const },
              ]}
              summary={`${year} annual mean ${a.mean}°, normal ${normal ?? '—'}°, between ${recordCold.mean}° coldest and ${recordWarm.mean}° warmest year`} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {normal != null && <StatCard label="Average" value={fmtTemp(normal)} sub="1991–2020 normal" />}
        {delta != null && <StatCard label="This year vs average" value={`${delta > 0 ? '+' : ''}${delta.toFixed(1)} °C`} sub={deltaWord} valueClass={delta > 0 ? 'text-warm' : delta < 0 ? 'text-accent' : 'text-fg'} />}
        <StatCard label="Warmest year" value={fmtTemp(recordWarm?.mean)} sub={recordWarm ? String(recordWarm.year) : undefined} valueClass="text-warm" />
        <StatCard label="Coldest year" value={fmtTemp(recordCold?.mean)} sub={recordCold ? String(recordCold.year) : undefined} valueClass="text-accent" />
      </div>

      {thenMean != null && recentMean != null && (
        <WarmingStrip label="A warming year"
          then={{ mean: thenMean, from: thenFrom, to: thenTo }}
          recent={{ mean: recentMean, from: recentFrom, to: recentTo }}
          delta={Math.round((recentMean - thenMean) * 10) / 10} />
      )}

      <PeriodScatter title="Annual mean by year" data={summary.annual.filter(x => !x.incomplete).map(x => ({ year: x.year, mean: x.mean }))}
        series={[{ key: 'mean', name: 'Annual mean', color: 'var(--accent)' }]} />
    </div>
  )
}
