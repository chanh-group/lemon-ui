// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/infrastructure/api/client'
import { useAuthStore } from '@/infrastructure/auth/auth-store'
import {
  clearAllGroupAvatarBlobs,
  fetchGroupAvatarBlobUrl,
  releaseGroupAvatarBlobUrl,
  useAvatarSrc,
} from './avatar-loader'

vi.mock('@/infrastructure/api/client', () => ({ api: { get: vi.fn() } }))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

const avatarA = 'https://api.example.com/api/files/group-avatars/group-a/a.png'
const avatarB = 'https://api.example.com/api/files/group-avatars/group-b/b.png'
const blobResponse = { data: new Blob(['image'], { type: 'image/png' }) }

describe('private group avatar loader', () => {
  const createObjectURL = vi.fn()
  const revokeObjectURL = vi.fn()

  beforeEach(() => {
    clearAllGroupAvatarBlobs()
    vi.mocked(api.get).mockReset()
    createObjectURL
      .mockReset()
      .mockImplementation(() => `blob:avatar-${createObjectURL.mock.calls.length}`)
    revokeObjectURL.mockReset()
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
  })

  afterEach(() => {
    cleanup()
    useAuthStore.getState().reset()
    vi.unstubAllGlobals()
  })

  it('keeps a shared blob until both consumers release it', async () => {
    const request = deferred<typeof blobResponse>()
    vi.mocked(api.get).mockReturnValueOnce(request.promise as ReturnType<typeof api.get>)

    const first = fetchGroupAvatarBlobUrl(avatarA)
    const second = fetchGroupAvatarBlobUrl(avatarA)
    expect(api.get).toHaveBeenCalledTimes(1)
    request.resolve(blobResponse)
    expect(await first).toBe('blob:avatar-1')
    expect(await second).toBe('blob:avatar-1')

    releaseGroupAvatarBlobUrl(avatarA)
    expect(revokeObjectURL).not.toHaveBeenCalled()
    releaseGroupAvatarBlobUrl(avatarA)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:avatar-1')
  })

  it('does not repopulate the cache when logout happens during the request', async () => {
    const request = deferred<typeof blobResponse>()
    vi.mocked(api.get).mockReturnValueOnce(request.promise as ReturnType<typeof api.get>)

    const first = fetchGroupAvatarBlobUrl(avatarA)
    clearAllGroupAvatarBlobs()
    request.resolve(blobResponse)
    expect(await first).toBeNull()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:avatar-1')
  })

  it('never displays the previous group photo while the next photo is loading', async () => {
    useAuthStore.getState().setAccessToken('token-a')
    const second = deferred<typeof blobResponse>()
    vi.mocked(api.get)
      .mockResolvedValueOnce(blobResponse as Awaited<ReturnType<typeof api.get>>)
      .mockReturnValueOnce(second.promise as ReturnType<typeof api.get>)

    const hook = renderHook(({ src }) => useAvatarSrc(src), { initialProps: { src: avatarA } })
    await waitFor(() => expect(hook.result.current).toBe('blob:avatar-1'))
    hook.rerender({ src: avatarB })
    expect(hook.result.current).toBeNull()
    await act(async () => {
      second.resolve(blobResponse)
      await second.promise
    })
    await waitFor(() => expect(hook.result.current).toBe('blob:avatar-2'))
  })
})
