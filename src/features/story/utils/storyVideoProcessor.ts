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

function abortable<T>(promise: Promise<T>, signal?: AbortSignal, onLateValue?: (value: T) => void) {
  if (!signal) return promise
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError())
    signal.addEventListener('abort', onAbort, { once: true })
    if (signal.aborted) onAbort()
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        if (signal.aborted) onLateValue?.(value)
        else resolve(value)
      },
      (error) => {
        signal.removeEventListener('abort', onAbort)
        reject(signal.aborted ? abortError() : error)
      },
    )
  })
}

export async function processStoryVideo({
  file,
  startSeconds,
  signal,
  onProgress,
}: ProcessStoryVideoInput): Promise<File> {
  if (signal?.aborted) throw abortError()
  const {
    Input,
    BlobSource,
    ALL_FORMATS,
    Output,
    Mp4OutputFormat,
    BufferTarget,
    Conversion,
    canEncodeAudio,
  } = await abortable(import('mediabunny'), signal)
  if (signal?.aborted) throw abortError()
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS })
  try {
    const audioTrack = await abortable(input.getPrimaryAudioTrack(), signal)
    if (audioTrack) {
      const [numberOfChannels, sampleRate] = await abortable(
        Promise.all([audioTrack.getNumberOfChannels(), audioTrack.getSampleRate()]),
        signal,
      )
      const supported = await abortable(
        canEncodeAudio('aac', { numberOfChannels, sampleRate, bitrate: 96000 }),
        signal,
      )
      if (!supported) {
        const { registerAacEncoder } = await abortable(import('@mediabunny/aac-encoder'), signal)
        registerAacEncoder()
      }
    }
    const target = new BufferTarget()
    const output = new Output({ format: new Mp4OutputFormat(), target })
    const conversion = await abortable(
      Conversion.init({
        input,
        output,
        trim: { start: startSeconds, end: startSeconds + STORY_MAX_TRIM_SECONDS },
        tracks: 'primary',
        copy: false,
        video: async (track) => {
          const rotation = await track.getRotation()
          const [squareWidth, squareHeight] = await Promise.all([
            track.getSquarePixelWidth(),
            track.getSquarePixelHeight(),
          ])
          const [sourceWidth, sourceHeight] =
            rotation % 180 === 0 ? [squareWidth, squareHeight] : [squareHeight, squareWidth]
          const width = Math.max(2, Math.min(1080, Math.ceil(sourceWidth / 2) * 2))
          const height = Math.max(2, Math.round((sourceHeight * width) / sourceWidth / 2) * 2)
          return { codec: 'avc', bitrate: 2400000, width, height, fit: 'contain' }
        },
        audio: { codec: 'aac', bitrate: 96000 },
      }).catch((error) => {
        void output.cancel().catch(() => {})
        throw error
      }),
      signal,
      (lateConversion) => {
        void lateConversion.cancel().catch(() => {})
      },
    )
    if (signal?.aborted) {
      await conversion.cancel().catch(() => {})
      throw abortError()
    }
    if (
      !conversion.isValid ||
      conversion.discardedTracks.some(
        ({ track }) => track.type === 'video' || track.type === 'audio',
      )
    ) {
      await conversion.cancel().catch(() => {})
      throw new Error('This browser cannot convert the video or audio codec')
    }
    conversion.onProgress = (progress) => onProgress?.(Math.max(0, Math.min(1, progress)))
    let cancellation: Promise<void> | undefined
    const onAbort = () => {
      cancellation = conversion.cancel().catch(() => {})
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
      await cancellation
    }
    if (!target.buffer?.byteLength || target.buffer.byteLength > STORY_MAX_MEDIA_BYTES)
      throw new Error('Invalid output size')
    return new File([target.buffer], 'story.mp4', { type: 'video/mp4' })
  } finally {
    input.dispose()
  }
}
