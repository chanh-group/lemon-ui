import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const { user } = useAuth()
  const logout = useLogout()
  const [tab, setTab] = useState<ChatTab>('messages')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(MOCK_CONVERSATIONS[0].id)
  const [threads, setThreads] = useState<Record<string, DayGroup[]>>(MOCK_THREADS)
  const [readIds, setReadIds] = useState<string[]>([])
  const [viewingStory, setViewingStory] = useState<StoryEntry | null>(null)
  const replyTimer = useRef<number | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => () => {
    if (replyTimer.current !== null) window.clearTimeout(replyTimer.current)
  }, [])

  // Story viewer: Esc để đóng + focus vào nút đóng + tự đóng sau 5s
  useEffect(() => {
    if (!viewingStory) return
    closeBtnRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewingStory(null)
    }
    window.addEventListener('keydown', onKey)
    const auto = window.setTimeout(() => setViewingStory(null), 5000)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(auto)
    }
  }, [viewingStory])
  const todayLabel = t('chat.today')

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
      id: crypto.randomUUID(),
      fromMe: true,
      text,
      kind: 'text',
      time: nowTime(),
      status: 'sent',
    }
    setThreads((prev) => {
      const current = prev[selected.id] ?? []
      const last = current[current.length - 1]
      if (last && last.date === todayLabel) {
        return { ...prev, [selected.id]: [...current.slice(0, -1), { ...last, messages: [...last.messages, msg] }] }
      }
      return { ...prev, [selected.id]: [...current, { date: todayLabel, messages: [msg] }] }
    })
    // Phản hồi mẫu nhẹ để composer có phản hồi trực quan (mock data only).
    if (replyTimer.current !== null) window.clearTimeout(replyTimer.current)
    const targetId = selected.id
    const targetIsGroup = selected.isGroup
    const targetName = selected.name
    replyTimer.current = window.setTimeout(() => {
      const reply: ChatMessage = {
        id: crypto.randomUUID(),
        fromMe: false,
        sender: targetIsGroup ? targetName : undefined,
        text: t('chat.mockReply'),
        kind: 'text',
        time: nowTime(),
      }
      setThreads((prev) => {
        const current = prev[targetId] ?? []
        const last = current[current.length - 1]
        if (last && last.date === todayLabel) {
          return { ...prev, [selected.id]: [...current.slice(0, -1), { ...last, messages: [...last.messages, reply] }] }
        }
        return { ...prev, [selected.id]: [...current, { date: todayLabel, messages: [reply] }] }
      })
    }, 1200)
  }

  const userName = user?.fullName ?? 'Minh Anh'
  const userInitials = initials(userName)

  return (
    <main className="flex h-dvh overflow-hidden bg-muted text-foreground">
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
          <section className="hidden min-w-0 flex-1 flex-col items-center justify-center gap-4 bg-muted p-8 text-center md:flex" aria-label={t('chat.noConversationSelected')}>
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
              <MessageCircle className="size-4 text-[var(--brand-ink)]" aria-hidden="true" />
              {t('chat.e2eNote')}
            </span>
          </section>
        )}
      </div>

      {/* Story viewer — chuyển cảnh nhẹ + thanh tiến trình */}
      {viewingStory && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('chat.storyOf', { name: viewingStory.name })}
          className="story-overlay fixed inset-0 z-50 grid place-items-center bg-foreground/70 p-4"
          onClick={() => setViewingStory(null)}
        >
          <div
            className="story-card w-full max-w-sm overflow-hidden rounded-3xl bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 pt-4">
              <div className="h-1 overflow-hidden rounded-full bg-border" aria-hidden="true">
                <div key={viewingStory.id} className="story-progress h-full rounded-full bg-[var(--brand-ink)]" />
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 pt-3">
              <span
                aria-hidden="true"
                className="grid size-10 place-items-center rounded-full text-[13px] font-bold ring-1 ring-border"
                style={{ backgroundColor: avatarColor(viewingStory.name) }}
              >
                {initials(viewingStory.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{viewingStory.name}</p>
                <p className="text-xs text-muted-foreground">{viewingStory.time}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingStory(null)}
                aria-label={t('chat.closeStory')}
                ref={closeBtnRef}
                className="grid size-11 min-h-11 min-w-11 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="grid place-items-center bg-gradient-to-br from-primary via-secondary to-[var(--ring)] px-6 py-14">
              <div className="flex flex-col items-center gap-3 text-center">
                <BrandMark animated={false} className="size-16 drop-shadow-sm" />
                <p className="text-lg font-bold text-foreground">{t('chat.storyGreeting', { name: viewingStory.name })}</p>
                <p className="max-w-[240px] text-sm text-foreground/75">
                  {t('chat.storyBody')}
                </p>
              </div>
            </div>
            <p className="px-4 py-3 text-center text-xs text-muted-foreground">{t('chat.storySample')}</p>
          </div>
        </div>
      )}
    </main>
  )
}
