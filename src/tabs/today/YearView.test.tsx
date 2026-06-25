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
  render(<YearView year={2020} />)
  await waitFor(() => expect(screen.getAllByText(/12\.1 °C/).length).toBeGreaterThan(0))
  expect(screen.getByText(/1st warmest year/i)).toBeInTheDocument()  // 2020 is warmest
})
