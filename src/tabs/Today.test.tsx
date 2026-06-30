import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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

function routeFetch(u: string) {
  if (u.includes('open-meteo')) return live
  if (u.includes('daynorm')) return daynorm
  if (u.includes('summary')) return summary
  if (u.includes('/month/')) return month
  if (u.includes('/daily/')) return []
  return thisday
}
afterEach(() => vi.unstubAllGlobals())

test('underline tabs switch mode; day is default', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () => routeFetch(u) })))
  render(<MemoryRouter><Today /></MemoryRouter>)
  expect(screen.getByRole('radio', { name: /day/i })).toHaveAttribute('aria-checked', 'true')
  fireEvent.click(screen.getByRole('radio', { name: /year/i }))
  await waitFor(() => expect(screen.getByRole('radio', { name: /year/i })).toHaveAttribute('aria-checked', 'true'))
})

test('header Previous steps the active unit (day) and Today is disabled on today', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () => routeFetch(u) })))
  const { container } = render(<MemoryRouter><Today /></MemoryRouter>)
  await waitFor(() => expect(container.querySelector('input[type="date"]')).toBeTruthy())
  expect(screen.getByRole('button', { name: /go to today/i })).toBeDisabled()  // cursor starts at today
  fireEvent.click(screen.getByRole('button', { name: /^previous/i }))
  expect(screen.getByRole('button', { name: /go to today/i })).not.toBeDisabled()  // moved off today
})

test('deep-links to a specific day via ?d= query param', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () => routeFetch(u) })))
  render(
    <MemoryRouter initialEntries={['/today?d=2019-07-25']}>
      <Today />
    </MemoryRouter>
  )
  // Day is the default mode; the cursor must be 25 Jul 2019, not today (29 Jun 2026)
  expect(await screen.findByText('JULY')).toBeInTheDocument()
  expect(screen.getByText('25')).toBeInTheDocument()
})

it('opens Month mode at the month-year from ?m=', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () => routeFetch(u) })))
  render(<MemoryRouter initialEntries={['/today?m=2019-06']}><Today /></MemoryRouter>)
  // Month-mode radio is selected and the month heading shows
  expect(await screen.findByRole('radio', { name: 'month' })).toHaveAttribute('aria-checked', 'true')
  // MonthView renders the CalendarTile header for the deep-linked month/year
  expect(await screen.findByText(/JUNE/)).toBeInTheDocument()
  expect(await screen.findByText('2019')).toBeInTheDocument()
})

it('lets ?d= win when both ?d and ?m are present', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () => routeFetch(u) })))
  render(<MemoryRouter initialEntries={['/today?d=2010-03-04&m=2019-06']}><Today /></MemoryRouter>)
  expect(await screen.findByRole('radio', { name: 'day' })).toHaveAttribute('aria-checked', 'true')
})

it('clamps an out-of-range ?m= month and falls back to the current month-year', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () => routeFetch(u) })))
  render(<MemoryRouter initialEntries={['/today?m=2019-13']}><Today /></MemoryRouter>)
  // month 13 is invalid → cursor falls back to the current year, not 2019
  expect(await screen.findByRole('radio', { name: 'month' })).toHaveAttribute('aria-checked', 'true')
  expect(screen.queryByText('2019')).not.toBeInTheDocument()
})
