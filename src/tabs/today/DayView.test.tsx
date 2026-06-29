import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import DayView from './DayView'
import { todayMMDD } from '../../lib/format'

vi.mock('recharts', async (o) => { const a = await o<typeof import('recharts')>()
  return { ...a, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 800, height: 300 }}>{children}</div> } })

const NOW = new Date()
const Y = NOW.getFullYear()
const MMDD = todayMMDD()
const midnight = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const TODAY = midnight(NOW)
const PAST = midnight(new Date(Y - 2, NOW.getMonth(), NOW.getDate()))   // same month/day, past year (not record)

// series spans Y-relative years so warming windows ([Y-11..Y-1] and [Y-111..Y-101]) are both non-empty on any run date
const thisday = { mmdd: MMDD, recordHigh: { v: 32.6, year: 1957 }, recordLow: { v: 5.3, year: 1844 },
  series: [
    { year: Y - 105, tmax: 19, tmin: 9 }, { year: 1957, tmax: 32.6, tmin: 12 },
    { year: Y - 2, tmax: 25, tmin: 14 }, { year: Y, tmax: 26.8, tmin: 16 },
  ], thenNow: { early: { from: 1833, to: 1900, mean: 18 }, recent: { from: 1996, to: 2025, mean: 21 } } }
const daynorm = { '1991-2020': [{ doy: 1, mmdd: MMDD, normal: 17.9, p10: 12, p90: 24 }], '1961-1990': [] }
const live = { current: { time: `${TODAY.getFullYear()}-01-01T12:00`, temperature_2m: 23.2 },
  daily: { time: [`${TODAY.getFullYear()}-01-01`], temperature_2m_max: [26.8], temperature_2m_min: [16] } }
function routeFetch(u: string) { if (u.includes('open-meteo')) return live; if (u.includes('daynorm')) return daynorm; return thisday }
afterEach(() => vi.unstubAllGlobals())

const MIN = new Date(1833, 0, 1)
function renderDay(date: Date) { return render(<DayView date={date} min={MIN} max={TODAY} onChange={() => {}} />) }

// NOTE: useTodayTemp picks today's daily row by matching current.time's date; here both are Jan 1
// so the matched row's tmax/tmin (26.8/16) are used regardless of the real run date.

test('today: HIGH + NOW + rank badge', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () => routeFetch(u) })))
  renderDay(TODAY)
  await waitFor(() => expect(screen.getByText('26.8 °C')).toBeInTheDocument())   // live today's high
  expect(screen.getByText("Today's high")).toBeInTheDocument()
  expect(screen.getByText('23.2°')).toBeInTheDocument()                           // NOW
  expect(screen.getByText('Now')).toBeInTheDocument()
  expect(screen.getByText(/warmest/i)).toBeInTheDocument()                        // rank badge present
})

test('opening the picker works (CalendarTile click does not throw)', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () => routeFetch(u) })))
  const { container } = renderDay(TODAY)
  await waitFor(() => expect(container.querySelector('input[type="date"]')).toBeTruthy())
  expect(() => fireEvent.click(screen.getByRole('button', { name: /change date/i }))).not.toThrow()
})

test('past day: HIGH + LOW (no NOW)', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () => routeFetch(u) })))
  renderDay(PAST)                                  // Y-2 row: high 25, low 14
  await waitFor(() => expect(screen.getByText('25.0 °C')).toBeInTheDocument())   // that day's high
  expect(screen.getByText('Low', { selector: 'p' })).toBeInTheDocument()         // hero label (the chart legend's "Low" lives in a <span>)
  expect(screen.queryByText('Now')).not.toBeInTheDocument()
})

test('today: range bar + stat cards (average, vs average, record high/low) + warming strip', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () => routeFetch(u) })))
  renderDay(TODAY)
  await waitFor(() => expect(screen.getByText('Average')).toBeInTheDocument())
  expect(screen.getByRole('img', { name: /record high/i })).toBeInTheDocument()  // RangeBar summary
  expect(screen.getByText('17.9 °C')).toBeInTheDocument()                  // 1991-2020 normal (Average card)
  expect(screen.getByText('Today vs average')).toBeInTheDocument()
  expect(screen.getByText('+8.9 °C')).toBeInTheDocument()                  // 26.8 - 17.9
  expect(screen.getByText('Record high')).toBeInTheDocument()              // StatCard label (exact)
  expect(screen.getByText('32.6 °C')).toBeInTheDocument()                  // record-high value (card)
  expect(screen.getByText('Record low')).toBeInTheDocument()
  expect(screen.getByText('5.3 °C')).toBeInTheDocument()
  expect(screen.getByText(/A warming/)).toBeInTheDocument()                // warming strip
})

test('today: live fetch error shows "Live temperature unavailable."', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => {
    if (u.includes('open-meteo')) return Promise.reject(new Error('network error'))
    return Promise.resolve({ ok: true, json: async () => routeFetch(u) })
  }))
  renderDay(TODAY)
  await waitFor(() => expect(screen.getByText('Live temperature unavailable.')).toBeInTheDocument())
  expect(screen.queryByText(/warmest/i)).not.toBeInTheDocument()
})
