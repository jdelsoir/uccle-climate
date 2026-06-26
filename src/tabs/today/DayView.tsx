import { Flame, Snowflake } from 'lucide-react'
import { useThisDay } from '../../data/useThisDay'
import { useTodayTemp } from '../../data/useTodayTemp'
import { useDayNorm } from '../../data/useDayNorm'
import { useSummary } from '../../data/useSummary'
import { fmtTemp, todayISO, ordinal } from '../../lib/format'
import { rankOf, meanAnomaly } from '../../lib/stats'
import { allTimeRank } from '../../lib/records'
import { Loading, ErrorState } from '../../components/States'
import PeriodScatter from '../../components/PeriodScatter'

export default function DayView({ mmdd, isToday }: { mmdd: string; isToday: boolean }) {
  const { data, loading, error } = useThisDay(mmdd)
  const live = useTodayTemp()
  const dayNorm = useDayNorm()
  const { summary } = useSummary()
  if (loading) return <Loading label="Loading day…" />
  if (error || !data) return <ErrorState label="Could not load this date." />

  const ld = isToday ? live.data : null
  const r = ld ? rankOf(ld.tmax, data.series.map(s => s.tmax)) : null
  const isHotRecord = ld != null && ld.tmax > data.recordHigh.v
  const isColdRecord = ld != null && ld.tmin < data.recordLow.v
  const heroClass = isHotRecord ? 'rounded-xl border-2 border-warm bg-warm/5 p-5'
    : isColdRecord ? 'rounded-xl border-2 border-accent bg-accent/5 p-5'
    : 'rounded-xl border border-border bg-surface p-5'
  const recordCount = summary?.records ? (isHotRecord ? summary.records.highs : summary.records.lows) : 0
  const entry = dayNorm.data?.['1991-2020']?.find(n => n.mmdd === mmdd)
  const startYear = summary?.annual?.[0]?.year ?? 1833

  let allTime: { rank: number; kind: 'warmest' | 'coldest' } | null = null
  if (ld && summary?.extremes) {
    const today = todayISO()
    const warmVals = summary.extremes.warmest.filter(e => e.date !== today).map(e => e.v)
    const coldVals = summary.extremes.coldest.filter(e => e.date !== today).map(e => e.v)
    const wRank = allTimeRank(warmVals, ld.tmax, 'warm')
    const cRank = allTimeRank(coldVals, ld.tmin, 'cold')
    if (wRank <= 10) allTime = { rank: wRank, kind: 'warmest' }
    else if (cRank <= 10) allTime = { rank: cRank, kind: 'coldest' }
  }

  return (
    <div className="space-y-4">
      {isToday && (
        <div className={heroClass}>
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Today · Uccle, Brussels</p>
          {live.error ? <p className="mt-1 text-sm text-muted">Live temperature unavailable — showing records only.</p>
            : live.loading ? <p className="mt-1 text-sm text-muted">Fetching today…</p>
            : <div className="mt-1 flex items-end gap-3">
                <span className="text-[46px] font-extrabold leading-none">{fmtTemp(live.data!.temp)}</span>
                <span className="pb-1.5 text-sm text-muted">max {fmtTemp(live.data!.tmax)}</span>
              </div>}
          {(isHotRecord || isColdRecord) && (
            <p className={`mt-2 flex items-center gap-2 text-sm font-semibold ${isHotRecord ? 'text-warm' : 'text-accent'}`}>
              {isHotRecord ? <Flame size={16} aria-hidden /> : <Snowflake size={16} aria-hidden />}
              <span>{isHotRecord ? 'New record high for this date!' : 'New record low for this date!'}
                {recordCount > 0 && ` ${recordCount} ${isHotRecord ? 'heat' : 'cold'} records set in ${summary!.records.year}.`}</span>
            </p>
          )}
          {r && <p className="mt-3 inline-block rounded-full bg-badge-bg px-3 py-1 text-xs font-semibold text-badge-fg">
            {ordinal(r.rank)} warmest on this date in {r.total} years</p>}
          {allTime && <p className={`mt-2 text-sm font-semibold ${allTime.kind === 'warmest' ? 'text-warm' : 'text-accent'}`}>
            {ordinal(allTime.rank)} {allTime.kind} day since {startYear}</p>}
          {entry?.normal != null && live.data != null && (
            <p className="mt-3 text-sm text-muted">
              Today averages <strong className="text-fg">{Math.abs(meanAnomaly(live.data.tmax, live.data.tmin, entry.normal))} °C {meanAnomaly(live.data.tmax, live.data.tmin, entry.normal) >= 0 ? 'above' : 'below'}</strong> the 1991–2020 normal ({entry.normal} °C) for this date.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          {' → '}<strong>{fmtTemp(data.thenNow.recent.mean)}</strong> <span className="text-muted">({data.thenNow.recent.from}–{data.thenNow.recent.to})</span>
        </p>
      </div>

      <PeriodScatter title="Every year on this date"
        data={data.series}
        series={[{ key: 'tmax', name: 'High', color: 'var(--warm)' }, { key: 'tmin', name: 'Low', color: 'var(--accent)' }]} />
    </div>
  )
}
