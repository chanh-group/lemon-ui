import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { BrandMark } from '@/components/common/BrandMark'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/config/constants'
import { MOCK_CALLS, MOCK_CONVERSATIONS } from '../data/mockData'
import type { ChatTab, DayGroup, StoryEntry } from '../types/chat.types'
import { useChatThreads } from '../hooks/useChatThreads'
import { useStoriesList } from '../hooks/useStories'
import { SideNav } from './SideNav'
import { MiddlePanel } from './MiddlePanel'
import { ConversationView } from './conversation'
import { StoryViewer } from './StoryViewer'
import { useAuth } from '@/features/auth/api'

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
  // Mặc định KHÔNG mở hội thoại nào — chỉ chọn khi người dùng bấm vào 1 row
  const [selectedId, setSelectedId] = useState<string | null>(initialSelect)
  const [readIds, setReadIds] = useState<string[]>([])
  const [viewingStory, setViewingStory] = useState<StoryEntry | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const todayLabel = t('chat.today')

  const { threads, send, sendStoryReply } = useChatThreads({ todayLabel })

  const q = query.trim().toLowerCase()
  const conversations = useMemo(
    () =>
      MOCK_CONVERSATIONS.map((c) => (readIds.includes(c.id) ? { ...c, unread: 0 } : c)).filter(
        (c) => !q || c.name.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q),
      ),
    [q, readIds],
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
    () => MOCK_CONVERSATIONS.reduce((n, c) => n + (readIds.includes(c.id) ? 0 : c.unread), 0),
    [readIds],
  )

  // Khi ở tab stories, nếu chưa bấm story nào thì tự động hiển thị story đầu tiên
  const currentStory = tab === 'stories' ? (viewingStory ?? stories[0] ?? null) : null

  const selected = MOCK_CONVERSATIONS.find((c) => c.id === selectedId) ?? null
  const groups: DayGroup[] = selected ? (threads[selected.id] ?? []) : []

  const handleSelect = (id: string) => {
    setSelectedId(id)
    setTab('messages')
    setReadIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  const userName = user?.fullName ?? 'Minh Anh'

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
          if (t === 'stories' && !viewingStory && stories.length > 0) {
            setViewingStory(stories[0])
          }
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

      {/* Panel B — danh sách (tin nhắn / cuộc gọi / story) */}
      <div
        className={cn(
          (selectedId || (tab === 'stories' && viewingStory))
            ? 'hidden h-full min-h-0 md:flex md:h-full md:min-w-0'
            : 'flex h-full min-h-0 min-w-0 flex-1 md:flex-none',
          !sidebarOpen && 'hidden md:hidden',
        )}
      >
        <MiddlePanel
          tab={tab}
          conversations={conversations}
          calls={calls}
          stories={stories}
          selectedId={selectedId}
          activeStoryId={tab === 'stories' ? currentStory?.id : null}
          query={query}
          onQuery={setQuery}
          onSelectConversation={handleSelect}
          onOpenStory={(s) => setViewingStory(s)}
          onCall={() => navigate(ROUTES.calls)}
          onNewChat={() => navigate(ROUTES.newChat)}
        />
      </div>

      {/* Panel C — Hội thoại hoặc Story Viewer trực tiếp trên màn hình chính */}
      <div
        className={
          (selectedId || (tab === 'stories' && viewingStory))
            ? 'flex h-full min-h-0 w-full min-w-0 flex-1'
            : 'hidden h-full min-h-0 w-full min-w-0 flex-1 md:flex'
        }
      >
        {tab === 'stories' ? (
          currentStory ? (
            <StoryViewer
              story={currentStory}
              stories={stories}
              embedded={true}
              onSelectStory={setViewingStory}
              onClose={() => setViewingStory(null)}
              onReplySent={(s, text) => {
                const targetConv =
                  MOCK_CONVERSATIONS.find(
                    (c) => c.name.toLowerCase() === s.name.toLowerCase(),
                  ) ?? MOCK_CONVERSATIONS[1] // 'mai-anh'
                if (targetConv) {
                  sendStoryReply(targetConv.id, text, s, t('chat.mockReply'))
                  handleSelect(targetConv.id)
                }
              }}
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
            conversation={selected}
            groups={groups}
            onSend={(text) => send(selected.id, text, t('chat.mockReply'), selected.name, selected.isGroup)}
            showBack
            onBack={() => setSelectedId(null)}
          />
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
