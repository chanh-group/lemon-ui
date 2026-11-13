import React, { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { FullScreenIcon, PauseIcon, PlayIcon } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
import { cn } from '@/lib/utils'
import type { MessageAttachmentItem } from '../../types/chat.types'
import {
  formatBytes,
  isAudio,
  isImage,
  isPdf,
  isPreviewable,
  isText,
  isVideo,
} from '../../utils/fileTypes'

const Play = createIcon(PlayIcon)
const Pause = createIcon(PauseIcon)
const FullScreen = createIcon(FullScreenIcon)

export function AudioPlayerBubble({
  src,
  fileName,
  sizeBytes,
}: {
  src: string
  fileName?: string
  sizeBytes?: number
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch(() => {})
    }
  }

  const handleTimeUpdate = () => {
    const audio = audioRef.current
    if (audio) {
      setCurrentTime(audio.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    const audio = audioRef.current
    if (audio && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
      setDuration(audio.duration)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    const audio = audioRef.current
    if (!audio) return
    const target = Number(e.target.value)
    audio.currentTime = target
    setCurrentTime(target)
  }

  const formatSec = (sec: number) => {
    if (!sec || isNaN(sec)) return '0:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const isVoiceNote = fileName?.startsWith('voice-note')

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-3 py-1.5 px-0.5 min-w-52.5 sm:min-w-62.5 max-w-xs sm:max-w-sm select-none"
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        className="hidden"
      />

      {/* Play / Pause button */}
      <button
        type="button"
        onClick={togglePlay}
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs transition-transform active:scale-90 hover:opacity-95 cursor-pointer"
        aria-label={isPlaying ? 'Tạm dừng' : 'Phát âm thanh'}
      >
        {isPlaying ? (
          <Pause className="size-4 fill-current" />
        ) : (
          <Play className="size-4 ml-0.5 fill-current" />
        )}
      </button>

      {/* Track & Time */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {!isVoiceNote && fileName && (
          <div className="flex items-center justify-between text-xs leading-none mb-1">
            <span className="truncate font-medium text-foreground/90">{fileName}</span>
            {sizeBytes ? (
              <span className="ml-1 text-[10px] opacity-70">({formatBytes(sizeBytes)})</span>
            ) : null}
          </div>
        )}

        <div className="flex items-center gap-2.5">
          {/* Progress bar */}
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-foreground/15 rounded-full appearance-none cursor-pointer accent-primary"
          />
          <span className="tabular-nums font-mono text-[11px] text-foreground/80 shrink-0 min-w-7 text-right">
            {formatSec(isPlaying ? currentTime : duration || currentTime)}
          </span>
        </div>
      </div>
    </div>
  )
}

export function DocumentBadge({ ext }: { ext: string }) {
  const label = ext ? ext.toLowerCase().slice(0, 4) : 'file'
  return (
    <div className="relative flex h-11 w-9 shrink-0 flex-col items-center justify-end pb-1 rounded-sm bg-white text-zinc-800 shadow-xs border border-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700">
      {/* Dog-ear folded corner */}
      <div className="absolute top-0 right-0 w-3 h-3 overflow-hidden">
        <div className="absolute -top-3 -right-3 w-6 h-6 bg-zinc-200 dark:bg-zinc-600 rotate-45 transform origin-bottom-left shadow-xs" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-tight leading-none mb-0.5">
        {label}
      </span>
    </div>
  )
}

interface AttachmentBubbleProps {
  attachment: MessageAttachmentItem
  onOpenLightbox?: (attachment: MessageAttachmentItem) => void
  onOpenDocument?: (attachment: MessageAttachmentItem) => void
  hasCaption?: boolean
}

export function AttachmentBubble({
  attachment,
  onOpenLightbox,
  onOpenDocument,
  hasCaption = false,
}: AttachmentBubbleProps) {
  const { t } = useTranslation()
  const isImg = attachment.kind === 'IMAGE' || isImage(attachment.mimeType, attachment.fileName)
  const isVid = attachment.kind === 'VIDEO' || isVideo(attachment.mimeType, attachment.fileName)
  const isAud = attachment.kind === 'AUDIO' || isAudio(attachment.mimeType, attachment.fileName)
  const canPreview = isPreviewable(attachment.mimeType, attachment.fileName)

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isImg) {
      onOpenLightbox?.(attachment)
    } else if (
      isPdf(attachment.mimeType, attachment.fileName) ||
      isText(attachment.mimeType, attachment.fileName)
    ) {
      onOpenDocument?.(attachment)
    } else {
      // Non-previewable file -> Automatically trigger download as requested
      const targetUrl = attachment.downloadUrl || attachment.previewUrl
      if (!targetUrl) {
        toast.error(t('chat.downloadFailed', 'Không thể tải tệp'))
        return
      }

      const a = document.createElement('a')
      a.href = targetUrl
      a.download = attachment.fileName || 'download'
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      toast.success(`${t('chat.downloading', 'Đang tải')} ${attachment.fileName}`)
    }
  }

  if (isImg) {
    return (
      <div
        className={cn(
          'group relative max-w-xs sm:max-w-sm overflow-hidden bg-muted/40 cursor-pointer',
          hasCaption ? 'rounded-t-2xl' : 'rounded-2xl',
        )}
      >
        <img
          src={attachment.previewUrl || attachment.downloadUrl}
          alt={attachment.fileName}
          onClick={handleCardClick}
          loading="lazy"
          className="max-h-72 w-full object-cover transition-transform duration-200 hover:scale-[1.01]"
        />
      </div>
    )
  }

  if (isAud) {
    const src = attachment.previewUrl || attachment.downloadUrl
    return (
      <div
        className={cn(
          'w-full max-w-xs sm:max-w-sm',
          hasCaption && 'pb-2 border-b border-foreground/15 mb-1.5',
        )}
      >
        <AudioPlayerBubble
          src={src}
          fileName={attachment.fileName}
          sizeBytes={attachment.sizeBytes}
        />
      </div>
    )
  }

  if (isVid) {
    return (
      <div
        className={cn(
          'group relative max-w-xs sm:max-w-sm overflow-hidden bg-black',
          hasCaption ? 'rounded-t-2xl' : 'rounded-2xl',
        )}
      >
        <video
          src={attachment.previewUrl || attachment.downloadUrl}
          controls
          playsInline
          preload="metadata"
          className="max-h-72 w-full"
        />
        {onOpenLightbox && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onOpenLightbox(attachment)
            }}
            className="absolute top-2 right-2 z-10 grid size-8 place-items-center rounded-full bg-black/60 text-white shadow-md opacity-80 hover:opacity-100 hover:bg-black/90 transition-all cursor-pointer"
            title={t('chat.fullscreenVideo', 'Xem toàn màn hình')}
            aria-label={t('chat.fullscreenVideo', 'Xem toàn màn hình')}
          >
            <FullScreen className="size-4" />
          </button>
        )}
      </div>
    )
  }

  const ext = attachment.fileName.includes('.')
    ? attachment.fileName.split('.').pop()?.toLowerCase() || ''
    : ''

  // Document / File row (integrated smoothly in single bubble, matching Messenger)
  return (
    <div
      onClick={handleCardClick}
      title={canPreview ? t('chat.preview', 'Xem trước') : t('chat.download', 'Tải xuống')}
      className={cn(
        'flex items-center gap-3 py-1 px-0.5 transition-opacity cursor-pointer hover:opacity-90 select-none min-w-50 max-w-xs sm:max-w-sm',
        hasCaption && 'pb-2 border-b border-foreground/15 mb-1.5',
      )}
    >
      <DocumentBadge ext={ext} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs sm:text-sm font-semibold leading-tight hover:underline">
          {attachment.fileName}
        </p>
        <p className="mt-0.5 text-[11px] opacity-75">{formatBytes(attachment.sizeBytes)}</p>
      </div>
    </div>
  )
}
