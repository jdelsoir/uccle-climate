export function rankOf(value: number, values: number[]) {
  const total = values.length
  const warmer = values.filter(v => v > value).length
  const rank = warmer + 1                 // 1 = warmest
  const colder = values.filter(v => v < value).length
  const pct = total > 1 ? (colder / (total - 1)) * 100 : 100
  return { rank, total, pct }
}
