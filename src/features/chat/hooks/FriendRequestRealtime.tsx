import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/api'
import { connectChatSocket, disconnectChatSocket, getChatSocket } from '@/lib/socket'
import { queryKeys } from '@/infrastructure/query/keys'

interface FriendRequestCreatedEvent {
  id: string
  user: {
    id: string
    name: string
    username: string
  }
}

export function FriendRequestRealtime() {
  const { status } = useAuth()
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  useEffect(() => {
    if (status !== 'authenticated') {
      disconnectChatSocket()
      return
    }

    const socket = getChatSocket()
    const handleFriendRequest = (event: FriendRequestCreatedEvent) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.friendRequests })
      toast.info(t('chat.friendRequestNotificationTitle'), {
        description: t('chat.friendRequestNotificationDescription', {
          name: event.user.name || event.user.username,
        }),
      })
    }

    const handleFriendRemoved = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.friends })
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations })
    }

    socket.on('friend:request:new', handleFriendRequest)
    socket.on('friend:removed', handleFriendRemoved)
    connectChatSocket()

    return () => {
      socket.off('friend:request:new', handleFriendRequest)
      socket.off('friend:removed', handleFriendRemoved)
    }
  }, [queryClient, status, t])

  return null
}
