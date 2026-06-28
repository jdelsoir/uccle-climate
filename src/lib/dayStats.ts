export type Daily = { year: number; tmax: number; tmin: number }

export function decadeMean(series: Daily[], from: number, to: number): number | null {
  const vals = series.filter(s => s.year >= from && s.year <= to).map(s => (s.tmax + s.tmin) / 2)
  if (!vals.length) return null
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
}

export function previousRecordHigh(series: Daily[], year: number): { v: number; year: number } | null {
  const before = series.filter(s => s.year < year)
  if (!before.length) return null
  const r = before.reduce((m, s) => (s.tmax > m.tmax ? s : m))
  return { v: r.tmax, year: r.year }
}

export function previousRecordLow(series: Daily[], year: number): { v: number; year: number } | null {
  const before = series.filter(s => s.year < year)
  if (!before.length) return null
  const r = before.reduce((m, s) => (s.tmin < m.tmin ? s : m))
  return { v: r.tmin, year: r.year }
}

export function tempColor(v: number | null, normal: number | null): 'text-warm' | 'text-accent' | 'text-fg' {
  if (v == null || normal == null) return 'text-fg'
  const d = v - normal
  return d > 2 ? 'text-warm' : d < -2 ? 'text-accent' : 'text-fg'
}
