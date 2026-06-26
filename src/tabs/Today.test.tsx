import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import Today from './Today'

vi.mock('recharts', async (o) => { const a = await o<typeof import('recharts')>()
  return { ...a, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 800, height: 300 }}>{children}</div> } })

const thisday = { mmdd: '0626', recordHigh: { v: 34.8, year: 1947 }, recordLow: { v: 4.1, year: 1923 },
  series: [{ year: 2020, tmax: 33, tmin: 20 }], thenNow: { early: { from: 1833, to: 1900, mean: 18 }, recent: { from: 1996, to: 2025, mean: 21 } } }
const month = { mm: '06', series: [{ year: 2020, mean: 19, complete: true }], recordWarm: { year: 2020, v: 19 }, recordCold: { year: 2020, v: 19 }, normal: 17, thenNow: { early: { from: 1833, to: 1900, mean: 15 }, recent: { from: 1996, to: 2025, mean: 18 } } }
const summary = { station: {}, baselines: { '1991-2020': 10, '1961-1990': 10 }, annual: [{ year: 2026, mean: 11, tmin: 6, tmax: 16, incomplete: true }, { year: 2025, mean: 12, tmin: 7, tmax: 17, incomplete: false }],
  anomaly: { '1991-2020': [], '1961-1990': [] }, decadal: [], warmingRate: { full: 0, last30: 0 }, records: { year: 2026, highs: 0, lows: 0 },
  extremes: { warmest: [], coldest: [] }, counters: { SU: [], hot30: [], TR: [], FD: [], ID: [], heatwaveDays: [], gsl: [] }, rankings: { warmest: [{ year: 2025, mean: 12 }], coldest: [{ year: 2025, mean: 12 }] } }

function routeFetch(u: string) {
  if (u.includes('open-meteo')) return { current: { temperature_2m: 20 }, daily: { temperature_2m_max: [21], temperature_2m_min: [12] } }
  if (u.includes('/month/')) return month
  if (u.includes('summary.json')) return summary
  return thisday
}
afterEach(() => vi.unstubAllGlobals())

test('defaults to Day mode with heading and switches to Month', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () => routeFetch(u) })))
  render(<Today />)
  expect(screen.getByRole('heading', { name: /this day in history/i })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('radio', { name: /month/i }))
  await waitFor(() => expect(screen.getByRole('heading', { name: /this month in history/i })).toBeInTheDocument())
})
