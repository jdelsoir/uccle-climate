import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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

const openMeteoPayload = {
  current: { time: '2026-06-25T12:00', temperature_2m: 38 },
  daily: { time: ['2026-06-25'], temperature_2m_max: [38], temperature_2m_min: [20] },
}

afterEach(() => vi.unstubAllGlobals())

function stub(s: unknown = summary, live: unknown = openMeteoPayload) {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) =>
    Promise.resolve({ ok: true, json: async () => (u.includes('open-meteo') ? live : s) })))
}
const renderRecords = () => render(<MemoryRouter><Records /></MemoryRouter>)

test('Warmest is selected by default with a solid red fill', async () => {
  stub(); renderRecords()
  const warmBtn = await screen.findByRole('radio', { name: /warmest/i })
  expect(warmBtn).toHaveAttribute('aria-checked', 'true')
  expect(warmBtn.className).toContain('bg-warm')
  expect(warmBtn.className).toContain('text-white')
})

test('rows are links to the Day view for that date, with warm accent', async () => {
  stub(); renderRecords()
  const link = await screen.findByRole('link', { name: /25 Jun 1947/i })
  expect(link).toHaveAttribute('href', '/today?d=1947-06-25')
  expect(link.querySelector('.text-warm')).toBeTruthy()
})

test('toggling to Coldest swaps data, accent to blue, and shows a solid blue fill', async () => {
  stub(); renderRecords()
  await screen.findByRole('link', { name: /25 Jun 1947/i })
  fireEvent.click(screen.getByRole('radio', { name: /coldest/i }))
  const coldBtn = screen.getByRole('radio', { name: /coldest/i })
  expect(coldBtn).toHaveAttribute('aria-checked', 'true')
  expect(coldBtn.className).toContain('bg-accent')
  expect(coldBtn.className).toContain('text-white')
  const link = screen.getByRole('link', { name: /26 Jan 1942/i })
  expect(link).toHaveAttribute('href', '/today?d=1942-01-26')
  expect(link.querySelector('.text-accent')).toBeTruthy()
  expect(screen.queryByRole('link', { name: /25 Jun 1947/i })).not.toBeInTheDocument()
})

test('rows are flat — no per-row card border, list uses dividers', async () => {
  stub(); renderRecords()
  const link = await screen.findByRole('link', { name: /25 Jun 1947/i })
  expect(link.closest('li')!.className).not.toMatch(/border|rounded/)
  expect(link.closest('ol')!.className).toContain('divide-y')
})

test("today's live datum still merges into the list", async () => {
  const s = { ...summary, extremes: { warmest: [{ date: '2019-07-25', v: 39.7 }, { date: '2026-06-25', v: 36.4 }], coldest: [] } }
  const live = { current: { time: '2026-06-26T12:00', temperature_2m: 38 }, daily: { time: ['2026-06-26'], temperature_2m_max: [38], temperature_2m_min: [20] } }
  stub(s, live); renderRecords()
  expect(await screen.findByRole('link', { name: /39\.7 °C/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /38\.0 °C/ })).toBeInTheDocument() // live today merged at 38.0
})
