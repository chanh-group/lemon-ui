import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePlusIcon as MediaData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const Media = createIcon(MediaData)

interface MediaStoryActorProps {
  onDiscard: () => void
  /** Nhận kèm captionText để gửi API. */
  onShare: (file: File, captionText: string, durationMs?: number) => void
  isSharing: boolean
}

/** Editor tin ảnh/video: chọn file (object URL), caption, xem trước 9:16. */
export function MediaStoryEditor({ onDiscard, onShare, isSharing }: MediaStoryActorProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [fileError, setFileError] = useState('')
  const [duration, setDuration] = useState<number | null>(null)
  const [trimStart, setTrimStart] = useState(0)
  const [isTrimming, setIsTrimming] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const activeRef = useRef(true)
  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
    }
  }, [])

  const handleFile = (selected: File | undefined | null) => {
    if (!selected) return
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
      'video/quicktime',
    ]
    const max = 25 * 1024 * 1024
    setDuration(null)
    setTrimStart(0)
    if (!allowed.includes(selected.type) || selected.size === 0 || selected.size > max) {
      setFileError(t('chat.storyFileInvalid'))
      setFile(null)
      setObjectUrl(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    setFileError('')
    setFile(selected)
    setObjectUrl(URL.createObjectURL(selected))
  }

  useEffect(
    () => () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    },
    [objectUrl],
  )

  const isVideo = file?.type.startsWith('video') ?? false
  const canShare = Boolean(file) && (!isVideo || (duration !== null && duration > 0))

  const share = async () => {
    if (!file || !canShare || isTrimming) return
    if (!isVideo || (duration !== null && duration <= 60)) {
      onShare(
        file,
        caption.trim(),
        isVideo && duration !== null ? Math.ceil(duration * 1000) : undefined,
      )
      return
    }
    setIsTrimming(true)
    setFileError('')
    try {
      const [{ FFmpeg }, { default: coreURL }, { default: wasmURL }] = await Promise.all([
        import('@ffmpeg/ffmpeg'),
        import('@ffmpeg/core?url'),
        import('@ffmpeg/core/wasm?url'),
      ])
      const ffmpeg = new FFmpeg()
      try {
        await ffmpeg.load({ coreURL, wasmURL })
        await ffmpeg.writeFile('input', new Uint8Array(await file.arrayBuffer()))
        const result = await ffmpeg.exec([
          '-ss',
          String(trimStart),
          '-i',
          'input',
          '-t',
          '59.9',
          '-map',
          '0:v:0',
          '-map',
          '0:a:0?',
          '-c:v',
          'libx264',
          '-preset',
          'ultrafast',
          '-c:a',
          'aac',
          '-movflags',
          '+faststart',
          'output.mp4',
        ])
        if (result !== 0) throw new Error('Video conversion failed')
        const data = await ffmpeg.readFile('output.mp4')
        if (typeof data === 'string') throw new Error('Invalid video output')
        const output = new File([new Uint8Array(data)], 'story.mp4', { type: 'video/mp4' })
        if (!output.size || output.size > 25 * 1024 * 1024) throw new Error('Video too large')
        const outputUrl = URL.createObjectURL(output)
        try {
          const outputDuration = await new Promise<number>((resolve, reject) => {
            const video = document.createElement('video')
            const timeout = window.setTimeout(
              () => reject(new Error('Video metadata timeout')),
              15000,
            )
            video.onloadedmetadata = () => {
              window.clearTimeout(timeout)
              resolve(video.duration)
            }
            video.onerror = () => {
              window.clearTimeout(timeout)
              reject(new Error('Invalid output'))
            }
            video.src = outputUrl
          })
          if (!Number.isFinite(outputDuration) || outputDuration <= 0 || outputDuration > 60)
            throw new Error('Invalid output duration')
          if (activeRef.current) onShare(output, caption.trim(), Math.ceil(outputDuration * 1000))
        } finally {
          URL.revokeObjectURL(outputUrl)
        }
      } finally {
        ffmpeg.terminate()
      }
    } catch {
      if (activeRef.current) setFileError(t('chat.storyTrimFailed'))
    } finally {
      if (activeRef.current) setIsTrimming(false)
    }
  }

  return (
    <div className="@container min-h-full">
      <div className="grid min-h-full grid-cols-1 @3xl:grid-cols-[19rem_1fr]">
        {/* Cột điều khiển */}
        <div className="min-h-0 space-y-4 overflow-y-auto border-b border-border p-4 @3xl:border-b-0 @3xl:border-r">
          {/* Chọn file ảnh/video */}
          <label
            htmlFor="stories-media-file"
            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border p-3 text-left transition-colors hover:bg-muted"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-brand-ink">
              <Media className="size-4.5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">
                {file ? file.name : t('chat.chooseMedia')}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {t('chat.chooseMediaHint')}
              </span>
            </span>
            <input
              ref={fileInputRef}
              id="stories-media-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              className="sr-only"
              disabled={isTrimming || isSharing}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>

          {fileError && (
            <p role="alert" className="text-sm text-red-500">
              {fileError}
            </p>
          )}
          {isVideo && duration !== null && duration > 60 && (
            <div className="space-y-2 text-sm text-foreground">
              <label htmlFor="story-trim-start" className="block font-semibold">
                {t('chat.storyTrimHint')}
              </label>
              <input
                id="story-trim-start"
                type="range"
                min={0}
                max={Math.max(0, duration - 59.9)}
                step={0.1}
                value={trimStart}
                disabled={isSharing || isTrimming}
                onChange={(event) => {
                  const start = Number(event.target.value)
                  setTrimStart(start)
                  if (videoRef.current) videoRef.current.currentTime = start
                }}
                className="w-full accent-primary"
              />
              <p>
                {t('chat.storyTrimRange', {
                  start: trimStart.toFixed(1),
                  end: Math.min(duration, trimStart + 59.9).toFixed(1),
                })}
              </p>
            </div>
          )}
          <input
            maxLength={500}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={t('chat.storyCaptionPlaceholder')}
            aria-label={t('chat.storyCaptionPlaceholder')}
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring"
          />
        </div>

        {/* Xem trước */}
        <div className="flex min-h-0 flex-col items-center justify-center gap-3 bg-background p-4">
          {objectUrl && !isVideo && (
            <img
              src={objectUrl}
              alt={caption || t('chat.storyPreview')}
              className="aspect-[9/16] w-[min(100%,460px,calc(56.25dvh-90px))] shrink-0 rounded-2xl object-cover shadow-xl"
            />
          )}
          {objectUrl && isVideo && (
            <video
              ref={videoRef}
              src={objectUrl}
              onLoadedMetadata={(event) => {
                const value = event.currentTarget.duration
                if (Number.isFinite(value) && value > 0) setDuration(value)
                else setFileError(t('chat.storyVideoInvalid'))
              }}
              onError={() => {
                setDuration(null)
                setFileError(t('chat.storyVideoInvalid'))
              }}
              onTimeUpdate={(event) => {
                if (
                  duration !== null &&
                  duration > 60 &&
                  event.currentTarget.currentTime >= trimStart + 59.9
                ) {
                  event.currentTarget.pause()
                  event.currentTarget.currentTime = trimStart
                }
              }}
              className="aspect-[9/16] w-[min(100%,460px,calc(56.25dvh-90px))] shrink-0 rounded-2xl object-cover shadow-xl"
              playsInline
              controls
            />
          )}
          {!objectUrl ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-[9/16] w-[min(100%,460px,calc(56.25dvh-90px))] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
            >
              <span className="grid size-14 place-items-center rounded-full bg-card ring-1 ring-border">
                <Media className="size-7 text-brand-ink" aria-hidden="true" />
              </span>
              {t('chat.chooseMedia')}
            </button>
          ) : null}

          <div className="flex w-[min(100%,460px,calc(56.25dvh-90px))] shrink-0 items-center justify-between gap-2 pb-2">
            <button
              type="button"
              onClick={onDiscard}
              disabled={isTrimming || isSharing}
              className="rounded-xl bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-border hover:text-foreground"
            >
              {t('chat.discard')}
            </button>
            <button
              type="button"
              onClick={share}
              disabled={!canShare || isSharing || isTrimming}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isTrimming
                ? t('chat.storyTrimming')
                : isSharing
                  ? t('chat.pending')
                  : t('chat.shareStory')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
