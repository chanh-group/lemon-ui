import { Film01Icon as FilmData, Image01Icon as ImageIconData, StickerIcon as StickerData, CallIncoming01Icon as PhoneIncomingData, CallMissed01Icon as PhoneMissedData, CallOutgoing01Icon as PhoneOutgoingData, Search01Icon as SearchData, Search01Icon as SearchXData, Edit02Icon as SquarePenData, Add01Icon as PlusData, ChevronRightIcon as ChevronRightData, CallIcon as PhoneData, MultiplicationSignIcon as XData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const Film = createIcon(FilmData)
const ImageIcon = createIcon(ImageIconData)
const Sticker = createIcon(StickerData)
const PhoneIncoming = createIcon(PhoneIncomingData)
const PhoneMissed = createIcon(PhoneMissedData)
const PhoneOutgoing = createIcon(PhoneOutgoingData)
const Search = createIcon(SearchData)
const SearchX = createIcon(SearchXData)
const SquarePen = createIcon(SquarePenData)
const Plus = createIcon(PlusData)
const ChevronRight = createIcon(ChevronRightData)
const Phone = createIcon(PhoneData)
const X = createIcon(XData)
import { useTranslation } from 'react-i18next'
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/common/EmptyState'
import { UserAvatar } from '@/components/common/UserAvatar'
import { ROUTES } from '@/config/constants'
import { useAuth } from '@/features/auth/api'
import { useFriendRequests } from '../hooks/useFriends'
import { storyDisplayName, storyTime } from '../data/storiesData'
import type { CallEntry, ChatTab, Conversation, StoryEntry } from '../types/chat.types'
import { CallsHeaderActions } from './CallsHeaderActions'

interface MiddlePanelProps {
  tab: ChatTab
  conversations: Conversation[]
  conversationsLoading: boolean
  calls: CallEntry[]
  stories: StoryEntry[]
  selectedId: string | null
  query: string
  onQuery: (q: string) => void
  onSelectConversation: (id: string) => void
  onOpenStory: (story: StoryEntry) => void
  onCall?: (name: string) => void
  onNewChat?: () => void
  onNewCall?: () => void
}

function PreviewIcon({ kind }: { kind: Conversation['previewKind'] }) {
  if (kind === 'photo') return <ImageIcon className="size-3.5 shrink-0" aria-hidden="true" />
  if (kind === 'gif') return <Film className="size-3.5 shrink-0" aria-hidden="true" />
  if (kind === 'sticker') return <Sticker className="size-3.5 shrink-0" aria-hidden="true" />
  return null
}

function ConversationAvatar({
  name,
  avatarUrl,
  online,
  onlineLabel,
  isGroup,
  story,
}: {
  name: string
  avatarUrl?: string | null
  online: boolean
  onlineLabel: string
  isGroup?: boolean
  /** Có story còn hiệu lực 24h → bọc ring quanh avatar (chưa xem: xanh / đã xem: xám). */
  story?: StoryEntry
}) {
  return (
    <span className="relative shrink-0">
      <UserAvatar
        name={name}
        src={avatarUrl}
        square={isGroup}
        className={cn(
          'size-11',
          // Có story: bọc vòng kiểu Messenger (xanh chưa xem / xám đã xem)
          story ? (story.viewed ? 'ring-2 ring-border ring-offset-2 ring-offset-card' : 'chat-story-ring') : 'ring-1 ring-border',
        )}
      />
      {online && (
        <span
          className="absolute right-0 bottom-0 size-3 rounded-full bg-success ring-2 ring-card"
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
  conversationsLoading,
  calls,
  stories,
  selectedId,
  query,
  onQuery,
  onSelectConversation,
  onOpenStory,
  onCall,
  onNewChat,
  onNewCall,
}: MiddlePanelProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const resultCount = tab === 'messages' ? conversations.length : tab === 'calls' ? calls.length : stories.length
  const meta: Record<ChatTab, { title: string; searchHint: string }> = {
    messages: { title: t('chat.messages'), searchHint: t('chat.searchConversations') },
    calls: { title: t('chat.calls'), searchHint: t('chat.searchCalls') },
    stories: { title: t('chat.stories'), searchHint: t('chat.searchFriends') },
  }
  const activeMeta = meta[tab]
  // Badge trên nút soạn tin = số lời mời kết bạn NHẬN VỀ (lời đi không tính)
  const requestsQuery = useFriendRequests()
  const { data: requests } = requestsQuery
  useEffect(() => {
    if (requestsQuery.isError) {
      toast.error(requestsQuery.error instanceof Error ? requestsQuery.error.message : t('chat.friendRequestsLoadError'))
    }
  }, [requestsQuery.isError, requestsQuery.error, t])
  const incomingRequests = requests?.incoming?.length ?? 0
  // Story theo tên người gửi — 1-1 mới bọc ring/bubble (Messenger không cho group)
  const storyByName = useMemo(() => new Map(stories.map((s) => [s.name, s])), [stories])

  return (
    <section
      aria-label={activeMeta.title}
      className="flex min-h-0 w-full flex-col border-r border-border bg-card md:w-88 md:shrink-0 lg:w-100"
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold tracking-tight text-foreground">{activeMeta.title}</h1>
        <div className="flex items-center gap-1">
          {tab === 'stories' ? (
            // Tab Stories: thay nút soạn tin bằng nút "+" → route /stories/create
            <button
              type="button"
              aria-label={t('chat.createStoryTitle')}
              title={t('chat.createStoryTitle')}
              onClick={() => navigate(ROUTES.storiesCreate)}
              className="grid size-11 min-h-11 min-w-11 place-items-center rounded-xl text-brand-ink transition-colors duration-150 hover:bg-muted"
            >
              <Plus className="size-5.5" aria-hidden="true" />
            </button>
          ) : tab === 'calls' ? (
            <CallsHeaderActions onNewCall={onNewCall ?? (() => navigate(ROUTES.newCall))} />
          ) : (
            <button
              type="button"
              aria-label={
                incomingRequests > 0
                  ? `${t('chat.newMessage')}, ${t('chat.friendRequestCount', { count: incomingRequests })}`
                  : t('chat.newMessage')
              }
              title={t('chat.newMessage')}
              onClick={onNewChat}
              className="relative grid size-11 min-h-11 min-w-11 place-items-center rounded-xl text-brand-ink transition-colors duration-150 hover:bg-muted"
            >
              <SquarePen className="size-5.5" aria-hidden="true" />
              {incomingRequests > 0 && (
                <span
                  className="absolute -top-0.5 right-0 grid min-w-4.5 place-items-center rounded-full bg-primary px-1 text-[10px] leading-4 font-bold text-primary-foreground ring-2 ring-card"
                  aria-hidden="true"
                >
                  {incomingRequests > 9 ? '9+' : incomingRequests}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pb-2">
        <label className="chat-search group flex items-center gap-2 rounded-full border border-border bg-muted px-3.5 py-2 transition-all duration-150 focus-within:border-ring focus-within:bg-card">
          <Search className="size-4.5 shrink-0 text-muted-foreground transition-colors group-focus-within:text-brand-ink" aria-hidden="true" />
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
            {conversationsLoading ? (
              <p className="px-4 py-5 text-sm text-muted-foreground">{t('common.loading')}</p>
            ) : conversations.length === 0 ? (
              <div className="px-2 pt-4">
                <EmptyState
                  title={query ? t('chat.noResults') : t('chat.noConversations')}
                  message={
                    query
                      ? t('chat.noResultsFor', { query })
                      : t('chat.startFirst')
                  }
                />
                {query && <SearchX className="mx-auto mt-2 size-6 text-muted-foreground" aria-hidden="true" />}
              </div>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {conversations.map((c) => {
                  const isActive = c.id === selectedId
                  // Story còn hiệu lực 24h của contact 1-1 — bấm avatar là xem tin, bấm row là chat
                  const contactStory = !c.isGroup ? storyByName.get(c.name) : undefined
                  return (
                    <li key={c.id} className="relative">
                      <button
                        type="button"
                        aria-current={isActive ? 'true' : undefined}
                        onClick={() => onSelectConversation(c.id)}
                        aria-label={`${c.name}${c.unread > 0 ? `, ${t('chat.unreadCount', { count: c.unread })}` : ''}`}
                        className={cn(
                          'chat-item group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-150',
                          isActive ? 'bg-secondary' : 'hover:translate-x-0.5 hover:bg-muted',
                        )}
                      >
                        <ConversationAvatar
                          name={c.name}
                          avatarUrl={c.partnerAvatar}
                          online={c.online}
                          onlineLabel={t('chat.online')}
                          isGroup={c.isGroup}
                          story={contactStory}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-foreground">{c.name}</span>
                            <span className={cn('shrink-0 text-[11px]', c.unread > 0 ? 'font-bold text-brand-ink' : 'text-muted-foreground')}>
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
                              {c.previewKind === 'photo'
                                ? t('chat.photo')
                                : c.previewKind === 'gif'
                                  ? t('chat.gif')
                                  : c.previewKind === 'sticker'
                                    ? t('chat.sticker')
                                    : c.preview || (!c.isGroup ? t('chat.newConnectionPreview') : '')}
                            </span>
                            {c.unread > 0 && (
                              <span aria-hidden="true" className="grid min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[11px] leading-5 font-bold text-primary-foreground">
                                {c.unread}
                              </span>
                            )}
                          </span>
                        </span>
                      </button>
                      {/* Nút trên avatar — layer trên row, tránh button lồng nhau */}
                      {contactStory && (
                        <button
                          type="button"
                          aria-label={t('chat.viewStoryOf', { name: c.name })}
                          title={t('chat.viewStoryOf', { name: c.name })}
                          onClick={() => onOpenStory(contactStory)}
                          className="absolute top-1/2 left-3 z-10 size-11 -translate-y-1/2 rounded-full transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        />
                      )}
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
                      <UserAvatar name={call.name} className="size-11" />
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
                        onClick={() => onCall?.(call.name)}
                        aria-label={t('chat.callBack', { name: call.name })}
                        title={t('chat.callBack', { name: call.name })}
                        className="grid size-11 min-h-11 min-w-11 shrink-0 place-items-center rounded-full text-brand-ink transition-all duration-150 hover:bg-secondary active:scale-95"
                      >
                        <Phone className="size-5" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {tab === 'stories' && <StoriesTab stories={stories} onOpenStory={onOpenStory} onOpenCreate={() => navigate(ROUTES.storiesCreate)} />}
      </div>
    </section>
  )
}

interface StoriesTabProps {
  stories: StoryEntry[]
  onOpenStory: (story: StoryEntry) => void
  onOpenCreate: () => void
}

/** Tab Stories — danh sách DỌC kiểu Messenger/FB: hàng "Tin của bạn" + từng hàng tin của bạn bè. */
function StoriesTab({ stories, onOpenStory, onOpenCreate }: StoriesTabProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const userName = user?.fullName ?? user?.username ?? 'Lemon User'
  // Tin của mình riêng — buộc nút +, hàng bấm là xem tin mới nhất của mình
  const myStory = stories.find((s) => s.mine)
  const friendStories = stories.filter((s) => !s.mine)

  return (
    <ul className="flex flex-col gap-0.5">
      {/* Hàng "Tin của bạn" */}
      <li className="relative">
        <button
          type="button"
          onClick={myStory ? () => onOpenStory(myStory) : onOpenCreate}
          aria-label={myStory ? t('chat.yourStory') : t('chat.createStoryTitle')}
          className="chat-item group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-150 hover:translate-x-0.5 hover:bg-muted"
        >
          <UserAvatar name={userName} src={user?.avatarUrl} className="size-11" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-0.5 text-sm font-bold text-foreground">
              <span className="truncate">{t('chat.myStories')}</span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {myStory ? storyTime(myStory, t('chat.now')) : t('chat.yourStoryHint')}
            </span>
          </span>
          {/* Chưa có tin: ô + nét đứt như Messenger — chỉ nút tạo, không phải chủ đề */}
          {!myStory && (
            <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-2xl border-2 border-dashed border-border bg-muted/40 text-muted-foreground">
              <Plus className="size-5" />
            </span>
          )}
        </button>
        {/* Nút + đè góc avatar — nút riêng, tránh button lồng nhau */}
        <button
          type="button"
          aria-label={t('chat.createStoryTitle')}
          title={t('chat.createStoryTitle')}
          onClick={onOpenCreate}
          className="absolute left-9.5 bottom-1 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground ring-2 ring-card transition-transform duration-150 hover:scale-110 active:scale-95"
        >
          <Plus className="size-3" aria-hidden="true" />
        </button>
      </li>

      {/* Tin của bạn bè — từng hàng dọc */}
      {friendStories.length === 0 ? (
        <li className="px-2 pt-6">
          <EmptyState title={t('chat.noStories')} message={t('chat.storiesEmpty')} />
        </li>
      ) : (
        friendStories.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onOpenStory(s)}
              aria-label={`${t('chat.storyOf', { name: s.name })}, ${storyTime(s, t('chat.now'))}`}
              className="chat-item group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-150 hover:translate-x-0.5 hover:bg-muted"
            >
              <UserAvatar
                name={s.name}
                src={s.avatarUrl}
                className={cn(
                  'size-11',
                  s.viewed ? 'ring-2 ring-border ring-offset-2 ring-offset-card' : 'chat-story-ring',
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">{storyDisplayName(s, t)}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{storyTime(s, t('chat.now'))}</span>
              </span>
            </button>
          </li>
        ))
      )}
    </ul>
  )
}
