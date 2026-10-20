import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { BrandMark } from '@/components/common/BrandMark'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/config/constants'
import { emitTypingStart, emitTypingStop } from '@/lib/socket'
import { MOCK_CALLS } from '../data/mockData'
import type { ChatTab, StoryEntry } from '../types/chat.types'
import {
  useConversationsQuery,
  useConversationMessagesQuery,
  useMarkReadMutation,
  useSendMessageMutation,
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

export function ChatShell() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const initialTab = (location.state as { tab?: ChatTab } | null)?.tab ?? 'messages'
  const initialSelect = (location.state as { select?: string } | null)?.select ?? null
  const isMdDown = useMediaQuery('(max-width: 48rem)') // Breakpoint md của Tailwind (768px)
  const [tab, setTab] = useState<ChatTab>(initialTab)
  const [query, setQuery] = useState('')
  // Mặc định chọn theo location.state nếu có
  const [selectedId, setSelectedId] = useState<string | null>(initialSelect)
  const [viewingStory, setViewingStory] = useState<StoryEntry | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const todayLabel = t('chat.today')

  // Realtime Socket.IO sync
  const { isPartnerTyping, connectionStatus } = useChatRealtime(selectedId)

  // API Queries & Mutations
  const conversationsQuery = useConversationsQuery()
  const messagesQuery = useConversationMessagesQuery(selectedId)
  const sendMessageMutation = useSendMessageMutation(selectedId)
  const markReadMutation = useMarkReadMutation()
  const lastTypingSentAt = useRef(0)
  const lastReadAttempt = useRef<string | null>(null)

  const [prevInitialSelect, setPrevInitialSelect] = useState(initialSelect)
  if (initialSelect !== prevInitialSelect) {
    setPrevInitialSelect(initialSelect)
    setSelectedId(initialSelect)
    if (initialSelect) setTab('messages')
  }

  const rawConversations = useMemo(
    () => conversationsQuery.data ?? [],
    [conversationsQuery.data],
  )

  const q = query.trim().toLowerCase()
  const conversations = useMemo(
    () =>
      rawConversations.filter(
        (c) => !q || c.name.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q),
      ),
    [rawConversations, q],
  )

  const calls = useMemo(
    () => MOCK_CALLS.filter((c) => !q || c.name.toLowerCase().includes(q)),
    [q],
  )

  const storiesQuery = useStoriesList()
  useEffect(() => {
    if (storiesQuery.isError) {
      toast.error(storiesQuery.error instanceof Error ? storiesQuery.error.message : t('chat.storiesLoadError'))
    }
  }, [storiesQuery.isError, storiesQuery.error, t])
  const stories = useMemo(
    () => (storiesQuery.data ?? []).filter((s) => !q || s.name.toLowerCase().includes(q)),
    [storiesQuery.data, q],
  )

  const totalUnread = useMemo(
    () => rawConversations.reduce((n, c) => n + (c.unread || 0), 0),
    [rawConversations],
  )

  const selected = rawConversations.find((c) => c.id === selectedId) ?? null

  const messageItems = useMemo(() => {
    const messages = [
      ...(messagesQuery.data?.pages.flatMap((page) => page.items) ?? []),
      ...(messagesQuery.liveMessages ?? []),
    ]
    const uniqueMessages = new Map(messages.map((message) => [message.id, message]))
    return [...uniqueMessages.values()].sort(
      (left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt),
    )
  }, [messagesQuery.data, messagesQuery.liveMessages])

  // API trả từng trang mới nhất trước; UI cần timeline cũ đến mới.
  const groups = useMemo(() => {
    if (!selected || !messageItems) return []
    const chatMsgs = messageItems.map((m) => mapMessageResponse(m, user?.id))
    return buildDayGroupsFromMessages(chatMsgs, todayLabel)
  }, [selected, messageItems, user?.id, todayLabel])

  const handleSelect = (id: string) => {
    setSelectedId(id)
    setTab('messages')
  }

  const lastMessage = messageItems.at(-1)
  const selectedUnread = selected?.unread
  const lastMessageId = lastMessage?.id
  const lastMessageConversationId = lastMessage?.conversationId
  const markRead = markReadMutation.mutate
  useEffect(() => {
    const attemptKey = selectedId && lastMessageId ? `${selectedId}:${lastMessageId}` : null
    if (
      !selectedId ||
      !selectedUnread ||
      !lastMessageId ||
      lastMessageConversationId !== selectedId ||
      !attemptKey ||
      lastReadAttempt.current === attemptKey
    ) {
      return
    }
    lastReadAttempt.current = attemptKey
    markRead({ conversationId: selectedId, lastReadMessageId: lastMessageId })
  }, [selectedId, selectedUnread, lastMessageId, lastMessageConversationId, markRead])

  const handleSend = async (text: string): Promise<boolean> => {
    if (!selectedId) return false
    try {
      await sendMessageMutation.mutateAsync(text)
      return true
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t('chat.sendMessageError'))
      return false
    }
  }

  const handleTypingStart = () => {
    const now = Date.now()
    if (selectedId && now - lastTypingSentAt.current >= TYPING_HEARTBEAT_MS) {
      lastTypingSentAt.current = now
      emitTypingStart(selectedId)
    }
  }

  const handleTypingStop = () => {
    lastTypingSentAt.current = 0
    if (selectedId) emitTypingStop(selectedId)
  }

  const userName = user?.fullName ?? 'Lemon User'

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
          {connectionStatus === 'connecting' ? t('chat.realtimeConnecting') : t('chat.realtimeOffline')}
        </div>
      )}
      <SideNav
        active={tab}
        onChange={(t) => {
          setTab(t)
          setQuery('')
          // Persist the active tab in this history entry so reload does not
          // restore a stale tab value from an earlier navigation.
          navigate(ROUTES.messages, {
            replace: true,
            state: { tab: t, ...(!isMdDown && selectedId ? { select: selectedId } : {}) },
          })
          // Mobile: quay về danh sách để chuyển tab/đổi hội thoại dễ dàng; desktop giữ phiên đang mở
          if (isMdDown) setSelectedId(null)
        }}
        totalUnread={totalUnread}
        onOpenSettings={() => navigate(ROUTES.settings)}
        settingsActive={false}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        mobileBarVisible={!selectedId}
      />

      {/* Panel B — danh sách hội thoại */}
      <div
        className={cn(
          selectedId ? 'hidden h-full min-h-0 md:flex md:h-full md:min-w-0' : 'flex h-full min-h-0 min-w-0 flex-1 md:flex-none',
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
          query={query}
          onQuery={setQuery}
          onSelectConversation={handleSelect}
          onOpenStory={setViewingStory}
          onCall={() => navigate(ROUTES.calls)}
          onNewCall={() => navigate(ROUTES.newCall)}
          onNewChat={() => navigate(ROUTES.newChat)}
        />
      </div>

      {/* Panel C — hội thoại, kéo dài full layout */}
      <div className={selectedId ? 'flex h-full min-h-0 w-full min-w-0 flex-1' : 'hidden h-full min-h-0 w-full min-w-0 flex-1 md:flex'}>
        {selected ? (
          <ConversationView
            key={selected.id}
            conversation={selected}
            groups={groups}
            messagesLoading={messagesQuery.isPending}
            messagesError={messagesQuery.isError && !messagesQuery.data ? messagesQuery.error.message : undefined}
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
            isLoadingNewerMessages={messagesQuery.isFetchingPreviousPage}
            onLoadNewerMessages={async () => {
              const result = await messagesQuery.fetchPreviousPage()
              if (result.isError) throw result.error
            }}
            onSend={handleSend}
            isSending={sendMessageMutation.isPending}
            showBack
            onBack={() => setSelectedId(null)}
            isTyping={isPartnerTyping}
            onTypingStart={handleTypingStart}
            onTypingStop={handleTypingStop}
          />
        ) : (
          <section className="hidden h-full min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 bg-background p-8 text-center md:flex" aria-label={t('chat.noConversationSelected')}>
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

      {/* Story viewer — tách thành component riêng */}
      {viewingStory && <StoryViewer story={viewingStory} onClose={() => setViewingStory(null)} />}
    </main>
  )
}
