import { useRef } from 'react'
import { Flame, Snowflake } from 'lucide-react'
import { useThisDay } from '../../data/useThisDay'
import { useTodayTemp } from '../../data/useTodayTemp'
import { useDayNorm } from '../../data/useDayNorm'
import { fmtTemp, mmddOf, isoOf, todayISO, ordinal, fmtMonth, fmtWeekday } from '../../lib/format'
import { rankOf } from '../../lib/stats'
import { previousRecordHigh, previousRecordLow, tempColor } from '../../lib/dayStats'
import { Loading, ErrorState } from '../../components/States'
import CalendarTile from '../../components/CalendarTile'
import PeriodScatter from '../../components/PeriodScatter'

export default function DayView({ date, min, max, onChange }: { date: Date; min: Date; max: Date; onChange: (d: Date) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
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
  const provisional = !!entry?.provisional && !isReal

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

  const mm = mmdd.slice(0, 2)
  const fullLabel = `${fmtWeekday(date)} ${date.getDate()} ${fmtMonth(mm)} ${year}`
  const openPicker = () => { const el = inputRef.current; if (!el) return; if (typeof el.showPicker === 'function') { try { el.showPicker(); return } catch { /* */ } } el.focus(); el.click() }
  const clampIso = (v: string) => (v < isoOf(min) ? isoOf(min) : v > isoOf(max) ? isoOf(max) : v)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-start gap-5">
          <CalendarTile header={fmtMonth(mm).toUpperCase()} body={date.getDate()} footer={fmtWeekday(date).toUpperCase()}
            onClick={openPicker} ariaLabel={`Change date — ${fullLabel}`} />
          <div className="min-w-0">
            {maxV != null ? (
              <>
                <p className="text-[11px] uppercase tracking-[0.09em] text-muted">{isReal ? "Today's high" : 'High'}</p>
                <span className={`text-[40px] font-extrabold leading-none ${tempColor(maxV, normal)}`}>{fmtTemp(maxV)}</span>
              </>
            ) : <p className="text-sm text-muted">No data for this date.</p>}
            {provisional && <p className="mt-1 text-[11px] text-muted"><span aria-hidden>· </span>Provisional — may be revised</p>}
            {r && <p className="mt-2 inline-block rounded-full bg-badge-bg px-3 py-1 text-xs font-semibold text-badge-fg">{ordinal(r.rank)} warmest {dayLabel}{firstYear != null && ` since ${firstYear}`}</p>}
          </div>
          {secondV != null && (
            <div className="ml-auto text-right">
              <p className="text-[11px] uppercase tracking-[0.09em] text-muted">{secondLabel === 'current' ? 'Now' : 'Low'}</p>
              <span className="text-2xl font-bold">{secondLabel === 'current' ? `${secondV.toFixed(1)}°` : fmtTemp(secondV)}</span>
            </div>
          )}
        </div>

        {(brokeHigh || brokeLow) && (
          <p className={`mt-3 flex items-center gap-2 text-sm font-semibold ${brokeHigh ? 'text-warm' : 'text-accent'}`}>
            {brokeHigh ? <Flame size={16} aria-hidden /> : <Snowflake size={16} aria-hidden />}
            <span>{brokeHigh ? 'Record high for this date!' : 'Record low for this date!'}{brokeHigh ? prevHigh && ` Previous: ${fmtTemp(prevHigh.v)} (${prevHigh.year})` : prevLow && ` Previous: ${fmtTemp(prevLow.v)} (${prevLow.year})`}</span>
          </p>
        )}
      </div>

      <input ref={inputRef} type="date" tabIndex={-1} aria-hidden className="sr-only"
        value={isoOf(date)} min={isoOf(min)} max={isoOf(max)}
        onChange={e => { if (e.target.value) onChange(new Date(clampIso(e.target.value) + 'T00:00:00')) }} />

      <PeriodScatter title="Every year on this date" data={data.series}
        series={[{ key: 'tmax', name: 'High', color: 'var(--warm)' }, { key: 'tmin', name: 'Low', color: 'var(--accent)' }]} />
    </div>
  )
}
