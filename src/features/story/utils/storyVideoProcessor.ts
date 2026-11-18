import { STORY_MAX_MEDIA_BYTES, STORY_MAX_TRIM_SECONDS } from '../constants'

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
  const { Input, BlobSource, ALL_FORMATS, Output, Mp4OutputFormat, BufferTarget, Conversion } =
    await import('mediabunny')
  if (signal?.aborted) throw abortError()
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS })
  const target = new BufferTarget()
  const output = new Output({ format: new Mp4OutputFormat(), target })
  try {
    const conversion = await Conversion.init({
      input,
      output,
      trim: { start: startSeconds, end: startSeconds + STORY_MAX_TRIM_SECONDS },
      tracks: 'primary',
      copy: false,
      video: { codec: 'avc', bitrate: 2400000 },
      audio: { codec: 'aac', bitrate: 96000 },
    })
    if (signal?.aborted) throw abortError()
    if (
      !conversion.isValid ||
      conversion.discardedTracks.some(
        ({ track }) => track.type === 'video' || track.type === 'audio',
      )
    ) {
      throw new Error('This browser cannot convert the video or audio codec')
    }
    conversion.onProgress = (progress) => onProgress?.(Math.max(0, Math.min(1, progress)))
    const onAbort = () => {
      void conversion.cancel()
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    try {
      if (signal?.aborted) throw abortError()
      await conversion.execute()
      if (signal?.aborted) throw abortError()
    } catch (error) {
      if (signal?.aborted) throw abortError()
      throw error
    } finally {
      signal?.removeEventListener('abort', onAbort)
    }
    if (!target.buffer?.byteLength || target.buffer.byteLength > STORY_MAX_MEDIA_BYTES)
      throw new Error('Invalid output size')
    return new File([target.buffer], 'story.mp4', { type: 'video/mp4' })
  } finally {
    input.dispose()
  }
}
