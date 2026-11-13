import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Message02Icon as MessageCircleData,
  MoreHorizontalIcon as DotsData,
  UserBlock01Icon as UserBlockData,
  UserRemove01Icon as UserRemoveData,
} from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useBlockUser, useRemoveFriend } from '../../hooks/useFriends'

const Dots = createIcon(DotsData)
const MessageCircle = createIcon(MessageCircleData)
const UserRemove = createIcon(UserRemoveData)
const UserBlock = createIcon(UserBlockData)

/**
 * Menu 3 chấm trên row bạn bè: nhắn tin / hủy kết bạn / chặn (có Dialog xác nhận).
 */
export function FriendRowMenu({
  id,
  name,
  onMessage,
}: {
  id: string
  name: string
  onMessage: () => void
}) {
  const { t } = useTranslation()
  const removeFriend = useRemoveFriend()
  const blockUser = useBlockUser()

  const [unfriendOpen, setUnfriendOpen] = useState(false)
  const [blockOpen, setBlockOpen] = useState(false)

  const handleConfirmRemove = () => {
    removeFriend.mutate(id, {
      onSuccess: () => {
        toast.success(t('chat.friendRemoved'))
        setUnfriendOpen(false)
      },
      onError: (error) => toast.error(error instanceof Error ? error.message : t('common.error')),
    })
  }

  const handleConfirmBlock = () => {
    blockUser.mutate(id, {
      onSuccess: () => {
        toast.warning(t('chat.userBlocked'))
        setBlockOpen(false)
      },
      onError: (error) => toast.error(error instanceof Error ? error.message : t('common.error')),
    })
  }

  return (
    <>
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
            <MessageCircle className="size-4 mr-2" />
            {t('chat.menuMessage')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setUnfriendOpen(true)}>
            <UserRemove className="size-4 mr-2" />
            {t('chat.removeFriend')}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setBlockOpen(true)}>
            <UserBlock className="size-4 mr-2" />
            {t('chat.blockUser')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={unfriendOpen} onOpenChange={setUnfriendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('chat.unfriendConfirmTitle', { name })}</DialogTitle>
            <DialogDescription>{t('chat.unfriendConfirmDesc', { name })}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setUnfriendOpen(false)}
              disabled={removeFriend.isPending}
            >
              {t('chat.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRemove}
              disabled={removeFriend.isPending}
            >
              {removeFriend.isPending ? t('common.loading') : t('chat.unfriendAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('chat.blockConfirmTitle', { name })}</DialogTitle>
            <DialogDescription>{t('chat.blockConfirmDesc', { name })}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setBlockOpen(false)}
              disabled={blockUser.isPending}
            >
              {t('chat.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmBlock}
              disabled={blockUser.isPending}
            >
              {blockUser.isPending ? t('common.loading') : t('chat.blockAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
