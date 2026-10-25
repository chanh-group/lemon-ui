import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ArrowDown01Icon as ArrowDownData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const ArrowDown = createIcon(ArrowDownData)
import type { Conversation, DayGroup } from '../../types/chat.types'
import { ConversationHeader } from './ConversationHeader'
import { MessageList, type MessageListHandle } from './MessageList'
import { MessageComposer } from './MessageComposer'

interface ConversationViewProps {
  conversation: Conversation
  groups: DayGroup[]
  messagesLoading: boolean
  messagesError?: string
  onRetryMessages: () => void
  hasOlderMessages: boolean
  isLoadingOlderMessages: boolean
  onLoadOlderMessages: () => Promise<unknown>
  hasNewerMessages: boolean
  isLoadingNewerMessages: boolean
  onLoadNewerMessages: () => Promise<unknown>
  onSend: (text: string) => Promise<boolean>
  isSending: boolean
  onBack?: () => void
  showBack: boolean
  isTyping?: boolean
  onTypingStart?: () => void
  onTypingStop?: () => void
}

export function ConversationView({
  conversation,
  groups,
  messagesLoading,
  messagesError,
  onRetryMessages,
  hasOlderMessages,
  isLoadingOlderMessages,
  onLoadOlderMessages,
  hasNewerMessages,
  isLoadingNewerMessages,
  onLoadNewerMessages,
  onSend,
  isSending,
  onBack,
  showBack,
  isTyping,
  onTypingStart,
  onTypingStop,
}: ConversationViewProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const messageListRef = useRef<MessageListHandle>(null)
  const [showJump, setShowJump] = useState(false)
  const olderRequestPending = useRef(false)
  const newerRequestPending = useRef(false)

  const scrollToBottom = (smooth = true) => {
    messageListRef.current?.scrollToEnd(smooth ? 'smooth' : 'auto')
  }

  const loadOlderMessages = () => {
    const el = scrollRef.current
    if (!el || !hasOlderMessages || isLoadingOlderMessages || olderRequestPending.current) return

    olderRequestPending.current = true
    void onLoadOlderMessages()
      .catch(() => toast.error(t('chat.messagesLoadError')))
      .finally(() => {
        olderRequestPending.current = false
      })
  }

  const loadNewerMessages = () => {
    if (
      !hasNewerMessages ||
      isLoadingNewerMessages ||
      newerRequestPending.current ||
      olderRequestPending.current
    ) return
    newerRequestPending.current = true
    void onLoadNewerMessages()
      .catch(() => toast.error(t('chat.messagesLoadError')))
      .finally(() => {
        newerRequestPending.current = false
      })
  }

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    setShowJump(!nearBottom)

    if (el.scrollTop < 250) loadOlderMessages()

    if (
      el.scrollHeight - el.scrollTop - el.clientHeight < 250 &&
      hasNewerMessages &&
      !isLoadingNewerMessages
    ) loadNewerMessages()
  }

  const submit = async () => {
    const text = draft.trim()
    if (!text || isSending) return
    const sent = await onSend(text)
    if (!sent) return
    setDraft('')
    setShowJump(false)
    scrollToBottom()
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
        {messagesLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t('chat.pending')}</p>
        ) : messagesError ? (
          <div className="py-6 text-center text-sm">
            <p className="font-semibold text-destructive">{t('chat.messagesLoadError')}</p>
            <p className="mt-1 text-muted-foreground">{messagesError}</p>
            <button type="button" onClick={onRetryMessages} className="mt-3 font-semibold text-brand-ink hover:underline">
              {t('common.retry')}
            </button>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <span className="mb-4 grid size-14 place-items-center rounded-full bg-primary/10 text-brand-ink" aria-hidden="true">
              ✓
            </span>
            <h2 className="text-base font-semibold text-foreground">
              {t('chat.newConnectionTitle', { name: conversation.name })}
            </h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">{t('chat.newConnectionPrompt')}</p>
          </div>
        ) : (
          <MessageList
            ref={messageListRef}
            groups={groups}
            senderLabel={conversation.name}
            senderAvatarUrl={conversation.partnerAvatar}
            scrollRef={scrollRef}
          />
        )}

        {showJump && (
          <button
            type="button"
            onClick={() => scrollToBottom()}
            aria-label={t('chat.jumpToLatest')}
            className="absolute right-4 bottom-2 flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-brand-ink shadow-md transition-transform duration-150 hover:scale-105"
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
        disabled={isSending || messagesLoading || Boolean(messagesError)}
        onTypingStart={onTypingStart}
        onTypingStop={onTypingStop}
      />
    </section>
  )
}
