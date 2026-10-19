import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/api'
import { connectChatSocket, disconnectChatSocket, getChatSocket, type SocketConnectionStatus } from '@/lib/socket'
import { CHAT_QUERY_KEYS } from './useChatQueries'
import { markConversationRead } from '../api/chat.api'
import type {
  ConversationResponse,
  MessageResponse,
  MessageRevokedPayload,
  MessageTimelineResponse,
  ReadUpdatedPayload,
  TypingEventPayload,
} from '../types/chat.types'

export function useChatRealtime(activeConversationId: string | null) {
  const { user, status } = useAuth()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [partnerTypingMap, setPartnerTypingMap] = useState<Record<string, boolean>>({})
  const [connectionStatus, setConnectionStatus] = useState<SocketConnectionStatus>('connecting')
  const userId = user?.id

  // 1. Quản lý kết nối socket theo trạng thái đăng nhập
  useEffect(() => {
    if (status !== 'authenticated' || !userId) {
      disconnectChatSocket()
      return
    }

    connectChatSocket()
  }, [status, userId])

  // 2. Đăng ký realtime event listeners
  useEffect(() => {
    if (status !== 'authenticated') return

    const socket = getChatSocket()
    const handleConnect = () => setConnectionStatus('connected')
    const handleDisconnect = () => setConnectionStatus('disconnected')
    const handleConnectError = () => setConnectionStatus('error')
    const handleReconnectAttempt = () => setConnectionStatus('connecting')

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleConnectError)
    socket.io.on('reconnect_attempt', handleReconnectAttempt)

    // A. Nhận tin nhắn mới
    const handleNewMessage = (msg: MessageResponse) => {
      const convId = msg.conversationId

      // Cập nhật messages cache nếu đang có dữ liệu trong cache
      queryClient.setQueryData<MessageTimelineResponse>(
        CHAT_QUERY_KEYS.messages(convId),
        (old) => {
          if (!old) return { items: [msg], hasMore: false }
          if (old.items.some((m) => m.id === msg.id || (m.clientMsgId && m.clientMsgId === msg.clientMsgId))) {
            return old
          }
          return {
            ...old,
            items: [...old.items, msg],
          }
        },
      )

      // Cập nhật conversations list
      const conversations = queryClient.getQueryData<ConversationResponse[]>(CHAT_QUERY_KEYS.conversations)
      if (conversations?.some((conversation) => conversation.id === convId)) {
        queryClient.setQueryData<ConversationResponse[]>(
          CHAT_QUERY_KEYS.conversations,
          (old) =>
            old?.map((conversation) => {
              if (conversation.id !== convId) return conversation
              const isCurrentActive = convId === activeConversationId
              return {
                ...conversation,
                lastMessagePreview: msg.deletedAt ? 'Tin nhắn đã bị thu hồi' : (msg.body ?? ''),
                lastMessageAt: msg.createdAt,
                unreadCount:
                  isCurrentActive || msg.senderId === userId
                    ? conversation.unreadCount
                    : (conversation.unreadCount || 0) + 1,
              }
            }),
        )
      } else {
        void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.conversations })
      }

      // Nếu đang mở đúng conversation này và tin nhắn do đối phương gửi -> Đánh dấu đã đọc
      if (convId === activeConversationId && userId && msg.senderId !== userId) {
        void markConversationRead(convId, msg.id)
          .then(() => {
            queryClient.setQueryData<ConversationResponse[]>(CHAT_QUERY_KEYS.conversations, (old) =>
              old?.map((conversation) =>
                conversation.id === convId ? { ...conversation, unreadCount: 0 } : conversation,
              ),
            )
          })
          .catch((error: unknown) => {
            toast.error(error instanceof Error ? error.message : t('chat.markReadError'))
          })
      }
    }

    // B. Tin nhắn được chỉnh sửa
    const handleMessageUpdated = (updated: { id: string; conversationId: string; body: string; editedAt: string }) => {
      queryClient.setQueryData<MessageTimelineResponse>(
        CHAT_QUERY_KEYS.messages(updated.conversationId),
        (old) => {
          if (!old) return old
          return {
            ...old,
            items: old.items.map((m) =>
              m.id === updated.id ? { ...m, body: updated.body, editedAt: updated.editedAt } : m,
            ),
          }
        },
      )

      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.conversations })
    }

    // C. Tin nhắn bị thu hồi
    const handleMessageRevoked = (revoked: MessageRevokedPayload) => {
      queryClient.setQueryData<MessageTimelineResponse>(
        CHAT_QUERY_KEYS.messages(revoked.conversationId),
        (old) => {
          if (!old) return old
          return {
            ...old,
            items: old.items.map((m) =>
              m.id === revoked.id ? { ...m, deletedAt: revoked.deletedAt } : m,
            ),
          }
        },
      )

      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.conversations })
    }

    // D. Đối phương đang gõ phím
    const handleTyping = (data: TypingEventPayload) => {
      if (data.userId === userId) return
      setPartnerTypingMap((prev) => ({
        ...prev,
        [data.conversationId]: data.isTyping,
      }))
    }

    // E. Đối phương đã đọc tin nhắn
    const handleReadUpdated = (data: ReadUpdatedPayload) => {
      // Khi đối phương đọc, invalidate messages của conversation để cập nhật trạng thái read
      queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.messages(data.conversationId) })
    }

    socket.on('message:new', handleNewMessage)
    socket.on('message:updated', handleMessageUpdated)
    socket.on('message:revoked', handleMessageRevoked)
    socket.on('typing', handleTyping)
    socket.on('read:updated', handleReadUpdated)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleConnectError)
      socket.io.off('reconnect_attempt', handleReconnectAttempt)
      socket.off('message:new', handleNewMessage)
      socket.off('message:updated', handleMessageUpdated)
      socket.off('message:revoked', handleMessageRevoked)
      socket.off('typing', handleTyping)
      socket.off('read:updated', handleReadUpdated)
    }
  }, [status, activeConversationId, userId, queryClient, t])

  const isPartnerTyping = Boolean(activeConversationId && partnerTypingMap[activeConversationId])

  return {
    isPartnerTyping,
    connectionStatus,
  }
}
