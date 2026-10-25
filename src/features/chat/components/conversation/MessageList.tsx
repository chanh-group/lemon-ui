import { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  CheckCheckIcon as CheckCheckData,
  CheckIcon as CheckData,
  Download01Icon as DownloadData,
  EyeIcon as ViewPreviewData,
  Film01Icon as FilmData,
  Image01Icon as ImageIconData,
  StickerIcon as StickerData,
} from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const Check = createIcon(CheckData)
const CheckCheck = createIcon(CheckCheckData)
const DownloadIcon = createIcon(DownloadData)
const ViewPreviewIcon = createIcon(ViewPreviewData)
const Film = createIcon(FilmData)
const ImageIcon = createIcon(ImageIconData)
const Sticker = createIcon(StickerData)
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { avatarColor, initials } from '../../data/mockData'
import type { ChatMessage, DayGroup, MessageAttachmentItem } from '../../types/chat.types'
import { isImage, isPreviewable, isVideo } from '../../utils/fileTypes'
import { AttachmentActionMenu } from './AttachmentActionMenu'
import { AttachmentBubble } from './AttachmentBubble'
import { ImageLightboxModal } from './ImageLightboxModal'
import { DocumentPreviewModal } from './DocumentPreviewModal'

// ---------------- logics tách cụm tin ----------------

// Khoảng cách (# phút) tối đa để tin liền cùng người gửi nằm trong 1 cụm (Signal style)
const GROUP_GAP_MIN = 5

export interface MessageGroup {
  fromMe: boolean
  sender?: string
  messages: ChatMessage[]
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0)
}

/** Nhóm tin nhắn liền kề cùng người gửi; tách cụm nếu lệch giờ. */
export function buildMessageGroups(messages: ChatMessage[]): MessageGroup[] {
  const out: MessageGroup[] = []
  for (const msg of messages) {
    const prev = out[out.length - 1]
    if (
      prev &&
      prev.fromMe === msg.fromMe &&
      (msg.fromMe || prev.sender === msg.sender) &&
      toMinutes(msg.time) - toMinutes(prev.messages[prev.messages.length - 1].time) <= GROUP_GAP_MIN
    ) {
      prev.messages.push(msg)
    } else {
      out.push({ fromMe: msg.fromMe, sender: msg.sender, messages: [msg] })
    }
  }
  return out
}

/** Bo góc mỗi bubble theo vị trí first/middle/last trong cụm. */
function bubbleRadius(pos: number, total: number, isMe: boolean, hasMedia: boolean): string {
  if (total === 1) return isMe ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-bl-md'
  if (pos === 0) return isMe ? 'rounded-t-2xl rounded-b-md' : 'rounded-t-2xl rounded-b-md'
  if (pos === total - 1) {
    return isMe ? `rounded-t-md rounded-b-2xl rounded-br-md${hasMedia ? '' : ' rounded-br-sm'}` : 'rounded-t-md rounded-b-2xl rounded-bl-sm'
  }
  return 'rounded-md'
}

// ---------------- UI bubbles ----------------

function MediaIcon({ kind }: { kind: ChatMessage['kind'] }) {
  if (kind === 'gif') return <Film className="size-7" aria-hidden="true" />
  if (kind === 'sticker') return <Sticker className="size-7" aria-hidden="true" />
  return <ImageIcon className="size-7" aria-hidden="true" />
}

function MediaBubble({ label, kind }: { label: string; kind: ChatMessage['kind'] }) {
  const { t } = useTranslation()
  const isGif = kind === 'gif'
  return (
    <span
      className={cn(
        'flex aspect-video w-60 max-w-full flex-col items-center justify-center gap-1.5 rounded-xl text-xs font-medium',
        isGif ? 'bg-foreground text-primary' : 'bg-linear-to-br from-primary via-secondary to-ring text-foreground',
      )}
    >
      <MediaIcon kind={kind} />
      {label || t('chat.attachment')}
    </span>
  )
}

function StoryReplyQuote({ preview, defaultAuthor }: { preview: NonNullable<ChatMessage['storyPreview']>; defaultAuthor: string }) {
  const { t } = useTranslation()
  const author = preview.authorName || defaultAuthor
  return (
    <div className="mb-2 flex items-center gap-2.5 rounded-xl border border-border/80 bg-muted/70 p-2 text-xs shadow-xs">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-primary via-secondary to-ring text-xs font-bold shadow-xs">
        🍋
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="flex items-center gap-1 text-[11px] font-semibold text-brand-ink">
          <span>{t('chat.replyToStory')}</span>
          <span className="font-normal text-muted-foreground">· {author}</span>
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {preview.caption || t('chat.unnamedStory')}
        </p>
      </div>
    </div>
  )
}

function MessageRowView({
  group,
  messageIndex,
  senderLabel,
  onOpenLightbox,
  onOpenDocument,
}: {
  group: MessageGroup
  messageIndex: number
  senderLabel: string
  onOpenLightbox: (attachment: MessageAttachmentItem) => void
  onOpenDocument: (attachment: MessageAttachmentItem) => void
}) {
  const { t } = useTranslation()
  const isMe = group.fromMe
  const total = group.messages.length
  const msg = group.messages[messageIndex]
  const isFirst = messageIndex === 0
  const isLast = messageIndex === total - 1
  const authorName = group.sender ?? senderLabel
  const hasAttachments = Boolean(msg.attachments && msg.attachments.length > 0)
  const firstAttachment = hasAttachments ? msg.attachments![0] : undefined
  const canPreview = firstAttachment ? isPreviewable(firstAttachment.mimeType, firstAttachment.fileName) : false

  const handleQuickDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!firstAttachment) return
    const url = firstAttachment.downloadUrl || firstAttachment.previewUrl
    const a = document.createElement('a')
    a.href = url
    a.download = firstAttachment.fileName || 'download'
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast.success(`${t('chat.downloading', 'Đang tải')} ${firstAttachment.fileName}`)
  }

  const handleQuickPreview = () => {
    if (!firstAttachment) return
    if (isImage(firstAttachment.mimeType, firstAttachment.fileName)) {
      onOpenLightbox(firstAttachment)
    } else {
      onOpenDocument(firstAttachment)
    }
  }

  // Floating Action Bar on hover/hold (like Messenger)
  const actionBar = firstAttachment ? (
    <div className={cn(
      'flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 self-center shrink-0',
      isMe ? 'mr-1.5' : 'ml-1.5'
    )}>
      {/* 3-dot More Options Menu */}
      <AttachmentActionMenu
        attachment={firstAttachment}
        onPreview={handleQuickPreview}
      />
      {/* Quick Download Button */}
      <button
        type="button"
        onClick={handleQuickDownload}
        className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        title={t('chat.download', 'Tải xuống')}
        aria-label={t('chat.download', 'Tải xuống')}
      >
        <DownloadIcon className="size-4" />
      </button>
      {/* Quick Preview Button (if previewable) */}
      {canPreview && (
        <button
          type="button"
          onClick={handleQuickPreview}
          className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title={t('chat.preview', 'Xem trực tiếp')}
          aria-label={t('chat.preview', 'Xem trực tiếp')}
        >
          <ViewPreviewIcon className="size-4" />
        </button>
      )}
    </div>
  ) : null

  return (
    <div
      data-message-id={msg.id}
      className={cn(
        'group msg-in flex w-full items-center',
        isMe ? 'justify-end' : 'justify-start gap-2.5',
        messageIndex > 0 && 'mt-0.5',
      )}
    >
      {!isMe && isLast && (
        <span
          aria-hidden="true"
          className="mt-auto mb-4 grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-bold text-foreground ring-1 ring-border"
          style={{ backgroundColor: avatarColor(authorName) }}
        >
          {initials(authorName)}
        </span>
      )}
      {!isMe && !isLast && <span aria-hidden="true" className="size-7 shrink-0" />}

      {/* Action buttons on the left of bubble for isMe */}
      {isMe && actionBar}

      {/* Single Message Box */}
      <div className={cn('flex max-w-[78%] flex-col sm:max-w-[65%]', isMe ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'w-fit max-w-full text-sm leading-relaxed wrap-break-word whitespace-pre-wrap',
            hasAttachments && !msg.text && (isImage(firstAttachment?.mimeType, firstAttachment?.fileName) || isVideo(firstAttachment?.mimeType, firstAttachment?.fileName))
              ? 'p-0 bg-transparent border-0 shadow-none'
              : cn(
                  'px-3.5 py-2.5',
                  isMe ? 'bg-secondary text-foreground' : 'border border-border bg-card text-foreground shadow-sm',
                  bubbleRadius(messageIndex, total, isMe, msg.kind !== 'text'),
                ),
          )}
        >
          {isFirst && !isMe && group.sender && (
            <span className="mb-1 block text-xs font-bold text-brand-ink">{group.sender}</span>
          )}

          {msg.storyPreview && (
            <StoryReplyQuote preview={msg.storyPreview} defaultAuthor={authorName} />
          )}

          {/* Render Attachments if present (Single Box) */}
          {hasAttachments && (
            <div className="flex flex-col gap-1.5">
              {msg.attachments!.map((att) => (
                <AttachmentBubble
                  key={att.id}
                  attachment={att}
                  onOpenLightbox={onOpenLightbox}
                  onOpenDocument={onOpenDocument}
                  hasCaption={Boolean(msg.text)}
                />
              ))}
            </div>
          )}

          {/* Render Text / Caption if present */}
          {msg.text && (
            <span>{msg.text}</span>
          )}

          {/* Legacy fallback for media without attachments */}
          {!hasAttachments && !msg.storyPreview && msg.kind !== 'text' && (
            <span className="flex flex-col gap-1.5">
              <MediaBubble label={msg.photoLabel ?? t('chat.attachment')} kind={msg.kind} />
              {msg.text && <span>{msg.text}</span>}
            </span>
          )}

          {msg.reactions && msg.reactions.length > 0 && (
            <span className="mt-1.5 flex gap-1" aria-label={t('chat.reactions')}>
              {msg.reactions.map((r) => (
                <span key={r} className="rounded-full border border-border bg-card px-1.5 py-0.5 text-xs shadow-sm">
                  {r}
                </span>
              ))}
            </span>
          )}
        </div>

        {isLast && (
          <span className={cn('mt-1 flex items-center gap-1 px-1 text-[11px] text-muted-foreground', isMe ? 'justify-end' : 'justify-start')}>
            {msg.time}
            {isMe &&
              (msg.status === 'read' ? (
                <CheckCheck className="size-3.5 text-brand-ink" aria-label={t('chat.read')} />
              ) : (
                <Check className="size-3.5" aria-label={t('chat.sent')} />
              ))}
          </span>
        )}
      </div>

      {/* Action buttons on the right of bubble for !isMe */}
      {!isMe && actionBar}
    </div>
  )
}

interface MessageListProps {
  groups: DayGroup[]
  senderLabel: string
  scrollRef: RefObject<HTMLDivElement | null>
}

export interface MessageListHandle {
  scrollToEnd: (behavior?: ScrollBehavior) => void
}

type MessageListRow =
  | { kind: 'date'; key: string; date: string }
  | { kind: 'message'; key: string; group: MessageGroup; messageIndex: number }

export const MessageList = forwardRef<MessageListHandle, MessageListProps>(function MessageList(
  { groups, senderLabel, scrollRef },
  ref,
) {
  'use no memo'

  const didInitialScroll = useRef(false)
  const [lightboxAttachment, setLightboxAttachment] = useState<MessageAttachmentItem | null>(null)
  const [documentAttachment, setDocumentAttachment] = useState<MessageAttachmentItem | null>(null)

  const rows = useMemo(() => {
    const result: MessageListRow[] = []
    for (const day of groups) {
      result.push({ kind: 'date', key: `date:${day.date}`, date: day.date })
      for (const group of buildMessageGroups(day.messages)) {
        group.messages.forEach((_, messageIndex) => {
          const message = group.messages[messageIndex]
          result.push({
            kind: 'message',
            key: message.id,
            group,
            messageIndex,
          })
        })
      }
    }
    return result
  }, [groups])

  // TanStack Virtual exposes an imperative instance; this component opts out of compiler memoization above.
  // eslint-disable-next-line react/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    getItemKey: (index) => rows[index]?.key ?? index,
    estimateSize: (index) => rows[index]?.kind === 'date' ? 48 : 80,
    overscan: 10,
    anchorTo: 'end',
    followOnAppend: true,
    scrollEndThreshold: 120,
  })

  useImperativeHandle(ref, () => ({
    scrollToEnd: (behavior = 'auto') => virtualizer.scrollToEnd({ behavior }),
  }), [virtualizer])

  useLayoutEffect(() => {
    if (rows.length === 0 || didInitialScroll.current) return
    const frame = requestAnimationFrame(() => {
      virtualizer.scrollToEnd({ behavior: 'auto' })
      didInitialScroll.current = true
    })
    return () => cancelAnimationFrame(frame)
  }, [rows.length, virtualizer])

  const virtualRows = virtualizer.getVirtualItems()
  const renderRow = (row: MessageListRow) =>
    row.kind === 'date' ? (
      <div className="flex items-center gap-3 pt-2 pb-3" role="separator" aria-label={row.date}>
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
        <span className="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold text-muted-foreground">
          {row.date}
        </span>
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>
    ) : (
      <MessageRowView
        group={row.group}
        messageIndex={row.messageIndex}
        senderLabel={senderLabel}
        onOpenLightbox={setLightboxAttachment}
        onOpenDocument={setDocumentAttachment}
      />
    )

  return (
    <>
      <div className="relative w-full" style={virtualRows.length ? { height: virtualizer.getTotalSize() } : undefined}>
        {virtualRows.length === 0 && rows.length > 0
          ? rows.map((row) => (
              <div key={row.key} className={row.kind === 'message' && row.messageIndex === row.group.messages.length - 1 ? 'pb-2' : 'pb-0'}>
                {renderRow(row)}
              </div>
            ))
          : virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index]
              return (
                <div
                  key={virtualRow.key}
                  ref={virtualizer.measureElement}
                  data-index={virtualRow.index}
                  className="absolute top-0 left-0 w-full"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <div className={row.kind === 'message' && row.messageIndex === row.group.messages.length - 1 ? 'pb-2' : 'pb-0'}>
                    {renderRow(row)}
                  </div>
                </div>
              )
            })}
      </div>
      <ImageLightboxModal
        attachment={lightboxAttachment}
        onClose={() => setLightboxAttachment(null)}
      />
      <DocumentPreviewModal
        attachment={documentAttachment}
        onClose={() => setDocumentAttachment(null)}
      />
    </>
  )
})
