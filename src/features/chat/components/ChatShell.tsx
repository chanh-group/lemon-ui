import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
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
import { useAuth } from '@/app/providers/AuthProvider'

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
  const { isPartnerTyping } = useChatRealtime(selectedId)

  // API Queries & Mutations
  const conversationsQuery = useConversationsQuery()
  const messagesQuery = useConversationMessagesQuery(selectedId)
  const sendMessageMutation = useSendMessageMutation(selectedId)
  const markReadMutation = useMarkReadMutation()

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
  const stories = useMemo(
    () => (storiesQuery.data ?? []).filter((s) => !q || s.name.toLowerCase().includes(q)),
    [storiesQuery.data, q],
  )

  const totalUnread = useMemo(
    () => rawConversations.reduce((n, c) => n + (c.unread || 0), 0),
    [rawConversations],
  )

  const selected = rawConversations.find((c) => c.id === selectedId) ?? null

  const messageItems = messagesQuery.data?.items
  // Chuyển đổi MessageResponse[] -> ChatMessage[] -> DayGroup[]
  const groups = useMemo(() => {
    if (!selected || !messageItems) return []
    const chatMsgs = messageItems.map((m) => mapMessageResponse(m, user?.id))
    return buildDayGroupsFromMessages(chatMsgs, todayLabel)
  }, [selected, messageItems, user?.id, todayLabel])

  const handleSelect = (id: string) => {
    setSelectedId(id)
    setTab('messages')

    // Đánh dấu đã đọc nếu hội thoại có tin chưa đọc
    const target = rawConversations.find((c) => c.id === id)
    if (target && target.unread > 0) {
      const msgs = messagesQuery.data?.items ?? []
      const lastMsg = msgs[msgs.length - 1]
      if (lastMsg) {
        markReadMutation.mutate({ conversationId: id, lastReadMessageId: lastMsg.id })
      }
    }
  }

  const handleSend = (text: string) => {
    if (!selectedId) return
    sendMessageMutation.mutate(text)
  }

  const handleTypingStart = () => {
    if (selectedId) emitTypingStart(selectedId)
  }

  const handleTypingStop = () => {
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
      <SideNav
        active={tab}
        onChange={(t) => {
          setTab(t)
          setQuery('')
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
          calls={calls}
          stories={stories}
          selectedId={selectedId}
          query={query}
          onQuery={setQuery}
          onSelectConversation={handleSelect}
          onOpenStory={setViewingStory}
          onCall={() => navigate(ROUTES.calls)}
          onNewChat={() => navigate(ROUTES.newChat)}
        />
      </div>

      {/* Panel C — hội thoại, kéo dài full layout */}
      <div className={selectedId ? 'flex h-full min-h-0 w-full min-w-0 flex-1' : 'hidden h-full min-h-0 w-full min-w-0 flex-1 md:flex'}>
        {selected ? (
          <ConversationView
            conversation={selected}
            groups={groups}
            onSend={handleSend}
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
