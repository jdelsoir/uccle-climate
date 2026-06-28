import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import DayView from './DayView'

vi.mock('recharts', async (o) => { const a = await o<typeof import('recharts')>()
  return { ...a, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 800, height: 300 }}>{children}</div> } })

// thisday for 06-28: record high held by 1955, with earlier years present
const thisday = { mmdd: '0628', recordHigh: { v: 34.8, year: 1955 }, recordLow: { v: 4.1, year: 1923 },
  series: [
    { year: 1923, tmax: 20, tmin: 4.1 }, { year: 1925, tmax: 22, tmin: 6 },
    { year: 1955, tmax: 34.8, tmin: 12 }, { year: 2015, tmax: 30, tmin: 16 },
    { year: 2020, tmax: 31, tmin: 17 }, { year: 2024, tmax: 29, tmin: 15 },
  ],
  thenNow: { early: { from: 1833, to: 1900, mean: 18 }, recent: { from: 1996, to: 2025, mean: 21 } } }
const daynorm = { '1991-2020': [{ doy: 180, mmdd: '0628', normal: 24, p10: 18, p90: 30 }], '1961-1990': [] }
const live = { current: { time: '2026-06-28T12:00', temperature_2m: 27 }, daily: { time: ['2026-06-28'], temperature_2m_max: [29], temperature_2m_min: [16] } }

function routeFetch(u: string) {
  if (u.includes('open-meteo')) return live
  if (u.includes('daynorm')) return daynorm
  return thisday
}
afterEach(() => vi.unstubAllGlobals())

test('today shows max + current, both colored, date line', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () => routeFetch(u) })))
  render(<DayView />)
  await waitFor(() => expect(screen.getByText('29.0 °C')).toBeInTheDocument()) // max
  expect(screen.getByText('27.0 °C')).toBeInTheDocument()                      // current
  expect(screen.getByText('current')).toBeInTheDocument()
})

test('navigating to the record year shows the record-broken banner + previous record, and records are clickable', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () => routeFetch(u) })))
  render(<DayView />)
  await waitFor(() => screen.getByLabelText('Pick a date'))
  // jump to 1955-06-28 (the record-high year)
  fireEvent.change(screen.getByLabelText('Pick a date'), { target: { value: '1955-06-28' } })
  await waitFor(() => expect(screen.getByText(/Record high for this date/i)).toBeInTheDocument())
  expect(screen.getByText(/Previous: 22.0 °C \(1925\)/)).toBeInTheDocument()
  expect(screen.getAllByText('34.8 °C')).toHaveLength(2)  // max from series for 1955 (hero + button)
  expect(screen.getByText('min')).toBeInTheDocument()     // past date → min, not current
})

test('then-vs-now uses viewed-year-relative 100yr decades', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () => routeFetch(u) })))
  render(<DayView />)
  await waitFor(() => screen.getByLabelText('Pick a date'))
  fireEvent.change(screen.getByLabelText('Pick a date'), { target: { value: '2025-06-28' } })
  // recent = 2014..2024 (series: 2015,2020,2024), then = 1914..1924 (series: 1923)
  await waitFor(() => expect(screen.getByText(/1914–1924/)).toBeInTheDocument())
  expect(screen.getByText(/2014–2024/)).toBeInTheDocument()
})

test('then-vs-now row hidden when recent window is empty', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () => routeFetch(u) })))
  render(<DayView />)
  await waitFor(() => screen.getByLabelText('Pick a date'))
  // navigate to 1930-06-28: recent = 1919..1929 (no series), then = 1819..1829 (no series)
  // then both windows empty, row should be hidden
  fireEvent.change(screen.getByLabelText('Pick a date'), { target: { value: '1930-06-28' } })
  await waitFor(() => expect(screen.queryByText(/Then vs now/i)).not.toBeInTheDocument())
})

test('on real today, live fetch error shows "Live temperature unavailable."', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) =>
    u.includes('open-meteo') ? Promise.reject(new Error('net')) : Promise.resolve({ ok: true, json: async () => routeFetch(u) })))
  render(<DayView />)
  await waitFor(() => expect(screen.getByText(/Live temperature unavailable/i)).toBeInTheDocument())
})
