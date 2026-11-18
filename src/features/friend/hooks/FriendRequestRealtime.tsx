import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/api'
import {
  connectChatSocket,
  disconnectChatSocket,
  getChatSocket,
  isChatSocketReady,
} from '@/lib/socket'
import { queryKeys } from '@/infrastructure/query/keys'
import type { ChatUser, FriendRequest } from '../types/friend.types'

export interface SocketReadyEvent {
  userId: string
}

export interface FriendRequestCreatedEvent {
  id: string
  user: {
    id: string
    name: string
    username: string
  }
}

export interface FriendRequestCancelledEvent {
  requestId: string
  requesterId: string
}

export interface FriendRequestAcceptedEvent {
  requestId: string
  addresseeId: string
}

export interface FriendRequestDeclinedEvent {
  requestId: string
  addresseeId: string
}

export interface FriendRemovedEvent {
  friendId: string
}

export function applyFriendRequestCreated(
  current: { incoming: FriendRequest[]; outgoing: FriendRequest[] } | undefined,
  event: FriendRequestCreatedEvent,
): { incoming: FriendRequest[]; outgoing: FriendRequest[] } {
  if (!event.user) return current ?? { incoming: [], outgoing: [] }
  const newReq: FriendRequest = {
    id: event.id,
    user: {
      id: event.user.id,
      name: event.user.name,
      username: event.user.username,
    },
    direction: 'incoming',
    createdAt: new Date().toISOString(),
  }
  if (!current) {
    return {
      incoming: [newReq],
      outgoing: [],
    }
  }
  if (current.incoming.some((r) => r.id === event.id)) return current
  return {
    ...current,
    incoming: [newReq, ...current.incoming],
  }
}

export function applyFriendRequestCancelled(
  current: { incoming: FriendRequest[]; outgoing: FriendRequest[] } | undefined,
  event: FriendRequestCancelledEvent,
): { incoming: FriendRequest[]; outgoing: FriendRequest[] } {
  if (!current) {
    return {
      incoming: [],
      outgoing: [],
    }
  }
  return {
    ...current,
    incoming: current.incoming.filter((r) => r.id !== event.requestId),
    outgoing: current.outgoing.filter((r) => r.id !== event.requestId),
  }
}

export function applyFriendRequestAccepted(
  current: { incoming: FriendRequest[]; outgoing: FriendRequest[] } | undefined,
  event: FriendRequestAcceptedEvent,
): { incoming: FriendRequest[]; outgoing: FriendRequest[] } {
  if (!current) {
    return {
      incoming: [],
      outgoing: [],
    }
  }
  return {
    ...current,
    incoming: current.incoming.filter((r) => r.id !== event.requestId),
    outgoing: current.outgoing.filter(
      (r) => r.id !== event.requestId && r.user.id !== event.addresseeId,
    ),
  }
}

export function applyFriendRequestDeclined(
  current: { incoming: FriendRequest[]; outgoing: FriendRequest[] } | undefined,
  event: FriendRequestDeclinedEvent,
): { incoming: FriendRequest[]; outgoing: FriendRequest[] } {
  if (!current) {
    return {
      incoming: [],
      outgoing: [],
    }
  }
  return {
    ...current,
    incoming: current.incoming.filter((r) => r.id !== event.requestId),
    outgoing: current.outgoing.filter(
      (r) => r.id !== event.requestId && r.user.id !== event.addresseeId,
    ),
  }
}

export function applyFriendRemoved(
  current: ChatUser[] | undefined,
  friendId: string,
): ChatUser[] | undefined {
  if (!current) return current
  return current.filter((f) => f.id !== friendId)
}

export function FriendRequestRealtime() {
  const { status } = useAuth()
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  useEffect(() => {
    if (status === 'anonymous') {
      disconnectChatSocket()
      return
    }
    if (status !== 'authenticated') return

    const socket = getChatSocket()

    const handleFriendRequest = (event: FriendRequestCreatedEvent) => {
      // Cập nhật tức thì query cache cho friendRequests
      queryClient.setQueryData<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>(
        queryKeys.chat.friendRequests,
        (old) => applyFriendRequestCreated(old, event),
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.friendRequests })
      toast.info(t('chat.friendRequestNotificationTitle'), {
        id: `friend-request-${event.id}`,
        description: t('chat.friendRequestNotificationDescription', {
          name: event.user?.name || event.user?.username || '',
        }),
      })
    }

    const handleFriendRequestCancelled = (event: FriendRequestCancelledEvent) => {
      queryClient.setQueryData<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>(
        queryKeys.chat.friendRequests,
        (old) => applyFriendRequestCancelled(old, event),
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.friendRequests })
    }

    const handleFriendRemoved = (event?: FriendRemovedEvent) => {
      if (event?.friendId) {
        queryClient.setQueryData<ChatUser[]>(queryKeys.chat.friends, (old) =>
          applyFriendRemoved(old, event.friendId),
        )
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.friends })
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations })
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.friendRequests })
    }

    const handleFriendRequestAccepted = (event: FriendRequestAcceptedEvent) => {
      const currentData = queryClient.getQueryData<{
        incoming: FriendRequest[]
        outgoing: FriendRequest[]
      }>(queryKeys.chat.friendRequests)
      const acceptedUser = currentData?.outgoing.find(
        (r) => r.id === event.requestId || r.user.id === event.addresseeId,
      )?.user

      queryClient.setQueryData<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>(
        queryKeys.chat.friendRequests,
        (old) => applyFriendRequestAccepted(old, event),
      )
      if (acceptedUser) {
        const friend = acceptedUser
        queryClient.setQueryData<ChatUser[]>(queryKeys.chat.friends, (old) => {
          if (!old) return [friend]
          if (old.some((f) => f.id === friend.id)) return old
          return [...old, friend]
        })
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.friendRequests })
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.friends })
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations })
      toast.success(t('chat.friendRequestAccepted'), {
        id: `friend-request-accepted-${event.requestId}`,
      })
    }

    const handleFriendRequestDeclined = (event: FriendRequestDeclinedEvent) => {
      queryClient.setQueryData<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>(
        queryKeys.chat.friendRequests,
        (old) => applyFriendRequestDeclined(old, event),
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.friendRequests })
    }

    const handleGenericNotification = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.friendRequests })
    }

    const refetchFriendRequests = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.friendRequests })
    }

    const refetchBadges = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.friendRequests })
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations })
    }

    // Backend đã join đủ các room nghiệp vụ thì mới refetch, tránh race condition
    const handleReady = (_event?: SocketReadyEvent) => {
      refetchFriendRequests()
      refetchBadges()
    }

    // Cơ chế tự phục hồi (Hội tụ dữ liệu): Lắng nghe khi người dùng quay lại tab
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refetchFriendRequests()
        refetchBadges()
      }
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }

    socket.on('ready', handleReady)
    socket.on('friend:request:new', handleFriendRequest)
    socket.on('friend:request:cancelled', handleFriendRequestCancelled)
    socket.on('friend:request:accepted', handleFriendRequestAccepted)
    socket.on('friend:request:declined', handleFriendRequestDeclined)
    socket.on('friend:removed', handleFriendRemoved)
    socket.on('notification', handleGenericNotification)
    socket.on('notification:new', handleGenericNotification)

    if (isChatSocketReady()) {
      refetchFriendRequests()
      refetchBadges()
    }

    connectChatSocket()

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
      socket.off('ready', handleReady)
      socket.off('friend:request:new', handleFriendRequest)
      socket.off('friend:request:cancelled', handleFriendRequestCancelled)
      socket.off('friend:request:accepted', handleFriendRequestAccepted)
      socket.off('friend:request:declined', handleFriendRequestDeclined)
      socket.off('friend:removed', handleFriendRemoved)
      socket.off('notification', handleGenericNotification)
      socket.off('notification:new', handleGenericNotification)
    }
  }, [queryClient, status, t])

  return null
}
