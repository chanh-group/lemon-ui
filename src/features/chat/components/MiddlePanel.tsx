import { ImageIcon, PhoneIncoming, PhoneMissed, PhoneOutgoing, Search, SearchX, SquarePen, Video } from 'lucide-react'
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

const TAB_META: Record<ChatTab, { title: string; searchHint: string }> = {
  messages: { title: 'Tin nhắn', searchHint: 'Tìm kiếm cuộc trò chuyện…' },
  calls: { title: 'Gọi điện', searchHint: 'Tìm kiếm lịch sử cuộc gọi…' },
  stories: { title: 'Story', searchHint: 'Tìm kiếm bạn bè…' },
}

function previewLabel(c: Conversation): string {
  if (c.previewKind === 'photo') return '📷 Ảnh';
  if (c.previewKind === 'gif') return '🎞️ GIF';
  if (c.previewKind === 'sticker') return '⭐ Nhãn dán';
  return c.preview
}

function ConversationAvatar({ name, online, isGroup }: { name: string; online: boolean; isGroup?: boolean }) {
  return (
    <span className="relative shrink-0">
      <span
        aria-hidden="true"
        className={cn(
          'grid size-11 place-items-center rounded-full text-[13px] font-bold text-[#20271F] ring-1 ring-[#E7EBDD]',
          isGroup && 'rounded-2xl',
        )}
        style={{ backgroundColor: avatarColor(name) }}
      >
        {initials(name)}
      </span>
      {online && (
        <span
          className="absolute right-0 bottom-0 size-3 rounded-full bg-[#3D7A36] ring-2 ring-white"
          aria-label="Đang online"
          role="status"
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
  const meta = TAB_META[tab]

  return (
    <section
      aria-label={meta.title}
      className="flex min-h-0 w-full flex-col border-r border-[#E7EBDD] bg-white md:w-[300px] md:shrink-0 lg:w-[340px]"
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold tracking-tight text-[#20271F]">{meta.title}</h1>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Soạn tin nhắn mới"
            className="grid size-9 place-items-center rounded-xl text-[#3D7A36] transition-colors duration-150 hover:bg-[#EFF5D8]"
          >
            <SquarePen className="size-[18px]" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="px-4 pb-2">
        <label className="chat-search group flex items-center gap-2 rounded-full border border-[#E7EBDD] bg-[#FAFBF5] px-3.5 py-2 transition-all duration-150 focus-within:border-[#3D7A36] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(61,122,54,0.12)]">
          <Search className="size-4 shrink-0 text-[#788074] transition-colors group-focus-within:text-[#3D7A36]" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={meta.searchHint}
            aria-label={meta.searchHint}
            className="w-full bg-transparent text-sm text-[#20271F] outline-none placeholder:text-[#788074]"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3" role={tab === 'messages' ? 'listbox' : 'list'}>
        {tab === 'messages' && (
          <>
            {conversations.length === 0 ? (
              <div className="px-2 pt-4">
                <EmptyState
                  title={query ? 'Không tìm thấy kết quả' : 'Chưa có cuộc trò chuyện'}
                  message={
                    query
                      ? `Không có kết quả cho “${query}”. Thử từ khóa khác nhé.`
                      : 'Bắt đầu cuộc trò chuyện đầu tiên của bạn trên LemonChat.'
                  }
                />
                {query && <SearchX className="mx-auto mt-2 size-5 text-[#788074]" aria-hidden="true" />}
              </div>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {conversations.map((c) => {
                  const isActive = c.id === selectedId
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onClick={() => onSelectConversation(c.id)}
                        className={cn(
                          'chat-item group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-150',
                          isActive ? 'bg-[#EAF3CC]' : 'hover:translate-x-[2px] hover:bg-[#F4F7E9]',
                        )}
                      >
                        <ConversationAvatar name={c.name} online={c.online} isGroup={c.isGroup} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-[#20271F]">{c.name}</span>
                            <span className={cn('shrink-0 text-[11px]', c.unread > 0 ? 'font-bold text-[#3D7A36]' : 'text-[#788074]')}>
                              {c.time}
                            </span>
                          </span>
                          <span className="mt-0.5 flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                'min-w-0 flex-1 truncate text-[13px]',
                                c.unread > 0 ? 'font-semibold text-[#20271F]' : 'text-[#788074]',
                              )}
                            >
                              {previewLabel(c)}
                            </span>
                            {c.unread > 0 && (
                              <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-[#3D7A36] px-1.5 text-[11px] leading-5 font-bold text-white">
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
                <EmptyState title="Không tìm thấy cuộc gọi" message="Lịch sử cuộc gọi của bạn sẽ hiển thị ở đây." />
              </div>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {calls.map((call) => (
                  <li key={call.id}>
                    <div className="chat-item flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors duration-150 hover:bg-[#F4F7E9]">
                      <ConversationAvatar name={call.name} online={call.online} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#20271F]">{call.name}</p>
                        <p
                          className={cn(
                            'mt-0.5 flex items-center gap-1.5 text-xs',
                            call.direction === 'missed' ? 'font-medium text-[#B3261E]' : 'text-[#788074]',
                          )}
                        >
                          {call.direction === 'missed' ? (
                            <PhoneMissed className="size-3.5" aria-hidden="true" />
                          ) : call.direction === 'incoming' ? (
                            <PhoneIncoming className="size-3.5" aria-hidden="true" />
                          ) : (
                            <PhoneOutgoing className="size-3.5" aria-hidden="true" />
                          )}
                          {call.direction === 'missed' ? 'Cuộc gọi nhỡ' : call.direction === 'incoming' ? 'Cuộc gọi đến' : 'Cuộc gọi đi'}
                          <span aria-hidden="true">·</span> {call.time}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Gọi lại ${call.name}`}
                        className="grid size-9 shrink-0 place-items-center rounded-full text-[#3D7A36] transition-colors duration-150 hover:bg-[#DDF4A7]"
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
                <EmptyState title="Chưa có story" message="Story mới từ bạn bè sẽ hiển thị ở đây." />
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-2.5 p-2">
                {stories.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => onOpenStory(s)}
                      className="group flex w-full flex-col items-center gap-2 rounded-2xl border border-[#E7EBDD] bg-[#FAFBF5] p-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#3D7A36]/40 hover:shadow-[0_6px_16px_rgba(61,122,54,0.10)]"
                    >
                      <span
                        className={cn(
                          'grid size-14 place-items-center rounded-full text-base font-bold text-[#20271F]',
                          s.viewed
                            ? 'ring-2 ring-[#E7EBDD] ring-offset-2 ring-offset-[#FAFBF5]'
                            : 'chat-story-ring ring-offset-2 ring-offset-[#FAFBF5]',
                        )}
                        style={{ backgroundColor: avatarColor(s.name) }}
                      >
                        {initials(s.name)}
                      </span>
                      <span className="w-full text-center">
                        <span className="block truncate text-[13px] font-semibold text-[#20271F]">{s.name}</span>
                        <span className="mt-0.5 flex items-center justify-center gap-1 text-[11px] text-[#788074]">
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
