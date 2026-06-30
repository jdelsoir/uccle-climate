import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PeriodScatter from './PeriodScatter'

vi.mock('recharts', async (o) => { const a = await o<typeof import('recharts')>()
  return { ...a, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 800, height: 240 }}>{children}</div> } })

const data = [{ year: 2000, mean: 16 }, { year: 2010, mean: 17 }, { year: 2020, mean: 18 }]
const series = [{ key: 'mean', name: 'June mean', color: 'var(--accent)' }]

describe('PeriodScatter trend line', () => {
  it('shows a trend legend entry when trendKey is set and ≥2 points are shown', () => {
    render(<PeriodScatter title="Every June mean" data={data} series={series} trendKey="mean" />)
    expect(screen.getByText(/trend · shown period/i)).toBeInTheDocument()
  })
  it('shows no trend entry without trendKey', () => {
    render(<PeriodScatter title="Every June mean" data={data} series={series} />)
    expect(screen.queryByText(/trend · shown period/i)).not.toBeInTheDocument()
  })
  it('shows no trend entry when fewer than 2 points are present', () => {
    render(<PeriodScatter title="Every June mean" data={[{ year: 2020, mean: 18 }]} series={series} trendKey="mean" />)
    expect(screen.queryByText(/trend · shown period/i)).not.toBeInTheDocument()
  })
})
