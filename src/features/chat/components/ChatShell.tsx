import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BrandMark } from '@/components/common/BrandMark'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { conversationPath, ROUTES } from '@/config/constants'
import { emitTypingStart, emitTypingStop } from '@/lib/socket'
import { MOCK_CALLS } from '../data/mockData'
import type {
  ChatTab,
  MessageAttachmentInput,
  MessageResponse,
  StoryEntry,
} from '../types/chat.types'
import {
  useConversationsQuery,
  useConversationMessagesQuery,
  useConversationQuery,
  useMarkReadMutation,
  useSendMessageMutation,
  type SendMessagePendingFile,
} from '../hooks/useChatQueries'
import { useChatRealtime } from '../hooks/useChatRealtime'
import { useStoriesList } from '../hooks/useStories'
import { buildDayGroupsFromMessages, mapMessageResponse } from '../utils/chat.mapper'
import { SideNav } from './SideNav'
import { MiddlePanel } from './MiddlePanel'
import { ConversationView } from './conversation'
import { StoryViewer } from './StoryViewer'
import { useAuth } from '@/features/auth/api'

const TYPING_HEARTBEAT_MS = 1_500

export function visibleLiveMessages(
  timeline: MessageResponse[],
  live: MessageResponse[],
  hasLatest: boolean,
): MessageResponse[] {
  if (!hasLatest) return []
  if (timeline.length === 0) return live
  const compare = (a: MessageResponse, b: MessageResponse) =>
    Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id)
  const oldest = timeline.reduce((a, b) => (compare(a, b) <= 0 ? a : b))
  return live.filter(
    (message) =>
      message.id.startsWith('temp-') ||
      compare(message, oldest) >= 0,
  )
}

export function ChatShell() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { conversationId } = useParams<{ conversationId: string }>()

  // Hội thoại đang mở được lấy từ URL để F5/reload không mất màn chat.
  const selectedId = conversationId ?? null
  const initialTab = (location.state as { tab?: ChatTab } | null)?.tab ?? 'messages'
  const legacySelect = (location.state as { select?: string } | null)?.select ?? null
  const isMdDown = useMediaQuery('(max-width: 48rem)') // Breakpoint md của Tailwind (768px)
  const [tab, setTab] = useState<ChatTab>(initialTab)
  const [query, setQuery] = useState('')
  const [viewingStory, setViewingStory] = useState<StoryEntry | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const todayLabel = t('chat.today')

  // Tương thích với các entry cũ còn truyền `state.select` — chuyển sang URL.
  useEffect(() => {
    if (!selectedId && legacySelect) {
      navigate(conversationPath(legacySelect), { replace: true, state: { tab } })
    }
  }, [legacySelect, navigate, selectedId, tab])

  // Realtime Socket.IO sync
  const { isPartnerTyping, connectionStatus } = useChatRealtime(selectedId)

  // API Queries & Mutations
  const conversationsQuery = useConversationsQuery()
  const messagesQuery = useConversationMessagesQuery(selectedId)
  const sendMessageMutation = useSendMessageMutation(selectedId)
  const markReadMutation = useMarkReadMutation()
  const lastTypingSentAt = useRef(0)
  const lastReadAttempt = useRef<string | null>(null)
  const [scrollPositions, setScrollPositions] = useState<Record<string, string | undefined>>({})

  const rawConversations = useMemo(() => conversationsQuery.data ?? [], [conversationsQuery.data])

  const q = query.trim().toLowerCase()
  const conversations = useMemo(
    () =>
      rawConversations.filter(
        (c) => !q || c.name.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q),
      ),
    [rawConversations, q],
  )

  const calls = useMemo(() => MOCK_CALLS.filter((c) => !q || c.name.toLowerCase().includes(q)), [q])

  const storiesQuery = useStoriesList(user?.id)
  useEffect(() => {
    if (storiesQuery.isError) {
      toast.error(
        storiesQuery.error instanceof Error
          ? storiesQuery.error.message
          : t('chat.storiesLoadError'),
      )
    }
  }, [storiesQuery.isError, storiesQuery.error, t])
  const allStories = useMemo(() => storiesQuery.data ?? [], [storiesQuery.data])
  const stories = useMemo(
    () => allStories.filter((s) => !q || s.name.toLowerCase().includes(q)),
    [allStories, q],
  )

  const totalUnread = useMemo(
    () => rawConversations.reduce((n, c) => n + (c.unread || 0), 0),
    [rawConversations],
  )

  // Tìm trong danh sách chưa lọc: gõ ô tìm kiếm không được làm viewer đang mở biến mất.
  const currentStory =
    tab === 'stories' && viewingStory
      ? (allStories.find((item) => item.id === viewingStory.id) ?? null)
      : null

  // Fallback khi URL trỏ tới hội thoại không có trong trang inbox đầu tiên.
  const selectedFromList = rawConversations.find((c) => c.id === selectedId) ?? null
  const needsConversationDetail =
    Boolean(selectedId) && !selectedFromList && !conversationsQuery.isPending
  const conversationDetailQuery = useConversationQuery(selectedId, needsConversationDetail)
  const selected = selectedFromList ?? conversationDetailQuery.data ?? null

  const restoringConversation =
    Boolean(selectedId) &&
    !selected &&
    (conversationsQuery.isPending || conversationDetailQuery.isPending)
  const restoreFailed =
    Boolean(selectedId) &&
    !selected &&
    !restoringConversation &&
    (conversationsQuery.isError || conversationDetailQuery.isError)
  const restoreListError = conversationsQuery.isError && !conversationDetailQuery.isSuccess

  const messageItems = useMemo(() => {
    const timeline = messagesQuery.data?.pages.flatMap((page) => page.items) ?? []
    const messages = [
      ...timeline,
      ...visibleLiveMessages(timeline, messagesQuery.liveMessages ?? [], messagesQuery.hasLatest),
    ]
    const uniqueMap = new Map<string, MessageResponse>()
    for (const msg of messages) {
      const key = msg.clientMsgId ? `client-${msg.clientMsgId}` : msg.id
      const existing = uniqueMap.get(key)
      if (!existing || (existing.id.startsWith('temp-') && !msg.id.startsWith('temp-'))) {
        uniqueMap.set(key, msg)
      }
    }
    return [...uniqueMap.values()].sort(
      (left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt) || left.id.localeCompare(right.id),
    )
  }, [messagesQuery.data, messagesQuery.liveMessages, messagesQuery.hasLatest])

  // API trả từng trang mới nhất trước; UI cần timeline cũ đến mới.
  const groups = useMemo(() => {
    if (!selected || !messageItems) return []
    const chatMsgs = messageItems.map((m) => mapMessageResponse(m, user?.id))
    return buildDayGroupsFromMessages(chatMsgs, todayLabel)
  }, [selected, messageItems, user?.id, todayLabel])

  const handleSelect = (id: string) => {
    setTab('messages')
    setQuery('')
    navigate(conversationPath(id))
  }

  const markVisibleMessageRead = (messageId: string) => {
    if (!selectedId) return
    const attempt = `${selectedId}:${messageId}`
    if (lastReadAttempt.current === attempt) return
    lastReadAttempt.current = attempt
    markReadMutation.mutate(
      { conversationId: selectedId, lastReadMessageId: messageId },
      { onError: () => { if (lastReadAttempt.current === attempt) lastReadAttempt.current = null } },
    )
  }

  const handleSend = async (
    text: string,
    attachments?: MessageAttachmentInput[],
    pendingFiles?: SendMessagePendingFile[],
  ): Promise<boolean> => {
    if (!selectedId) return false
    try {
      handleTypingStop()
      await sendMessageMutation.mutateAsync({
        body: text,
        attachments,
        pendingFiles,
      })
      return true
    } catch {
      return false
    }
  }

  const handleTypingStart = () => {
    if (!selectedId) return
    const now = Date.now()
    if (now - lastTypingSentAt.current < TYPING_HEARTBEAT_MS) return
    lastTypingSentAt.current = now
    emitTypingStart(selectedId)
  }

  const handleTypingStop = () => {
    if (!selectedId) return
    lastTypingSentAt.current = 0
    emitTypingStop(selectedId)
  }

  const userName = user?.fullName ?? user?.username ?? 'Lemon User'

  return (
    <main
      className={cn(
        'flex h-dvh w-full overflow-hidden bg-background text-foreground md:pb-0',
        !selectedId && 'pb-16',
      )}
    >
      {connectionStatus !== 'connected' && (
        <div
          className="fixed right-3 top-3 z-50 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground shadow-md"
          role="status"
          aria-live="polite"
        >
          {connectionStatus === 'connecting'
            ? t('chat.realtimeConnecting')
            : t('chat.realtimeOffline')}
        </div>
      )}
      <SideNav
        active={tab}
        onChange={(nextTab) => {
          setTab(nextTab)
          setQuery('')
          if (nextTab === 'stories' && !viewingStory && stories.length > 0) {
            setViewingStory(stories[0])
          }
          // Desktop giữ hội thoại đang mở trên URL; mobile quay về danh sách.
          const targetPath =
            !isMdDown && selectedId ? conversationPath(selectedId) : ROUTES.messages
          navigate(targetPath, { replace: true, state: { tab: nextTab } })
        }}
        totalUnread={totalUnread}
        onOpenSettings={() => navigate(ROUTES.settings)}
        settingsActive={false}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        mobileBarVisible={!selectedId}
      />

      {/* Panel B — danh sách (tin nhắn / cuộc gọi / story) */}
      <div
        className={cn(
          selectedId || (tab === 'stories' && currentStory)
            ? 'hidden h-full min-h-0 md:flex md:h-full md:min-w-0'
            : 'flex h-full min-h-0 min-w-0 flex-1 md:flex-none',
          !sidebarOpen && 'hidden md:hidden',
        )}
      >
        <MiddlePanel
          tab={tab}
          conversations={conversations}
          conversationsLoading={conversationsQuery.isPending}
          conversationsError={conversationsQuery.error?.message}
          onRetryConversations={() => {
            void conversationsQuery.refetch()
          }}
          calls={calls}
          stories={stories}
          selectedId={selectedId}
          activeStoryId={tab === 'stories' ? currentStory?.id : null}
          query={query}
          onQuery={setQuery}
          onSelectConversation={handleSelect}
          onOpenStory={(s) => setViewingStory(s)}
          onCall={() => navigate(ROUTES.calls)}
          onNewCall={() => navigate(ROUTES.newCall)}
          onNewChat={() => navigate(ROUTES.newChat)}
        />
      </div>

      {/* Panel C — Hội thoại hoặc Story Viewer trực tiếp trên màn hình chính */}
      <div
        className={
          selectedId || (tab === 'stories' && currentStory)
            ? 'flex h-full min-h-0 w-full min-w-0 flex-1'
            : 'hidden h-full min-h-0 w-full min-w-0 flex-1 md:flex'
        }
      >
        {tab === 'stories' ? (
          currentStory ? (
            <StoryViewer
              key={currentStory.id}
              story={currentStory}
              stories={allStories}
              embedded={true}
              onSelectStory={setViewingStory}
              onClose={() => setViewingStory(null)}
            />
          ) : (
            <section
              className="hidden h-full min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 bg-background p-8 text-center md:flex"
              aria-label="Chọn tin để xem"
            >
              <span className="grid size-20 place-items-center rounded-[28px] bg-primary/20 text-primary shadow-md">
                <BrandMark animated className="size-12" />
              </span>
              <div>
                <h2 className="text-lg font-bold">Chọn một tin để xem</h2>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                  Chọn tin của bạn bè ở danh sách bên trái để xem nội dung và tương tác.
                </p>
              </div>
            </section>
          )
        ) : selected ? (
          <ConversationView
            key={selected.id}
            conversation={selected}
            groups={groups}
            messagesLoading={messagesQuery.isPending}
            messagesError={
              messagesQuery.isError && !messagesQuery.data ? messagesQuery.error.message : undefined
            }
            onRetryMessages={() => {
              void messagesQuery.refetch()
            }}
            hasOlderMessages={Boolean(messagesQuery.hasNextPage)}
            isLoadingOlderMessages={messagesQuery.isFetchingNextPage}
            onLoadOlderMessages={async () => {
              const result = await messagesQuery.fetchNextPage()
              if (result.isError) throw result.error
            }}
            hasNewerMessages={Boolean(messagesQuery.hasPreviousPage)}
            hasLatest={messagesQuery.hasLatest}
            onLoadLatest={messagesQuery.loadLatest}
            onVisibleMessage={markVisibleMessageRead}
            restoreMessageId={
              !selected.unread && messageItems.some((message) => message.id === scrollPositions[selected.id])
                ? scrollPositions[selected.id]
                : undefined
            }
            onPositionChange={(messageId) => {
              setScrollPositions((positions) =>
                positions[selected.id] === messageId ? positions : { ...positions, [selected.id]: messageId },
              )
            }}
            isLoadingNewerMessages={messagesQuery.isFetchingPreviousPage}
            onLoadNewerMessages={async () => {
              const result = await messagesQuery.fetchPreviousPage()
              if (result.isError) throw result.error
            }}
            onSend={handleSend}
            isSending={sendMessageMutation.isPending}
            showBack
            onBack={() => navigate(ROUTES.messages, { state: { tab } })}
            isTyping={isPartnerTyping}
            onTypingStart={handleTypingStart}
            onTypingStop={handleTypingStop}
          />
        ) : selectedId ? (
          <section
            className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center gap-3 bg-background p-8 text-center"
            aria-busy={restoringConversation}
            aria-label={t('chat.loadingConversation')}
          >
            {restoringConversation ? (
              <>
                <span
                  className="size-8 animate-spin rounded-full border-2 border-border border-t-brand-ink"
                  aria-hidden="true"
                />
                <p className="text-sm text-muted-foreground">{t('chat.loadingConversation')}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-foreground">
                  {restoreListError
                    ? t('chat.conversationsLoadError')
                    : t('chat.conversationNotFound')}
                </p>
                <div className="flex items-center gap-2">
                  {restoreFailed && (
                    <button
                      type="button"
                      onClick={() => {
                        void conversationsQuery.refetch()
                        void conversationDetailQuery.refetch()
                      }}
                      className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                    >
                      {t('common.retry')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate(ROUTES.messages)}
                    className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
                  >
                    {t('chat.backToList')}
                  </button>
                </div>
              </>
            )}
          </section>
        ) : (
          <section
            className="hidden h-full min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 bg-background p-8 text-center md:flex"
            aria-label={t('chat.noConversationSelected')}
          >
            <span className="grid size-20 place-items-center rounded-[28px] bg-primary shadow-md">
              <BrandMark animated className="size-12" />
            </span>
            <div>
              <h2 className="text-lg font-bold">{t('chat.emptyThread', { name: userName })}</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                {t('chat.emptyThreadHint')}
              </p>
            </div>
            <span className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground">
              {t('chat.tagline')}
            </span>
          </section>
        )}
      </div>
    </main>
  )
}
