import { useTranslation } from 'react-i18next'
import { CheckCheckIcon as CheckCheckData, CheckIcon as CheckData, Film01Icon as FilmData, Image01Icon as ImageIconData, StickerIcon as StickerData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const Check = createIcon(CheckData)
const CheckCheck = createIcon(CheckCheckData)
const Film = createIcon(FilmData)
const ImageIcon = createIcon(ImageIconData)
const Sticker = createIcon(StickerData)
import { cn } from '@/lib/utils'
import { avatarColor, initials } from '../../data/mockData'
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

function MessageGroupView({ group, senderLabel }: { group: MessageGroup; senderLabel: string }) {
  const { t } = useTranslation()
  const isMe = group.fromMe
  const total = group.messages.length
  const last = group.messages[total - 1]
  const authorName = group.sender ?? senderLabel
  return (
    <div className={cn('msg-in flex w-full', isMe ? 'justify-end' : 'justify-start gap-2.5')}>
      {!isMe && (
        <span
          aria-hidden="true"
          className="mt-auto mb-4 grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-bold text-foreground ring-1 ring-border"
          style={{ backgroundColor: avatarColor(authorName) }}
        >
          {initials(authorName)}
        </span>
      )}
      <div className={cn('flex max-w-[78%] flex-col sm:max-w-[65%]', isMe ? 'items-end' : 'items-start')}>
        {group.messages.map((msg, i) => {
          const hasMedia = msg.kind !== 'text'
          return (
            <div
              key={msg.id}
              className={cn(
                'w-fit max-w-full px-3.5 py-2 text-sm leading-relaxed wrap-break-word whitespace-pre-wrap',
                i > 0 && total > 1 && 'mt-0.5',
                isMe ? 'bg-secondary text-foreground' : 'border border-border bg-card text-foreground shadow-sm',
                bubbleRadius(i, total, isMe, hasMedia),
              )}
            >
              {i === 0 && !isMe && group.sender && (
                <span className="mb-0.5 block text-xs font-bold text-brand-ink">{group.sender}</span>
              )}
              {msg.storyPreview && (
                <StoryReplyQuote preview={msg.storyPreview} defaultAuthor={authorName} />
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
          )
        })}
        {/* Thời gian + trạng thái chỉ hiển thị ở tin cuối của cụm */}
        <span className={cn('mt-1 flex items-center gap-1 px-1 text-[11px] text-muted-foreground', isMe ? 'justify-end' : 'justify-start')}>
          {last.time}
          {isMe &&
            (last.status === 'read' ? (
              <CheckCheck className="size-3.5 text-brand-ink" aria-label={t('chat.read')} />
            ) : (
              <Check className="size-3.5" aria-label={t('chat.sent')} />
            ))}
        </span>
      </div>
    </div>
  )
}

interface MessageListProps {
  groups: DayGroup[]
  senderLabel: string
}

export function MessageList({ groups, senderLabel }: MessageListProps) {
  return (
    <div className="flex w-full flex-col gap-5">
      {groups.map((group) => (
        <div key={group.date} className="flex flex-col gap-3">
          <div className="flex items-center gap-3" role="separator" aria-label={group.date}>
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
            <span className="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold text-muted-foreground">
              {group.date}
            </span>
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-2">
            {buildMessageGroups(group.messages).map((mg) => (
              <MessageGroupView key={mg.messages[0].id} group={mg} senderLabel={senderLabel} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
