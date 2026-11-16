import { STORY_MAX_MEDIA_BYTES } from '../constants'
import { buildStoryVideoArgs } from './storyVideo'

export interface ProcessStoryVideoInput {
  file: File
  startSeconds: number
  signal?: AbortSignal
  onProgress?: (progress: number) => void
}

function abortError() {
  return new DOMException('Aborted', 'AbortError')
}

export async function processStoryVideo({
  file,
  startSeconds,
  signal,
  onProgress,
}: ProcessStoryVideoInput): Promise<File> {
  if (signal?.aborted) throw abortError()

  const [{ FFmpeg }, { default: coreURL }, { default: wasmURL }] = await Promise.all([
    import('@ffmpeg/ffmpeg'),
    import('@ffmpeg/core?url'),
    import('@ffmpeg/core/wasm?url'),
  ])
  if (signal?.aborted) throw abortError()

  const ffmpeg = new FFmpeg()
  let terminated = false
  const terminate = () => {
    if (terminated) return
    terminated = true
    ffmpeg.terminate()
  }

  let rejectAbort: ((reason: DOMException) => void) | undefined
  const aborted = new Promise<never>((_, reject) => {
    rejectAbort = reject
  })
  void aborted.catch(() => {}) // an abort before the race must not surface as unhandled
  const onAbort = () => {
    terminate()
    rejectAbort?.(abortError())
  }
  signal?.addEventListener('abort', onAbort, { once: true })

  try {
    ffmpeg.on('progress', ({ progress }) => {
      onProgress?.(Math.min(1, Math.max(0, progress)))
    })
    await ffmpeg.load({ coreURL, wasmURL })
    await ffmpeg.writeFile('input', new Uint8Array(await file.arrayBuffer()))
    if (signal?.aborted) throw abortError()

    const exitCode = await Promise.race([ffmpeg.exec(buildStoryVideoArgs(startSeconds)), aborted])
    if (exitCode !== 0) throw new Error(`ffmpeg exited with code ${exitCode}`)

    const data = await ffmpeg.readFile('output.mp4')
    if (typeof data === 'string' || data.byteLength === 0) {
      throw new Error('ffmpeg produced no video output')
    }
    if (data.byteLength > STORY_MAX_MEDIA_BYTES) {
      throw new Error('encoded story video is too large')
    }

    return new File([new Uint8Array(data)], 'story.mp4', { type: 'video/mp4' })
  } catch (error) {
    // terminate() rejects a pending exec, don't leak that as a real failure.
    if (signal?.aborted) throw abortError()
    throw error
  } finally {
    signal?.removeEventListener('abort', onAbort)
    terminate()
  }
}
