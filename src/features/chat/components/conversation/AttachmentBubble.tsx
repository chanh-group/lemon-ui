import React from 'react'
import { File01Icon as FileData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
import { cn } from '@/lib/utils'
import type { MessageAttachmentItem } from '../../types/chat.types'
import { formatBytes, isImage, isPdf, isText, isVideo } from '../../utils/fileTypes'

const FileIcon = createIcon(FileData)

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

  if (isImg) {
    return (
      <div className={cn(
        'group relative max-w-xs sm:max-w-sm overflow-hidden bg-muted/40 cursor-pointer',
        hasCaption ? 'rounded-t-xl mb-1.5' : 'rounded-xl'
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
        hasCaption ? 'rounded-t-xl mb-1.5' : 'rounded-xl'
      )}>
        <video
          src={attachment.previewUrl || attachment.downloadUrl}
          controls
          playsInline
          preload="metadata"
          className="max-h-72 w-full rounded-xl"
        />
      </div>
    )
  }

  const ext = attachment.fileName.includes('.')
    ? attachment.fileName.split('.').pop()?.toLowerCase()
    : 'file'

  // Document / File row (integrated smoothly in single bubble, matching Messenger)
  return (
    <div
      onClick={handleCardClick}
      className={cn(
        'flex items-center gap-3 p-1 transition-opacity cursor-pointer hover:opacity-90 select-none min-w-[200px] max-w-xs sm:max-w-sm',
        hasCaption && 'pb-2 border-b border-border/20 mb-1.5'
      )}
    >
      {/* File Badge Icon */}
      <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-card text-foreground shadow-xs border border-border/50 font-bold text-[10px] uppercase tracking-wider">
        {ext ? ext.slice(0, 4) : <FileIcon className="size-5 text-primary" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold leading-tight text-foreground hover:underline">
          {attachment.fileName}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {formatBytes(attachment.sizeBytes)}
        </p>
      </div>
    </div>
  )
}
