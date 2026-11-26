import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { CheckIcon as CheckData, MultiplicationSignIcon as XData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const Check = createIcon(CheckData)
const X = createIcon(XData)
import { toast } from 'sonner'
import { conversationPath } from '@/config/constants'
import {
  isFriendRequestNotFoundError,
  useAcceptFriendRequest,
  useBlockUser,
  useCancelFriendRequest,
  useDeclineFriendRequest,
} from '@/features/friend/hooks/useFriends'
import type { FriendRequest } from '@/features/friend/types/friend.types'
import { Avatar } from './kit'

export function RequestRow({ request }: { request: FriendRequest }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const accept = useAcceptFriendRequest()
  const decline = useDeclineFriendRequest()
  const cancel = useCancelFriendRequest()
  const block = useBlockUser()
  const isIncoming = request.direction === 'incoming'
  const actionPending = useRef(false)
  const isPending = accept.isPending || decline.isPending || cancel.isPending || block.isPending
  const startAction = (action: () => void) => {
    if (actionPending.current) return
    actionPending.current = true
    action()
  }
  const onSettled = () => {
    actionPending.current = false
  }

  const onError = (error: unknown) => {
    if (isFriendRequestNotFoundError(error)) {
      // Lời mời đã được xử lý hoặc không còn tồn tại trên server:
      // Tự động xóa khỏi giao diện mà không báo lỗi làm phiền người dùng.
      return
    }
    toast.error(error instanceof Error ? error.message : t('common.error'))
  }
  const handleAccept = () =>
    startAction(() =>
      accept.mutate(request.id, {
        onSuccess: (conversation) => {
          toast.success(t('chat.friendRequestAccepted'))
          navigate(conversationPath(conversation.id))
        },
        onError,
        onSettled,
      }),
    )
  const handleDecline = () =>
    startAction(() =>
      decline.mutate(request.id, {
        onSuccess: () => toast.info(t('chat.friendRequestDeclined')),
        onError,
        onSettled,
      }),
    )
  const handleCancel = () =>
    startAction(() =>
      cancel.mutate(request.id, {
        onSuccess: () => toast.info(t('chat.friendRequestCancelled')),
        onError,
        onSettled,
      }),
    )
  const handleBlock = () =>
    startAction(() =>
      block.mutate(request.user.id, {
        onSuccess: () => toast.warning(t('chat.userBlocked')),
        onError: (error) => toast.error(error instanceof Error ? error.message : t('common.error')),
        onSettled,
      }),
    )

  return (
    <li
      aria-busy={isPending}
      className="chat-item flex w-full items-center gap-3 rounded-2xl px-3 py-2.5"
    >
      <Avatar name={request.user.name} src={request.user.avatarUrl} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{request.user.name}</p>
        <p className="truncate text-xs text-muted-foreground">@{request.user.username}</p>
        {isPending && (
          <p role="status" className="text-xs text-muted-foreground">
            {t('chat.pending')}
          </p>
        )}
      </div>
      {isIncoming ? (
        <span className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={handleAccept}
            disabled={isPending}
            aria-label={`${t('chat.accept')} ${request.user.name}`}
            className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
          >
            <Check className="size-4.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleDecline}
            disabled={isPending}
            aria-label={`${t('chat.decline')} ${request.user.name}`}
            className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-all hover:bg-muted active:scale-95 disabled:opacity-50"
          >
            <X className="size-4.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleBlock}
            disabled={isPending}
            className="shrink-0 rounded-full border border-destructive/30 px-2.5 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          >
            {t('chat.blockUser')}
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          {cancel.isPending ? t('chat.pending') : t('chat.cancelRequest')}
        </button>
      )}
    </li>
  )
}
