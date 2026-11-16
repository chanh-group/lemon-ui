import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readVideoDuration } from './readVideoDuration'

describe('readVideoDuration', () => {
  let video: {
    duration: number
    onloadedmetadata: (() => void) | null
    onerror: (() => void) | null
    src: string
  }

  beforeEach(() => {
    vi.useFakeTimers()
    video = {
      duration: 12.5,
      onloadedmetadata: null,
      onerror: null,
      set src(_value: string) {},
    }
    vi.stubGlobal('document', { createElement: vi.fn().mockReturnValue(video as HTMLVideoElement) })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:video')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('resolves the duration and cleans up after metadata loads', async () => {
    const result = readVideoDuration(new File([], 'video.mp4'))
    video.onloadedmetadata?.()

    await expect(result).resolves.toBe(12.5)
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('rejects invalid videos and cleans up after an error', async () => {
    const result = readVideoDuration(new File([], 'video.mp4'))
    video.onerror?.()

    await expect(result).rejects.toThrow('Invalid video')
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('cleans up when metadata loading times out', async () => {
    const result = readVideoDuration(new File([], 'video.mp4'))
    const rejection = expect(result).rejects.toThrow('Video metadata timeout')
    await vi.advanceTimersByTimeAsync(15_000)

    await rejection
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('rejects with AbortError and cleans up when aborted', async () => {
    const controller = new AbortController()
    const result = readVideoDuration(new File([], 'video.mp4'), controller.signal)
    const rejection = expect(result).rejects.toMatchObject({ name: 'AbortError' })
    controller.abort()

    await rejection
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })
})
