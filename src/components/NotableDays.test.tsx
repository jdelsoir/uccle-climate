import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import NotableDays from './NotableDays'
import type { DailyPoint } from '../types'

const day = (mmdd: string, tmax: number, tmin: number, extra: Partial<DailyPoint> = {}): DailyPoint => ({ mmdd, tmax, tmin, ...extra })

describe('NotableDays', () => {
  it('shows warmest by default and switches to coldest via the toggle', () => {
    const onPick = vi.fn()
    const warmest = [day('0619', 34.1, 18, { recHi: true })]
    const coldest = [day('0603', 12, 4, { recLo: true })]
    render(<NotableDays warmest={warmest} coldest={coldest} year={2019} mm="06" onPick={onPick} />)
    expect(screen.getByText('34.1')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Coldest' }))
    expect(screen.getByText('4.0')).toBeInTheDocument()         // tmin shown for coldest
  })

  it('clicking a row calls onPick with the iso date', () => {
    const onPick = vi.fn()
    render(<NotableDays warmest={[day('0619', 34.1, 18)]} coldest={[]} year={2019} mm="06" onPick={onPick} />)
    fireEvent.click(screen.getByRole('button', { name: /19 June 2019/i }))
    expect(onPick).toHaveBeenCalledWith('2019-06-19')
  })

  it('renders nothing when both lists are empty', () => {
    const { container } = render(<NotableDays warmest={[]} coldest={[]} year={2019} mm="06" onPick={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
