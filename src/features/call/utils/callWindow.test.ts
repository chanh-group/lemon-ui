// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { openCallWindow } from './callWindow'

describe('openCallWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
    window.localStorage.clear()
  })

  it('never appends peerAvatar to URL search params to avoid HTTP 431', () => {
    const mockOpen = vi.fn().mockReturnValue({ focus: vi.fn() })
    vi.stubGlobal('open', mockOpen)

    const largeDataUrl = 'data:image/png;base64,' + 'A'.repeat(5000)
    openCallWindow('conv-123', {
      media: 'video',
      state: 'ringing',
      peerName: 'Lemon User',
      peerAvatar: largeDataUrl,
    })

    expect(mockOpen).toHaveBeenCalledTimes(1)
    const openedUrl = new URL(mockOpen.mock.calls[0][0])

    // URL query string should NOT contain peerAvatar
    expect(openedUrl.searchParams.get('peerAvatar')).toBeNull()
    expect(openedUrl.searchParams.get('media')).toBe('video')
    expect(openedUrl.searchParams.get('state')).toBe('ringing')
    expect(openedUrl.searchParams.get('peerName')).toBe('Lemon User')

    // Stored safely in localStorage / sessionStorage
    const stored = JSON.parse(window.localStorage.getItem('lemon_call_peer_conv-123') || '{}')
    expect(stored.peerAvatar).toBe(largeDataUrl)
    expect(stored.peerName).toBe('Lemon User')
  })
})
