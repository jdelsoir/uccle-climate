import { useEffect, useState } from 'react'
import { useSummary } from '../data/useSummary'
import Stripes from '../components/Stripes'
import ShareButton from '../components/ShareButton'
import { Loading, ErrorState } from '../components/States'

const KEY = 'uccle.birthYear'

export default function Me() {
  const { summary, loading, error } = useSummary()
  const [year, setYear] = useState<number | ''>(() => {
    const v = localStorage.getItem(KEY)
    return v ? Number(v) : ''
  })
  useEffect(() => { if (year) localStorage.setItem(KEY, String(year)) }, [year])
  if (loading) return <Loading label="Loading…" />
  if (error || !summary) return <ErrorState label="Could not load data." />

  const maxYear = summary.annual.filter(a => !a.incomplete).reduce((m, a) => Math.max(m, a.year), 1833)
  const incompleteYears = new Set(summary.annual.filter(a => a.incomplete).map(a => a.year))
  const anom = summary.anomaly['1991-2020'].filter(a => year !== '' && a.year >= year && !incompleteYears.has(a.year))
  const annual = summary.annual

  let warming: number | null = null
  if (year !== '') {
    const a0 = annual.find(a => a.year >= (year as number) && !a.incomplete)
    const a1 = [...annual].reverse().find(a => !a.incomplete)
    if (a0 && a1) warming = Math.round((a1.mean - a0.mean) * 10) / 10
  }

  return (
    <section className="fade-in space-y-4">
      <h2 className="text-2xl font-extrabold tracking-tight">Your Climate</h2>
      <div className="rounded-xl border border-border bg-surface p-5">
        <label className="block text-sm font-medium">
          Birth year
          <input
            type="number" min={1833} max={maxYear} value={year}
            onChange={e => setYear(e.target.value ? Number(e.target.value) : '')}
            placeholder="e.g. 1990"
            className="mt-2 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
          />
        </label>
      </div>
      {year !== '' && (
        <div id="share-card" className="rounded-xl border border-border bg-surface p-5">
          <Stripes points={anom.map(a => ({ year: a.year, v: a.v }))} />
          {warming != null && (
            <p className="mt-3 text-sm">
              Uccle warmed about <strong className="text-warm">{warming} °C</strong> since you were born — Uccle, Brussels.
            </p>
          )}
        </div>
      )}
      {year !== '' && <ShareButton targetId="share-card" />}
    </section>
  )
}
