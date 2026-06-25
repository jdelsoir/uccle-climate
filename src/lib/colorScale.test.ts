import { anomalyColor } from './colorScale'
import { RAMP } from './ramp'

test('zero anomaly maps to the neutral middle of the ramp', () => {
  expect(anomalyColor(0)).toBe(RAMP[Math.round((RAMP.length - 1) / 2)])
})
test('positive anomaly is warmer (later in ramp) than negative', () => {
  expect(RAMP.indexOf(anomalyColor(2))).toBeGreaterThan(RAMP.indexOf(anomalyColor(-2)))
})
test('clamps beyond span to the ramp ends', () => {
  expect(anomalyColor(99)).toBe(RAMP[RAMP.length - 1])
  expect(anomalyColor(-99)).toBe(RAMP[0])
})
