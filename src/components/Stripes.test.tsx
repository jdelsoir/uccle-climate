import { render } from '@testing-library/react'
import Stripes from './Stripes'
test('renders one rect per year', () => {
  const { container } = render(<Stripes points={[{year:2000,v:-1},{year:2001,v:1.5}]} />)
  expect(container.querySelectorAll('rect').length).toBe(2)
})
