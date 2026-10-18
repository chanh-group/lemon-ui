import { ArrowLeft01Icon as ArrowLeftData, CallingIcon as PhoneCallData, MoreHorizontalIcon as DotsThreeData, CallIcon as PhoneData, Search01Icon as SearchData, CallIncoming01Icon as PhoneIncomingData, CallOutgoing01Icon as PhoneOutgoingData, CallMissed01Icon as PhoneXData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const ArrowLeft = createIcon(ArrowLeftData)
const PhoneCall = createIcon(PhoneCallData)
const DotsThree = createIcon(DotsThreeData)
const Phone = createIcon(PhoneData)
const Search = createIcon(SearchData)
const PhoneIncoming = createIcon(PhoneIncomingData)
const PhoneOutgoing = createIcon(PhoneOutgoingData)
const PhoneX = createIcon(PhoneXData)
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/config/constants'
import { cn } from '@/lib/utils'
import { avatarColor, initials, MOCK_CALLS, MOCK_CONVERSATIONS } from '../data/mockData'
import type { CallEntry } from '../types/chat.types'
import { SideNav } from './SideNav'

const DIRECTION_KEYS = { incoming: 'chat.incomingCall', outgoing: 'chat.outgoingCall', missed: 'chat.missedCall' } as const

const DIRECTION_ICON = { incoming: PhoneIncoming, outgoing: PhoneOutgoing, missed: PhoneX } as const

function CallRow({ call }: { call: CallEntry }) {
  const { t } = useTranslation()
  const DirectionIcon = DIRECTION_ICON[call.direction]
  const isMissed = call.direction === 'missed'
  return (
    <button
      type="button"
      title={t('chat.callBack', { name: call.name })}
      className="chat-item group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-150 hover:translate-x-0.5 hover:bg-muted"
    >
      <span
        aria-hidden="true"
        className="grid size-11 shrink-0 place-items-center rounded-full text-[13px] font-bold text-foreground ring-1 ring-border"
        style={{ backgroundColor: avatarColor(call.name) }}
      >
        {initials(call.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{call.name}</span>
        <span className={cn('flex items-center gap-1 truncate text-[13px]', isMissed ? 'font-semibold text-destructive' : 'text-muted-foreground')}>
          <DirectionIcon className="size-3.5 shrink-0" aria-hidden="true" />
          {t(DIRECTION_KEYS[call.direction])} · {call.time}
        </span>
      </span>
      <span className="grid size-11 shrink-0 place-items-center rounded-xl text-brand-ink transition-colors duration-150 hover:bg-secondary">
        <Phone className="size-5" aria-hidden="true" />
      </span>
    </button>
  )
}

/**
 * Màn lịch sử cuộc gọi (route /calls) — Signal style:
 * SideNav | Danh sách cuộc gọi | Pane trống gợi ý.
 */
export function CallsView() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const totalUnread = useMemo(() => MOCK_CONVERSATIONS.reduce((n, c) => n + c.unread, 0), [])

  const calls = useMemo(() => {
    const q = query.trim().toLowerCase()
    return MOCK_CALLS.filter((c) => !q || c.name.toLowerCase().includes(q) || c.time.toLowerCase().includes(q))
  }, [query])

  return (
    <main className="flex h-dvh w-full overflow-hidden bg-background pb-16 text-foreground md:pb-0">
      <SideNav
        active="calls"
        totalUnread={totalUnread}
        onOpenSettings={() => navigate(ROUTES.settings)}
        onChange={(tab) => navigate(ROUTES.messages, { state: { tab } })}
      />

      {/* Cột 2: Danh sách cuộc gọi */}
      <aside className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col border-r border-border bg-card md:w-88 md:flex-none lg:w-100" aria-label={t('chat.calls')}>
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 px-4 pt-3 pb-1 sm:px-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(ROUTES.messages)}
              aria-label={t('chat.backToMessages')}
              className="grid size-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
            </button>
            <h1 className="text-xl font-bold tracking-tight text-foreground">{t('chat.calls')}</h1>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              aria-label={t('chat.callLink')}
              className="grid size-10 place-items-center rounded-xl text-brand-ink transition-colors hover:bg-muted"
            >
              <PhoneCall className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={t('chat.moreOptions')}
              className="grid size-10 place-items-center rounded-xl text-brand-ink transition-colors hover:bg-muted"
            >
              <DotsThree className="size-5" strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="px-4 pb-2 sm:px-5">
          <label className="chat-search group flex items-center gap-2 rounded-full border border-border bg-muted px-3.5 py-2 transition-all duration-150 focus-within:border-ring focus-within:bg-card">
            <Search className="size-4.5 shrink-0 text-muted-foreground transition-colors group-focus-within:text-brand-ink" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('chat.searchCalls')}
              aria-label={t('chat.searchCalls')}
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3" role="list" aria-label={t('chat.calls')}>
          {calls.length === 0 ? (
            <p className="px-4 pt-6 text-center text-sm text-muted-foreground">{t('chat.noCalls')}</p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {calls.map((call) => (
                <li key={call.id} role="listitem">
                  <CallRow call={call} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Cột 3: Pane trống — Signal style */}
      <section className="hidden h-full min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-3 p-8 text-center md:flex" aria-label={t('chat.calls')}>
        <span className="grid size-16 place-items-center rounded-3xl text-brand-ink">
          <Phone className="size-14" strokeWidth={1.25} aria-hidden="true" />
        </span>
        <p className="max-w-sm text-sm text-muted-foreground">{t('chat.callsHint')}</p>
      </section>
    </main>
  )
}
