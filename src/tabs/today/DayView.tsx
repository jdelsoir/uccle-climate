import { useRef } from 'react'
import { useThisDay } from '../../data/useThisDay'
import { useTodayTemp } from '../../data/useTodayTemp'
import { useDayNorm } from '../../data/useDayNorm'
import { fmtTemp, mmddOf, isoOf, todayISO, ordinal, fmtMonth, fmtWeekday } from '../../lib/format'
import { rankOf } from '../../lib/stats'
import { decadeMean, previousRecordHigh, previousRecordLow } from '../../lib/dayStats'
import { Loading, ErrorState } from '../../components/States'
import CalendarTile from '../../components/CalendarTile'
import BigTemp from '../../components/BigTemp'
import RangeBar from '../../components/RangeBar'
import StatCard from '../../components/StatCard'
import WarmingStrip from '../../components/WarmingStrip'
import PeriodScatter from '../../components/PeriodScatter'
import HeroShell from '../../components/HeroShell'
import { heroState, deltaLine, bannerClass, toneText } from '../../lib/heroState'

export default function DayView({ date, min, max, onChange }: { date: Date; min: Date; max: Date; onChange: (d: Date) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const mmdd = mmddOf(date)
  const mm = mmdd.slice(0, 2)
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

  let highV: number | null = null, secondV: number | null = null
  const todayLive = isReal && live.data
  if (todayLive) { highV = live.data!.tmax; secondV = live.data!.temp }
  else if (!isReal && entry) { highV = entry.tmax; secondV = entry.tmin }
  const secondLabel = todayLive ? 'Now' : 'Low'

  const brokeHigh = data.recordHigh.year === year
  const brokeLow = data.recordLow.year === year
  const prevHigh = brokeHigh ? previousRecordHigh(data.series, year) : null
  const prevLow = brokeLow ? previousRecordLow(data.series, year) : null

  const r = highV != null ? rankOf(highV, data.series.map(s => s.tmax)) : null
  const dayLabel = `${fmtMonth(mm)} ${Number(mmdd.slice(2))}`
  const firstYear = data.series.length ? Math.min(...data.series.map(s => s.year)) : null

  const delta = highV != null && normal != null ? Math.round((highV - normal) * 10) / 10 : null
  const deltaWord = delta == null ? '' : delta > 0 ? 'warmer than normal' : delta < 0 ? 'cooler than normal' : 'at normal'

  const state = heroState({ value: highV, normal, brokeHigh, brokeLow })
  const dl = deltaLine(state)

  const banner =
    state.key === 'record-hot' ? `New record · hottest ${dayLabel}${firstYear != null ? ` since ${firstYear}` : ''}`
    : state.key === 'record-cold' ? `New record · coldest ${dayLabel}${firstYear != null ? ` since ${firstYear}` : ''}`
    : state.key === 'above' && r ? `${ordinal(r.rank)} warmest ${dayLabel}${firstYear != null ? ` since ${firstYear}` : ''}`
    : state.key === 'below' ? `Cooler than usual for ${dayLabel}`
    : `A typical ${dayLabel}`

  const bannerSub =
    state.key === 'record-hot' && prevHigh ? `beat ${prevHigh.v}° from ${prevHigh.year}`
    : state.key === 'record-cold' && prevLow ? `beat ${prevLow.v}° from ${prevLow.year}`
    : null

  // viewed-year-relative warming windows (matches mockup: 2026 → 1915–1925 vs 2015–2025)
  const recentFrom = year - 11, recentTo = year - 1, thenFrom = year - 111, thenTo = year - 101
  const recentMean = decadeMean(data.series, recentFrom, recentTo)
  const thenMean = decadeMean(data.series, thenFrom, thenTo)

  const fullLabel = `${fmtWeekday(date)} ${date.getDate()} ${fmtMonth(mm)} ${year}`
  const openPicker = () => { const el = inputRef.current; if (!el) return; if (typeof el.showPicker === 'function') { try { el.showPicker(); return } catch { /* */ } } el.focus(); el.click() }
  const clampIso = (v: string) => (v < isoOf(min) ? isoOf(min) : v > isoOf(max) ? isoOf(max) : v)
  const goToYear = (y: number) => { const m = date.getMonth(); const d = Math.min(date.getDate(), new Date(y, m + 1, 0).getDate()); onChange(new Date(y, m, d)) }

  const rangeSummary = highV != null
    ? `${secondLabel} ${secondV?.toFixed(1)}°, high ${highV.toFixed(1)}°, avg ${normal ?? '—'}°, between ${data.recordLow.v}° record low and ${data.recordHigh.v}° record high`
    : `Records ${data.recordLow.v}° to ${data.recordHigh.v}°`

  return (
    <div className="space-y-4">
      {/* HERO */}
      <HeroShell tone={state.tone} intensity={state.intensity}>
        <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
          <CalendarTile header={fmtMonth(mm).toUpperCase()} body={date.getDate()} footer={fmtWeekday(date).toUpperCase()}
            onClick={openPicker} ariaLabel={`Change date — ${fullLabel}`} />
          <div className="min-w-0 flex-1">
            {isReal && !live.data ? (
              <p className="text-sm text-muted">{live.error ? 'Live temperature unavailable.' : 'Fetching today…'}</p>
            ) : highV != null ? (
              <>
                <p className="text-[11px] uppercase tracking-[0.09em] text-muted">{state.word}</p>
                <div><BigTemp v={highV} className={`text-[40px] ${toneText(state.tone)}`} /></div>
                {dl && <p className="mt-1 text-sm text-muted">{dl}</p>}
                {provisional && <p className="mt-1 text-[11px] text-muted"><span aria-hidden>· </span>Provisional — may be revised</p>}
              </>
            ) : <p className="text-sm text-muted">No data for this date.</p>}
          </div>
          {secondV != null && (
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.09em] text-muted">{secondLabel}</p>
              <span className="text-2xl font-bold">{todayLive ? `${secondV.toFixed(1)}°` : fmtTemp(secondV)}</span>
            </div>
          )}
        </div>

        {highV != null && (
          <div className="mt-3">
            <span className={`inline-block px-2.5 py-1 text-xs font-semibold ${bannerClass(state.key)}`}>{banner}</span>
            {bannerSub && <p className="mt-1 text-[11px] text-muted">{bannerSub}</p>}
          </div>
        )}
      </HeroShell>

      {/* WHERE TODAY SITS — own card (kept out of the hero to avoid the glyph) */}
      {highV != null && (
        <div className="border border-border bg-surface p-5">
          <p className="mb-2 text-[11px] uppercase tracking-[0.09em] text-muted">Where {isReal ? 'today' : 'it'} sits</p>
          <RangeBar
            min={{ v: data.recordLow.v, label: `${data.recordLow.v}° record low` }}
            max={{ v: data.recordHigh.v, label: `${data.recordHigh.v}° record high` }}
            markers={[
              ...(normal != null ? [{ v: normal, label: `avg ${normal}°`, kind: 'tick' as const }] : []),
              ...(secondV != null ? [{ v: secondV, label: `${secondLabel.toLowerCase()} ${secondV.toFixed(1)}°`, kind: 'dot' as const }] : []),
              { v: highV, label: `high ${highV.toFixed(1)}°`, kind: 'diamond' as const },
            ]}
            summary={rangeSummary} />
        </div>
      )}

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {normal != null && <StatCard label="Average" value={fmtTemp(normal)} sub="1991–2020 normal" />}
        {delta != null && <StatCard label={isReal ? 'Today vs average' : 'High vs average'} value={`${delta > 0 ? '+' : ''}${delta.toFixed(1)} °C`} sub={deltaWord} valueClass={delta > 0 ? 'text-warm' : delta < 0 ? 'text-accent' : 'text-fg'} />}
        <StatCard label="Record high" value={fmtTemp(data.recordHigh.v)} sub={String(data.recordHigh.year)} valueClass="text-warm" onClick={() => goToYear(data.recordHigh.year)} />
        <StatCard label="Record low" value={fmtTemp(data.recordLow.v)} sub={String(data.recordLow.year)} valueClass="text-accent" onClick={() => goToYear(data.recordLow.year)} />
      </div>

      {/* WARMING STRIP */}
      {thenMean != null && recentMean != null && (
        <WarmingStrip label={`A warming ${dayLabel}`}
          then={{ mean: thenMean, from: thenFrom, to: thenTo }}
          recent={{ mean: recentMean, from: recentFrom, to: recentTo }}
          delta={Math.round((recentMean - thenMean) * 10) / 10} />
      )}

      <input ref={inputRef} type="date" tabIndex={-1} aria-hidden className="sr-only"
        value={isoOf(date)} min={isoOf(min)} max={isoOf(max)}
        onChange={e => { if (e.target.value) onChange(new Date(clampIso(e.target.value) + 'T00:00:00')) }} />

      <PeriodScatter title="Every year on this date" data={data.series}
        series={[{ key: 'tmax', name: 'High', color: 'var(--warm)' }, { key: 'tmin', name: 'Low', color: 'var(--accent)' }]} />
    </div>
  )
}
