import { fmtWeekday, fmtMonth, ordinal, isoOf } from './format'
import type { HeroKey } from './heroState'

export const APP_URL = 'https://jdelsoir.github.io/uccle-climate/'

interface ShareSentenceInput {
  date: Date
  key: HeroKey
  rank: number | null
  firstYear: number | null
  prevRecord: { v: number; year: number } | null
  isToday: boolean
}

export function shareSentence({ date, key, rank, firstYear, prevRecord, isToday }: ShareSentenceInput): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const day = date.getDate()
  const D = `${fmtWeekday(date)} ${fmtMonth(mm)} ${day} ${date.getFullYear()}`
  const L = `${fmtMonth(mm)} ${day}`
  const since = firstYear != null ? ` since ${firstYear}` : ''

  switch (key) {
    case 'record-hot':
      return prevRecord
        ? `${D} ${isToday ? 'is forecast to break' : 'broke'} the ${prevRecord.year} record — the hottest ${L}${since}.`
        : `${D} ${isToday ? 'is forecast to be' : 'was'} the hottest ${L} on record.`
    case 'record-cold':
      return prevRecord
        ? `${D} ${isToday ? 'is forecast to break' : 'broke'} the ${prevRecord.year} cold record for ${L}.`
        : `${D} ${isToday ? 'is forecast to be' : 'was'} the coldest ${L} on record.`
    case 'above':
      return rank != null
        ? `${D} ${isToday ? 'is forecast to be' : 'was'} the ${ordinal(rank)} warmest ${L}${since}.`
        : `${D} ${isToday ? 'is forecast to be' : 'was'} warmer than usual for ${L}.`
    case 'below':
      return `${D} ${isToday ? 'is forecast to be' : 'was'} cooler than usual for ${L}.`
    case 'close':
    default:
      return `${D} ${isToday ? 'is forecast to be' : 'was'} a typical ${L}.`
  }
}

// Deep link to a specific day (HashRouter ?d= form on the /day route).
export function dayShareUrl(date: Date): string {
  return `${APP_URL}#/day?d=${isoOf(date)}`
}

export function shareCaption(sentence: string, date: Date): string {
  return `${sentence}\n${dayShareUrl(date)}`
}

// Deep link to a specific month (HashRouter ?m= form on the /month route).
export function monthShareUrl(year: number, mm: string): string {
  return `${APP_URL}#/month?m=${year}-${mm}`
}

export function monthShareCaption(sentence: string, year: number, mm: string): string {
  return `${sentence}\n${monthShareUrl(year, mm)}`
}

export function yearShareSentence({ year, key, rank, total, complete }: {
  year: number; key: HeroKey; rank: number | null; total: number | null; complete: boolean
}): string {
  if (!complete) {
    switch (key) {
      case 'record-hot': case 'above': return `${year} so far is running warmer than usual.`
      case 'record-cold': case 'below': return `${year} so far is running cooler than usual.`
      default: return `${year} so far is running about average.`
    }
  }
  switch (key) {
    case 'record-hot': return `${year} was the warmest year on record.`
    case 'record-cold': return `${year} was the coldest year on record.`
    case 'above':
      return rank != null && total != null
        ? `${year} was the ${ordinal(rank)} warmest year in ${total} years.`
        : `${year} was warmer than usual.`
    case 'below': return `${year} was cooler than usual.`
    case 'close': default: return `${year} was a typical year.`
  }
}

// Deep link to a specific year (HashRouter ?y= form on the /year route).
export function yearShareUrl(year: number): string { return `${APP_URL}#/year?y=${year}` }
export function yearShareCaption(sentence: string, year: number): string { return `${sentence}\n${yearShareUrl(year)}` }
