import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowTurnBackwardIcon as ReplyData,
  Copy01Icon as CopyData,
  Delete02Icon as DeleteData,
  Download01Icon as DownloadData,
  EyeIcon as ViewPreviewData,
  Flag01Icon as FlagData,
  PinIcon as PinData,
  SmileIcon as SmileData,
} from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
import { EllipsisVertical } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { ChatMessage, MessageAttachmentItem } from '../../types/chat.types'
import { isPreviewable } from '../../utils/fileTypes'

const SmileIcon = createIcon(SmileData)
const ReplyIcon = createIcon(ReplyData)
const DownloadIcon = createIcon(DownloadData)
const DeleteIcon = createIcon(DeleteData)
const CopyIcon = createIcon(CopyData)
const ViewPreviewIcon = createIcon(ViewPreviewData)
const PinIcon = createIcon(PinData)
const FlagIcon = createIcon(FlagData)

export interface MessageActionPillProps {
  message: ChatMessage
  attachment?: MessageAttachmentItem
  isMe: boolean
  onPreview?: (attachment: MessageAttachmentItem) => void
  onRevoke?: (messageId: string) => void
  onReact?: (messageId: string, emoji: string) => void
  onForward?: (message: ChatMessage) => void
  onReply?: (message: ChatMessage) => void
  className?: string
  align?: 'start' | 'end'
  onOpenChange?: (open: boolean) => void
}

export function MessageActionPill({
  message,
  attachment,
  isMe,
  onPreview,
  onRevoke,
  onReact,
  onForward,
  onReply,
  className,
  align = 'end',
  onOpenChange,
}: MessageActionPillProps) {
  const { t } = useTranslation()
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const canPreview = attachment ? isPreviewable(attachment.mimeType, attachment.fileName) : false

  useEffect(() => {
    onOpenChange?.(emojiOpen || menuOpen)
  }, [emojiOpen, menuOpen, onOpenChange])

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(false)
    if (!attachment) return
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

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(false)
    if (attachment && onPreview) onPreview(attachment)
  }

  const handleForward = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(false)
    if (onForward) {
      onForward(message)
    } else {
      toast.info(t('chat.forwardDeveloping', 'Tính năng chuyển tiếp đang phát triển'))
    }
  }

  const handleCopyText = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(false)
    if (message.text) {
      navigator.clipboard.writeText(message.text)
      toast.success(t('chat.textCopied', 'Đã sao chép tin nhắn'))
    }
  }

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(false)
    toast.info(t('chat.pinDeveloping', 'Tính năng ghim đang phát triển'))
  }

  const handleRevoke = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(false)
    onRevoke?.(message.id)
  }

  const handleReport = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(false)
    toast.success(t('chat.reportSubmitted', 'Đã gửi báo cáo'))
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={cn('flex items-center gap-1 shrink-0 select-none', className)}
    >
      {/* 1. Emoji Reaction Button */}
      <DropdownMenu open={emojiOpen} onOpenChange={setEmojiOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'grid size-7 sm:size-8 place-items-center rounded-full bg-white dark:bg-zinc-800 border border-border/80 text-foreground/80 shadow-sm transition-all hover:bg-muted hover:text-foreground active:scale-95 focus:outline-none',
              emojiOpen && 'bg-muted text-foreground ring-1 ring-border',
            )}
            title="Thả cảm xúc"
            aria-label="Thả cảm xúc"
          >
            <SmileIcon className="size-4" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="center"
          side="top"
          className="flex items-center gap-1 rounded-full border border-border/80 bg-card p-1 shadow-lg"
        >
          {['👍', '❤️', '😆', '😮', '😢', '😡'].map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setEmojiOpen(false)
                if (onReact) {
                  onReact(message.id, emoji)
                } else {
                  toast.success(`${t('chat.reactStorySuccess', 'Đã thả cảm xúc')} ${emoji}`)
                }
              }}
              className="grid size-7 sm:size-8 place-items-center rounded-full text-base sm:text-lg transition-transform hover:scale-125 hover:bg-muted"
            >
              {emoji}
            </button>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 2. Chuyển tiếp / Trả lời Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onReply?.(message)
        }}
        disabled={!onReply}
        className="grid size-7 sm:size-8 place-items-center rounded-full bg-white dark:bg-zinc-800 border border-border/80 text-foreground/80 shadow-sm transition-all hover:bg-muted hover:text-foreground active:scale-95 focus:outline-none disabled:opacity-40 disabled:shadow-none"
        title={t('chat.replyMessage', 'Trả lời')}
        aria-label={t('chat.replyMessage', 'Trả lời')}
      >
        <ReplyIcon className="size-4" aria-hidden="true" />
      </button>

      {/* 3. 3-dots Menu Button */}
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'grid size-7 sm:size-8 place-items-center rounded-full bg-white dark:bg-zinc-800 border border-border/80 text-foreground/80 shadow-sm transition-all hover:bg-muted hover:text-foreground active:scale-95 focus:outline-none',
              menuOpen && 'bg-muted text-foreground ring-1 ring-border',
            )}
            title="Tùy chọn khác"
            aria-label="Tùy chọn khác"
          >
            <EllipsisVertical className="size-4 shrink-0" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={align}
          side="top"
          className="w-44 rounded-xl border border-border/80 bg-popover p-1.5 shadow-lg z-50"
        >
          {isMe && onRevoke && !message.deletedAt && (
            <DropdownMenuItem
              onClick={handleRevoke}
              className="cursor-pointer gap-2.5 rounded-lg py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <DeleteIcon className="size-4" />
              <span className="font-medium text-xs">{t('chat.revoke', 'Gỡ')}</span>
            </DropdownMenuItem>
          )}

          {/* Tải xuống - only if message has attachment */}
          {attachment && (
            <DropdownMenuItem
              onClick={handleDownload}
              className="cursor-pointer gap-2.5 rounded-lg py-2 focus:bg-muted"
            >
              <DownloadIcon className="size-4" />
              <span className="font-medium text-xs">{t('chat.download', 'Tải xuống')}</span>
            </DropdownMenuItem>
          )}

          {/* Xem trước - if previewable attachment */}
          {canPreview && onPreview && attachment && (
            <DropdownMenuItem
              onClick={handlePreview}
              className="cursor-pointer gap-2.5 rounded-lg py-2 focus:bg-muted"
            >
              <ViewPreviewIcon className="size-4" />
              <span className="font-medium text-xs">{t('chat.preview', 'Xem trước')}</span>
            </DropdownMenuItem>
          )}

          {/* Chuyển tiếp */}
          <DropdownMenuItem
            onClick={handleForward}
            className="cursor-pointer gap-2.5 rounded-lg py-2 focus:bg-muted"
          >
            <ReplyIcon className="size-4" />
            <span className="font-medium text-xs">{t('chat.forward', 'Chuyển tiếp')}</span>
          </DropdownMenuItem>

          {/* Sao chép - only if message has text */}
          {message.text && (
            <DropdownMenuItem
              onClick={handleCopyText}
              className="cursor-pointer gap-2.5 rounded-lg py-2 focus:bg-muted"
            >
              <CopyIcon className="size-4" />
              <span className="font-medium text-xs">{t('chat.copyText', 'Sao chép')}</span>
            </DropdownMenuItem>
          )}

          {/* Ghim */}
          <DropdownMenuItem
            onClick={handlePin}
            className="cursor-pointer gap-2.5 rounded-lg py-2 focus:bg-muted"
          >
            <PinIcon className="size-4" />
            <span className="font-medium text-xs">{t('chat.pin', 'Ghim')}</span>
          </DropdownMenuItem>

          {/* Báo cáo - for received messages */}
          {!isMe && (
            <DropdownMenuItem
              onClick={handleReport}
              className="cursor-pointer gap-2.5 rounded-lg py-2 text-muted-foreground focus:bg-muted focus:text-foreground"
            >
              <FlagIcon className="size-4" />
              <span className="font-medium text-xs">{t('chat.report', 'Báo cáo')}</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function AttachmentActionMenu(props: {
  attachment: MessageAttachmentItem
  onPreview?: (attachment: MessageAttachmentItem) => void
  className?: string
  align?: 'start' | 'end'
}) {
  return (
    <MessageActionPill
      message={{ id: '', fromMe: false, text: '', kind: 'file', time: '', createdAt: '' }}
      attachment={props.attachment}
      isMe={false}
      onPreview={props.onPreview}
      className={props.className}
      align={props.align}
    />
  )
}
