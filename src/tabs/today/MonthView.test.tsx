import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import MonthView from './MonthView'

vi.mock('recharts', async (o) => { const a = await o<typeof import('recharts')>()
  return { ...a, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 800, height: 300 }}>{children}</div> } })

afterEach(() => vi.unstubAllGlobals())

function stubFetch(map: Record<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    const key = Object.keys(map).find(k => String(url).endsWith(k))
    return key
      ? Promise.resolve({ ok: true, json: () => Promise.resolve(map[key]) })
      : Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) })
  }))
}

const monthData = {
  mm: '06',
  series: [{ year: 2019, mean: 19.8, complete: true }],
  recordWarm: { year: 2019, v: 19.8 }, recordCold: { year: 1909, v: 13.0 }, normal: 17.0,
  thenNow: { early: { from: 1833, to: 1900, mean: 15.0 }, recent: { from: 1996, to: 2025, mean: 18.0 } },
}

const daynormData = {
  '1991-2020': [{ doy: 170, mmdd: '0619', normal: 17, p10: null, p90: null }],
  '1961-1990': [],
}

const dailyData = [
  { mmdd: '0619', tmax: 34.1, tmin: 18, recHi: true },
  { mmdd: '0620', tmax: 18, tmin: 12 },
]

it('renders the summary line and the day-by-day heatmap', async () => {
  stubFetch({
    'month/06.json': monthData,
    'daynorm.json': daynormData,
    'daily/2019.json': dailyData,
  })
  render(<MonthView year={2019} mm="06" onPickDay={vi.fn()} onPickMonth={vi.fn()} />)
  // heatmap grid present
  expect(await screen.findByRole('grid', { name: /June 2019 daily highs/i })).toBeInTheDocument()
  // summary line present (1 of 2 days ran warm — 0619 is +17 over normal; 0620 is +1 → neutral)
  expect(await screen.findByText(/1 of 2 days ran warm, 0 cool/)).toBeInTheDocument()
})

it('opens a month picker from the calendar tile and reports the chosen month-year', async () => {
  const onPickMonth = vi.fn()
  stubFetch({ 'month/06.json': monthData, 'daynorm.json': daynormData, 'daily/2019.json': dailyData })
  const { container } = render(<MonthView year={2019} mm="06" onPickDay={vi.fn()} onPickMonth={onPickMonth} />)
  // calendar tile is an interactive button labelled for changing the month
  expect(await screen.findByRole('button', { name: /change month/i })).toBeInTheDocument()
  // the hidden month input drives the callback
  const input = container.querySelector('input[type="month"]') as HTMLInputElement
  expect(input).toBeTruthy()
  expect(input.value).toBe('2019-06')
  fireEvent.change(input, { target: { value: '2015-03' } })
  expect(onPickMonth).toHaveBeenCalledWith(2015, 3)
})

describe('existing MonthView behaviour', () => {
  const month = {
    mm: '06', normal: 17.0,
    series: [{ year: 2000, mean: 16, complete: true }, { year: 2020, mean: 21, complete: true }, { year: 2026, mean: 18.4, complete: true }],
    recordWarm: { year: 2020, v: 21 }, recordCold: { year: 2000, v: 16 },
    thenNow: { early: { from: 1833, to: 1900, mean: 16.1 }, recent: { from: 1996, to: 2025, mean: 18.0 } },
  }

  type RenderMonthOpts = {
    cur: { year: number; mean: number; complete: boolean }
    normal?: number
    rank?: number
    completeCount?: number
    recordWarm?: { v: number; year: number } | null
    recordCold?: { v: number; year: number } | null
  }

  function renderMonth({ cur, normal = 17, rank = 1, completeCount = 10, recordWarm = null, recordCold = null }: RenderMonthOpts) {
    const higherCount = rank - 1
    const lowerCount = completeCount - 1 - higherCount
    const higherEntries = Array.from({ length: higherCount }, (_, i) => ({ year: 1800 + i, mean: cur.mean + 1 + i, complete: true }))
    const lowerEntries = Array.from({ length: lowerCount }, (_, i) => ({ year: 1900 + i, mean: normal - 1, complete: true }))
    const series = [...higherEntries, ...lowerEntries, { year: cur.year, mean: cur.mean, complete: cur.complete }]
    const data = {
      mm: '06', normal, series,
      recordWarm: recordWarm ?? { v: 21, year: 2020 },
      recordCold: recordCold ?? { v: 13, year: 1880 },
      thenNow: { early: { from: 1833, to: 1900, mean: 15.0 }, recent: { from: 1996, to: 2025, mean: 17.5 } },
    }
    stubFetch({
      'month/06.json': data,
      'daynorm.json': { '1991-2020': [], '1961-1990': [] },
      'daily/2019.json': [],
    })
    render(<MonthView mm="06" year={cur.year} onPickDay={vi.fn()} onPickMonth={vi.fn()} />)
  }

  it('month: tile, mean, rank, stat cards, warming strip', async () => {
    stubFetch({
      'month/06.json': month,
      'daynorm.json': { '1991-2020': [], '1961-1990': [] },
      'daily/2026.json': [],
    })
    render(<MonthView mm="06" year={2026} onPickDay={vi.fn()} onPickMonth={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('18.4')).toBeInTheDocument())
    expect(screen.getByText('JUNE')).toBeInTheDocument()
    expect(screen.getByText('2026')).toBeInTheDocument()
    expect(screen.getByText(/A typical June/)).toBeInTheDocument()
    expect(screen.getByText('Average')).toBeInTheDocument()
    expect(screen.getByText('17.0 °C')).toBeInTheDocument()
    expect(screen.getByText('Warmest June')).toBeInTheDocument()
    expect(screen.getByText('Coldest June')).toBeInTheDocument()
    expect(screen.getByText(/A warming June/)).toBeInTheDocument()
  })

  it('shows the state word, delta line and rank banner for a warm complete month', async () => {
    renderMonth({ cur: { year: 2026, mean: 20.9, complete: true }, normal: 18, rank: 3, completeCount: 120 })
    expect(await screen.findByText(/above average/i)).toBeTruthy()
    expect(screen.getByText('+2.9° above the 1991–2020 average')).toBeTruthy()
    expect(screen.getByText(/3rd warmest .* in 120 years/i)).toBeTruthy()
  })

  it('uses an on-record banner when the current year holds the warmest month', async () => {
    renderMonth({ cur: { year: 2026, mean: 22, complete: true }, normal: 18, recordWarm: { v: 22, year: 2026 } })
    expect(await screen.findByText(/record hot broken/i)).toBeTruthy()
    expect(screen.getByText(/Warmest .* on record/i)).toBeTruthy()
  })

  it('shows a "so far" banner and suppresses record/rank for the incomplete current month', async () => {
    renderMonth({ cur: { year: 2026, mean: 19, complete: false }, normal: 18, recordWarm: { v: 19, year: 2026 } })
    expect(await screen.findByText(/so far/i)).toBeTruthy()
    expect(screen.queryByText(/on record/i)).toBeNull()
  })
})
