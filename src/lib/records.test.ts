import { allTimeRank, mergeLiveExtreme } from './records'

test('allTimeRank warm: ties share rank', () => {
  expect(allTimeRank([39, 38, 37, 36.8], 36.8, 'warm')).toBe(4) // 3 strictly greater +1
  expect(allTimeRank([39, 38, 37], 40, 'warm')).toBe(1)
})
test('allTimeRank cold: lower is rank 1', () => {
  expect(allTimeRank([-10, -5, 0], -8, 'cold')).toBe(2)
})
test('mergeLiveExtreme inserts, sorts desc for warm, dedupes by date', () => {
  const list = [{ date: '2019-07-25', v: 39.7 }, { date: '1959-07-09', v: 36.8 }]
  const merged = mergeLiveExtreme(list, { date: '2026-06-26', v: 38.0 }, 'warm')
  expect(merged.map(e => e.v)).toEqual([39.7, 38.0, 36.8])
})
test('mergeLiveExtreme null live returns sorted copy', () => {
  expect(mergeLiveExtreme([{ date: 'a', v: 1 }, { date: 'b', v: 3 }], null, 'warm').map(e => e.v)).toEqual([3, 1])
})
