import { useState } from 'react'
import { Flame, Snowflake } from 'lucide-react'
import { useThisDay } from '../../data/useThisDay'
import { useTodayTemp } from '../../data/useTodayTemp'
import { useDayNorm } from '../../data/useDayNorm'
import { fmtTemp, mmddOf, isoOf, todayISO, ordinal, fmtMonth } from '../../lib/format'
import { rankOf } from '../../lib/stats'
import { decadeMean, previousRecordHigh, previousRecordLow, tempColor } from '../../lib/dayStats'
import { Loading, ErrorState } from '../../components/States'
import DateNav from '../../components/DateNav'
import PeriodScatter from '../../components/PeriodScatter'

const MIN = new Date(1833, 0, 1)
const midnight = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }

export default function DayView() {
  const [date, setDate] = useState<Date>(() => midnight(new Date()))
  const max = midnight(new Date())
  const mmdd = mmddOf(date)
  const year = date.getFullYear()
  const isReal = isoOf(date) === todayISO()

  const { data, loading, error } = useThisDay(mmdd)
  const live = useTodayTemp()
  const dayNorm = useDayNorm()
  if (loading) return <Loading label="Loading day…" />
  if (error || !data) return <ErrorState label="Could not load this date." />

  const normal = dayNorm.data?.['1991-2020']?.find(n => n.mmdd === mmdd)?.normal ?? null
  const entry = data.series.find(s => s.year === year)

  let maxV: number | null = null, secondV: number | null = null, secondLabel = 'min'
  if (isReal && live.data) { maxV = live.data.tmax; secondV = live.data.temp; secondLabel = 'current' }
  else if (entry) { maxV = entry.tmax; secondV = entry.tmin; secondLabel = 'min' }

  const brokeHigh = data.recordHigh.year === year
  const brokeLow = data.recordLow.year === year
  const prevHigh = brokeHigh ? previousRecordHigh(data.series, year) : null
  const prevLow = brokeLow ? previousRecordLow(data.series, year) : null

  const r = maxV != null ? rankOf(maxV, data.series.map(s => s.tmax)) : null
  const dayLabel = `${fmtMonth(mmdd.slice(0, 2))} ${Number(mmdd.slice(2))}`
  const firstYear = data.series.length ? Math.min(...data.series.map(s => s.year)) : null

  const recentFrom = year - 11, recentTo = year - 1
  const thenFrom = year - 111, thenTo = year - 101
  const recentMean = decadeMean(data.series, recentFrom, recentTo)
  const thenMean = decadeMean(data.series, thenFrom, thenTo)

  const goToYear = (y: number) => {
    const m = date.getMonth()
    const d = Math.min(date.getDate(), new Date(y, m + 1, 0).getDate())
    setDate(midnight(new Date(y, m, d)))
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-5">
        <DateNav date={date} min={MIN} max={max} onChange={d => setDate(midnight(d))} />
        {isReal && !live.data ? (
          <p className="mt-4 text-sm text-muted">{live.error ? 'Live temperature unavailable.' : 'Fetching today…'}</p>
        ) : maxV != null ? (
          <div className="mt-4 flex items-end gap-6">
            <div>
              <span className={`text-[40px] font-extrabold leading-none ${tempColor(maxV, normal)}`}>{fmtTemp(maxV)}</span>
              <p className="mt-1 text-xs text-muted">max</p>
            </div>
            {secondV != null && (
              <div>
                <span className={`text-[40px] font-extrabold leading-none ${tempColor(secondV, normal)}`}>{fmtTemp(secondV)}</span>
                <p className="mt-1 text-xs text-muted">{secondLabel}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">No data for this date.</p>
        )}

        {normal != null && (
          <p className="mt-2 text-xs text-muted">
            Average {fmtTemp(normal)} <span className="text-muted/70">(1991–2020)</span>
          </p>
        )}

        {(brokeHigh || brokeLow) && (
          <p className={`mt-3 flex items-center gap-2 text-sm font-semibold ${brokeHigh ? 'text-warm' : 'text-accent'}`}>
            {brokeHigh ? <Flame size={16} aria-hidden /> : <Snowflake size={16} aria-hidden />}
            <span>
              {brokeHigh ? 'Record high for this date!' : 'Record low for this date!'}
              {brokeHigh
                ? prevHigh && ` Previous: ${fmtTemp(prevHigh.v)} (${prevHigh.year})`
                : prevLow && ` Previous: ${fmtTemp(prevLow.v)} (${prevLow.year})`}
            </span>
          </p>
        )}

        {r && <p className="mt-3 inline-block rounded-full bg-badge-bg px-3 py-1 text-xs font-semibold text-badge-fg">
          {ordinal(r.rank)} warmest {dayLabel}{firstYear != null && ` since ${firstYear}`}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => goToYear(data.recordHigh.year)}
          className="rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-warm">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Record high</p>
          <p className="mt-1 text-lg font-bold text-warm">{fmtTemp(data.recordHigh.v)}</p>
          <p className="text-xs text-muted">{data.recordHigh.year}</p>
        </button>
        <button type="button" onClick={() => goToYear(data.recordLow.year)}
          className="rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-accent">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Record low</p>
          <p className="mt-1 text-lg font-bold text-accent">{fmtTemp(data.recordLow.v)}</p>
          <p className="text-xs text-muted">{data.recordLow.year}</p>
        </button>
      </div>

      {thenMean != null && recentMean != null && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-[11px] uppercase tracking-[0.09em] text-muted">Then vs now</p>
          <p className="mt-1 text-sm">
            {fmtTemp(thenMean)} <span className="text-muted">({thenFrom}–{thenTo})</span>
            {' → '}<strong>{fmtTemp(recentMean)}</strong> <span className="text-muted">({recentFrom}–{recentTo})</span>
          </p>
        </div>
      )}

      <PeriodScatter title="Every year on this date"
        data={data.series}
        series={[{ key: 'tmax', name: 'High', color: 'var(--warm)' }, { key: 'tmin', name: 'Low', color: 'var(--accent)' }]} />
    </div>
  )
}
