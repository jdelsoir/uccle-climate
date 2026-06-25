import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import MonthView from './MonthView'

vi.mock('recharts', async (o) => { const a = await o<typeof import('recharts')>()
  return { ...a, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 800, height: 300 }}>{children}</div> } })

const month = { mm: '06',
  series: [{ year: 2000, mean: 16, complete: true }, { year: 2020, mean: 19, complete: true }, { year: 2026, mean: 21, complete: false }],
  recordWarm: { year: 2020, v: 19 }, recordCold: { year: 2000, v: 16 }, normal: 17,
  thenNow: { early: { from: 1833, to: 1900, mean: 15 }, recent: { from: 1996, to: 2025, mean: 18 } } }

afterEach(() => vi.unstubAllGlobals())

test('shows current-year month mean, rank, record', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => month }))
  render(<MonthView mm="06" currentYear={2026} />)
  await waitFor(() => expect(screen.getByText(/16\.0 °C/)).toBeInTheDocument()) // record cold value present
  expect(screen.getByText(/so far/i)).toBeInTheDocument()        // 2026 partial
  expect(screen.getByText(/warmest June on record/i)).toBeInTheDocument()
})
