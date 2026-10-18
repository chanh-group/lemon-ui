import { useTranslation } from 'react-i18next'
import { Message02Icon as MessageCircleData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const MessageCircle = createIcon(MessageCircleData)
import { toast } from 'sonner'
import { useFriendRequests, useSendFriendRequest } from '../../hooks/useFriends'
import type { ChatUser } from '../../types/chat.types'
import { Avatar } from './kit'

/** Kết quả tìm user theo username / email. */
export function SearchResultCard({ user, onMessage }: { user: ChatUser; onMessage: () => void }) {
  const { t } = useTranslation()
  const sendRequest = useSendFriendRequest()
  // Trạng thái lời mời với user này (kiểm tra trong requests đang load)
  const { data } = useFriendRequests()
  const isPending =
    data?.outgoing.some((r) => r.user.id === user.id) || data?.incoming.some((r) => r.user.id === user.id) || false

  return (
    <div className="mx-2 flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
      <Avatar name={user.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
      </div>
      {isPending ? (
        <span className="shrink-0 rounded-full bg-muted px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">
          {t('chat.pending')}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => sendRequest.mutate(user.id, { onSuccess: () => toast.success(t('chat.friendRequestSent')) })}
          disabled={sendRequest.isPending}
          className="shrink-0 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
        >
          {sendRequest.isPending ? t('chat.pending') : t('chat.addFriend')}
        </button>
      )}
      <button
        type="button"
        onClick={onMessage}
        className="grid size-9 shrink-0 place-items-center rounded-full text-brand-ink transition-colors hover:bg-muted"
        aria-label={t('chat.menuMessage')}
      >
        <MessageCircle className="size-5" aria-hidden="true" />
      </button>
    </div>
  )
}
