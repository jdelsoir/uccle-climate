import { useRef, useState } from 'react'
import { useSummary } from '../../data/useSummary'
import { useYear } from '../../data/useYear'
import { useDaily } from '../../data/useDaily'
import { useDayNorm } from '../../data/useDayNorm'
import { fmtTemp, ordinal } from '../../lib/format'
import { Loading, ErrorState } from '../../components/States'
import CalendarTile from '../../components/CalendarTile'
import BigTemp from '../../components/BigTemp'
import RangeBar from '../../components/RangeBar'
import StatCard from '../../components/StatCard'
import WarmingStrip from '../../components/WarmingStrip'
import PeriodScatter from '../../components/PeriodScatter'
import HeroShell from '../../components/HeroShell'
import MonthGrid from '../../components/MonthGrid'
import YearStrip from '../../components/YearStrip'
import RecordsTally from '../../components/RecordsTally'
import YearCounters from '../../components/YearCounters'
import { heroState, deltaLine, bannerClass, toneText } from '../../lib/heroState'
import { shareNode } from '../../lib/share'
import { yearShareSentence, yearShareCaption } from '../../lib/shareText'
import { Share2 } from 'lucide-react'

type Annual = { year: number; mean: number; incomplete: boolean }
function yearWindowMean(annual: Annual[], from: number, to: number): number | null {
  const v = annual.filter(a => a.year >= from && a.year <= to && !a.incomplete).map(a => a.mean)
  return v.length ? Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 10) / 10 : null
}

export default function YearView({ year, onPickMonth, onPickDay }: {
  year: number
  onPickMonth: (year: number, month: number) => void
  onPickDay: (iso: string) => void
}) {
  const { summary, loading, error } = useSummary()
  const { data: yearMonths } = useYear(year)
  const daily = useDaily(year)
  const dayNorm = useDayNorm()
  const [capturing, setCapturing] = useState(false)
  const busy = useRef(false)
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

  const yComplete = !!a && !a.incomplete
  const state = heroState({
    value: a ? a.mean : null,
    normal,
    brokeHigh: yComplete && recordWarm?.year === year,
    brokeLow: yComplete && recordCold?.year === year,
  })
  const dl = deltaLine(state)
  const banner = !a ? null
    : !yComplete ? 'This year so far'
    : state.key === 'record-hot' ? 'Warmest year on record'
    : state.key === 'record-cold' ? 'Coldest year on record'
    : state.key === 'above' && rank ? `${ordinal(rank)} warmest year in ${total} years`
    : state.key === 'below' ? 'Cooler than usual'
    : 'A typical year'
  const bannerKey = yComplete ? state.key : 'close'

  const recentFrom = year - 11, recentTo = year - 1, thenFrom = year - 111, thenTo = year - 101
  const recentMean = yearWindowMean(summary.annual, recentFrom, recentTo)
  const thenMean = yearWindowMean(summary.annual, thenFrom, thenTo)

  const ratePerDecade = summary.warmingRate.full
  const completeYears = summary.annual.filter(x => !x.incomplete)
  const firstComplete = completeYears.length ? Math.min(...completeYears.map(x => x.year)) : null

  const normMap = new Map((dayNorm.data?.['1991-2020'] ?? []).map(n => [n.mmdd, n.normal]))
  const normalFor = (mmdd: string) => normMap.get(mmdd) ?? null
  const days = Array.isArray(daily.data) ? daily.data : []

  const handleShare = async () => {
    if (busy.current) return
    busy.current = true; setCapturing(true)
    try {
      await new Promise<void>(res => requestAnimationFrame(() => requestAnimationFrame(() => res())))
      const node = document.getElementById('year-capture')
      if (node && a) await shareNode(node, 'uccle-year.png', {
        text: yearShareCaption(yearShareSentence({ year, key: state.key, rank, total, complete: yComplete }), year),
      })
    } finally { setCapturing(false); busy.current = false }
  }

  return (
    <div className="space-y-3">
      <div id="year-capture" className="space-y-3">
        <HeroShell tone={state.tone} intensity={state.intensity}>
          <div className="flex flex-wrap items-start gap-x-5 gap-y-2">
            <CalendarTile header="YEAR" body={year} />
            <div className="min-w-0 flex-1">
              {a ? (
                <>
                  <p className="text-[11px] uppercase tracking-[0.09em] text-muted">{state.word}</p>
                  <div><BigTemp v={a.mean} className={`text-[40px] ${toneText(state.tone)}`} /></div>
                  {dl && <p className="mt-1 text-sm text-muted">{dl}</p>}
                </>
              ) : <p className="text-sm text-muted">No data for {year} yet.</p>}
            </div>
          </div>
          {banner && (
            <div className="mt-3">
              <span className={`inline-block px-2.5 py-1 text-xs font-semibold ${bannerClass(bannerKey)}`}>{banner}</span>
            </div>
          )}
        </HeroShell>

        {Array.isArray(daily.data) && dayNorm.data && <YearStrip year={year} days={days} normalFor={normalFor} />}

        {capturing && (
          <div className="border border-border bg-surface px-5 py-3 text-[11px] text-muted">
            <p>Uccle, Brussels · jdelsoir.github.io/uccle-climate</p>
          </div>
        )}
      </div>

      {a && (
        <div className="flex justify-end">
          <button type="button" aria-label="Share this year" disabled={capturing} onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-muted transition-colors hover:text-fg disabled:opacity-40">
            <Share2 size={14} aria-hidden /> Share
          </button>
        </div>
      )}

      {Array.isArray(yearMonths) && yearMonths.length > 0 && (
        <MonthGrid year={year} months={yearMonths} onPickMonth={onPickMonth} />
      )}

      {a && recordWarm && recordCold && (
        <div className="border border-border bg-surface p-4">
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

      <YearCounters year={year} counters={summary.counters} incomplete={!yComplete} />

      {Array.isArray(daily.data) && <RecordsTally year={year} days={days} onPickDay={onPickDay} />}

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {normal != null && <StatCard label="Average" value={fmtTemp(normal)} sub="1991–2020 normal" />}
        {delta != null && <StatCard label="This year vs average" value={`${delta > 0 ? '+' : ''}${delta.toFixed(1)} °C`} sub={deltaWord} valueClass={delta > 0 ? 'text-warm' : delta < 0 ? 'text-accent' : 'text-fg'} />}
        <StatCard label="Warmest year" value={fmtTemp(recordWarm?.mean)} sub={recordWarm ? String(recordWarm.year) : undefined} valueClass="text-warm" />
        <StatCard label="Coldest year" value={fmtTemp(recordCold?.mean)} sub={recordCold ? String(recordCold.year) : undefined} valueClass="text-accent" />
        {ratePerDecade != null && (
          <StatCard label="Warming"
            value={`${ratePerDecade > 0 ? '+' : ''}${ratePerDecade.toFixed(2)} °C/decade`}
            sub={firstComplete != null ? `since ${firstComplete}` : 'full record'}
            valueClass={ratePerDecade > 0 ? 'text-warm' : ratePerDecade < 0 ? 'text-accent' : 'text-fg'} />
        )}
      </div>

      {thenMean != null && recentMean != null && (
        <WarmingStrip label="A warming century"
          then={{ mean: thenMean, from: thenFrom, to: thenTo }}
          recent={{ mean: recentMean, from: recentFrom, to: recentTo }}
          delta={Math.round((recentMean - thenMean) * 10) / 10} />
      )}

      <PeriodScatter title="Annual mean by year" data={summary.annual.filter(x => !x.incomplete).map(x => ({ year: x.year, mean: x.mean }))}
        series={[{ key: 'mean', name: 'Annual mean', color: 'var(--accent)' }]} trendKey="mean" />
    </div>
  )
}
