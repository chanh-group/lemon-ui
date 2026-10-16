import { useMemo, useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { useLogout } from '@/features/auth/hooks/useAuth'
import { BrandMark } from '@/components/common/BrandMark'
import { avatarColor, initials, MOCK_CALLS, MOCK_CONVERSATIONS, MOCK_STORIES, MOCK_THREADS } from '../data/mockData'
import type { ChatMessage, ChatTab, DayGroup, StoryEntry } from '../types'
import { SideNav } from './SideNav'
import { MiddlePanel } from './MiddlePanel'
import { ConversationView } from './ConversationView'

function nowTime(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function ChatShell() {
  const { user } = useAuth()
  const logout = useLogout()
  const [tab, setTab] = useState<ChatTab>('messages')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(MOCK_CONVERSATIONS[0].id)
  const [threads, setThreads] = useState<Record<string, DayGroup[]>>(MOCK_THREADS)
  const [readIds, setReadIds] = useState<string[]>([])
  const [viewingStory, setViewingStory] = useState<StoryEntry | null>(null)

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
  const stories = useMemo(
    () => MOCK_STORIES.filter((s) => !q || s.name.toLowerCase().includes(q)),
    [q],
  )
  const totalUnread = useMemo(
    () => MOCK_CONVERSATIONS.reduce((n, c) => n + (readIds.includes(c.id) ? 0 : c.unread), 0),
    [readIds],
  )

  const selected = MOCK_CONVERSATIONS.find((c) => c.id === selectedId) ?? null
  const groups: DayGroup[] = selected ? (threads[selected.id] ?? []) : []

  const handleSelect = (id: string) => {
    setSelectedId(id)
    setTab('messages')
    setReadIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  const handleSend = (text: string) => {
    if (!selected) return
    const msg: ChatMessage = {
      id: `local-${Date.now()}`,
      fromMe: true,
      text,
      kind: 'text',
      time: nowTime(),
      status: 'sent',
    }
    setThreads((prev) => {
      const current = prev[selected.id] ?? []
      const last = current[current.length - 1]
      if (last && last.date === 'Hôm nay') {
        return { ...prev, [selected.id]: [...current.slice(0, -1), { ...last, messages: [...last.messages, msg] }] }
      }
      return { ...prev, [selected.id]: [...current, { date: 'Hôm nay', messages: [msg] }] }
    })
    // Phản hồi mẫu nhẹ để composer có phản hồi trực quan (mock data only).
    window.setTimeout(() => {
      const reply: ChatMessage = {
        id: `reply-${Date.now()}`,
        fromMe: false,
        sender: selected.isGroup ? selected.name : undefined,
        text: 'Ok nhé, để mình xem rồi trả lời bạn ngay 👍',
        kind: 'text',
        time: nowTime(),
      }
      setThreads((prev) => {
        const current = prev[selected.id] ?? []
        const last = current[current.length - 1]
        if (last && last.date === 'Hôm nay') {
          return { ...prev, [selected.id]: [...current.slice(0, -1), { ...last, messages: [...last.messages, reply] }] }
        }
        return { ...prev, [selected.id]: [...current, { date: 'Hôm nay', messages: [reply] }] }
      })
    }, 1200)
  }

  const userName = user?.fullName ?? 'Minh Anh'
  const userInitials = initials(userName)

  return (
    <main className="flex h-dvh overflow-hidden bg-[#FAFBF5] text-[#20271F]">
      <SideNav
        active={tab}
        onChange={(t) => {
          setTab(t)
          setQuery('')
        }}
        totalUnread={totalUnread}
        userName={userName}
        userInitials={userInitials}
        onLogout={() => logout.mutate()}
      />

      {/* Panel B — ẩn trên mobile khi đang xem hội thoại */}
      <div className={selectedId ? 'hidden min-h-0 md:flex md:min-w-0' : 'flex min-h-0 min-w-0 flex-1 md:flex-none'}>
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
        />
      </div>

      {/* Panel C — hội thoại */}
      <div className={selectedId ? 'flex min-h-0 min-w-0 flex-1' : 'hidden min-h-0 min-w-0 flex-1 md:flex'}>
        {selected ? (
          <ConversationView
            conversation={selected}
            groups={groups}
            onSend={handleSend}
            showBack
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <section className="hidden min-w-0 flex-1 flex-col items-center justify-center gap-4 bg-[#FAFBF5] p-8 text-center md:flex" aria-label="Chưa chọn hội thoại">
            <span className="grid size-20 place-items-center rounded-[28px] bg-[#F5E85B] shadow-[0_12px_32px_rgba(61,122,54,0.18)]">
              <BrandMark animated className="size-12" />
            </span>
            <div>
              <h2 className="text-lg font-bold">Chào {userName}, bắt đầu trò chuyện nhé 🍋</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-[#788074]">
                Chọn một cuộc trò chuyện bên trái để xem tin nhắn. LemonChat nhanh, nhẹ và luôn tươi mới.
              </p>
            </div>
            <span className="flex items-center gap-2 rounded-full border border-[#E7EBDD] bg-white px-4 py-2 text-xs font-medium text-[#788074]">
              <MessageCircle className="size-4 text-[#3D7A36]" aria-hidden="true" />
              Mã hóa đầu cuối · Không lưu tin nhắn trên máy chủ lạ
            </span>
          </section>
        )}
      </div>

      {/* Story viewer — chuyển cảnh nhẹ + thanh tiến trình */}
      {viewingStory && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Story của ${viewingStory.name}`}
          className="story-overlay fixed inset-0 z-50 grid place-items-center bg-[#20271F]/70 p-4"
          onClick={() => setViewingStory(null)}
        >
          <div
            className="story-card w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 pt-4">
              <div className="h-1 overflow-hidden rounded-full bg-[#E7EBDD]" aria-hidden="true">
                <div key={viewingStory.id} className="story-progress h-full rounded-full bg-[#3D7A36]" />
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 pt-3">
              <span
                aria-hidden="true"
                className="grid size-10 place-items-center rounded-full text-[13px] font-bold ring-1 ring-[#E7EBDD]"
                style={{ backgroundColor: avatarColor(viewingStory.name) }}
              >
                {initials(viewingStory.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{viewingStory.name}</p>
                <p className="text-xs text-[#788074]">{viewingStory.time}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingStory(null)}
                aria-label="Đóng story"
                className="grid size-9 place-items-center rounded-xl text-[#788074] transition-colors hover:bg-[#F2F5E6] hover:text-[#20271F]"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="grid place-items-center bg-gradient-to-br from-[#F5E85B] via-[#DDF4A7] to-[#B9D97A] px-6 py-14">
              <div className="flex flex-col items-center gap-3 text-center">
                <BrandMark animated={false} className="size-16 drop-shadow-sm" />
                <p className="text-lg font-bold text-[#20271F]">Chào buổi sáng từ {viewingStory.name}! 🍋</p>
                <p className="max-w-[240px] text-sm text-[#20271F]/75">
                  Một ngày mới tươi như chanh — uống đủ nước và cười nhiều lên nhé.
                </p>
              </div>
            </div>
            <p className="px-4 py-3 text-center text-xs text-[#788074]">Story mẫu · Nhấn ra ngoài để đóng</p>
          </div>
        </div>
      )}
    </main>
  )
}
