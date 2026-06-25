import { useEffect, useState } from 'react'
import { useSummary } from '../data/useSummary'
import Stripes from '../components/Stripes'
import ShareButton from '../components/ShareButton'

const KEY = 'uccle.birthYear'

export default function Me() {
  const { summary, loading, error } = useSummary()
  const [year, setYear] = useState<number | ''>(() => {
    const v = localStorage.getItem(KEY)
    return v ? Number(v) : ''
  })

  useEffect(() => {
    if (year) localStorage.setItem(KEY, String(year))
  }, [year])

  if (loading) return <p>Loading…</p>
  if (error || !summary) return <p>Could not load data.</p>

  const anom = summary.anomaly['1991-2020'].filter((a) => year !== '' && a.year >= year)
  const annual = summary.annual

  let warming: number | null = null
  if (year !== '') {
    const a0 = annual.find((a) => a.year >= (year as number) && !a.incomplete)
    const a1 = [...annual].reverse().find((a) => !a.incomplete)
    if (a0 && a1) warming = Math.round((a1.mean - a0.mean) * 10) / 10
  }

  return (
    <section>
      <h2>Your Climate</h2>
      <label>
        Birth year:{' '}
        <input
          type="number"
          min={1833}
          max={2026}
          value={year}
          onChange={(e) => setYear(e.target.value ? Number(e.target.value) : '')}
        />
      </label>
      {year !== '' && (
        <div id="share-card">
          <Stripes points={anom.map((a) => ({ year: a.year, v: a.v }))} />
          {warming != null && (
            <p>
              Uccle warmed about <strong>{warming} °C</strong> since you were born — Uccle, Brussels.
            </p>
          )}
        </div>
      )}
      {year !== '' && <ShareButton targetId="share-card" />}
    </section>
  )
}
