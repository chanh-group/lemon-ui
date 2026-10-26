import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useFriendRequests, useFriends, useSendFriendRequest } from '../../hooks/useFriends'
import type { ChatUser } from '../../types/chat.types'
import { Avatar } from './kit'

/** Kết quả tìm user theo username / email. */
export function SearchResultCard({ user, onMessage }: { user: ChatUser; onMessage: () => void }) {
  const { t } = useTranslation()
  const sendRequest = useSendFriendRequest()
  const requests = useFriendRequests()
  const friends = useFriends()
  const relationUnavailable = !friends.isSuccess || !requests.isSuccess
  const relationLoading = friends.isPending || requests.isPending
  const data = requests.data
  const isFriend = friends.data?.some((friend) => friend.id === user.id) ?? false
  const isPending = data?.outgoing.some((r) => r.user.id === user.id) || data?.incoming.some((r) => r.user.id === user.id) || false

  const displayName = user.name || user.username

  return (
    <div className="mx-2 flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
      <Avatar name={displayName} src={user.avatarUrl} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
        <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
      </div>
      {relationUnavailable ? (
        <span className="shrink-0 rounded-full bg-muted px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">
          {relationLoading ? t('chat.pending') : t('chat.relationshipLoadError')}
        </span>
      ) : isFriend ? (
        <button
          type="button"
          onClick={onMessage}
          className="shrink-0 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground transition-all hover:opacity-90 active:scale-95"
        >
          {t('chat.menuMessage')}
        </button>
      ) : isPending ? (
        <span className="shrink-0 rounded-full bg-muted px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">
          {t('chat.pending')}
        </span>
      ) : (
        <button
          type="button"
          onClick={() =>
            sendRequest.mutate(user.id, {
              onSuccess: () => toast.success(t('chat.friendRequestSent')),
              onError: (error) => toast.error(error instanceof Error ? error.message : t('common.error')),
            })
          }
          disabled={sendRequest.isPending}
          className="shrink-0 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
        >
          {sendRequest.isPending ? t('chat.pending') : t('chat.addFriend')}
        </button>
      )}
    </div>
  )
}
