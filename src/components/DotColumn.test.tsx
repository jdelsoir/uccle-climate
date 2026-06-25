import { render } from '@testing-library/react'
import DotColumn from './DotColumn'

test('renders a circle per year + highlight', () => {
  const { container } = render(<DotColumn values={[{year:2000,value:20},{year:2001,value:25,highlight:true}]} />)
  expect(container.querySelectorAll('circle').length).toBe(2)
})
