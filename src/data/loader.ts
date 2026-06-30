import type { Summary, DayNorm, ThisDay, Baseline, MonthData, DailyYear } from '../types'

export async function loadJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}${path}`)
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`)
  return res.json() as Promise<T>
}
export const loadSummary = () => loadJSON<Summary>('data/summary.json')
export const loadDayNorm = () => loadJSON<Record<Baseline, DayNorm[]>>('data/daynorm.json')
export const loadThisDay = (mmdd: string) => loadJSON<ThisDay>(`data/thisday/${mmdd}.json`)
export const loadMonth = (mm: string) => loadJSON<MonthData>(`data/month/${mm}.json`)
export const loadDaily = (year: number) => loadJSON<DailyYear>(`data/daily/${year}.json`)
