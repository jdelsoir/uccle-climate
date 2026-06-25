import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import YearView from './YearView'

vi.mock('recharts', async (o) => { const a = await o<typeof import('recharts')>()
  return { ...a, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 800, height: 300 }}>{children}</div> } })

const summary = { station: { id: '', name: '', lat: 0, lon: 0 }, baselines: { '1991-2020': 10, '1961-1990': 10 },
  annual: [{ year: 2000, mean: 10.5, tmin: 6, tmax: 15, incomplete: false }, { year: 2020, mean: 12.1, tmin: 8, tmax: 16, incomplete: false }],
  anomaly: { '1991-2020': [{ year: 2000, v: 0.5 }, { year: 2020, v: 2.1 }], '1961-1990': [] }, decadal: [],
  warmingRate: { full: 0, last30: 0 }, records: { year: 2026, highs: 0, lows: 0 },
  extremes: { warmest: [], coldest: [] },
  counters: { SU: [], hot30: [], TR: [], FD: [], ID: [], heatwaveDays: [], gsl: [] },
  rankings: { warmest: [{ year: 2020, mean: 12.1 }, { year: 2000, mean: 10.5 }], coldest: [{ year: 2000, mean: 10.5 }] } }

afterEach(() => vi.unstubAllGlobals())

test('shows selected year mean + rank', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => summary }))
  render(<YearView year={2000} />)
  await waitFor(() => expect(screen.getAllByText('10.5 °C')).toHaveLength(2))  // headline + coldest record
  expect(screen.getByText(/2nd warmest year/i)).toBeInTheDocument()  // 2000 is 2nd warmest
})

test('incomplete year shows (so far) and no rank badge', async () => {
  const s = { ...summary, annual: [...summary.annual, { year: 2026, mean: 13.0, tmin: 9, tmax: 18, incomplete: true }] }
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => s }))
  render(<YearView year={2026} />)
  await waitFor(() => expect(screen.getByText('13.0 °C')).toBeInTheDocument())
  expect(screen.getByText(/so far/i)).toBeInTheDocument()
  expect(screen.queryByText(/warmest year in/i)).not.toBeInTheDocument()  // rank badge suppressed
})
