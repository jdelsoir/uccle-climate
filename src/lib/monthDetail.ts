import { tempColor } from './dayStats'
import type { DailyPoint } from '../types'

export function monthDays(daily: DailyPoint[], mm: string): DailyPoint[] {
  return daily.filter(d => d.mmdd.slice(0, 2) === mm)
}

export function dayMix(days: DailyPoint[], normalFor: (mmdd: string) => number | null) {
  let warm = 0, cool = 0, neutral = 0
  for (const d of days) {
    const c = tempColor(d.tmax, normalFor(d.mmdd))
    if (c === 'text-warm') warm++
    else if (c === 'text-accent') cool++
    else neutral++
  }
  return { warm, cool, neutral, total: days.length }
}

export function recordsBroken(days: DailyPoint[]): number {
  return days.reduce((n, d) => n + (d.recHi ? 1 : 0) + (d.recLo ? 1 : 0), 0)
}

export function topWarmest(days: DailyPoint[], n = 5): DailyPoint[] {
  return [...days].sort((a, b) => b.tmax - a.tmax).slice(0, n)
}

export function topColdest(days: DailyPoint[], n = 5): DailyPoint[] {
  return [...days].sort((a, b) => a.tmin - b.tmin).slice(0, n)
}

export function windowMean(series: { year: number; mean: number; complete: boolean }[], from: number, to: number): number | null {
  const vals = series.filter(s => s.complete && s.year >= from && s.year <= to).map(s => s.mean)
  if (!vals.length) return null
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
}

export function monthCounters(days: DailyPoint[]): { SU: number; hot30: number; TR: number; FD: number; ID: number } {
  let SU = 0, hot30 = 0, TR = 0, FD = 0, ID = 0
  for (const d of days) {
    if (d.tmax >= 25) SU++
    if (d.tmax >= 30) hot30++
    if (d.tmin >= 20) TR++
    if (d.tmin < 0) FD++
    if (d.tmax < 0) ID++
  }
  return { SU, hot30, TR, FD, ID }
}
