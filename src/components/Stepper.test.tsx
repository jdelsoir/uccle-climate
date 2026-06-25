import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import Stepper from './Stepper'

test('renders label and fires prev/next', () => {
  const onPrev = vi.fn(), onNext = vi.fn()
  render(<Stepper label="June" onPrev={onPrev} onNext={onNext} />)
  expect(screen.getByText('June')).toBeInTheDocument()
  fireEvent.click(screen.getByLabelText('Previous')); expect(onPrev).toHaveBeenCalled()
  fireEvent.click(screen.getByLabelText('Next')); expect(onNext).toHaveBeenCalled()
})
