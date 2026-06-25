import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import Climate from './Climate'

const summary = {
  station: { id: '', name: '', lat: 0, lon: 0 },
  baselines: { '1991-2020': 0, '1961-1990': 0 },
  // 2000 complete; 2001 is a partial/incomplete trailing year (must NOT be the headline)
  annual: [
    { year: 2000, mean: 11, tmin: 6, tmax: 16, incomplete: false },
    { year: 2001, mean: 10, tmin: 6, tmax: 14, incomplete: true },
  ],
  anomaly: { '1991-2020': [], '1961-1990': [] },
  decadal: [],
  warmingRate: { full: 0, last30: 0 },
  counters: {
    SU: [{ year: 2000, n: 30 }, { year: 2001, n: 9 }],
    hot30: [{ year: 2000, n: 5 }, { year: 2001, n: 1 }],
    TR: [{ year: 2000, n: 2 }, { year: 2001, n: 0 }],
    FD: [{ year: 2000, n: 40 }, { year: 2001, n: 14 }],
    ID: [{ year: 2000, n: 3 }, { year: 2001, n: 0 }],
    heatwaveDays: [{ year: 2000, n: 6 }, { year: 2001, n: 0 }],
    gsl: [{ year: 2000, n: 250 }, { year: 2001, n: 0 }],
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
  // Defaults to the latest year (2001, partial) → SU 9, flagged "(so far)"
  expect(screen.getByText('9')).toBeInTheDocument()
  expect(screen.getAllByText(/in 2001 \(so far\)/).length).toBe(5)
  // Year selector switches to a complete year
  fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2000' } })
  expect(screen.getByText('30')).toBeInTheDocument()
  expect(screen.getAllByText(/in 2000/).length).toBe(5)
})

afterEach(() => vi.unstubAllGlobals())
