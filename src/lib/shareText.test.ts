import { describe, it, expect } from 'vitest'
import { shareSentence, shareCaption, dayShareUrl, monthShareUrl, monthShareCaption, APP_URL } from './shareText'

const D = new Date(2026, 5, 29) // Monday June 29 2026
const base = { date: D, rank: null, firstYear: 1833, prevRecord: null, isToday: true } as const

describe('shareSentence', () => {
  it('above / today is tentative with rank', () => {
    expect(shareSentence({ ...base, key: 'above', rank: 26 }))
      .toBe('Monday June 29 2026 is forecast to be the 26th warmest June 29 since 1833.')
  })
  it('above / consolidated is affirmative', () => {
    expect(shareSentence({ ...base, key: 'above', rank: 26, isToday: false }))
      .toBe('Monday June 29 2026 was the 26th warmest June 29 since 1833.')
  })
  it('record-hot today with a previous record', () => {
    expect(shareSentence({ ...base, key: 'record-hot', prevRecord: { v: 32.6, year: 1957 } }))
      .toBe('Monday June 29 2026 is forecast to break the 1957 record — the hottest June 29 since 1833.')
  })
  it('record-hot consolidated with a previous record', () => {
    expect(shareSentence({ ...base, key: 'record-hot', prevRecord: { v: 32.6, year: 1957 }, isToday: false }))
      .toBe('Monday June 29 2026 broke the 1957 record — the hottest June 29 since 1833.')
  })
  it('record-hot with no previous record', () => {
    expect(shareSentence({ ...base, key: 'record-hot', isToday: false }))
      .toBe('Monday June 29 2026 was the hottest June 29 on record.')
  })
  it('record-cold today with a previous record', () => {
    expect(shareSentence({ ...base, key: 'record-cold', prevRecord: { v: 1.2, year: 1900 } }))
      .toBe('Monday June 29 2026 is forecast to break the 1900 cold record for June 29.')
  })
  it('close', () => {
    expect(shareSentence({ ...base, key: 'close' }))
      .toBe('Monday June 29 2026 is forecast to be a typical June 29.')
  })
  it('below / consolidated', () => {
    expect(shareSentence({ ...base, key: 'below', isToday: false }))
      .toBe('Monday June 29 2026 was cooler than usual for June 29.')
  })
  it('above with null rank falls back to warmer-than-usual', () => {
    expect(shareSentence({ ...base, key: 'above', rank: null }))
      .toBe('Monday June 29 2026 is forecast to be warmer than usual for June 29.')
  })
})

describe('dayShareUrl', () => {
  it('builds a deep link to that day (HashRouter ?d= form)', () => {
    expect(dayShareUrl(new Date(2019, 6, 25)))
      .toBe('https://jdelsoir.github.io/uccle-climate/#/today?d=2019-07-25')
    expect(APP_URL).toBe('https://jdelsoir.github.io/uccle-climate/')
  })
})

describe('shareCaption', () => {
  it('appends the day deep link on a new line', () => {
    expect(shareCaption('X', new Date(2019, 6, 25)))
      .toBe('X\nhttps://jdelsoir.github.io/uccle-climate/#/today?d=2019-07-25')
  })
})

describe('month share', () => {
  it('builds a ?m= deep link', () => {
    expect(monthShareUrl(2019, '06')).toBe('https://jdelsoir.github.io/uccle-climate/#/today?m=2019-06')
  })
  it('appends the deep link to the sentence', () => {
    expect(monthShareCaption('June 2019 was warm.', 2019, '06'))
      .toBe('June 2019 was warm.\nhttps://jdelsoir.github.io/uccle-climate/#/today?m=2019-06')
  })
})
