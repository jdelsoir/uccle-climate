import { rankOf, meanAnomaly } from './stats'

test('rankOf: warmest is rank 1', () => {
  const r = rankOf(30, [10, 20, 30, 25])
  expect(r.rank).toBe(1)
  expect(r.total).toBe(4)
  expect(Math.round(r.pct)).toBe(100)
})

test('rankOf: coldest', () => {
  expect(rankOf(10, [10, 20, 30]).rank).toBe(3)
})

test('meanAnomaly: uses the day mean vs the normal, 1 decimal', () => {
  // mean(36.8, 26.2) = 31.5; 31.5 - 17.51 = 13.99 → 14.0
  expect(meanAnomaly(36.8, 26.2, 17.51)).toBe(14.0)
})

test('meanAnomaly: zero when the day mean equals the normal', () => {
  expect(meanAnomaly(20, 10, 15)).toBe(0)
})

test('meanAnomaly: negative when below normal', () => {
  expect(meanAnomaly(5, 1, 10)).toBe(-7)
})
