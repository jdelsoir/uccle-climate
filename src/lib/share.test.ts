import { vi, test, expect, describe, afterEach, beforeEach } from 'vitest'

// Mock html-to-image at module level
vi.mock('html-to-image', () => ({
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,xxx'),
}))

import { shareNode } from './share'

describe('shareNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock fetch globally for tests
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        blob: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'image/png' })),
      })
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  test('falls back to download link when navigator.share absent', async () => {
    const click = vi.fn()
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
      click,
      href: '',
      download: '',
    } as any)

    const node = document.createElement('div')
    await shareNode(node, 'uccle.png')

    expect(click).toHaveBeenCalled()
    expect(createElementSpy).toHaveBeenCalledWith('a')
  })

  test('calls navigator.share when available', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined)
    const originalCanShare = navigator.canShare
    const originalShare = (navigator as any).share

    try {
      Object.defineProperty(navigator, 'canShare', {
        value: vi.fn().mockReturnValue(true),
        configurable: true,
      })
      Object.defineProperty(navigator, 'share', {
        value: mockShare,
        configurable: true,
      })

      const node = document.createElement('div')
      await shareNode(node, 'uccle.png')

      expect(mockShare).toHaveBeenCalled()
    } finally {
      // Restore
      Object.defineProperty(navigator, 'canShare', {
        value: originalCanShare,
        configurable: true,
      })
      Object.defineProperty(navigator, 'share', {
        value: originalShare,
        configurable: true,
      })
    }
  })
})
