import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, Check, CheckCheck, ChevronLeft, Film, Image as ImageIcon, ImagePlus, Mic, MoreVertical, Paperclip, Phone, Smile, Sticker, Video } from 'lucide-react'
import { cn } from '@/lib/utils'
import { avatarColor, initials } from '../data/mockData'
import type { ChatMessage, Conversation, DayGroup } from '../types'

interface ConversationViewProps {
  conversation: Conversation
  groups: DayGroup[]
  onSend: (text: string) => void
  onBack?: () => void
  showBack: boolean
}

function MediaIcon({ label, kind }: { label: string; kind: ChatMessage['kind'] }) {
  if (kind === 'gif' || label.startsWith('GIF')) return <Film className="size-7" aria-hidden="true" />
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
        isGif ? 'bg-foreground text-primary' : 'bg-gradient-to-br from-primary via-secondary to-[var(--ring)] text-foreground',
      )}
    >
      <MediaIcon label={label} kind={kind} />
      {label || t('chat.attachment')}
    </span>
  )
}

function MessageBubble({ msg, showSender }: { msg: ChatMessage; showSender: boolean }) {
  const { t } = useTranslation()
  const isMe = msg.fromMe
  return (
    <div className={cn('msg-in flex w-full', isMe ? 'justify-end' : 'justify-start')}>
      <div className={cn('flex max-w-[78%] flex-col sm:max-w-[65%]', isMe ? 'items-end' : 'items-start')}>
        {showSender && msg.sender && (
          <span className="mb-1 ml-1 text-xs font-bold text-[var(--brand-ink)]">{msg.sender}</span>
        )}
        <div
          className={cn(
            'px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap',
            isMe
              ? 'rounded-2xl rounded-br-md bg-secondary text-foreground'
              : 'rounded-2xl rounded-bl-md border border-border bg-card text-foreground shadow-sm',
          )}
        >
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
        <span className="mt-1 flex items-center gap-1 px-1 text-[11px] text-muted-foreground">
          {msg.time}
          {isMe &&
            (msg.status === 'read' ? (
              <CheckCheck className="size-3.5 text-[var(--brand-ink)]" aria-label={t('chat.read')} />
            ) : (
              <Check className="size-3.5" aria-label={t('chat.sent')} />
            ))}
        </span>
      </div>
    </div>
  )
}

export function ConversationView({ conversation, groups, onSend, onBack, showBack }: ConversationViewProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [stickToBottom, setStickToBottom] = useState(true)
  const [showJump, setShowJump] = useState(false)
  const totalMessages = groups.reduce((n, g) => n + g.messages.length, 0)

  const scrollToBottom = (smooth = true) => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }

  // Chỉ tự cuộn khi người dùng đang ở gần cuối — không giật khi đọc tin cũ.
  useEffect(() => {
    if (stickToBottom) scrollToBottom(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalMessages, conversation.id])

  useEffect(() => {
    setStickToBottom(true)
    setShowJump(false)
    setDraft('')
  }, [conversation.id])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    setStickToBottom(nearBottom)
    setShowJump(!nearBottom)
  }

  const submit = () => {
    const text = draft.trim()
    if (!text) return
    onSend(text)
    setDraft('')
    setStickToBottom(true)
  }

  return (
    <section aria-label={t('chat.conversationWith', { name: conversation.name })} className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted">
      {/* Header hội thoại */}
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card/95 px-3 py-2.5 backdrop-blur sm:px-5">
        {showBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label={t('chat.backToList')}
            className="grid size-11 min-h-11 min-w-11 shrink-0 place-items-center rounded-xl text-foreground transition-colors hover:bg-muted md:hidden"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
        )}
        <span className="relative shrink-0">
          <span
            aria-hidden="true"
            className="grid size-10 place-items-center rounded-full text-[13px] font-bold text-foreground ring-1 ring-border"
            style={{ backgroundColor: avatarColor(conversation.name) }}
          >
            {initials(conversation.name)}
          </span>
          {conversation.online && (
            <span className="absolute right-0 bottom-0 size-2.5 rounded-full bg-[var(--success)] ring-2 ring-card" title={t('chat.online')} aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-bold text-foreground">{conversation.name}</h2>
          <p className="truncate text-xs text-muted-foreground">
            {conversation.isGroup ? conversation.members : (conversation.lastActive ?? t('chat.offline'))}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {[
            { label: t('chat.voiceCall'), icon: Phone },
            { label: t('chat.videoCall'), icon: Video },
            { label: t('chat.moreOptions'), icon: MoreVertical },
          ].map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              title={label}
              className="chat-icon-btn grid size-11 min-h-11 min-w-11 place-items-center rounded-xl text-[var(--brand-ink)] transition-all duration-150 hover:bg-muted active:scale-95"
            >
              <Icon className="size-[18px]" aria-hidden="true" />
            </button>
          ))}
        </div>
      </header>

      {/* Nội dung hội thoại */}
      <div ref={scrollRef} onScroll={handleScroll} className="relative min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {groups.map((group) => (
            <div key={group.date} className="flex flex-col gap-3">
              <div className="flex items-center gap-3" role="separator" aria-label={group.date}>
                <span className="h-px flex-1 bg-border" aria-hidden="true" />
                <span className="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                  {group.date}
                </span>
                <span className="h-px flex-1 bg-border" aria-hidden="true" />
              </div>
              {group.messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} showSender={!msg.fromMe && Boolean(msg.sender)} />
              ))}
            </div>
          ))}
        </div>

        {showJump && (
          <button
            type="button"
            onClick={() => scrollToBottom()}
            aria-label={t('chat.jumpToLatest')}
            className="sticky bottom-2 mx-auto flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-[var(--brand-ink)] shadow-md transition-transform duration-150 hover:scale-105"
          >
            <ArrowDown className="size-3.5" aria-hidden="true" />
            {t('chat.newMessages')}
          </button>
        )}
      </div>

      {/* Thanh soạn tin */}
      <footer className="shrink-0 border-t border-border bg-card px-3 pt-2.5 pb-3 sm:px-5">
        <div className="mx-auto flex max-w-3xl items-end gap-1.5">
          <div className="flex shrink-0 items-center">
            {[
              { label: t('chat.chooseEmoji'), icon: Smile },
              { label: t('chat.attachFile'), icon: Paperclip },
              { label: t('chat.sendPhoto'), icon: ImagePlus },
            ].map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                title={label}
                className="chat-icon-btn grid size-11 min-h-11 min-w-11 place-items-center rounded-xl text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-[var(--brand-ink)] active:scale-95"
              >
                <Icon className="size-5" aria-hidden="true" />
              </button>
            ))}
          </div>
          <label className="chat-composer flex min-h-11 flex-1 items-center gap-2 rounded-full border border-border bg-muted px-4 py-2 transition-all duration-150 focus-within:border-[var(--ring)] focus-within:bg-card">
            <span className="sr-only">{t('chat.composeLabel')}</span>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submit()
                }
              }}
              placeholder={t('chat.composeHint', { name: conversation.name })}
              aria-label={t('chat.composeHint', { name: conversation.name })}
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <Mic className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={!draft.trim()}
            aria-label={t('chat.sendMessage')}
            title={t('chat.sendMessage')}
            className="chat-send grid size-11 min-h-11 min-w-11 shrink-0 place-items-center rounded-full bg-[var(--brand-ink)] text-primary-foreground shadow-md transition-all duration-150 hover:shadow-lg active:scale-90 disabled:cursor-not-allowed disabled:bg-muted disabled:shadow-none"
          >
            <svg viewBox="0 0 24 24" className="size-5 -translate-x-[1px]" fill="currentColor" aria-hidden="true">
              <path d="M3.4 20.4 21.5 12 3.4 3.6l2.6 7.1 9.3 1.3-9.3 1.3-2.6 7.1Z" />
            </svg>
          </button>
        </div>
        <p className="mx-auto mt-1.5 max-w-3xl px-1 text-[11px] text-muted-foreground">
          {t('chat.enterToSend')}
        </p>
      </footer>
    </section>
  )
}
