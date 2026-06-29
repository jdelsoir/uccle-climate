import { describe, it, expect } from 'vitest'
import { heroState, bannerClass, deltaLine, toneText } from './heroState'

describe('heroState', () => {
  it('classifies above when delta > 2 (strict)', () => {
    const s = heroState({ value: 20, normal: 15 })
    expect(s.key).toBe('above'); expect(s.tone).toBe('warm'); expect(s.delta).toBe(5)
  })
  it('treats exactly +2 as close (matches tempColor strict)', () => {
    expect(heroState({ value: 17, normal: 15 }).key).toBe('close')
  })
  it('classifies below when delta < -2', () => {
    const s = heroState({ value: 10, normal: 15 })
    expect(s.key).toBe('below'); expect(s.tone).toBe('cool'); expect(s.delta).toBe(-5)
  })
  it('record flags override a large opposite delta', () => {
    const s = heroState({ value: 1, normal: 15, brokeHigh: true })
    expect(s.key).toBe('record-hot'); expect(s.tone).toBe('warm'); expect(s.intensity).toBe(1)
  })
  it('intensity scales with |delta| and caps at 1', () => {
    expect(heroState({ value: 18, normal: 15 }).intensity).toBeCloseTo(0.3, 5)
    expect(heroState({ value: 40, normal: 15 }).intensity).toBe(1)
  })
  it('null value → close, neutral, intensity 0, delta null', () => {
    const s = heroState({ value: null, normal: 15 })
    expect(s.key).toBe('close'); expect(s.tone).toBe('neutral'); expect(s.intensity).toBe(0); expect(s.delta).toBeNull()
  })
  it('exposes the eyebrow word', () => {
    expect(heroState({ value: 20, normal: 15 }).word).toBe('Above average')
  })
})

describe('deltaLine', () => {
  it('above uses signed + above-the-average', () => {
    expect(deltaLine(heroState({ value: 23.9, normal: 15 }))).toBe('+8.9° above the 1991–2020 average')
  })
  it('below uses real minus sign + below', () => {
    expect(deltaLine(heroState({ value: 10.3, normal: 15 }))).toBe('−4.7° below the 1991–2020 average')
  })
  it('close uses vs the average', () => {
    expect(deltaLine(heroState({ value: 15.7, normal: 15 }))).toBe('+0.7° vs the average')
  })
  it('returns null when delta is null', () => {
    expect(deltaLine(heroState({ value: null, normal: 15 }))).toBeNull()
  })
})

describe('bannerClass / toneText', () => {
  it('record states are solid', () => {
    expect(bannerClass('record-hot')).toContain('bg-warm'); expect(bannerClass('record-hot')).toContain('text-white')
    expect(bannerClass('record-cold')).toContain('bg-accent'); expect(bannerClass('record-cold')).toContain('text-white')
  })
  it('above/below are tinted, close is neutral', () => {
    expect(bannerClass('above')).toBe('bg-warm/10 text-warm')
    expect(bannerClass('below')).toBe('bg-accent/10 text-accent')
    expect(bannerClass('close')).toBe('bg-surface-2 text-muted')
  })
  it('toneText maps tone to text token', () => {
    expect(toneText('warm')).toBe('text-warm'); expect(toneText('cool')).toBe('text-accent'); expect(toneText('neutral')).toBe('text-fg')
  })
})
