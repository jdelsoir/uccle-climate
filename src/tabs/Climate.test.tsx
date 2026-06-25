import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import Climate from './Climate'

const summary = {
  station: { id: '', name: '', lat: 0, lon: 0 },
  baselines: { '1991-2020': 0, '1961-1990': 0 },
  annual: [],
  anomaly: { '1991-2020': [], '1961-1990': [] },
  decadal: [],
  warmingRate: { full: 0, last30: 0 },
  counters: {
    SU: [{ year: 2000, n: 30 }],
    hot30: [{ year: 2000, n: 5 }],
    TR: [{ year: 2000, n: 2 }],
    FD: [{ year: 2000, n: 40 }],
    ID: [{ year: 2000, n: 3 }],
    heatwaveDays: [{ year: 2000, n: 6 }],
    gsl: [{ year: 2000, n: 250 }],
  },
  rankings: { warmest: [], coldest: [] },
}

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>()
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      <div style={{ width: 800, height: 80 }}>{children}</div>,
  }
})

test('renders counter cards', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => summary }))
  render(<Climate />)
  await waitFor(() => expect(screen.getByText(/summer days/i)).toBeInTheDocument())
  expect(screen.getByText(/tropical nights/i)).toBeInTheDocument()
})

afterEach(() => vi.unstubAllGlobals())
