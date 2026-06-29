// src/lib/share.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('html-to-image', () => ({ toPng: vi.fn().mockResolvedValue('data:image/png;base64,AAAA') }))
import { shareNode } from './share'

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

function stubFetchBlob() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ blob: async () => new Blob(['x'], { type: 'image/png' }) }))
}

describe('shareNode', () => {
  it('passes caption text to navigator.share when files can be shared', async () => {
    stubFetchBlob()
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { canShare: () => true, share })
    await shareNode(document.createElement('div'), 'x.png', { text: 'hello\nurl' })
    expect(share).toHaveBeenCalledTimes(1)
    expect(share.mock.calls[0][0].text).toBe('hello\nurl')
    expect(Array.isArray(share.mock.calls[0][0].files)).toBe(true)
  })

  it('falls back to clipboard + download when files cannot be shared', async () => {
    stubFetchBlob()
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } }) // no canShare
    const click = vi.fn()
    const realCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = realCreate(tag)
      if (tag === 'a') (el as HTMLAnchorElement).click = click
      return el
    })
    await shareNode(document.createElement('div'), 'x.png', { text: 'cap' })
    expect(writeText).toHaveBeenCalledWith('cap')
    expect(click).toHaveBeenCalled()
  })
})
