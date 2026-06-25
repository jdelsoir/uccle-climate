import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import Today from './Today'

// Mock Recharts ResponsiveContainer to avoid jsdom width(0) warnings
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>()
  return { ...actual, ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
    <div style={{ width: 800, height: 300 }}>{children}</div> }
})

const thisday = { mmdd:'0625', recordHigh:{v:34.8,year:1947}, recordLow:{v:4.1,year:1923},
  series:[{year:1900,tmax:24,tmin:12},{year:2020,tmax:33,tmin:20}],
  thenNow:{early:{from:1833,to:1900,mean:18},recent:{from:1996,to:2025,mean:21}} }

test('shows rank badge using live temp', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) =>
    Promise.resolve({ ok:true, json: async () =>
      u.includes('open-meteo')
        ? { current:{temperature_2m:35}, daily:{temperature_2m_max:[36],temperature_2m_min:[20]} }
        : thisday })))
  render(<Today />)
  await waitFor(() => expect(screen.getByText(/warmest/i)).toBeInTheDocument())
  expect(screen.getByText(/34.8/)).toBeInTheDocument()  // record high
  // today's live max (36) beats the record high (34.8) → record banner shows
  expect(screen.getByText(/record high for this date/i)).toBeInTheDocument()
})

test('shows anomaly vs 1991-2020 normal for today', async () => {
  const daynorm = {
    '1991-2020': [{ doy: 176, mmdd: '0625', normal: 18.5, p10: 14.0, p90: 23.0 }],
    '1961-1990': [],
  }
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) =>
    Promise.resolve({ ok: true, json: async () =>
      u.includes('open-meteo')
        ? { current: { temperature_2m: 20.5 }, daily: { temperature_2m_max: [21], temperature_2m_min: [15] } }
        : u.includes('daynorm.json')
          ? daynorm
          : thisday })))
  render(<Today />)
  await waitFor(() => expect(screen.getByText(/1991.2020 normal/i)).toBeInTheDocument())
})

afterEach(() => vi.unstubAllGlobals())
