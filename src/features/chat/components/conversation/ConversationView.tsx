import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ArrowDown01Icon as ArrowDownData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const ArrowDown = createIcon(ArrowDownData)
import type { Conversation, DayGroup, MessageAttachmentInput } from '../../types/chat.types'
import { ConversationHeader } from './ConversationHeader'
import { ConversationInfoPanel } from './ConversationInfoPanel'
import { MessageList, type MessageListHandle } from './MessageList'
import { MessageComposer, type PendingFile } from './MessageComposer'
import type { MessageScrollPosition } from '../../utils/messageScrollPosition'

interface ConversationViewProps {
  conversation: Conversation
  isVisible: boolean
  groups: DayGroup[]
  messagesLoading: boolean
  messagesError?: string
  onRetryMessages: () => void
  hasOlderMessages: boolean
  isLoadingOlderMessages: boolean
  isFetchingMessages: boolean
  onLoadOlderMessages: () => Promise<unknown>
  hasNewerMessages: boolean
  isLoadingNewerMessages: boolean
  onLoadNewerMessages: () => Promise<unknown>
  hasLatest: boolean
  onLoadLatest: () => Promise<void>
  onVisibleMessage: (messageId: string) => void
  onRetryMessage: (messageId: string) => void
  restorePosition?: MessageScrollPosition
  onPositionChange: (position: MessageScrollPosition) => void
  onSend: (
    text: string,
    attachments?: MessageAttachmentInput[],
    pendingFiles?: PendingFile[],
  ) => Promise<boolean>
  isSending: boolean
  onBack?: () => void
  showBack: boolean
  isTyping?: boolean
  onTypingStart?: () => void
  onTypingStop?: () => void
  onVoiceCall?: () => void
  onVideoCall?: () => void
  onOpenStory?: () => void
}

export function ConversationView({
  conversation,
  isVisible,
  groups,
  messagesLoading,
  messagesError,
  onRetryMessages,
  hasOlderMessages,
  isLoadingOlderMessages,
  isFetchingMessages,
  onLoadOlderMessages,
  hasNewerMessages,
  isLoadingNewerMessages,
  onLoadNewerMessages,
  hasLatest,
  onLoadLatest,
  onVisibleMessage,
  onRetryMessage,
  restorePosition,
  onPositionChange,
  onSend,
  isSending,
  onBack,
  showBack,
  isTyping,
  onTypingStart,
  onTypingStop,
  onVoiceCall,
  onVideoCall,
  onOpenStory,
}: ConversationViewProps) {
  const { t } = useTranslation()
  const [initialRestorePosition] = useState(restorePosition)
  const [draft, setDraft] = useState('')
  const [isInfoOpen, setIsInfoOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null)
  const setScrollContainerRef = useCallback((element: HTMLDivElement | null) => {
    scrollRef.current = element
    if (element) setScrollElement(element)
  }, [])
  const messageListRef = useRef<MessageListHandle>(null)
  const [showJump, setShowJump] = useState(false)
  const [atBottom, setAtBottom] = useState(initialRestorePosition?.kind !== 'message')
  const [jumpPending, setJumpPending] = useState(false)
  const [jumpReady, setJumpReady] = useState(false)
  const atBottomRef = useRef(initialRestorePosition?.kind !== 'message')
  const olderRequestPending = useRef(false)
  const newerRequestPending = useRef(false)
  const lastUserScrollInput = useRef(0)
  const latestMessage = groups.at(-1)?.messages.at(-1)
  const previousLatestMessageId = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (
      latestMessage?.id &&
      previousLatestMessageId.current &&
      latestMessage.id !== previousLatestMessageId.current &&
      !latestMessage.fromMe
    ) {
      const el = scrollRef.current
      if (el && el.scrollHeight - el.scrollTop - el.clientHeight >= 120) setShowJump(true)
    }
    previousLatestMessageId.current = latestMessage?.id
  }, [latestMessage])

  const scrollToBottom = (smooth = true) => {
    messageListRef.current?.scrollToEnd(smooth ? 'smooth' : 'auto')
  }

  useLayoutEffect(() => {
    if (!jumpReady || !hasLatest) return
    scrollToBottom(false)
    setJumpReady(false)
    setShowJump(false)
    atBottomRef.current = true
    setAtBottom(true)
  }, [jumpReady, hasLatest, groups])

  useLayoutEffect(() => {
    if (isVisible && atBottom && hasLatest) onPositionChange({ kind: 'bottom' })
  }, [isVisible, atBottom, hasLatest, onPositionChange])

  const goToLatest = async () => {
    if (jumpPending) return
    setJumpPending(true)
    try {
      if (!hasLatest) await onLoadLatest()
      setJumpReady(true)
    } catch {
      toast.error(t('chat.messagesLoadError'))
    } finally {
      setJumpPending(false)
    }
  }

  const loadOlderMessages = () => {
    const el = scrollRef.current
    if (
      !el ||
      !hasOlderMessages ||
      isFetchingMessages ||
      olderRequestPending.current ||
      newerRequestPending.current
    )
      return

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
      isFetchingMessages ||
      isLoadingNewerMessages ||
      newerRequestPending.current ||
      olderRequestPending.current
    )
      return
    newerRequestPending.current = true
    void onLoadNewerMessages()
      .catch(() => toast.error(t('chat.messagesLoadError')))
      .finally(() => {
        newerRequestPending.current = false
      })
  }

  const lastScrollTop = useRef(0)
  const noteUserScrollInput = () => {
    lastUserScrollInput.current = Date.now()
  }

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el || !isVisible || el.clientHeight === 0) return
    const previousScrollTop = lastScrollTop.current
    lastScrollTop.current = el.scrollTop
    const scrollingUp = el.scrollTop < previousScrollTop
    const scrollingDown = el.scrollTop > previousScrollTop
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    const userInitiated = Date.now() - lastUserScrollInput.current < 500
    if (!userInitiated && !(nearBottom && hasLatest)) return
    if (nearBottom && hasLatest) onPositionChange({ kind: 'bottom' })
    else {
      const visibleMessage = messageListRef.current?.firstVisibleMessage()
      if (visibleMessage) onPositionChange(visibleMessage)
    }
    setShowJump(!nearBottom)
    if (atBottomRef.current !== nearBottom) {
      atBottomRef.current = nearBottom
      setAtBottom(nearBottom)
    }

    // Tải trước khi còn cách mép ~1.5 màn hình để trang kế tiếp về kịp,
    // tránh khựng khi người dùng cuộn tới cuối lịch sử đã có.
    const edgeThreshold = el.clientHeight * 1.5
    // Chỉ tải lịch sử khi người dùng thực sự cuộn lên. Nếu không, scroll
    // chương trình lúc mở chat (scrollTop = 0 khi nội dung ngắn hơn khung)
    // sẽ kích hoạt tải trang cũ liên tục và giữ viewport ở đầu lịch sử.
    if (userInitiated && scrollingUp && el.scrollTop < edgeThreshold) loadOlderMessages()

    if (
      userInitiated &&
      scrollingDown &&
      el.scrollHeight - el.scrollTop - el.clientHeight < edgeThreshold &&
      hasNewerMessages &&
      !isLoadingNewerMessages
    )
      loadNewerMessages()
  }

  const submit = async (
    text: string,
    attachments?: MessageAttachmentInput[],
    pendingFiles?: PendingFile[],
  ) => {
    if (
      (!text &&
        (!attachments || attachments.length === 0) &&
        (!pendingFiles || pendingFiles.length === 0)) ||
      isSending
    )
      return false
    const sent = await onSend(text, attachments, pendingFiles)
    if (!sent) return false
    // Giữ text người dùng gõ thêm trong lúc tin trước đang gửi.
    setDraft((current) => (current === text ? '' : current))
    await goToLatest()
    return true
  }

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 flex-1 overflow-hidden">
      <section
        aria-label={t('chat.conversationWith', { name: conversation.name })}
        className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-background"
      >
        <ConversationHeader
          conversation={conversation}
          onOpenStory={onOpenStory}
          showBack={showBack}
          onBack={onBack}
          isTyping={isTyping}
          onToggleInfo={() => setIsInfoOpen((prev) => !prev)}
          isInfoOpen={isInfoOpen}
          onVoiceCall={onVoiceCall}
          onVideoCall={onVideoCall}
        />

        {/* Nội dung hội thoại */}
        <div
          ref={setScrollContainerRef}
          onScroll={handleScroll}
          onWheel={noteUserScrollInput}
          onTouchMove={noteUserScrollInput}
          onKeyDown={(event) => {
            if (
              ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)
            )
              noteUserScrollInput()
          }}
          className="relative min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6"
        >
          {!messagesLoading && !messagesError && hasOlderMessages && (
            <div className="py-2 text-center">
              <button
                type="button"
                onClick={loadOlderMessages}
                disabled={isFetchingMessages}
                className="rounded-full px-4 py-2 text-xs font-semibold text-brand-ink hover:bg-muted disabled:opacity-50"
              >
                {isLoadingOlderMessages ? t('chat.pending') : t('chat.loadOlderMessages')}
              </button>
            </div>
          )}
          {messagesLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('chat.pending')}</p>
          ) : messagesError ? (
            <div className="py-6 text-center text-sm">
              <p className="font-semibold text-destructive">{t('chat.messagesLoadError')}</p>
              <p className="mt-1 text-muted-foreground">{messagesError}</p>
              <button
                type="button"
                onClick={onRetryMessages}
                className="mt-3 font-semibold text-brand-ink hover:underline"
              >
                {t('common.retry')}
              </button>
            </div>
          ) : groups.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <span
                className="mb-4 grid size-14 place-items-center rounded-full bg-primary/10 text-brand-ink"
                aria-hidden="true"
              >
                ✓
              </span>
              <h2 className="text-base font-semibold text-foreground">
                {t('chat.newConnectionTitle', { name: conversation.name })}
              </h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {t('chat.newConnectionPrompt')}
              </p>
            </div>
          ) : (
            <MessageList
              ref={messageListRef}
              groups={groups}
              senderLabel={conversation.name}
              senderAvatarUrl={conversation.partnerAvatar}
              scrollRef={scrollRef}
              scrollElement={scrollElement}
              isVisible={isVisible}
              conversationId={conversation.id}
              followBottom={atBottom && hasLatest}
              onVisibleMessage={onVisibleMessage}
              onRetryMessage={onRetryMessage}
              restorePosition={restorePosition ?? initialRestorePosition}
            />
          )}

          {(showJump || (!hasLatest && groups.length > 0)) && (
            <button
              type="button"
              onClick={() => void goToLatest()}
              disabled={jumpPending}
              aria-label={t('chat.jumpToLatest')}
              className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-brand-ink shadow-md transition-transform duration-150 hover:scale-105"
            >
              <ArrowDown className="size-3.5" aria-hidden="true" />
              {t('chat.jumpToLatest')}
            </button>
          )}
        </div>

        <MessageComposer
          draft={draft}
          onDraftChange={setDraft}
          onSubmit={submit}
          disabled={messagesLoading || Boolean(messagesError)}
          isSending={isSending}
          onTypingStart={onTypingStart}
          onTypingStop={onTypingStop}
        />
      </section>

      {isInfoOpen && (
        <ConversationInfoPanel
          conversation={conversation}
          groups={groups}
          onClose={() => setIsInfoOpen(false)}
        />
      )}
    </div>
  )
}
