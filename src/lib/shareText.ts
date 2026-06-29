import { fmtWeekday, fmtMonth, ordinal } from './format'
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

export function shareCaption(sentence: string): string {
  return `${sentence}\n${APP_URL}`
}
