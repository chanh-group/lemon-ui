import React from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { MessageAttachmentItem } from '../../types/chat.types'
import { formatBytes, isImage, isPdf, isPreviewable, isText, isVideo } from '../../utils/fileTypes'

export function DocumentBadge({ ext }: { ext: string }) {
  const label = ext ? ext.toLowerCase().slice(0, 4) : 'file'
  return (
    <div className="relative flex h-11 w-9 shrink-0 flex-col items-center justify-end pb-1 rounded-sm bg-white text-zinc-800 shadow-xs border border-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700">
      {/* Dog-ear folded corner */}
      <div className="absolute top-0 right-0 w-3 h-3 overflow-hidden">
        <div className="absolute -top-3 -right-3 w-6 h-6 bg-zinc-200 dark:bg-zinc-600 rotate-45 transform origin-bottom-left shadow-xs" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-tight leading-none mb-0.5">{label}</span>
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
  const isImg = isImage(attachment.mimeType, attachment.fileName)
  const isVid = isVideo(attachment.mimeType, attachment.fileName)
  const canPreview = isPreviewable(attachment.mimeType, attachment.fileName)

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isImg) {
      onOpenLightbox?.(attachment)
    } else if (isPdf(attachment.mimeType, attachment.fileName) || isText(attachment.mimeType, attachment.fileName)) {
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
      <div className={cn(
        'group relative max-w-xs sm:max-w-sm overflow-hidden bg-muted/40 cursor-pointer',
        hasCaption ? 'rounded-t-2xl' : 'rounded-2xl'
      )}>
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

  if (isVid) {
    return (
      <div className={cn(
        'group relative max-w-xs sm:max-w-sm overflow-hidden bg-black',
        hasCaption ? 'rounded-t-2xl' : 'rounded-2xl'
      )}>
        <video
          src={attachment.previewUrl || attachment.downloadUrl}
          controls
          playsInline
          preload="metadata"
          className="max-h-72 w-full"
        />
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
        'flex items-center gap-3 py-1 px-0.5 transition-opacity cursor-pointer hover:opacity-90 select-none min-w-[200px] max-w-xs sm:max-w-sm',
        hasCaption && 'pb-2 border-b border-foreground/15 mb-1.5'
      )}
    >
      <DocumentBadge ext={ext} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs sm:text-sm font-semibold leading-tight hover:underline">
          {attachment.fileName}
        </p>
        <p className="mt-0.5 text-[11px] opacity-75">
          {formatBytes(attachment.sizeBytes)}
        </p>
      </div>
    </div>
  )
}
