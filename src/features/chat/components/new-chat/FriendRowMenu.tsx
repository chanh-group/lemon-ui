import { useTranslation } from 'react-i18next'
import { Message02Icon as MessageCircleData, MoreHorizontalIcon as DotsData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const Dots = createIcon(DotsData)
const MessageCircle = createIcon(MessageCircleData)
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useBlockUser, useRemoveFriend } from '../../hooks/useFriends'

/**
 * Menu 3 chấm trên row bạn bè: nhắn tin / gọi / gọi video / xóa kết bạn / chặn.
 */
export function FriendRowMenu({ id, name, onMessage }: { id: string; name: string; onMessage: () => void }) {
  const { t } = useTranslation()
  const removeFriend = useRemoveFriend()
  const blockUser = useBlockUser()
  const handleRemove = () => {
    removeFriend.mutate(id, {
      onSuccess: () => toast.success(t('chat.friendRemoved')),
      onError: (error) => toast.error(error instanceof Error ? error.message : t('common.error')),
    })
  }
  const handleBlock = () => {
    blockUser.mutate(id, {
      onSuccess: () => toast.warning(t('chat.userBlocked')),
      onError: (error) => toast.error(error instanceof Error ? error.message : t('common.error')),
    })
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${t('chat.moreOptions')} ${name}`}
          onClick={(e) => e.stopPropagation()}
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground opacity-0 transition-all duration-150 hover:bg-border hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
        >
          <Dots className="size-5" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem onClick={onMessage}>
          <MessageCircle />
          {t('chat.menuMessage')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleRemove}>
          {t('chat.removeFriend')}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={handleBlock}>
          {t('chat.blockUser')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
