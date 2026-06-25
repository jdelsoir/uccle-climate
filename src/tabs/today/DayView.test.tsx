import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import DayView from './DayView'

vi.mock('recharts', async (o) => { const a = await o<typeof import('recharts')>()
  return { ...a, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 800, height: 300 }}>{children}</div> } })

const thisday = { mmdd: '0626', recordHigh: { v: 34.8, year: 1947 }, recordLow: { v: 4.1, year: 1923 },
  series: [{ year: 1900, tmax: 24, tmin: 12 }, { year: 2020, tmax: 33, tmin: 20 }],
  thenNow: { early: { from: 1833, to: 1900, mean: 18 }, recent: { from: 1996, to: 2025, mean: 21 } } }

afterEach(() => vi.unstubAllGlobals())

test('today shows live block + record high', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((u: string) => Promise.resolve({ ok: true, json: async () =>
    u.includes('open-meteo') ? { current: { temperature_2m: 35 }, daily: { temperature_2m_max: [36], temperature_2m_min: [20] } } : thisday })))
  render(<DayView mmdd="0626" isToday />)
  await waitFor(() => expect(screen.getByText(/34.8/)).toBeInTheDocument())
  expect(screen.getByText(/record high for this date/i)).toBeInTheDocument()
})

test('non-today day hides the live block', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => thisday }))
  render(<DayView mmdd="0301" isToday={false} />)
  await waitFor(() => expect(screen.getByText(/34.8/)).toBeInTheDocument())
  expect(screen.queryByText(/record high for this date/i)).not.toBeInTheDocument()
})
