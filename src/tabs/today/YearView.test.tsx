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

test('year: tile, mean, rank, stat cards', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve({ ok: true, json: async () => summary })))
  render(<YearView year={2026} />)
  await waitFor(() => expect(screen.getByText('11.8 °C')).toBeInTheDocument())  // 2026 annual mean
  expect(screen.getByText('YEAR')).toBeInTheDocument()
  expect(screen.getByText('2026')).toBeInTheDocument()
  expect(screen.getByText(/warmest year/)).toBeInTheDocument()
  expect(screen.getByText('Average')).toBeInTheDocument()
  expect(screen.getByText('10.5 °C')).toBeInTheDocument()                       // 1991-2020 baseline
  expect(screen.getByText('Warmest year')).toBeInTheDocument()
  expect(screen.getByText('Coldest year')).toBeInTheDocument()
})

test('year incomplete: (so far) label shown, rank badge suppressed', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve({ ok: true, json: async () => summaryIncomplete })))
  render(<YearView year={2026} />)
  await waitFor(() => expect(screen.getByText('11.8 °C')).toBeInTheDocument())
  expect(screen.getByText(/so far/i)).toBeInTheDocument()
  expect(screen.queryByText(/warmest year in/i)).not.toBeInTheDocument()
})
