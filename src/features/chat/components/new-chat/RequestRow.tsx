import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { CheckIcon as CheckData, MultiplicationSignIcon as XData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const Check = createIcon(CheckData)
const X = createIcon(XData)
import { toast } from 'sonner'
import { conversationPath } from '@/config/constants'
import { useAcceptFriendRequest, useBlockUser, useCancelFriendRequest, useDeclineFriendRequest } from '../../hooks/useFriends'
import type { FriendRequest } from '../../types/chat.types'
import { Avatar } from './kit'

export function RequestRow({ request }: { request: FriendRequest }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const accept = useAcceptFriendRequest()
  const decline = useDeclineFriendRequest()
  const cancel = useCancelFriendRequest()
  const block = useBlockUser()
  const isIncoming = request.direction === 'incoming'

  const onError = (error: unknown) => toast.error(error instanceof Error ? error.message : t('common.error'))
  const handleAccept = () =>
    accept.mutate(request.id, {
      onSuccess: (conversation) => {
        toast.success(t('chat.friendRequestAccepted'))
        navigate(conversationPath(conversation.id))
      },
      onError,
    })
  const handleDecline = () =>
    decline.mutate(request.id, {
      onSuccess: () => toast.info(t('chat.friendRequestDeclined')),
      onError,
    })
  const handleCancel = () =>
    cancel.mutate(request.id, {
      onSuccess: () => toast.info(t('chat.friendRequestCancelled')),
      onError,
    })
  const handleBlock = () =>
    block.mutate(request.user.id, {
      onSuccess: () => toast.warning(t('chat.userBlocked')),
      onError: (error) => toast.error(error instanceof Error ? error.message : t('common.error')),
    })

  return (
    <li className="chat-item flex w-full items-center gap-3 rounded-2xl px-3 py-2.5">
      <Avatar name={request.user.name} src={request.user.avatarUrl} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{request.user.name}</p>
        <p className="truncate text-xs text-muted-foreground">@{request.user.username}</p>
      </div>
      {isIncoming ? (
        <span className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={handleAccept}
            disabled={accept.isPending || block.isPending}
            aria-label={`${t('chat.accept')} ${request.user.name}`}
            className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
          >
            <Check className="size-4.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleDecline}
            disabled={decline.isPending || block.isPending}
            aria-label={`${t('chat.decline')} ${request.user.name}`}
            className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-all hover:bg-muted active:scale-95 disabled:opacity-50"
          >
            <X className="size-4.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleBlock}
            disabled={block.isPending || accept.isPending || decline.isPending}
            className="shrink-0 rounded-full border border-destructive/30 px-2.5 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          >
            {t('chat.blockUser')}
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={handleCancel}
          disabled={cancel.isPending}
          className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          {cancel.isPending ? t('chat.pending') : t('chat.cancelRequest')}
        </button>
      )}
    </li>
  )
}
