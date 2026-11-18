import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STORY_MAX_MEDIA_BYTES, STORY_MAX_TRIM_SECONDS } from '../constants'
import { processStoryVideo } from './storyVideoProcessor'

const media = vi.hoisted(() => {
  const conversion = {
    isValid: true,
    discardedTracks: [] as { track: { type: string } }[],
    onProgress: undefined as ((progress: number) => void) | undefined,
    execute: vi.fn<() => Promise<void>>(),
    cancel: vi.fn<() => Promise<void>>(),
  }
  return {
    conversion,
    init: vi.fn(),
    dispose: vi.fn(),
    outputCancel: vi.fn(),
    getPrimaryAudioTrack: vi.fn(),
    canEncodeAudio: vi.fn(),
    registerAacEncoder: vi.fn(),
    target: { buffer: new ArrayBuffer(3) as ArrayBuffer | null },
  }
})

vi.mock('mediabunny', () => ({
  ALL_FORMATS: ['formats'],
  BlobSource: class {
    constructor(public file: File) {}
  },
  Input: class {
    constructor(public options: unknown) {}
    dispose = media.dispose
    getPrimaryAudioTrack = media.getPrimaryAudioTrack
  },
  BufferTarget: class {
    constructor() {
      return media.target
    }
  },
  Mp4OutputFormat: class {},
  Output: class {
    cancel = media.outputCancel
    constructor(public options: unknown) {}
  },
  Conversion: { init: media.init },
  canEncodeAudio: media.canEncodeAudio,
}))

vi.mock('@mediabunny/aac-encoder', () => ({ registerAacEncoder: media.registerAacEncoder }))

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

const file = () => new File(['video'], 'source.mov', { type: 'video/quicktime' })

beforeEach(() => {
  vi.clearAllMocks()
  media.target.buffer = new Uint8Array([1, 2, 3]).buffer
  media.conversion.isValid = true
  media.conversion.discardedTracks = []
  media.conversion.onProgress = undefined
  media.conversion.execute.mockReset().mockResolvedValue(undefined)
  media.conversion.cancel.mockReset().mockResolvedValue(undefined)
  media.outputCancel.mockReset().mockResolvedValue(undefined)
  media.init.mockReset().mockResolvedValue(media.conversion)
  media.getPrimaryAudioTrack.mockReset().mockResolvedValue(null)
  media.canEncodeAudio.mockReset().mockResolvedValue(true)
})

describe('processStoryVideo', () => {
  it('converts the requested trim to an MP4 and disposes the input', async () => {
    const source = file()
    const result = await processStoryVideo({ file: source, startSeconds: 12 })

    expect(result.name).toBe('story.mp4')
    expect(result.type).toBe('video/mp4')
    expect(result.size).toBe(3)
    expect(new Uint8Array(await result.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
    expect(media.init).toHaveBeenCalledWith(
      expect.objectContaining({
        trim: { start: 12, end: 12 + STORY_MAX_TRIM_SECONDS },
        tracks: 'primary',
        copy: false,
        audio: { codec: 'aac', bitrate: 96000 },
        input: expect.objectContaining({
          options: expect.objectContaining({ source: { file: source } }),
        }),
      }),
    )
    expect(media.conversion.execute).toHaveBeenCalledOnce()
    expect(media.dispose).toHaveBeenCalledOnce()
  })

  it.each([true, false])(
    'checks AAC support and registers a fallback only when needed (%s)',
    async (supported) => {
      media.getPrimaryAudioTrack.mockResolvedValue({
        getNumberOfChannels: async () => 2,
        getSampleRate: async () => 44100,
      })
      media.canEncodeAudio.mockResolvedValue(supported)
      await processStoryVideo({ file: file(), startSeconds: 0 })
      expect(media.canEncodeAudio).toHaveBeenCalledWith('aac', {
        numberOfChannels: 2,
        sampleRate: 44100,
        bitrate: 96000,
      })
      expect(media.registerAacEncoder).toHaveBeenCalledTimes(supported ? 0 : 1)
    },
  )

  it.each([
    [3840, 2160, 0, 1080, 608],
    [641, 481, 0, 642, 482],
    [1920, 1080, 90, 1080, 1920],
  ])(
    'bounds dimensions for %sx%s rotated %s degrees',
    async (width, height, rotation, expectedWidth, expectedHeight) => {
      await processStoryVideo({ file: file(), startSeconds: 0 })
      const options = media.init.mock.calls[0][0]
      const video = await options.video({
        getRotation: async () => rotation,
        getSquarePixelWidth: async () => width,
        getSquarePixelHeight: async () => height,
      })
      expect(video).toMatchObject({ width: expectedWidth, height: expectedHeight, fit: 'contain' })
    },
  )

  it.each([
    ['invalid conversion', false, []],
    ['discarded video', true, [{ track: { type: 'video' } }]],
    ['discarded audio', true, [{ track: { type: 'audio' } }]],
  ])('rejects %s without executing', async (_name, isValid, discardedTracks) => {
    media.conversion.isValid = isValid
    media.conversion.discardedTracks = discardedTracks

    await expect(processStoryVideo({ file: file(), startSeconds: 0 })).rejects.toThrow()
    expect(media.conversion.execute).not.toHaveBeenCalled()
    expect(media.conversion.cancel).toHaveBeenCalledOnce()
    expect(media.dispose).toHaveBeenCalledOnce()
  })

  it('rejects unreadable media instead of sharing the original', async () => {
    media.init.mockRejectedValue(new Error('Unreadable media'))
    await expect(processStoryVideo({ file: file(), startSeconds: 0 })).rejects.toThrow(
      'Unreadable media',
    )
    expect(media.dispose).toHaveBeenCalledOnce()
  })

  it.each([null, new ArrayBuffer(0), new ArrayBuffer(STORY_MAX_MEDIA_BYTES + 1)])(
    'rejects missing, empty, or oversized output',
    async (buffer) => {
      media.target.buffer = buffer
      await expect(processStoryVideo({ file: file(), startSeconds: 0 })).rejects.toThrow(
        'Invalid output size',
      )
      expect(media.dispose).toHaveBeenCalledOnce()
    },
  )

  it('forwards progress clamped to the range 0 to 1', async () => {
    const onProgress = vi.fn()
    media.conversion.execute.mockImplementation(async () => {
      for (const progress of [-0.5, 0.4, 1.5]) media.conversion.onProgress?.(progress)
    })
    await processStoryVideo({ file: file(), startSeconds: 0, onProgress })
    expect(onProgress.mock.calls).toEqual([[0], [0.4], [1]])
  })

  it('rejects an already cancelled request without starting conversion', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(
      processStoryVideo({ file: file(), startSeconds: 0, signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(media.init).not.toHaveBeenCalled()
  })

  it('rejects promptly on cancellation during init and cancels a late conversion', async () => {
    const init = deferred<typeof media.conversion>()
    media.init.mockReturnValue(init.promise)
    const controller = new AbortController()
    const result = processStoryVideo({ file: file(), startSeconds: 0, signal: controller.signal })
    await vi.waitFor(() => expect(media.init).toHaveBeenCalledOnce())
    controller.abort()
    await expect(result).rejects.toMatchObject({ name: 'AbortError' })
    expect(media.dispose).toHaveBeenCalledOnce()
    expect(media.conversion.execute).not.toHaveBeenCalled()

    init.resolve(media.conversion)
    await vi.waitFor(() => expect(media.conversion.cancel).toHaveBeenCalledOnce())
  })

  it('cancels an executing conversion and reports AbortError', async () => {
    const execution = deferred<void>()
    media.conversion.execute.mockReturnValue(execution.promise)
    media.conversion.cancel.mockImplementation(async () => {
      execution.reject(new Error('Conversion cancelled'))
    })
    const controller = new AbortController()
    const result = processStoryVideo({ file: file(), startSeconds: 0, signal: controller.signal })
    await vi.waitFor(() => expect(media.conversion.execute).toHaveBeenCalledOnce())
    controller.abort()
    await expect(result).rejects.toMatchObject({ name: 'AbortError' })
    expect(media.conversion.cancel).toHaveBeenCalledOnce()
    expect(media.dispose).toHaveBeenCalledOnce()
  })
})
