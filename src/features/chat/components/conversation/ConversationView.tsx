import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown01Icon as ArrowDownData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const ArrowDown = createIcon(ArrowDownData)
import type { Conversation, DayGroup } from '../../types/chat.types'
import { ConversationHeader } from './ConversationHeader'
import { MessageList } from './MessageList'
import { MessageComposer } from './MessageComposer'

interface ConversationViewProps {
  conversation: Conversation
  groups: DayGroup[]
  onSend: (text: string) => void
  onBack?: () => void
  showBack: boolean
  isTyping?: boolean
  onTypingStart?: () => void
  onTypingStop?: () => void
}

export function ConversationView({
  conversation,
  groups,
  onSend,
  onBack,
  showBack,
  isTyping,
  onTypingStart,
  onTypingStop,
}: ConversationViewProps) {
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
    <section aria-label={t('chat.conversationWith', { name: conversation.name })} className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col bg-background">
      <ConversationHeader
        conversation={conversation}
        showBack={showBack}
        onBack={onBack}
        isTyping={isTyping}
      />

      {/* Nội dung hội thoại */}
      <div ref={scrollRef} onScroll={handleScroll} className="relative min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6">
        <MessageList groups={groups} senderLabel={conversation.name} />

        {showJump && (
          <button
            type="button"
            onClick={() => scrollToBottom()}
            aria-label={t('chat.jumpToLatest')}
            className="sticky bottom-2 mx-auto flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-brand-ink shadow-md transition-transform duration-150 hover:scale-105"
          >
            <ArrowDown className="size-3.5" aria-hidden="true" />
            {t('chat.newMessages')}
          </button>
        )}
      </div>

      <MessageComposer
        draft={draft}
        onDraftChange={setDraft}
        onSubmit={submit}
        onTypingStart={onTypingStart}
        onTypingStop={onTypingStop}
      />
    </section>
  )
}
