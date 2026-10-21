import {
  ArrowLeft01Icon as ArrowLeftData,
  CallIcon as PhoneData,
  Video01Icon as VideoData,
} from '@hugeicons/core-free-icons'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { createIcon } from '@/components/icons/hugeIcon'
import { ROUTES } from '@/config/constants'
import { SideNav } from './SideNav'
import { useConversationsQuery } from '../hooks/useChatQueries'
import { useFriends } from '../hooks/useFriends'
import { Avatar, SearchBox } from './new-chat/kit'

const ArrowLeft = createIcon(ArrowLeftData)
const Phone = createIcon(PhoneData)
const Video = createIcon(VideoData)

export function NewCallView() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const friendsQuery = useFriends()
  const conversationsQuery = useConversationsQuery()
  const totalUnread = (conversationsQuery.data ?? []).reduce((count, conversation) => count + conversation.unread, 0)
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const friends = useMemo(
    () =>
      (friendsQuery.data ?? []).filter(
        (friend) =>
          !normalizedQuery ||
          friend.name.toLocaleLowerCase().includes(normalizedQuery) ||
          friend.username.toLocaleLowerCase().includes(normalizedQuery),
      ),
    [friendsQuery.data, normalizedQuery],
  )
  const groups = useMemo(
    () =>
      (conversationsQuery.data ?? []).filter(
        (conversation) =>
          conversation.isGroup &&
          (!normalizedQuery || conversation.name.toLocaleLowerCase().includes(normalizedQuery)),
      ),
    [conversationsQuery.data, normalizedQuery],
  )
  const callUnavailable = () => toast.info(t('chat.callsNotAvailable'))

  return (
    <main className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <SideNav
        active="calls"
        totalUnread={totalUnread}
        onOpenSettings={() => navigate(ROUTES.settings)}
        onChange={(tab) =>
          navigate(tab === 'calls' ? ROUTES.calls : ROUTES.messages, { state: { tab } })
        }
      />

      <aside
        className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col border-r border-border bg-card md:w-88 md:flex-none lg:w-100"
        aria-label={t('chat.newCall')}
      >
        <header className="relative flex h-14 shrink-0 items-center justify-center px-4 pt-3 pb-1">
          <button
            type="button"
            onClick={() => navigate(ROUTES.calls)}
            aria-label={t('chat.backToCalls')}
            className="absolute left-3 grid size-10 place-items-center rounded-xl text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </button>
          <h1 className="text-lg font-bold tracking-tight text-foreground">{t('chat.newCall')}</h1>
        </header>

        <div className="px-4 pb-2 sm:px-5">
          <SearchBox value={query} onChange={setQuery} hint={t('chat.searchPeopleHint')} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          <h2 className="px-2 pt-3 pb-2 text-sm font-semibold text-foreground">{t('chat.newChatContacts')}</h2>
          {friendsQuery.isPending ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">{t('chat.pending')}</p>
          ) : friendsQuery.isError ? (
            <p className="px-2 py-3 text-sm text-destructive">{t('chat.friendsLoadError')}</p>
          ) : friends.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">{t('chat.noPeople')}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {friends.map((friend) => (
                <li key={friend.id} className="flex min-h-16 items-center gap-3 rounded-xl px-2">
                  <Avatar name={friend.name} />
                  <span className="min-w-0 flex-1 truncate text-[15px] text-foreground">{friend.name}</span>
                  <button
                    type="button"
                    onClick={callUnavailable}
                    aria-label={t('chat.startVoiceCallWith', { name: friend.name })}
                    title={t('chat.voiceCall')}
                    className="grid size-10 shrink-0 place-items-center rounded-xl text-foreground transition-colors hover:bg-muted"
                  >
                    <Phone className="size-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={callUnavailable}
                    aria-label={t('chat.startVideoCallWith', { name: friend.name })}
                    title={t('chat.videoCall')}
                    className="grid size-10 shrink-0 place-items-center rounded-xl text-foreground transition-colors hover:bg-muted"
                  >
                    <Video className="size-5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <h2 className="px-2 pt-5 pb-2 text-sm font-semibold text-foreground">{t('chat.newChatGroups')}</h2>
          {conversationsQuery.isPending ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">{t('chat.pending')}</p>
          ) : conversationsQuery.isError ? (
            <p className="px-2 py-3 text-sm text-destructive">{t('chat.conversationsLoadError')}</p>
          ) : groups.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">{t('chat.noGroups')}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {groups.map((group) => (
                <li key={group.id} className="flex min-h-16 items-center gap-3 rounded-xl px-2">
                  <Avatar name={group.name} square />
                  <span className="min-w-0 flex-1 truncate text-[15px] text-foreground">{group.name}</span>
                  <button
                    type="button"
                    onClick={callUnavailable}
                    aria-label={t('chat.startVideoCallWith', { name: group.name })}
                    title={t('chat.videoCall')}
                    className="grid size-10 shrink-0 place-items-center rounded-xl text-foreground transition-colors hover:bg-muted"
                  >
                    <Video className="size-5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <section className="hidden h-full min-h-0 min-w-0 flex-1 md:block" aria-hidden="true" />
    </main>
  )
}
