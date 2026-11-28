import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/infrastructure/api/client'
import { uploadBinaryToUrl, uploadFileViaBackend } from './file.api'

vi.mock('@/infrastructure/api/client', () => ({ api: { post: vi.fn() } }))

describe('file uploads', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  it('reports direct upload progress without credentials or authorization headers', async () => {
    const progress = vi.fn()
    const headers: Record<string, string> = {}
    let credentials: boolean | undefined
    const open = vi.fn()
    const send = vi.fn()
    class MockRequest {
      withCredentials = true
      status = 200
      upload: {
        onprogress?: (event: { lengthComputable: boolean; loaded: number; total: number }) => void
      } = {}
      onload?: () => void
      onerror?: () => void
      onabort?: () => void
      open = open
      setRequestHeader(name: string, value: string) {
        headers[name] = value
      }
      send(file: Blob) {
        credentials = this.withCredentials
        send(file)
        this.upload.onprogress?.({ lengthComputable: false, loaded: 1, total: 0 })
        this.upload.onprogress?.({ lengthComputable: true, loaded: 25, total: 100 })
        this.onload?.()
      }
    }
    vi.stubGlobal('XMLHttpRequest', MockRequest)

    const file = new Blob(['content'], { type: 'image/png' })
    await uploadBinaryToUrl('https://upload.example.test/avatar', file, 'image/png', progress)

    expect(credentials).toBe(false)
    expect(open).toHaveBeenCalledWith('PUT', 'https://upload.example.test/avatar')
    expect(headers).toEqual({ 'Content-Type': 'image/png' })
    expect(send).toHaveBeenCalledWith(file)
    expect(progress.mock.calls).toEqual([[null], [25]])
  })

  it('rejects a failed direct upload so the caller can fall back', async () => {
    class MockRequest {
      withCredentials = false
      status = 403
      upload = {}
      onload?: () => void
      open() {}
      setRequestHeader() {}
      send() {
        this.onload?.()
      }
    }
    vi.stubGlobal('XMLHttpRequest', MockRequest)
    await expect(
      uploadBinaryToUrl('https://upload.example.test/avatar', new Blob(), 'image/png', vi.fn()),
    ).rejects.toThrow('(403)')
  })

  it('does not cap the total duration of a direct upload', async () => {
    let timeoutAtSend: number | undefined
    class MockRequest {
      timeout = 0
      withCredentials = false
      status = 200
      upload = {}
      onload?: () => void
      open() {}
      setRequestHeader() {}
      send() {
        timeoutAtSend = this.timeout
        this.onload?.()
      }
    }
    vi.stubGlobal('XMLHttpRequest', MockRequest)
    await uploadBinaryToUrl('https://upload.example.test/avatar', new Blob(), 'image/png', vi.fn())
    // File lớn (25MB) trên uplink chậm không được abort ở mốc 15s như trước —
    // fetch trên main cũng không có timeout tổng.
    expect(timeoutAtSend).toBe(0)
  })

  it('reports backend fallback progress only when total is known', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { objectKey: 'key' } })
    const progress = vi.fn()
    const file = new File(['data'], 'photo.png', { type: 'image/png' })
    await uploadFileViaBackend(file, 'USER_AVATAR', undefined, file.name, progress)
    const config = vi.mocked(api.post).mock.calls[0][2]!
    config.onUploadProgress?.({ loaded: 2, total: undefined, bytes: 2, lengthComputable: false })
    config.onUploadProgress?.({ loaded: 2, total: 4, bytes: 2, lengthComputable: true })
    expect(progress.mock.calls).toEqual([[null], [50]])
  })
})
