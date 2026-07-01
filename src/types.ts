export type Baseline = '1991-2020' | '1961-1990'
export interface AnnualPoint { year: number; mean: number; tmin: number; tmax: number; incomplete: boolean }
export interface AnomalyPoint { year: number; v: number }
export interface DecadalPoint { decade: number; mean: number }
export interface CounterPoint { year: number; n: number }
export interface Summary {
  station: { id: string; name: string; lat: number; lon: number }
  baselines: Record<Baseline, number>
  annual: AnnualPoint[]
  anomaly: Record<Baseline, AnomalyPoint[]>
  decadal: DecadalPoint[]
  warmingRate: { full: number | null; last30: number | null }
  records: { year: number; highs: number; lows: number }
  extremes: { warmest: { date: string; v: number }[]; coldest: { date: string; v: number }[] }
  counters: { SU: CounterPoint[]; hot30: CounterPoint[]; TR: CounterPoint[]; FD: CounterPoint[]; ID: CounterPoint[]; heatwaveDays: CounterPoint[]; gsl: CounterPoint[] }
  rankings: { warmest: { year: number; mean: number }[]; coldest: { year: number; mean: number }[] }
}
export interface DayNorm { doy: number; mmdd: string; normal: number | null; p10: number | null; p90: number | null }
export interface ThisDay {
  mmdd: string
  recordHigh: { v: number; year: number }
  recordLow: { v: number; year: number }
  series: { year: number; tmax: number; tmin: number; provisional?: boolean }[]
  thenNow: { early: { from: number; to: number; mean: number | null }; recent: { from: number; to: number; mean: number | null } }
}
export interface MonthData {
  mm: string
  series: { year: number; mean: number; meanMax?: number; meanMin?: number; complete: boolean }[]
  recordWarm: { year: number; v: number } | null
  recordCold: { year: number; v: number } | null
  normal: number | null
  counterNormals: { SU: number; hot30: number; TR: number; FD: number; ID: number } | null
  thenNow: { early: { from: number; to: number; mean: number | null }; recent: { from: number; to: number; mean: number | null } }
}
export interface DailyPoint { mmdd: string; tmax: number; tmin: number; provisional?: boolean; recHi?: boolean; recLo?: boolean }
export type DailyYear = DailyPoint[]
