import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AtIcon as AtData, Mail01Icon as MailData, UserAdd01Icon as UserPlusData, UsersIcon as UsersGroupData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const At = createIcon(AtData)
const Mail = createIcon(MailData)
const UserPlus = createIcon(UserPlusData)
const UsersGroup = createIcon(UsersGroupData)
import { ROUTES } from '@/config/constants'
import { toast } from 'sonner'
import { useCreateDirectChatMutation, useConversationsQuery } from '../../hooks/useChatQueries'
import { useFriendRequests, useFriends } from '../../hooks/useFriends'
import type { NewChatPane } from '../../types/new-chat.types'
import { Avatar, SectionLabel, SearchBox } from './kit'
import { FriendRowMenu } from './FriendRowMenu'

/** Màn chính: hành động nhanh + bạn bè + nhóm. */
export function MainPane({ onOpenPane }: { onOpenPane: (pane: Exclude<NewChatPane, 'main'>) => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const { data: requests } = useFriendRequests()
  const friendsQuery = useFriends()
  const conversationsQuery = useConversationsQuery()
  const createDirectChat = useCreateDirectChatMutation()
  const incoming = requests?.incoming ?? []

  const q = query.trim().toLowerCase()
  const friends = useMemo(
    () =>
      (friendsQuery.data ?? []).filter(
        (friend) =>
          !q ||
          friend.name.toLowerCase().includes(q) ||
          friend.username.toLowerCase().includes(q) ||
          friend.email?.toLowerCase().includes(q),
      ),
    [friendsQuery.data, q],
  )
  const groups = useMemo(
    () => (conversationsQuery.data ?? []).filter((conversation) => conversation.isGroup && (!q || conversation.name.toLowerCase().includes(q))),
    [conversationsQuery.data, q],
  )

  const openMessages = (selectId?: string) =>
    navigate(ROUTES.messages, { state: selectId ? { select: selectId } : { tab: 'messages' } })

  const openConversationWith = (friendId: string) => {
    createDirectChat.mutate(friendId, {
      onSuccess: (conversation) => openMessages(conversation.id),
      onError: (error) => toast.error(error instanceof Error ? error.message : t('common.error')),
    })
  }

  useEffect(() => {
    if (friendsQuery.isError) toast.error(friendsQuery.error.message)
  }, [friendsQuery.isError, friendsQuery.error])

  useEffect(() => {
    if (conversationsQuery.isError) toast.error(conversationsQuery.error.message)
  }, [conversationsQuery.isError, conversationsQuery.error])

  return (
    <>
      <div className="px-4 pb-3 sm:px-5">
        <SearchBox value={query} onChange={setQuery} hint={t('chat.searchPeopleHint')} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {/* Hành động nhanh */}
        <ul className="flex flex-col gap-0.5">
          {[
            { key: 'group', icon: UsersGroup, label: t('chat.newChatActionGroup'), onClick: () => onOpenPane('group') },
            { key: 'username', icon: At, label: t('chat.newChatByUsername'), onClick: () => onOpenPane('username') },
            { key: 'email', icon: Mail, label: t('chat.newChatByEmail'), onClick: () => onOpenPane('email') },
            { key: 'requests', icon: UserPlus, label: t('chat.friendRequests'), onClick: () => onOpenPane('requests'), badge: incoming.length },
          ].map(({ key, icon: Icon, label, onClick, badge }) => (
            <li key={key}>
              <button
                type="button"
                onClick={onClick}
                className="chat-item flex w-full items-center gap-3.5 rounded-2xl px-3 py-2.5 text-left transition-all duration-150 hover:translate-x-0.5 hover:bg-muted"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-brand-ink" aria-hidden="true">
                  <Icon className="size-5.5" aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold text-foreground">{label}</span>
                {badge !== undefined && badge > 0 && (
                  <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] leading-5 font-bold text-primary-foreground">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>

        {/* Bạn bè đã kết nối */}
        <SectionLabel>{t('chat.newChatContacts')}</SectionLabel>
        {friendsQuery.isPending ? (
          <p className="px-4 py-2 text-sm text-muted-foreground">{t('chat.pending')}</p>
        ) : friendsQuery.isError ? (
          <p className="px-4 py-2 text-sm text-destructive">{t('chat.friendsLoadError')}</p>
        ) : friends.length === 0 ? (
          <p className="px-4 py-2 text-sm text-muted-foreground">{t('chat.noPeople')}</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {friends.map((friend) => (
              <li key={friend.id}>
                {/* div role=button vì bên trong có nút menu 3 chấm (không được lồng button trong button) */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => openConversationWith(friend.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      openConversationWith(friend.id)
                    }
                  }}
                  className="chat-item group flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-150 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Avatar name={friend.name} />
                  <span className="flex min-w-0 flex-1 items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-foreground">{friend.name}</span>
                    <span className="truncate text-xs text-muted-foreground">@{friend.username}</span>
                  </span>
                  <FriendRowMenu id={friend.id} name={friend.name} onMessage={() => openConversationWith(friend.id)} />
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Nhóm của tôi */}
        <SectionLabel>{t('chat.newChatGroups')}</SectionLabel>
        {conversationsQuery.isPending ? (
          <p className="px-4 py-2 text-sm text-muted-foreground">{t('chat.pending')}</p>
        ) : conversationsQuery.isError ? (
          <p className="px-4 py-2 text-sm text-destructive">{t('chat.conversationsLoadError')}</p>
        ) : groups.length === 0 ? (
          <p className="px-4 py-2 text-sm text-muted-foreground">{t('chat.noGroups')}</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {groups.map((group) => (
              <li key={group.id}>
                <button
                  type="button"
                  onClick={() => openMessages(group.id)}
                  className="chat-item flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-150 hover:bg-muted"
                >
                  <Avatar name={group.name} square />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{group.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
