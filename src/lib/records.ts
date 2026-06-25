export interface DayExtreme { date: string; v: number }

export function allTimeRank(values: number[], value: number, dir: 'warm' | 'cold'): number {
  const more = dir === 'warm'
    ? values.filter(v => v > value).length
    : values.filter(v => v < value).length
  return more + 1
}

export function mergeLiveExtreme(list: DayExtreme[], live: DayExtreme | null, dir: 'warm' | 'cold'): DayExtreme[] {
  const merged = live ? [...list.filter(e => e.date !== live.date), live] : [...list]
  merged.sort((a, b) => (dir === 'warm' ? b.v - a.v : a.v - b.v))
  return merged
}
