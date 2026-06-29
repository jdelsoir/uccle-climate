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
  await waitFor(() => expect(screen.getByText('26.8')).toBeInTheDocument())       // live today's high (BigTemp number)
  expect(screen.getByText(/above average/i)).toBeInTheDocument()                  // state.word eyebrow (replaces "Today's high")
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
  await waitFor(() => expect(screen.getByText('25.0')).toBeInTheDocument())      // that day's high (BigTemp number)
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

// ── Hero-state helpers ───────────────────────────────────────────────────────

const PAST2 = midnight(new Date(Y - 2, NOW.getMonth(), NOW.getDate()))

// Build a series with 25 entries above tmax (rank=26) and firstYear=1833
function makeWarmSeries(tmax: number, tmin: number): Array<{ year: number; tmax: number; tmin: number }> {
  const above = Array.from({ length: 25 }, (_, i) => ({ year: 1833 + i, tmax: tmax + 10, tmin: tmin }))
  return [...above, { year: Y - 2, tmax, tmin }]
}

function renderWarmPastDay({ tmax, tmin, normal, firstYear: _fy }: { tmax: number; tmin: number; normal: number; rank: number; firstYear: number }) {
  const series = makeWarmSeries(tmax, tmin)
  const fixture = {
    mmdd: MMDD,
    recordHigh: { v: tmax + 15, year: 1890 },
    recordLow: { v: 3, year: 1900 },
    series,
    thenNow: { early: { from: 1833, to: 1900, mean: normal }, recent: { from: 1996, to: 2025, mean: normal + 1 } },
  }
  const customDaynorm = { '1991-2020': [{ doy: 1, mmdd: MMDD, normal, p10: normal - 5, p90: normal + 5 }], '1961-1990': [] }
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => {
    if (u.includes('open-meteo')) return Promise.reject(new Error('not used'))
    if (u.includes('daynorm')) return Promise.resolve({ ok: true, json: async () => customDaynorm })
    return Promise.resolve({ ok: true, json: async () => fixture })
  }))
  render(<DayView date={PAST2} min={MIN} max={TODAY} onChange={() => {}} />)
}

function renderRecordHighDay({ tmax, normal, prevHigh, firstYear: _fy }: { tmax: number; normal: number; prevHigh: { v: number; year: number }; firstYear: number }) {
  const series = [
    { year: 1833, tmax: normal + 1, tmin: normal - 7 },
    { year: prevHigh.year, tmax: prevHigh.v, tmin: normal - 7 },
    { year: Y - 2, tmax, tmin: normal - 6 },
  ]
  const fixture = {
    mmdd: MMDD,
    recordHigh: { v: tmax, year: Y - 2 },
    recordLow: { v: 3, year: 1900 },
    series,
    thenNow: { early: { from: 1833, to: 1900, mean: normal }, recent: { from: 1996, to: 2025, mean: normal + 1 } },
  }
  const customDaynorm = { '1991-2020': [{ doy: 1, mmdd: MMDD, normal, p10: normal - 5, p90: normal + 5 }], '1961-1990': [] }
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => {
    if (u.includes('open-meteo')) return Promise.reject(new Error('not used'))
    if (u.includes('daynorm')) return Promise.resolve({ ok: true, json: async () => customDaynorm })
    return Promise.resolve({ ok: true, json: async () => fixture })
  }))
  render(<DayView date={PAST2} min={MIN} max={TODAY} onChange={() => {}} />)
}

it('shows the ABOVE AVERAGE state word, delta line and rank banner for a warm past day', async () => {
  renderWarmPastDay({ tmax: 26.9, tmin: 14, normal: 18, rank: 26, firstYear: 1833 })
  expect(await screen.findByText(/above average/i)).toBeTruthy()
  expect(screen.getByText('+8.9° above the 1991–2020 average')).toBeTruthy()
  expect(screen.getByText(/26th warmest .* since 1833/i)).toBeTruthy()
})

it('shows the record-hot banner with a prev-record subline when the viewed year holds the record high', async () => {
  renderRecordHighDay({ tmax: 33.1, normal: 18, prevHigh: { v: 32.9, year: 1976 }, firstYear: 1833 })
  expect(await screen.findByText(/record hot broken/i)).toBeTruthy()
  expect(screen.getByText(/New record · hottest .* since 1833/i)).toBeTruthy()
  expect(screen.getByText('beat 32.9° from 1976')).toBeTruthy()
})

it('shows the CLOSE TO AVERAGE state for a typical day', async () => {
  renderWarmPastDay({ tmax: 18.7, tmin: 12, normal: 18, rank: 80, firstYear: 1833 })
  expect(await screen.findByText(/close to average/i)).toBeTruthy()
  expect(screen.getByText('+0.7° vs the average')).toBeTruthy()
  expect(screen.getByText(/A typical/i)).toBeTruthy()
})
