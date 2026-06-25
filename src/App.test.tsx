import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import App from './App'

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>()
  return { ...actual, ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
    <div style={{ width: 800, height: 300 }}>{children}</div> }
})

vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) =>
  Promise.resolve({ ok:true, json: async () =>
    u.includes('open-meteo')
      ? { current:{temperature_2m:35}, daily:{temperature_2m_max:[36],temperature_2m_min:[20]} }
      : { mmdd:'0625', recordHigh:{v:34.8,year:1947}, recordLow:{v:4.1,year:1923},
          series:[{year:1900,tmax:24,tmin:12},{year:2020,tmax:33,tmin:20}],
          thenNow:{early:{from:1833,to:1900,mean:18},recent:{from:1996,to:2025,mean:21}} } })))

test('renders Today tab by default and nav links', async () => {
  render(<App />)
  await waitFor(() => expect(screen.getByRole('heading', { name: /this day in history/i })).toBeInTheDocument())
  expect(screen.getByRole('link', { name: /trends/i })).toBeInTheDocument()
})

afterEach(() => vi.unstubAllGlobals())
