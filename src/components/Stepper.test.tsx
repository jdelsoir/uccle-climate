import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import Stepper from './Stepper'

test('renders label and fires prev/next', () => {
  const onPrev = vi.fn(), onNext = vi.fn()
  render(<Stepper label="June" onPrev={onPrev} onNext={onNext} unit="day" />)
  expect(screen.getByText('June')).toBeInTheDocument()
  fireEvent.click(screen.getByLabelText('Previous day')); expect(onPrev).toHaveBeenCalled()
  fireEvent.click(screen.getByLabelText('Next day')); expect(onNext).toHaveBeenCalled()
})
