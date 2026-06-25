export function rankOf(value: number, values: number[]) {
  const total = values.length
  const warmer = values.filter(v => v > value).length
  const rank = warmer + 1                 // 1 = warmest
  const colder = values.filter(v => v < value).length
  // Clamp to [0,100]: a value beating every entry (e.g. a record) must not exceed 100.
  const pct = total > 1 ? Math.max(0, Math.min(100, (colder / (total - 1)) * 100)) : 100
  return { rank, total, pct }
}

// Today's mean temperature anomaly vs a day-of-year MEAN normal (1 decimal).
// Compares like-to-like: the day's mean ((tmax+tmin)/2) against the mean normal,
// NOT tmax against a mean normal.
export function meanAnomaly(tmax: number, tmin: number, normal: number): number {
  return Math.round(((tmax + tmin) / 2 - normal) * 10) / 10
}
