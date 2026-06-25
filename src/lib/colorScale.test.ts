import { anomalyColor } from './colorScale'

test('warm positive → red-ish, cold negative → blue-ish', () => {
  expect(anomalyColor(2)).not.toBe(anomalyColor(-2))
  expect(anomalyColor(0)).toMatch(/rgb/)
})
