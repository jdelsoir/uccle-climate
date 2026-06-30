import { useRef, useState } from 'react'
import { useMonth } from '../../data/useMonth'
import { useDaily } from '../../data/useDaily'
import { useDayNorm } from '../../data/useDayNorm'
import { useTodayTemp } from '../../data/useTodayTemp'
import { fmtTemp, fmtMonth, ordinal, todayMMDD } from '../../lib/format'
import { Loading, ErrorState } from '../../components/States'
import CalendarTile from '../../components/CalendarTile'
import BigTemp from '../../components/BigTemp'
import RangeBar from '../../components/RangeBar'
import StatCard from '../../components/StatCard'
import WarmingStrip from '../../components/WarmingStrip'
import PeriodScatter from '../../components/PeriodScatter'
import HeroShell from '../../components/HeroShell'
import MonthHeatmap from '../../components/MonthHeatmap'
import NotableDays from '../../components/NotableDays'
import { heroState, deltaLine, bannerClass, toneText } from '../../lib/heroState'
import { monthDays, dayMix, recordsBroken, topWarmest, topColdest, windowMean } from '../../lib/monthDetail'
import { linregress, perDecade } from '../../lib/trend'
import { monthSummary } from '../../lib/monthSummary'
import { monthShareCaption } from '../../lib/shareText'
import { shareNode } from '../../lib/share'
import { Share2 } from 'lucide-react'

export default function MonthView({ year, mm, onPickDay, onPickMonth }: { year: number; mm: string; onPickDay: (iso: string) => void; onPickMonth: (year: number, month: number) => void }) {
  const { data, loading, error } = useMonth(mm)
  const daily = useDaily(year)
  const dayNorm = useDayNorm()
  const live = useTodayTemp()
  const [capturing, setCapturing] = useState(false)
  const busy = useRef(false)
  const pickerRef = useRef<HTMLInputElement>(null)
  const openPicker = () => { const el = pickerRef.current; if (!el) return; if (typeof el.showPicker === 'function') { try { el.showPicker(); return } catch { /* */ } } el.focus(); el.click() }
  const nowD = new Date()
  const maxMonth = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}`

  if (loading) return <Loading label="Loading month…" />
  if (error || !data) return <ErrorState label="Could not load this month." />

  const name = fmtMonth(mm)
  const cur = data.series.find(s => s.year === year)
  const complete = data.series.filter(s => s.complete)
  const rank = cur ? complete.filter(s => s.mean > cur.mean).length + 1 : null
  const delta = cur && data.normal != null ? Math.round((cur.mean - data.normal) * 10) / 10 : null
  const deltaWord = delta == null ? '' : delta > 0 ? 'warmer than normal' : delta < 0 ? 'cooler than normal' : 'at normal'
  const fit = linregress(complete.map(s => ({ x: s.year, y: s.mean })))
  const ratePerDecade = fit ? Math.round(perDecade(fit.slope) * 100) / 100 : null
  const firstComplete = complete.length ? Math.min(...complete.map(s => s.year)) : null
  const recentFrom = year - 11, recentTo = year - 1, thenFrom = year - 111, thenTo = year - 101
  const recentMean = windowMean(data.series, recentFrom, recentTo)
  const thenMean = windowMean(data.series, thenFrom, thenTo)

  const complete_ = cur?.complete === true
  const state = heroState({
    value: cur ? cur.mean : null,
    normal: data.normal,
    brokeHigh: complete_ && data.recordWarm?.year === year,
    brokeLow: complete_ && data.recordCold?.year === year,
  })
  const dl = deltaLine(state)
  const banner = !cur ? null
    : !complete_ ? `${name} so far`
    : state.key === 'record-hot' ? `Warmest ${name} on record`
    : state.key === 'record-cold' ? `Coldest ${name} on record`
    : state.key === 'above' && rank ? `${ordinal(rank)} warmest ${name} in ${complete.length} years`
    : state.key === 'below' ? `Cooler than usual`
    : `A typical ${name}`
  const bannerKey = complete_ ? state.key : 'close'

  // within-month detail (app-side; tempColor single source of truth)
  const normMap = new Map((dayNorm.data?.['1991-2020'] ?? []).map(n => [n.mmdd, n.normal]))
  const normalFor = (mmdd: string) => normMap.get(mmdd) ?? null
  const mDays = daily.data ? monthDays(daily.data, mm) : []
  const mix = dayMix(mDays, normalFor)
  const records = recordsBroken(mDays)
  const warmest = topWarmest(mDays)
  const coldest = topColdest(mDays)
  const summary = mDays.length ? monthSummary({ warm: mix.warm, cool: mix.cool, total: mix.total, records, soFar: !complete_ }) : null

  const todayMM = todayMMDD().slice(0, 2)
  const liveToday = year === new Date().getFullYear() && mm === todayMM && live.data
    ? { mmdd: todayMMDD(), tmax: live.data.tmax }
    : null

  const handleShare = async () => {
    if (busy.current) return
    busy.current = true; setCapturing(true)
    try {
      await new Promise<void>(res => requestAnimationFrame(() => requestAnimationFrame(() => res())))
      const node = document.getElementById('month-capture')
      if (node && summary) await shareNode(node, 'uccle-month.png', { text: monthShareCaption(summary, year, mm) })
    } finally { setCapturing(false); busy.current = false }
  }

  return (
    <div className="space-y-4">
      <div id="month-capture" className="space-y-4">
        <HeroShell tone={state.tone} intensity={state.intensity}>
          <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
            <CalendarTile header={name.toUpperCase()} body={year} onClick={openPicker} ariaLabel={`Change month — ${name} ${year}`} />
            <div className="min-w-0 flex-1">
              {cur ? (
                <>
                  <p className="text-[11px] uppercase tracking-[0.09em] text-muted">{state.word}</p>
                  <div><BigTemp v={cur.mean} className={`text-[40px] ${toneText(state.tone)}`} /></div>
                  {dl && <p className="mt-1 text-sm text-muted">{dl}</p>}
                </>
              ) : <p className="text-sm text-muted">No data for {name} {year} yet.</p>}
            </div>
          </div>
          {banner && (
            <div className="mt-3">
              <span className={`inline-block px-2.5 py-1 text-xs font-semibold ${bannerClass(bannerKey)}`}>{banner}</span>
            </div>
          )}
        </HeroShell>

        {summary && <p className="text-sm text-fg">{summary}</p>}

        {daily.data && dayNorm.data && (
          <MonthHeatmap year={year} mm={mm} days={mDays} normalFor={normalFor} liveToday={liveToday} onPick={onPickDay} />
        )}

        {capturing && summary && (
          <div className="border border-border bg-surface px-5 py-3 text-[11px] text-muted">
            {/* summary already shown above inside #month-capture; footer is attribution-only */}
            <p>Uccle, Brussels · jdelsoir.github.io/uccle-climate</p>
          </div>
        )}
      </div>

      {summary && (
        <div className="flex justify-end">
          <button type="button" aria-label="Share this month" disabled={capturing} onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-muted transition-colors hover:text-fg disabled:opacity-40">
            <Share2 size={14} aria-hidden /> Share
          </button>
        </div>
      )}

      {cur && data.recordCold && data.recordWarm && (
        <div className="border border-border bg-surface p-5">
          <p className="mb-2 text-[11px] uppercase tracking-[0.09em] text-muted">Where {year} sits</p>
          <RangeBar
            min={{ v: data.recordCold.v, label: `${data.recordCold.v}° coldest` }}
            max={{ v: data.recordWarm.v, label: `${data.recordWarm.v}° warmest` }}
            markers={[
              ...(data.normal != null ? [{ v: data.normal, label: `normal ${data.normal}°`, kind: 'tick' as const }] : []),
              { v: cur.mean, label: `${year} ${cur.mean}°`, kind: 'dot' as const },
            ]}
            summary={`${name} ${year} mean ${cur.mean}°, normal ${data.normal ?? '—'}°, between ${data.recordCold.v}° coldest and ${data.recordWarm.v}° warmest`} />
        </div>
      )}

      <NotableDays warmest={warmest} coldest={coldest} year={year} mm={mm} onPick={onPickDay} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {data.normal != null && <StatCard label="Average" value={fmtTemp(data.normal)} sub="1991–2020 normal" />}
        {delta != null && <StatCard label="This year vs average" value={`${delta > 0 ? '+' : ''}${delta.toFixed(1)} °C`} sub={deltaWord} valueClass={delta > 0 ? 'text-warm' : delta < 0 ? 'text-accent' : 'text-fg'} />}
        <StatCard label={`Warmest ${name}`} value={fmtTemp(data.recordWarm?.v)} sub={data.recordWarm ? String(data.recordWarm.year) : undefined} valueClass="text-warm" />
        <StatCard label={`Coldest ${name}`} value={fmtTemp(data.recordCold?.v)} sub={data.recordCold ? String(data.recordCold.year) : undefined} valueClass="text-accent" />
        {ratePerDecade != null && (
          <StatCard label="Warming"
            value={`${ratePerDecade > 0 ? '+' : ''}${ratePerDecade.toFixed(2)} °C/decade`}
            sub={firstComplete != null ? `since ${firstComplete}` : 'full record'}
            valueClass={ratePerDecade > 0 ? 'text-warm' : ratePerDecade < 0 ? 'text-accent' : 'text-fg'} />
        )}
      </div>

      {thenMean != null && recentMean != null && (
        <WarmingStrip label={`A warming ${name}`}
          then={{ mean: thenMean, from: thenFrom, to: thenTo }}
          recent={{ mean: recentMean, from: recentFrom, to: recentTo }}
          delta={Math.round((recentMean - thenMean) * 10) / 10} />
      )}

      <input ref={pickerRef} type="month" tabIndex={-1} aria-hidden className="sr-only"
        value={`${year}-${mm}`} min="1833-01" max={maxMonth}
        onChange={e => { const m = /^(\d{4})-(\d{2})$/.exec(e.target.value); if (m) onPickMonth(+m[1], +m[2]) }} />

      <PeriodScatter title={`Every ${name} mean`} data={complete.map(s => ({ year: s.year, mean: s.mean }))}
        series={[{ key: 'mean', name: `${name} mean`, color: 'var(--accent)' }]} trendKey="mean" />
    </div>
  )
}
