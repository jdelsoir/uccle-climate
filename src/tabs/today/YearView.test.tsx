import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import YearView from './YearView'

vi.mock('recharts', async (o) => { const a = await o<typeof import('recharts')>()
  return { ...a, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 800, height: 300 }}>{children}</div> } })

const annual = [
  { year: 1920, mean: 9.5, tmin: 5, tmax: 14, incomplete: false },
  { year: 2000, mean: 10.5, tmin: 6, tmax: 15, incomplete: false },
  { year: 2024, mean: 12.1, tmin: 8, tmax: 16, incomplete: false },
  { year: 2026, mean: 11.8, tmin: 8, tmax: 16, incomplete: false },
]
const summary = { station:{id:'x',name:'Uccle',lat:0,lon:0}, baselines:{'1991-2020':10.5,'1961-1990':9.8},
  annual, anomaly:{'1991-2020':[{year:2026,v:1.3}],'1961-1990':[]}, decadal:[], warmingRate:{full:0.2,last30:0.3},
  records:{year:2026,highs:0,lows:0}, extremes:{warmest:[],coldest:[]},
  counters:{SU:[],hot30:[],TR:[],FD:[],ID:[],heatwaveDays:[],gsl:[]},
  rankings:{warmest:[{year:2024,mean:12.1},{year:2026,mean:11.8},{year:2000,mean:10.5},{year:1920,mean:9.5}],
            coldest:[{year:1920,mean:9.5},{year:2000,mean:10.5}]} }
const summaryIncomplete = {
  ...summary,
  annual: summary.annual.map(a => a.year === 2026 ? { ...a, incomplete: true } : a),
  rankings: { ...summary.rankings, warmest: summary.rankings.warmest.filter(r => r.year !== 2026) },
}

afterEach(() => vi.unstubAllGlobals())

type RenderYearOpts = {
  a: { year: number; mean: number; incomplete: boolean }
  normal?: number
  rank?: number
  total?: number
  recordWarm?: { year: number; mean: number }
  recordCold?: { year: number; mean: number }
}

function renderYear({ a: aEntry, normal = 10, rank = 1, total = 10, recordWarm, recordCold }: RenderYearOpts) {
  // Build warmest list so that (rank-1) entries rank above aEntry, rest below
  const higherCount = rank - 1
  const lowerCount = total - 1 - higherCount
  const higherEntries = Array.from({ length: higherCount }, (_, i) => ({ year: 1800 + i, mean: aEntry.mean + 1 + i }))
  const lowerEntries = Array.from({ length: lowerCount }, (_, i) => ({ year: 1900 + i, mean: normal - 1 - i }))
  const warmest = [...higherEntries, { year: aEntry.year, mean: aEntry.mean }, ...lowerEntries]
  const coldest = [...lowerEntries.slice().reverse(), { year: aEntry.year, mean: aEntry.mean }, ...higherEntries.slice().reverse()]
  const annualEntry = { ...aEntry, tmin: 5, tmax: 15 }
  const data = {
    station: { id: 'x', name: 'Uccle', lat: 0, lon: 0 },
    baselines: { '1991-2020': normal, '1961-1990': normal - 0.5 },
    annual: [annualEntry],
    anomaly: { '1991-2020': [], '1961-1990': [] },
    decadal: [],
    warmingRate: { full: 0.2, last30: 0.3 },
    records: { year: aEntry.year, highs: 0, lows: 0 },
    extremes: { warmest: [], coldest: [] },
    counters: { SU: [], hot30: [], TR: [], FD: [], ID: [], heatwaveDays: [], gsl: [] },
    rankings: {
      warmest: recordWarm ? [{ year: recordWarm.year, mean: recordWarm.mean }, ...warmest.filter(r => r.year !== recordWarm.year)] : warmest,
      coldest: recordCold ? [{ year: recordCold.year, mean: recordCold.mean }, ...coldest.filter(r => r.year !== recordCold.year)] : coldest,
    },
  }
  vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve({ ok: true, json: async () => data })))
  render(<YearView year={aEntry.year} />)
}

test('year: tile, mean, rank, stat cards', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve({ ok: true, json: async () => summary })))
  render(<YearView year={2026} />)
  await waitFor(() => expect(screen.getByText('11.8')).toBeInTheDocument())  // 2026 annual mean
  expect(screen.getByText('YEAR')).toBeInTheDocument()
  expect(screen.getByText('2026')).toBeInTheDocument()
  expect(screen.getByText(/A typical year/)).toBeInTheDocument()             // state banner (delta 1.3° < 2 → close)
  expect(screen.getByText('Average')).toBeInTheDocument()
  expect(screen.getByText('10.5 °C')).toBeInTheDocument()                       // 1991-2020 baseline
  expect(screen.getByText('Warmest year')).toBeInTheDocument()
  expect(screen.getByText('Coldest year')).toBeInTheDocument()
})

test('year incomplete: (so far) label shown, rank badge suppressed', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve({ ok: true, json: async () => summaryIncomplete })))
  render(<YearView year={2026} />)
  await waitFor(() => expect(screen.getByText('11.8')).toBeInTheDocument())
  expect(screen.getByText(/so far/i)).toBeInTheDocument()
  expect(screen.queryByText(/warmest year in/i)).not.toBeInTheDocument()
})

it('shows the state word, delta line and rank banner for a warm complete year', async () => {
  renderYear({ a: { year: 2025, mean: 12.5, incomplete: false }, normal: 10, rank: 4, total: 180 })
  expect(await screen.findByText(/above average/i)).toBeTruthy()
  expect(screen.getByText('+2.5° above the 1991–2020 average')).toBeTruthy()
  expect(screen.getByText(/4th warmest year in 180 years/i)).toBeTruthy()
})

it('uses an on-record banner when the viewed year is the warmest on record', async () => {
  renderYear({ a: { year: 2025, mean: 13, incomplete: false }, normal: 10, recordWarm: { year: 2025, mean: 13 } })
  expect(await screen.findByText(/record hot broken/i)).toBeTruthy()
  expect(screen.getByText(/Warmest year on record/i)).toBeTruthy()
})

it('keeps the "(so far)"/neutral treatment and suppresses record/rank for an incomplete year', async () => {
  renderYear({ a: { year: 2026, mean: 11, incomplete: true }, normal: 10, recordWarm: { year: 2026, mean: 11 } })
  expect(await screen.findByText(/so far/i)).toBeTruthy()
  expect(screen.queryByText(/on record/i)).toBeNull()
})
