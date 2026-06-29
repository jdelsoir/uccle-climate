import { tempColor } from './dayStats'

export type HeroTone = 'warm' | 'neutral' | 'cool'
export type HeroKey = 'record-hot' | 'above' | 'close' | 'below' | 'record-cold'

export interface HeroState {
  key: HeroKey
  word: string
  tone: HeroTone
  intensity: number
  delta: number | null
}

const WORD: Record<HeroKey, string> = {
  'record-hot': 'Record hot broken',
  above: 'Above average',
  close: 'Close to average',
  below: 'Below average',
  'record-cold': 'Cold record broken',
}

export function heroState({ value, normal, brokeHigh, brokeLow }: {
  value: number | null
  normal: number | null
  brokeHigh?: boolean
  brokeLow?: boolean
}): HeroState {
  const delta = value != null && normal != null ? Math.round((value - normal) * 10) / 10 : null

  let key: HeroKey
  let tone: HeroTone
  if (brokeHigh) { key = 'record-hot'; tone = 'warm' }
  else if (brokeLow) { key = 'record-cold'; tone = 'cool' }
  else {
    const c = tempColor(value, normal) // strict ±2 — single source of truth
    if (c === 'text-warm') { key = 'above'; tone = 'warm' }
    else if (c === 'text-accent') { key = 'below'; tone = 'cool' }
    else { key = 'close'; tone = 'neutral' }
  }

  const isRecord = key === 'record-hot' || key === 'record-cold'
  const intensity = isRecord ? 1 : delta == null ? 0 : Math.min(Math.abs(delta) / 10, 1)
  return { key, word: WORD[key], tone, intensity, delta }
}

export function toneText(tone: HeroTone): 'text-warm' | 'text-accent' | 'text-fg' {
  return tone === 'warm' ? 'text-warm' : tone === 'cool' ? 'text-accent' : 'text-fg'
}

export function bannerClass(key: HeroKey): string {
  switch (key) {
    case 'record-hot': return 'bg-warm text-white'
    case 'record-cold': return 'bg-accent text-white'
    case 'above': return 'bg-warm/10 text-warm'
    case 'below': return 'bg-accent/10 text-accent'
    case 'close': return 'bg-surface-2 text-muted'
  }
}

export function deltaLine(s: HeroState): string | null {
  if (s.delta == null) return null
  const sign = s.delta > 0 ? '+' : s.delta < 0 ? '−' : '' // U+2212 for negatives
  const mag = Math.abs(s.delta).toFixed(1)
  if (s.key === 'close') return `${sign}${mag}° vs the average`
  const dir = s.delta >= 0 ? 'above' : 'below'
  return `${sign}${mag}° ${dir} the 1991–2020 average`
}
