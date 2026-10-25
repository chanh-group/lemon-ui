import React from 'react'
import { File01Icon as FileData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
import { cn } from '@/lib/utils'
import type { MessageAttachmentItem } from '../../types/chat.types'
import { formatBytes, isImage, isPdf, isText, isVideo } from '../../utils/fileTypes'
import { AttachmentActionMenu } from './AttachmentActionMenu'

const FileIcon = createIcon(FileData)

interface AttachmentBubbleProps {
  attachment: MessageAttachmentItem
  onOpenLightbox?: (attachment: MessageAttachmentItem) => void
  onOpenDocument?: (attachment: MessageAttachmentItem) => void
  isMe?: boolean
}

export function AttachmentBubble({
  attachment,
  onOpenLightbox,
  onOpenDocument,
  isMe = false,
}: AttachmentBubbleProps) {
  const isImg = isImage(attachment.mimeType, attachment.fileName)
  const isVid = isVideo(attachment.mimeType, attachment.fileName)

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isImg) {
      onOpenLightbox?.(attachment)
    } else if (isPdf(attachment.mimeType, attachment.fileName) || isText(attachment.mimeType, attachment.fileName)) {
      onOpenDocument?.(attachment)
    } else {
      // Trigger download
      const url = attachment.downloadUrl || attachment.previewUrl
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.fileName
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  const handleMenuPreview = () => {
    if (isImg) onOpenLightbox?.(attachment)
    else onOpenDocument?.(attachment)
  }

  if (isImg) {
    return (
      <div className="group relative my-1 max-w-xs sm:max-w-sm overflow-hidden rounded-xl border border-border shadow-xs bg-muted">
        <img
          src={attachment.previewUrl || attachment.downloadUrl}
          alt={attachment.fileName}
          onClick={handleCardClick}
          loading="lazy"
          className="max-h-72 w-full object-cover transition-transform duration-200 cursor-pointer hover:scale-[1.02]"
        />
        <div className="absolute top-2 right-2 opacity-90 transition-opacity duration-150 group-hover:opacity-100">
          <AttachmentActionMenu
            attachment={attachment}
            onPreview={handleMenuPreview}
          />
        </div>
      </div>
    )
  }

  if (isVid) {
    return (
      <div className="group relative my-1 max-w-xs sm:max-w-sm overflow-hidden rounded-xl border border-border bg-black shadow-xs">
        <video
          src={attachment.previewUrl || attachment.downloadUrl}
          controls
          playsInline
          preload="metadata"
          className="max-h-72 w-full rounded-xl"
        />
        <div className="absolute top-2 right-2 z-10 opacity-90 transition-opacity duration-150 group-hover:opacity-100">
          <AttachmentActionMenu
            attachment={attachment}
            onPreview={handleMenuPreview}
          />
        </div>
      </div>
    )
  }

  // Document / Other File Card
  return (
    <div
      onClick={handleCardClick}
      className={cn(
        'group relative my-1 flex w-64 max-w-full items-center gap-3 rounded-xl p-3 border shadow-xs transition-all cursor-pointer hover:shadow-md select-none',
        isMe
          ? 'bg-secondary/90 hover:bg-secondary text-foreground border-border/80'
          : 'bg-card hover:bg-muted/70 text-foreground border-border',
      )}
    >
      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <FileIcon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold leading-tight text-foreground">
          {attachment.fileName}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {formatBytes(attachment.sizeBytes)}
        </p>
      </div>
      <div onClick={(e) => e.stopPropagation()} className="shrink-0">
        <AttachmentActionMenu
          attachment={attachment}
          onPreview={handleMenuPreview}
        />
      </div>
    </div>
  )
}
