import { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { useVirtualizer } from '@tanstack/react-virtual'
import { CheckCheckIcon as CheckCheckData, CheckIcon as CheckData, Film01Icon as FilmData, Image01Icon as ImageIconData, StickerIcon as StickerData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const Check = createIcon(CheckData)
const CheckCheck = createIcon(CheckCheckData)
const Film = createIcon(FilmData)
const ImageIcon = createIcon(ImageIconData)
const Sticker = createIcon(StickerData)
import { UserAvatar } from '@/components/common/UserAvatar'
import { cn } from '@/lib/utils'
import type { ChatMessage, DayGroup } from '../../types/chat.types'

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

function MessageRowView({
  group,
  messageIndex,
  senderLabel,
  senderAvatarUrl,
}: {
  group: MessageGroup
  messageIndex: number
  senderLabel: string
  senderAvatarUrl?: string | null
}) {
  const { t } = useTranslation()
  const isMe = group.fromMe
  const total = group.messages.length
  const msg = group.messages[messageIndex]
  const isFirst = messageIndex === 0
  const isLast = messageIndex === total - 1
  const authorName = group.sender ?? senderLabel
  return (
    <div
      data-message-id={msg.id}
      className={cn(
        'msg-in flex w-full',
        isMe ? 'justify-end' : 'justify-start gap-2.5',
        messageIndex > 0 && 'mt-0.5',
      )}
    >
      {!isMe && isLast && (
        <UserAvatar
          name={authorName}
          src={senderAvatarUrl}
          className="mt-auto mb-4 size-7"
          fallbackClassName="text-[10px]"
        />
      )}
      {!isMe && !isLast && <span aria-hidden="true" className="size-7 shrink-0" />}
      <div className={cn('flex max-w-[78%] flex-col sm:max-w-[65%]', isMe ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'w-fit max-w-full px-3.5 py-2 text-sm leading-relaxed wrap-break-word whitespace-pre-wrap',
            isMe ? 'bg-secondary text-foreground' : 'border border-border bg-card text-foreground shadow-sm',
            bubbleRadius(messageIndex, total, isMe, msg.kind !== 'text'),
          )}
        >
          {isFirst && !isMe && group.sender && (
            <span className="mb-0.5 block text-xs font-bold text-brand-ink">{group.sender}</span>
          )}
          {msg.kind === 'text' ? (
            msg.text
          ) : (
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
    </div>
  )
}

interface MessageListProps {
  groups: DayGroup[]
  senderLabel: string
  senderAvatarUrl?: string | null
  scrollRef: RefObject<HTMLDivElement | null>
}

export interface MessageListHandle {
  scrollToEnd: (behavior?: ScrollBehavior) => void
}

type MessageListRow =
  | { kind: 'date'; key: string; date: string }
  | { kind: 'message'; key: string; group: MessageGroup; messageIndex: number }

export const MessageList = forwardRef<MessageListHandle, MessageListProps>(function MessageList(
  { groups, senderLabel, senderAvatarUrl, scrollRef },
  ref,
) {
  'use no memo'

  const didInitialScroll = useRef(false)
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
    virtualizer.scrollToEnd()
    didInitialScroll.current = true
  }, [rows.length, virtualizer])

  return (
    <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const row = rows[virtualRow.index]
        return (
          <div
            key={virtualRow.key}
            ref={virtualizer.measureElement}
            data-index={virtualRow.index}
            className="absolute top-0 left-0 w-full"
            style={{ transform: `translateY(${virtualRow.start}px)` }}
          >
            {row.kind === 'date' ? (
              <div className="flex items-center gap-3 pt-2 pb-3" role="separator" aria-label={row.date}>
                <span className="h-px flex-1 bg-border" aria-hidden="true" />
                <span className="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                  {row.date}
                </span>
                <span className="h-px flex-1 bg-border" aria-hidden="true" />
              </div>
            ) : (
              <div className={row.messageIndex === row.group.messages.length - 1 ? 'pb-2' : 'pb-0'}>
                <MessageRowView
                  group={row.group}
                  messageIndex={row.messageIndex}
                  senderLabel={senderLabel}
                  senderAvatarUrl={senderAvatarUrl}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
})
