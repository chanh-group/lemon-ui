import { Film, Image as ImageIcon, PhoneIncoming, PhoneMissed, PhoneOutgoing, Search, SearchX, SquarePen, Sticker, Video, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/common/EmptyState'
import { avatarColor, initials } from '../data/mockData'
import type { CallEntry, ChatTab, Conversation, StoryEntry } from '../types'

interface MiddlePanelProps {
  tab: ChatTab
  conversations: Conversation[]
  calls: CallEntry[]
  stories: StoryEntry[]
  selectedId: string | null
  query: string
  onQuery: (q: string) => void
  onSelectConversation: (id: string) => void
  onOpenStory: (story: StoryEntry) => void
}

function PreviewIcon({ kind }: { kind: Conversation['previewKind'] }) {
  if (kind === 'photo') return <ImageIcon className="size-3.5 shrink-0" aria-hidden="true" />
  if (kind === 'gif') return <Film className="size-3.5 shrink-0" aria-hidden="true" />
  if (kind === 'sticker') return <Sticker className="size-3.5 shrink-0" aria-hidden="true" />
  return null
}

function ConversationAvatar({ name, online, onlineLabel, isGroup }: { name: string; online: boolean; onlineLabel: string; isGroup?: boolean }) {
  return (
    <span className="relative shrink-0">
      <span
        aria-hidden="true"
        className={cn(
          'grid size-11 place-items-center rounded-full text-[13px] font-bold text-foreground ring-1 ring-border',
          isGroup && 'rounded-2xl',
        )}
        style={{ backgroundColor: avatarColor(name) }}
      >
        {initials(name)}
      </span>
      {online && (
        <span
          className="absolute right-0 bottom-0 size-3 rounded-full bg-[var(--success)] ring-2 ring-card"
          title={onlineLabel}
          aria-hidden="true"
        />
      )}
    </span>
  )
}

export function MiddlePanel({
  tab,
  conversations,
  calls,
  stories,
  selectedId,
  query,
  onQuery,
  onSelectConversation,
  onOpenStory,
}: MiddlePanelProps) {
  const { t } = useTranslation()
  const resultCount = tab === 'messages' ? conversations.length : tab === 'calls' ? calls.length : stories.length
  const meta: Record<ChatTab, { title: string; searchHint: string }> = {
    messages: { title: t('chat.messages'), searchHint: t('chat.searchConversations') },
    calls: { title: t('chat.calls'), searchHint: t('chat.searchCalls') },
    stories: { title: t('chat.stories'), searchHint: t('chat.searchFriends') },
  }
  const activeMeta = meta[tab]

  return (
    <section
      aria-label={activeMeta.title}
      className="flex min-h-0 w-full flex-col border-r border-border bg-card md:w-[300px] md:shrink-0 lg:w-[340px]"
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold tracking-tight text-foreground">{activeMeta.title}</h1>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={t('chat.newMessage')}
            title={t('chat.newMessage')}
            className="grid size-11 min-h-11 min-w-11 place-items-center rounded-xl text-[var(--brand-ink)] transition-colors duration-150 hover:bg-muted"
          >
            <SquarePen className="size-[18px]" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="px-4 pb-2">
        <label className="chat-search group flex items-center gap-2 rounded-full border border-border bg-muted px-3.5 py-2 transition-all duration-150 focus-within:border-[var(--ring)] focus-within:bg-card">
          <Search className="size-4 shrink-0 text-muted-foreground transition-colors group-focus-within:text-[var(--brand-ink)]" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={activeMeta.searchHint}
            aria-label={activeMeta.searchHint}
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQuery('')}
              aria-label={t('chat.clearSearch')}
              className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-border hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </label>
        {query.trim() && (
          <p aria-live="polite" className="px-1 pt-1.5 text-xs text-muted-foreground">
            {t('chat.resultsCount', { count: resultCount })}
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3" role="list" aria-label={activeMeta.title}>
        {tab === 'messages' && (
          <>
            {conversations.length === 0 ? (
              <div className="px-2 pt-4">
                <EmptyState
                  title={query ? t('chat.noResults') : t('chat.noConversations')}
                  message={
                    query
                      ? t('chat.noResultsFor', { query })
                      : t('chat.startFirst')
                  }
                />
                {query && <SearchX className="mx-auto mt-2 size-5 text-muted-foreground" aria-hidden="true" />}
              </div>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {conversations.map((c) => {
                  const isActive = c.id === selectedId
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        aria-current={isActive ? 'true' : undefined}
                        onClick={() => onSelectConversation(c.id)}
                        aria-label={`${c.name}${c.unread > 0 ? `, ${t('chat.unreadCount', { count: c.unread })}` : ''}`}
                        className={cn(
                          'chat-item group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-150',
                          isActive ? 'bg-secondary' : 'hover:translate-x-[2px] hover:bg-muted',
                        )}
                      >
                        <ConversationAvatar name={c.name} online={c.online} onlineLabel={t('chat.online')} isGroup={c.isGroup} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-foreground">{c.name}</span>
                            <span className={cn('shrink-0 text-[11px]', c.unread > 0 ? 'font-bold text-[var(--brand-ink)]' : 'text-muted-foreground')}>
                              {c.time}
                            </span>
                          </span>
                          <span className="mt-0.5 flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                'flex min-w-0 flex-1 items-center gap-1 truncate text-[13px]',
                                c.unread > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground',
                              )}
                            >
                              <PreviewIcon kind={c.previewKind} />
                              {c.previewKind === 'photo' ? t('chat.photo') : c.previewKind === 'gif' ? t('chat.gif') : c.previewKind === 'sticker' ? t('chat.sticker') : c.preview}
                            </span>
                            {c.unread > 0 && (
                              <span aria-hidden="true" className="grid min-w-5 shrink-0 place-items-center rounded-full bg-[var(--brand-ink)] px-1.5 text-[11px] leading-5 font-bold text-primary-foreground">
                                {c.unread}
                              </span>
                            )}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}

        {tab === 'calls' && (
          <>
            {calls.length === 0 ? (
              <div className="px-2 pt-4">
                <EmptyState title={t('chat.noCalls')} message={t('chat.callsEmpty')} />
              </div>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {calls.map((call) => (
                  <li key={call.id}>
                    <div className="chat-item flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors duration-150 hover:bg-muted">
                      <ConversationAvatar name={call.name} online={call.online} onlineLabel={t('chat.online')} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{call.name}</p>
                        <p
                          className={cn(
                            'mt-0.5 flex items-center gap-1.5 text-xs',
                            call.direction === 'missed' ? 'font-medium text-destructive' : 'text-muted-foreground',
                          )}
                        >
                          {call.direction === 'missed' ? (
                            <PhoneMissed className="size-3.5" aria-hidden="true" />
                          ) : call.direction === 'incoming' ? (
                            <PhoneIncoming className="size-3.5" aria-hidden="true" />
                          ) : (
                            <PhoneOutgoing className="size-3.5" aria-hidden="true" />
                          )}
                          {call.direction === 'missed' ? t('chat.missedCall') : call.direction === 'incoming' ? t('chat.incomingCall') : t('chat.outgoingCall')}
                          <span aria-hidden="true">·</span> {call.time}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={t('chat.callBack', { name: call.name })}
                        className="grid size-11 min-h-11 min-w-11 shrink-0 place-items-center rounded-full text-[var(--brand-ink)] transition-colors duration-150 hover:bg-secondary"
                      >
                        {call.kind === 'video' ? (
                          <Video className="size-[18px]" aria-hidden="true" />
                        ) : (
                          <PhoneIncoming className="size-[18px] rotate-180" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {tab === 'stories' && (
          <>
            {stories.length === 0 ? (
              <div className="px-2 pt-4">
                <EmptyState title={t('chat.noStories')} message={t('chat.storiesEmpty')} />
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-2.5 p-2">
                {stories.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => onOpenStory(s)}
                      aria-label={`${t('chat.storyOf', { name: s.name })}, ${s.time}`}
                      className="group flex w-full flex-col items-center gap-2 rounded-2xl border border-border bg-muted p-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--ring)]/40 hover:shadow-md"
                    >
                      <span
                        className={cn(
                          'grid size-14 place-items-center rounded-full text-base font-bold text-foreground',
                          s.viewed
                            ? 'ring-2 ring-border ring-offset-2 ring-offset-card'
                            : 'chat-story-ring ring-offset-2 ring-offset-card',
                        )}
                        style={{ backgroundColor: avatarColor(s.name) }}
                      >
                        {initials(s.name)}
                      </span>
                      <span className="w-full text-center">
                        <span className="block truncate text-[13px] font-semibold text-foreground">{s.name}</span>
                        <span className="mt-0.5 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                          <ImageIcon className="size-3" aria-hidden="true" />
                          {s.time}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  )
}
