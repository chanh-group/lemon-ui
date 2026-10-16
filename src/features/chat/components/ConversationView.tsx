import { useEffect, useRef, useState } from 'react'
import { ArrowDown, Check, CheckCheck, ChevronLeft, ImagePlus, Mic, MoreVertical, Paperclip, Phone, Smile, Video } from 'lucide-react'
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

function MediaBubble({ label }: { label: string }) {
  const isGif = label.startsWith('GIF')
  return (
    <span
      className={cn(
        'flex h-36 w-60 flex-col items-center justify-center gap-1.5 rounded-xl text-xs font-medium',
        isGif ? 'bg-[#20271F] text-[#F5E85B]' : 'bg-gradient-to-br from-[#F5E85B] via-[#DDF4A7] to-[#B9D97A] text-[#20271F]',
      )}
    >
      <span className="text-2xl" aria-hidden="true">
        {label.startsWith('Ảnh') ? '🍋' : isGif ? '🎞️' : '⭐'}
      </span>
      {label}
    </span>
  )
}

function MessageBubble({ msg, showSender }: { msg: ChatMessage; showSender: boolean }) {
  const isMe = msg.fromMe
  return (
    <div className={cn('msg-in flex w-full', isMe ? 'justify-end' : 'justify-start')}>
      <div className={cn('flex max-w-[78%] flex-col sm:max-w-[65%]', isMe ? 'items-end' : 'items-start')}>
        {showSender && msg.sender && (
          <span className="mb-1 ml-1 text-xs font-bold text-[#3D7A36]">{msg.sender}</span>
        )}
        <div
          className={cn(
            'px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap',
            isMe
              ? 'rounded-2xl rounded-br-md bg-[#DDF4A7] text-[#20271F]'
              : 'rounded-2xl rounded-bl-md border border-[#E7EBDD] bg-white text-[#20271F] shadow-[0_1px_2px_rgba(32,39,31,0.05)]',
          )}
        >
          {msg.kind === 'text' ? (
            msg.text
          ) : (
            <span className="flex flex-col gap-1.5">
              <MediaBubble label={msg.photoLabel ?? 'Tệp đính kèm'} />
              {msg.text && <span>{msg.text}</span>}
            </span>
          )}
          {msg.reactions && msg.reactions.length > 0 && (
            <span className="mt-1.5 flex gap-1" aria-label="Biểu cảm">
              {msg.reactions.map((r) => (
                <span key={r} className="rounded-full border border-[#E7EBDD] bg-white px-1.5 py-0.5 text-xs shadow-sm">
                  {r}
                </span>
              ))}
            </span>
          )}
        </div>
        <span className="mt-1 flex items-center gap-1 px-1 text-[11px] text-[#788074]">
          {msg.time}
          {isMe &&
            (msg.status === 'read' ? (
              <CheckCheck className="size-3.5 text-[#3D7A36]" aria-label="Đã đọc" />
            ) : (
              <Check className="size-3.5" aria-label="Đã gửi" />
            ))}
        </span>
      </div>
    </div>
  )
}

export function ConversationView({ conversation, groups, onSend, onBack, showBack }: ConversationViewProps) {
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
    <section aria-label={`Hội thoại với ${conversation.name}`} className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#FAFBF5]">
      {/* Header hội thoại */}
      <header className="flex shrink-0 items-center gap-3 border-b border-[#E7EBDD] bg-white/95 px-3 py-2.5 backdrop-blur sm:px-5">
        {showBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Quay lại danh sách"
            className="grid size-9 shrink-0 place-items-center rounded-xl text-[#20271F] transition-colors hover:bg-[#F2F5E6] md:hidden"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
        )}
        <span className="relative shrink-0">
          <span
            aria-hidden="true"
            className="grid size-10 place-items-center rounded-full text-[13px] font-bold text-[#20271F] ring-1 ring-[#E7EBDD]"
            style={{ backgroundColor: avatarColor(conversation.name) }}
          >
            {initials(conversation.name)}
          </span>
          {conversation.online && (
            <span className="absolute right-0 bottom-0 size-2.5 rounded-full bg-[#3D7A36] ring-2 ring-white" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-bold text-[#20271F]">{conversation.name}</h2>
          <p className="truncate text-xs text-[#788074]">
            {conversation.isGroup ? conversation.members : (conversation.lastActive ?? 'Ngoại tuyến')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {[
            { label: 'Gọi thoại', icon: Phone },
            { label: 'Gọi video', icon: Video },
            { label: 'Tùy chọn khác', icon: MoreVertical },
          ].map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              title={label}
              className="chat-icon-btn grid size-9 place-items-center rounded-xl text-[#3D7A36] transition-all duration-150 hover:bg-[#EFF5D8] active:scale-95"
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
                <span className="h-px flex-1 bg-[#E7EBDD]" aria-hidden="true" />
                <span className="rounded-full border border-[#E7EBDD] bg-white px-3 py-1 text-[11px] font-semibold text-[#788074]">
                  {group.date}
                </span>
                <span className="h-px flex-1 bg-[#E7EBDD]" aria-hidden="true" />
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
            aria-label="Cuộn xuống tin nhắn mới nhất"
            className="sticky bottom-2 mx-auto flex items-center gap-1.5 rounded-full border border-[#E7EBDD] bg-white px-3 py-1.5 text-xs font-semibold text-[#3D7A36] shadow-md transition-transform duration-150 hover:scale-105"
          >
            <ArrowDown className="size-3.5" aria-hidden="true" />
            Tin nhắn mới
          </button>
        )}
      </div>

      {/* Thanh soạn tin */}
      <footer className="shrink-0 border-t border-[#E7EBDD] bg-white px-3 pt-2.5 pb-3 sm:px-5">
        <div className="mx-auto flex max-w-3xl items-end gap-1.5">
          <div className="flex shrink-0 items-center">
            {[
              { label: 'Chọn emoji', icon: Smile },
              { label: 'Đính kèm tệp', icon: Paperclip },
              { label: 'Gửi ảnh', icon: ImagePlus },
            ].map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                title={label}
                className="chat-icon-btn grid size-9 place-items-center rounded-xl text-[#788074] transition-all duration-150 hover:bg-[#F2F5E6] hover:text-[#3D7A36] active:scale-95"
              >
                <Icon className="size-5" aria-hidden="true" />
              </button>
            ))}
          </div>
          <label className="chat-composer flex min-h-11 flex-1 items-center gap-2 rounded-full border border-[#E7EBDD] bg-[#FAFBF5] px-4 py-2 transition-all duration-150 focus-within:border-[#3D7A36] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(61,122,54,0.12)]">
            <span className="sr-only">Soạn tin nhắn</span>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submit()
                }
              }}
              placeholder={`Nhắn tin cho ${conversation.name}…`}
              aria-label={`Nhắn tin cho ${conversation.name}`}
              className="w-full bg-transparent text-sm text-[#20271F] outline-none placeholder:text-[#788074]"
            />
            <Mic className="size-4 shrink-0 text-[#788074]" aria-hidden="true" />
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={!draft.trim()}
            aria-label="Gửi tin nhắn"
            title="Gửi tin nhắn"
            className="chat-send grid size-11 shrink-0 place-items-center rounded-full bg-[#3D7A36] text-white shadow-[0_4px_12px_rgba(61,122,54,0.35)] transition-all duration-150 hover:bg-[#2F6130] hover:shadow-[0_6px_16px_rgba(61,122,54,0.4)] active:scale-90 disabled:cursor-not-allowed disabled:bg-[#C9CFC0] disabled:shadow-none"
          >
            <svg viewBox="0 0 24 24" className="size-5 -translate-x-[1px]" fill="currentColor" aria-hidden="true">
              <path d="M3.4 20.4 21.5 12 3.4 3.6l2.6 7.1 9.3 1.3-9.3 1.3-2.6 7.1Z" />
            </svg>
          </button>
        </div>
        <p className="mx-auto mt-1.5 max-w-3xl px-1 text-[11px] text-[#788074]">
          Nhấn Enter để gửi · LemonChat mã hóa đầu cuối các cuộc trò chuyện của bạn
        </p>
      </footer>
    </section>
  )
}
