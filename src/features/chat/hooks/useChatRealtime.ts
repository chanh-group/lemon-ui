import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/app/providers/AuthProvider'
import {
  connectChatSocket,
  disconnectChatSocket,
  getChatSocket,
  joinConversation,
  leaveConversation,
} from '@/lib/socket'
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
  const queryClient = useQueryClient()
  const [partnerTypingMap, setPartnerTypingMap] = useState<Record<string, boolean>>({})

  // 1. Quản lý kết nối socket theo trạng thái đăng nhập
  useEffect(() => {
    if (status !== 'authenticated' || !user) {
      disconnectChatSocket()
      return
    }

    connectChatSocket()

    return () => {
      // Giữ kết nối khi đổi tab/page trong phiên đăng nhập
    }
  }, [status, user])

  // 2. Quản lý tham gia / rời phòng chat khi activeConversationId thay đổi
  useEffect(() => {
    if (!activeConversationId || status !== 'authenticated') return

    joinConversation(activeConversationId)

    return () => {
      leaveConversation(activeConversationId)
    }
  }, [activeConversationId, status])

  // 3. Đăng ký các realtime event listeners
  useEffect(() => {
    if (status !== 'authenticated') return

    const socket = getChatSocket()

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
      queryClient.setQueryData<ConversationResponse[]>(
        CHAT_QUERY_KEYS.conversations,
        (old) => {
          if (!old) return old
          return old.map((c) => {
            if (c.id === convId) {
              const isCurrentActive = convId === activeConversationId
              return {
                ...c,
                lastMessagePreview: msg.deletedAt ? 'Tin nhắn đã bị thu hồi' : (msg.body ?? ''),
                lastMessageAt: msg.createdAt,
                unreadCount: isCurrentActive || msg.senderId === user?.id ? c.unreadCount : (c.unreadCount || 0) + 1,
              }
            }
            return c
          })
        },
      )

      // Nếu đang mở đúng conversation này và tin nhắn do đối phương gửi -> Đánh dấu đã đọc
      if (convId === activeConversationId && user?.id && msg.senderId !== user.id) {
        markConversationRead(convId, msg.id).catch(() => {})
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

      // Cập nhật preview nếu là tin nhắn cuối
      queryClient.setQueryData<ConversationResponse[]>(
        CHAT_QUERY_KEYS.conversations,
        (old) => {
          if (!old) return old
          return old.map((c) => (c.id === updated.conversationId ? { ...c, lastMessagePreview: updated.body } : c))
        },
      )
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

      queryClient.setQueryData<ConversationResponse[]>(
        CHAT_QUERY_KEYS.conversations,
        (old) => {
          if (!old) return old
          return old.map((c) =>
            c.id === revoked.conversationId ? { ...c, lastMessagePreview: 'Tin nhắn đã bị thu hồi' } : c,
          )
        },
      )
    }

    // D. Đối phương đang gõ phím
    const handleTyping = (data: TypingEventPayload) => {
      if (data.userId === user?.id) return
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
      socket.off('message:new', handleNewMessage)
      socket.off('message:updated', handleMessageUpdated)
      socket.off('message:revoked', handleMessageRevoked)
      socket.off('typing', handleTyping)
      socket.off('read:updated', handleReadUpdated)
    }
  }, [status, activeConversationId, user?.id, queryClient])

  const isPartnerTyping = Boolean(activeConversationId && partnerTypingMap[activeConversationId])

  return {
    isPartnerTyping,
  }
}
