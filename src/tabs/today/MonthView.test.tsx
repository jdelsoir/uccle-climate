import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import MonthView from './MonthView'

vi.mock('recharts', async (o) => { const a = await o<typeof import('recharts')>()
  return { ...a, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 800, height: 300 }}>{children}</div> } })

const month = { mm: '06', normal: 17.0,
  series: [{ year: 2000, mean: 16, complete: true }, { year: 2020, mean: 21, complete: true }, { year: 2026, mean: 18.4, complete: true }],
  recordWarm: { year: 2020, v: 21 }, recordCold: { year: 2000, v: 16 },
  thenNow: { early: { from: 1833, to: 1900, mean: 16.1 }, recent: { from: 1996, to: 2025, mean: 18.0 } } }
afterEach(() => vi.unstubAllGlobals())

test('month: tile, mean, rank, stat cards, warming strip', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve({ ok: true, json: async () => month })))
  render(<MonthView mm="06" currentYear={2026} />)
  await waitFor(() => expect(screen.getByText('18.4')).toBeInTheDocument())      // June 2026 mean (BigTemp number)
  expect(screen.getByText('JUNE')).toBeInTheDocument()                            // tile header
  expect(screen.getByText('2026')).toBeInTheDocument()                            // tile body
  expect(screen.getByText(/warmest June/)).toBeInTheDocument()                    // rank badge
  expect(screen.getByText('Average')).toBeInTheDocument()
  expect(screen.getByText('17.0 °C')).toBeInTheDocument()                         // normal
  expect(screen.getByText('Warmest June')).toBeInTheDocument()
  expect(screen.getByText('Coldest June')).toBeInTheDocument()
  expect(screen.getByText(/A warming June/)).toBeInTheDocument()
})
