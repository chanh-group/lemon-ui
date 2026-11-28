import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { ImagePlusIcon as MediaData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
import {
  STORY_MAX_MEDIA_BYTES,
  STORY_MAX_TRIM_SECONDS,
  STORY_MAX_VIDEO_INPUT_BYTES,
  STORY_MAX_VIDEO_SECONDS,
} from '../constants'
import { STORY_MAX_CAPTION_LENGTH } from '@/config/constants'
import { isVideoDurationKnown, planStoryVideo, toStoryDurationMs } from '../utils/storyVideo'
import { processStoryVideo } from '../utils/storyVideoProcessor'
import { readVideoDuration } from '../utils/readVideoDuration'
import { VideoTrimmer } from './VideoTrimmer'
const Media = createIcon(MediaData)

interface MediaStoryActorProps {
  onDiscard: () => void
  /** Nhận kèm captionText để gửi API. */
  onShare: (file: File, captionText: string, durationMs?: number) => void
  isSharing: boolean
  uploadProgress?: number | null
  controlsTarget?: HTMLElement
}

/** Editor tin ảnh/video: chọn file (object URL), caption, xem trước 9:16. */
export function MediaStoryEditor({
  onDiscard,
  onShare,
  isSharing,
  uploadProgress,
  controlsTarget,
}: MediaStoryActorProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const activeRef = useRef(true)
  const controllerRef = useRef<AbortController>(null)
  const [file, setFile] = useState<File | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [fileError, setFileError] = useState('')
  const [duration, setDuration] = useState<number | null>(null)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const [playhead, setPlayhead] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [unreadable, setUnreadable] = useState(false)
  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
      controllerRef.current?.abort()
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
    const video = selected.type.startsWith('video/')
    const max = video ? STORY_MAX_VIDEO_INPUT_BYTES : STORY_MAX_MEDIA_BYTES
    setDuration(null)
    setTrimStart(0)
    setTrimEnd(0)
    setPlayhead(0)
    setProgress(0)
    setUnreadable(false)
    if (!allowed.includes(selected.type) || selected.size === 0) {
      setFileError(t('chat.storyFileInvalid'))
      setFile(null)
      setObjectUrl(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    if (selected.size > max) {
      setFileError(t(video ? 'chat.storyVideoTooLarge' : 'chat.storyFileInvalid'))
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
  const canShare = Boolean(file) && !unreadable
  const showTrimmer =
    isVideo && Boolean(objectUrl) && isVideoDurationKnown(duration) && duration >= 1
  const hasCustomTrim =
    isVideo && isVideoDurationKnown(duration) && (trimStart > 0 || trimEnd < duration - 0.01)
  const frameWidth = showTrimmer
    ? 'w-[min(100%,460px,calc(56.25dvh-135px))]'
    : 'w-[min(100%,460px,calc(56.25dvh-90px))]'

  const share = async () => {
    if (!file || !canShare || isProcessing || isSharing) return
    const plan = isVideo
      ? planStoryVideo({ sizeBytes: file.size, durationSeconds: duration })
      : 'share'
    if (plan === 'share' && !hasCustomTrim) {
      onShare(
        file,
        caption.trim(),
        isVideo && isVideoDurationKnown(duration) ? toStoryDurationMs(duration) : undefined,
      )
      return
    }
    setIsProcessing(true)
    setProgress(0)
    setFileError('')
    const controller = new AbortController()
    controllerRef.current = controller
    try {
      const startSeconds = hasCustomTrim || plan === 'trim' ? trimStart : 0
      const output = await processStoryVideo({
        file,
        startSeconds,
        endSeconds: isVideoDurationKnown(duration)
          ? Math.min(trimEnd, startSeconds + STORY_MAX_TRIM_SECONDS)
          : undefined,
        signal: controller.signal,
        onProgress: (ratio) => {
          if (activeRef.current) setProgress(Math.round(ratio * 100))
        },
      })
      const outputDuration = await readVideoDuration(output, controller.signal)
      if (!isVideoDurationKnown(outputDuration) || outputDuration > STORY_MAX_VIDEO_SECONDS) {
        throw new Error('invalid duration')
      }
      if (activeRef.current) onShare(output, caption.trim(), toStoryDurationMs(outputDuration))
    } catch (error) {
      const aborted = error instanceof DOMException && error.name === 'AbortError'
      if (!aborted && activeRef.current) setFileError(t('chat.storyVideoProcessFailed'))
    } finally {
      controllerRef.current = null
      if (activeRef.current) {
        setIsProcessing(false)
        setProgress(0)
      }
    }
  }

  const controls = (
    <div className="space-y-4 border-b border-border p-4">
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
          disabled={isProcessing || isSharing}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>

      {fileError && (
        <p role="alert" className="text-sm text-red-500">
          {fileError}
        </p>
      )}
      <input
        maxLength={STORY_MAX_CAPTION_LENGTH}
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder={t('chat.storyCaptionPlaceholder')}
        aria-label={t('chat.storyCaptionPlaceholder')}
        className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring"
      />
    </div>
  )

  return (
    <div className="flex min-h-full flex-col md:h-full">
      {controlsTarget ? createPortal(controls, controlsTarget) : controls}
      {/* Xem trước */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto bg-background p-4 [justify-content:safe_center]">
        {objectUrl && (
          <div
            className={`relative aspect-[9/16] ${frameWidth} shrink-0 overflow-hidden rounded-2xl bg-card shadow-xl`}
          >
            {!isVideo && (
              <img
                src={objectUrl}
                alt={caption || t('chat.storyPreview')}
                className="h-full w-full object-contain"
              />
            )}
            {objectUrl && isVideo && (
              <video
                ref={videoRef}
                src={objectUrl}
                onLoadedMetadata={(event) => {
                  const value = event.currentTarget.duration
                  setDuration(isVideoDurationKnown(value) ? value : null)
                  if (isVideoDurationKnown(value))
                    setTrimEnd(value <= STORY_MAX_VIDEO_SECONDS ? value : STORY_MAX_TRIM_SECONDS)
                }}
                onError={() => {
                  setDuration(null)
                  setUnreadable(true)
                  setFileError(t('chat.storyVideoInvalid'))
                }}
                onTimeUpdate={(event) => {
                  setPlayhead(event.currentTarget.currentTime)
                  if (
                    hasCustomTrim &&
                    (event.currentTarget.currentTime >= trimEnd ||
                      event.currentTarget.currentTime < trimStart)
                  ) {
                    event.currentTarget.currentTime = trimStart
                  }
                }}
                className="h-full w-full object-contain"
                playsInline
                controls
              />
            )}
            {caption.trim() && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/75 to-transparent px-4 pb-16 pt-8">
                <p className="whitespace-pre-wrap break-words text-center text-sm font-medium text-foreground">
                  {caption.trim()}
                </p>
              </div>
            )}
          </div>
        )}
        {!objectUrl ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`flex aspect-[9/16] ${frameWidth} shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:border-ring hover:text-foreground`}
          >
            <span className="grid size-14 place-items-center rounded-full bg-card ring-1 ring-border">
              <Media className="size-7 text-brand-ink" aria-hidden="true" />
            </span>
            {t('chat.chooseMedia')}
          </button>
        ) : null}

        {showTrimmer && objectUrl !== null && (
          <div className={`${frameWidth} shrink-0`}>
            <VideoTrimmer
              key={objectUrl}
              url={objectUrl}
              duration={duration}
              start={trimStart}
              end={trimEnd}
              disabled={isProcessing || isSharing}
              currentTime={playhead}
              onSeek={(time) => {
                if (videoRef.current) videoRef.current.currentTime = time
                setPlayhead(time)
              }}
              onChange={(start, end) => {
                setTrimStart(start)
                setTrimEnd(end)
                if (start !== trimStart && videoRef.current) videoRef.current.currentTime = start
              }}
            />
          </div>
        )}
        <div className={`flex ${frameWidth} shrink-0 items-center justify-between gap-2 pb-2`}>
          <button
            type="button"
            onClick={onDiscard}
            disabled={isSharing}
            className="rounded-xl bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-border hover:text-foreground"
          >
            {t('chat.discard')}
          </button>
          {isProcessing && (
            <button
              type="button"
              onClick={() => controllerRef.current?.abort()}
              className="rounded-xl bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-border hover:text-foreground"
            >
              {t('chat.cancel')}
            </button>
          )}
          {isSharing && (
            <span
              role="status"
              aria-label={t('chat.uploadingFiles')}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              {uploadProgress != null && `${uploadProgress}%`}
              <progress
                className="w-24"
                max={100}
                value={uploadProgress ?? undefined}
                aria-label={t('chat.uploadingFiles')}
              />
            </span>
          )}
          <button
            type="button"
            onClick={share}
            disabled={!canShare || isSharing || isProcessing}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isSharing
              ? t('chat.pending')
              : isProcessing
                ? t('chat.storyProcessing', { progress })
                : t('chat.shareStory')}
          </button>
        </div>
      </div>
    </div>
  )
}
