import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import Trends from './Trends'

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>()
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      <div style={{ width: 800, height: 300 }}>{children}</div>
  }
})

afterEach(() => vi.unstubAllGlobals())

const summary = {
  station: { id: 'BE000006447', name: 'Uccle', lat: 50.8, lon: 4.36 },
  baselines: { '1991-2020': 10.9, '1961-1990': 9.8 },
  annual: [{ year: 2000, mean: 10, tmin: 5, tmax: 15, incomplete: false }],
  anomaly: { '1991-2020': [{ year: 2000, v: -0.9 }], '1961-1990': [{ year: 2000, v: 0.2 }] },
  decadal: [{ decade: 2000, mean: 10 }],
  warmingRate: { full: 0.11, last30: 0.42 },
  counters: { SU: [], hot30: [], TR: [], FD: [], ID: [], heatwaveDays: [], gsl: [] },
  rankings: { warmest: [], coldest: [] }
}

test('shows warming rate headline', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => summary }))
  render(<Trends />)
  await waitFor(() => expect(screen.getByText(/per decade/i)).toBeInTheDocument())
})
