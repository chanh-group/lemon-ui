import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Download01Icon as DownloadData,
  EyeIcon as ViewPreviewData,
  MoreVerticalIcon as DotsData,
} from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { MessageAttachmentItem } from '../../types/chat.types'
import { isPreviewable } from '../../utils/fileTypes'

const Dots = createIcon(DotsData)
const DownloadIcon = createIcon(DownloadData)
const ViewPreviewIcon = createIcon(ViewPreviewData)

interface AttachmentActionMenuProps {
  attachment: MessageAttachmentItem
  onPreview?: (attachment: MessageAttachmentItem) => void
  className?: string
  align?: 'start' | 'end'
}

export function AttachmentActionMenu({
  attachment,
  onPreview,
  className,
  align = 'end',
}: AttachmentActionMenuProps) {
  const { t } = useTranslation()
  const canPreview = isPreviewable(attachment.mimeType, attachment.fileName)

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    const targetUrl = attachment.downloadUrl || attachment.previewUrl
    if (!targetUrl) {
      toast.error(t('chat.downloadFailed', 'Không thể tải tệp'))
      return
    }

    // Tạo thẻ ancher ẩn để kích hoạt download đúng tên gốc
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

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation()
    onPreview?.(attachment)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'grid size-7 place-items-center rounded-full bg-background/80 text-foreground shadow-xs backdrop-blur-xs transition-colors hover:bg-background hover:text-primary focus:outline-none focus:ring-1 focus:ring-ring',
            className,
          )}
          aria-label="Tác vụ tệp tin"
        >
          <Dots className="size-4" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-44 z-50">
        {canPreview && onPreview && (
          <DropdownMenuItem onClick={handlePreview} className="cursor-pointer gap-2">
            <ViewPreviewIcon className="size-4" />
            <span>{t('chat.preview', 'Xem trực tiếp')}</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleDownload} className="cursor-pointer gap-2">
          <DownloadIcon className="size-4" />
          <span>{t('chat.download', 'Tải xuống')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

