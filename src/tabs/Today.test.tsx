import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { vi } from 'vitest'
import Today from './Today'

vi.mock('recharts', async (o) => { const a = await o<typeof import('recharts')>()
  return { ...a, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 800, height: 300 }}>{children}</div> } })

const summary = { station:{id:'x',name:'Uccle',lat:0,lon:0}, baselines:{'1991-2020':10.5,'1961-1990':9.8},
  annual:[{year:2025,mean:12,tmin:8,tmax:16,incomplete:false}], anomaly:{'1991-2020':[{year:2025,v:1.5}],'1961-1990':[]},
  decadal:[], warmingRate:{full:0.2,last30:0.3}, records:{year:2025,highs:0,lows:0},
  extremes:{warmest:[],coldest:[]}, counters:{SU:[],hot30:[],TR:[],FD:[],ID:[],heatwaveDays:[],gsl:[]},
  rankings:{warmest:[{year:2025,mean:12}],coldest:[{year:2025,mean:12}]} }
const daynorm = { '1991-2020':[], '1961-1990':[] }
const live = { current:{time:'2026-06-29T12:00',temperature_2m:23.2}, daily:{time:['2026-06-29'],temperature_2m_max:[26.8],temperature_2m_min:[16]} }
const thisday = { mmdd:'0629', recordHigh:{v:32.6,year:1957}, recordLow:{v:5.3,year:1844},
  series:[{year:2024,tmax:25,tmin:14},{year:2026,tmax:26.8,tmin:16}], thenNow:{early:{from:1833,to:1900,mean:18},recent:{from:1996,to:2025,mean:21}} }
const month = { mm:'06', series:[{year:2025,mean:18,complete:true}], recordWarm:{year:2020,v:21}, recordCold:{year:1923,v:14}, normal:17, thenNow:{early:{from:1833,to:1900,mean:16},recent:{from:1996,to:2025,mean:18}} }
const yearMonths = [{ mm: '06', mean: 20, normal: 18, complete: true }]

function routeFetch(u: string) {
  if (u.includes('open-meteo')) return live
  if (u.includes('daynorm')) return daynorm
  if (u.includes('summary')) return summary
  if (u.includes('/month/')) return month
  if (u.includes('/year/')) return yearMonths
  if (u.includes('/daily/')) return []
  return thisday
}
beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () => routeFetch(u) }))))
afterEach(() => vi.unstubAllGlobals())

// Mounts the three view routes so cross-mode navigate() lands. Each element carries a
// mode-keyed `key` — React Router does not remount a route's element just because the
// matched path changed if the element type is unchanged (all three routes render the
// same `Today` component); without distinct keys, navigating day->month->year would
// reuse the previous instance's cursor state instead of re-deriving it from the new
// route's own ?d=/?m=/?y= params.
const app = (initial: string) => render(
  <MemoryRouter initialEntries={[initial]}>
    <Routes>
      <Route path="/day" element={<Today mode="day" key="day" />} />
      <Route path="/month" element={<Today mode="month" key="month" />} />
      <Route path="/year" element={<Today mode="year" key="year" />} />
    </Routes>
  </MemoryRouter>
)

test('/day renders the Day view with a date picker, default cursor is today', async () => {
  const { container } = app('/day')
  await waitFor(() => expect(container.querySelector('input[type="date"]')).toBeTruthy())
  expect(screen.getByRole('heading', { name: /this day in history/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /go to today/i })).toBeDisabled()   // starts on today
})

test('the ◀ stepper moves the day off today (Today button re-enables)', async () => {
  const { container } = app('/day')
  await waitFor(() => expect(container.querySelector('input[type="date"]')).toBeTruthy())
  fireEvent.click(screen.getByRole('button', { name: /^previous/i }))
  expect(screen.getByRole('button', { name: /go to today/i })).not.toBeDisabled()
})

test('/day?d= deep-links to that day', async () => {
  app('/day?d=2019-07-25')
  expect(await screen.findByText('JULY')).toBeInTheDocument()
  expect(screen.getByText('25')).toBeInTheDocument()
})

test('/month?m= opens that month-year', async () => {
  app('/month?m=2019-06')
  expect(await screen.findByText(/JUNE/)).toBeInTheDocument()
  expect(await screen.findByText('2019')).toBeInTheDocument()
})

test('/month?m= with an out-of-range month falls back to the current month', async () => {
  app('/month?m=2019-13')
  expect(await screen.findByText(/this month in history/i)).toBeInTheDocument()
  expect(screen.queryByText('2019')).not.toBeInTheDocument()
})

test('/year?y= opens that year', async () => {
  app('/year?y=2015')
  expect(await screen.findByText('2015')).toBeInTheDocument()
})

test('tapping a month tile in Year view navigates to the Month view', async () => {
  app('/year')
  const tile = await screen.findByRole('gridcell', { name: /June .*Open this month/i })
  fireEvent.click(tile)
  // navigate('/month?m=2023-06') → Month route renders MonthView (CalendarTile shows JUNE)
  expect(await screen.findByText(/this month in history/i)).toBeInTheDocument()
  expect(await screen.findByText(/JUNE/)).toBeInTheDocument()
})
