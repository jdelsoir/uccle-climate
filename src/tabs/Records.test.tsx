import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import Records from './Records'

const summary = {
  station: { id: '', name: '', lat: 0, lon: 0 },
  baselines: { '1991-2020': 0, '1961-1990': 0 },
  annual: [],
  anomaly: { '1991-2020': [], '1961-1990': [] },
  decadal: [],
  warmingRate: { full: 0, last30: 0 },
  records: { year: 2026, highs: 0, lows: 0 },
  extremes: {
    warmest: [{ date: '1947-06-25', v: 36.6 }, { date: '1976-07-03', v: 35.9 }],
    coldest: [{ date: '1942-01-26', v: -19.5 }, { date: '1985-01-16', v: -18.0 }],
  },
  counters: { SU: [], hot30: [], TR: [], FD: [], ID: [], heatwaveDays: [], gsl: [] },
  rankings: { warmest: [], coldest: [] },
}

afterEach(() => vi.unstubAllGlobals())

const openMeteoPayload = {
  current: { time: '2026-06-25T12:00', temperature_2m: 38 },
  daily: { time: ['2026-06-25'], temperature_2m_max: [38], temperature_2m_min: [20] },
}

test('defaults to Warmest and lists records with dates', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((u: string) =>
      Promise.resolve({
        ok: true,
        json: async () => (u.includes('open-meteo') ? openMeteoPayload : summary),
      })
    )
  )
  render(<Records />)
  await waitFor(() => expect(screen.getByText('36.6 °C')).toBeInTheDocument())
  expect(screen.getByText('25 Jun 1947')).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: /warmest/i })).toHaveAttribute('aria-checked', 'true')
  // cold record not shown by default
  expect(screen.queryByText('-19.5 °C')).not.toBeInTheDocument()
})

test('toggles to Coldest', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((u: string) =>
      Promise.resolve({
        ok: true,
        json: async () => (u.includes('open-meteo') ? openMeteoPayload : summary),
      })
    )
  )
  render(<Records />)
  await waitFor(() => screen.getByText('36.6 °C'))
  fireEvent.click(screen.getByRole('radio', { name: /coldest/i }))
  expect(screen.getByText('-19.5 °C')).toBeInTheDocument()
  expect(screen.getByText('26 Jan 1942')).toBeInTheDocument()
  expect(screen.queryByText('36.6 °C')).not.toBeInTheDocument()
})

test('merges live today into the warmest list at its rank', async () => {
  // summary warmest top values 39.7, 36.4; live today 38.0 should appear between them
  const s = {
    ...summary,
    extremes: {
      warmest: [
        { date: '2019-07-25', v: 39.7 },
        { date: '2026-06-25', v: 36.4 },
      ],
      coldest: [],
    },
  }
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((u: string) =>
      Promise.resolve({
        ok: true,
        json: async () =>
          u.includes('open-meteo')
            ? {
                current: { time: '2026-06-26T12:00', temperature_2m: 38 },
                daily: { time: ['2026-06-26'], temperature_2m_max: [38], temperature_2m_min: [20] },
              }
            : s,
      })
    )
  )
  render(<Records />)
  await waitFor(() => expect(screen.getByText('38.0 °C')).toBeInTheDocument())
  expect(screen.getByText(/25 Jun 2026/)).toBeInTheDocument() // today appears in the list
})
