import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STORY_MAX_MEDIA_BYTES } from '../constants'
import { buildStoryVideoArgs } from './storyVideo'

const ffmpegMock = vi.hoisted(() => {
  const handlers: Record<string, (event: { progress: number }) => void> = {}
  const instance = {
    load: vi.fn(),
    writeFile: vi.fn(),
    exec: vi.fn(),
    readFile: vi.fn(),
    on: vi.fn((event: string, callback: (e: { progress: number }) => void) => {
      handlers[event] = callback
    }),
    terminate: vi.fn(),
  }
  return { instance, handlers }
})

vi.mock('@ffmpeg/ffmpeg', () => ({
  FFmpeg: function FFmpeg() {
    return ffmpegMock.instance
  },
}))

vi.mock('@ffmpeg/core?url', () => ({ default: 'core.js' }))
vi.mock('@ffmpeg/core/wasm?url', () => ({ default: 'core.wasm' }))

const { processStoryVideo } = await import('./storyVideoProcessor')

const OUTPUT_BYTES = new Uint8Array([1, 2, 3, 4])

function inputFile() {
  return new File([new Uint8Array([9, 9, 9])], 'clip.mov', { type: 'video/quicktime' })
}

beforeEach(() => {
  const { instance, handlers } = ffmpegMock
  instance.load.mockReset().mockResolvedValue(undefined)
  instance.writeFile.mockReset().mockResolvedValue(undefined)
  instance.exec.mockReset().mockResolvedValue(0)
  instance.readFile.mockReset().mockResolvedValue(OUTPUT_BYTES)
  instance.on.mockClear()
  instance.terminate.mockReset()
  for (const key of Object.keys(handlers)) delete handlers[key]
})

describe('processStoryVideo', () => {
  it('encodes the file and returns a capped mp4', async () => {
    const result = await processStoryVideo({ file: inputFile(), startSeconds: 1.5 })

    expect(result.name).toBe('story.mp4')
    expect(result.type).toBe('video/mp4')
    expect(new Uint8Array(await result.arrayBuffer())).toEqual(OUTPUT_BYTES)

    expect(ffmpegMock.instance.load).toHaveBeenCalledWith({
      coreURL: 'core.js',
      wasmURL: 'core.wasm',
    })
    expect(ffmpegMock.instance.writeFile).toHaveBeenCalledWith('input', expect.any(Uint8Array))
    expect(ffmpegMock.instance.exec).toHaveBeenCalledWith(buildStoryVideoArgs(1.5))
    expect(ffmpegMock.instance.terminate).toHaveBeenCalledTimes(1)
  })

  it('rejects when ffmpeg exits with a non-zero code', async () => {
    ffmpegMock.instance.exec.mockResolvedValue(1)

    await expect(processStoryVideo({ file: inputFile(), startSeconds: 0 })).rejects.toThrow()
    expect(ffmpegMock.instance.terminate).toHaveBeenCalledTimes(1)
  })

  it('rejects when the encoded video exceeds the size cap', async () => {
    ffmpegMock.instance.readFile.mockResolvedValue({
      byteLength: STORY_MAX_MEDIA_BYTES + 1,
    } as Uint8Array)

    await expect(processStoryVideo({ file: inputFile(), startSeconds: 0 })).rejects.toThrow()
    expect(ffmpegMock.instance.terminate).toHaveBeenCalledTimes(1)
  })

  it('rejects when ffmpeg returns the output as a string', async () => {
    ffmpegMock.instance.readFile.mockResolvedValue('nope')

    await expect(processStoryVideo({ file: inputFile(), startSeconds: 0 })).rejects.toThrow()
    expect(ffmpegMock.instance.terminate).toHaveBeenCalledTimes(1)
  })

  it('aborts a hanging encode and terminates ffmpeg', async () => {
    ffmpegMock.instance.exec.mockReturnValue(new Promise(() => {}))
    const controller = new AbortController()

    const promise = processStoryVideo({
      file: inputFile(),
      startSeconds: 0,
      signal: controller.signal,
    })
    await vi.waitFor(() => expect(ffmpegMock.instance.exec).toHaveBeenCalled())
    controller.abort()

    const error = await promise.catch((e: unknown) => e)
    expect(error).toBeInstanceOf(DOMException)
    expect((error as DOMException).name).toBe('AbortError')
    expect(ffmpegMock.instance.terminate).toHaveBeenCalledTimes(1)
  })

  it('clamps reported progress into 0..1', async () => {
    const seen: number[] = []

    await processStoryVideo({
      file: inputFile(),
      startSeconds: 0,
      onProgress: (progress) => seen.push(progress),
    })

    const progress = ffmpegMock.handlers.progress
    expect(progress).toBeTypeOf('function')
    progress({ progress: 0.5 })
    progress({ progress: 2 })
    progress({ progress: -1 })

    expect(seen).toEqual([0.5, 1, 0])
  })
})
