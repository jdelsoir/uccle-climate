import { rankOf } from './stats'

test('rankOf: warmest is rank 1', () => {
  const r = rankOf(30, [10, 20, 30, 25])
  expect(r.rank).toBe(1)
  expect(r.total).toBe(4)
  expect(Math.round(r.pct)).toBe(100)
})

test('rankOf: coldest', () => {
  expect(rankOf(10, [10, 20, 30]).rank).toBe(3)
})
