import { useEffect, useRef, useState } from 'react'
import { useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/api'
import {
  connectChatSocket,
  disconnectChatSocket,
  getChatSocket,
  type SocketConnectionStatus,
} from '@/lib/socket'
import { CHAT_QUERY_KEYS, type MessagePageParam } from './useChatQueries'
import { getConversationMessages } from '../api/chat.api'
import { fetchMissedMessages } from '../utils/messageSync'
import type {
  ConversationResponse,
  MessageReactionPayload,
  MessageResponse,
  MessageRevokedPayload,
  MessageTimelineResponse,
  TypingEventPayload,
} from '../types/chat.types'

export function mergeMessagesByTime(
  existing: MessageResponse[],
  incoming: MessageResponse[],
): MessageResponse[] {
  const messages = new Map(existing.map((message) => [message.id, message]))
  incoming.forEach((message) => messages.set(message.id, message))
  return [...messages.values()].sort(
    (left, right) =>
      Date.parse(left.createdAt) - Date.parse(right.createdAt) || left.id.localeCompare(right.id),
  )
}

export function correlateSentMessage(
  messages: MessageResponse[],
  id: string,
  clientMsgId: string,
): MessageResponse[] {
  const existing = messages.find((message) => message.id === id)
  return messages.flatMap((message) => {
    if (message === existing) return [{ ...message, clientMsgId }]
    if (message.clientMsgId !== clientMsgId) return [message]
    if (existing && existing !== message) return []
    return [{ ...message, id }]
  })
}

export function useChatRealtime(activeConversationId: string | null) {
  const { user, status } = useAuth()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [partnerTypingMap, setPartnerTypingMap] = useState<Record<string, boolean>>({})
  const refreshedInboxOnConnection = useRef(false)
  const [connectionStatus, setConnectionStatus] = useState<SocketConnectionStatus | null>(() => {
    if (status !== 'authenticated') return null
    const socket = getChatSocket()
    return socket.connected ? 'connected' : socket.active ? 'connecting' : 'disconnected'
  })
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
    const refreshInbox = () => {
      if (refreshedInboxOnConnection.current) return
      refreshedInboxOnConnection.current = true
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.conversations })
    }
    const syncMissedMessages = async (conversationId: string) => {
      const live =
        queryClient.getQueryData<MessageResponse[]>(CHAT_QUERY_KEYS.liveMessages(conversationId)) ??
        []
      const timeline = queryClient.getQueryData<
        InfiniteData<MessageTimelineResponse, MessagePageParam>
      >(CHAT_QUERY_KEYS.messages(conversationId))
      const cached = [...(timeline?.pages.flatMap((page) => page.items) ?? []), ...live]
      const lastMessage = cached
        .sort(
          (left, right) =>
            Date.parse(left.createdAt) - Date.parse(right.createdAt) ||
            left.id.localeCompare(right.id),
        )
        .at(-1)
      if (!lastMessage) {
        void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.messages(conversationId) })
        return
      }

      const missed = await fetchMissedMessages(lastMessage.id, (cursor) =>
        getConversationMessages(conversationId, undefined, 100, cursor),
      )

      if (missed.length > 0) {
        queryClient.setQueryData<MessageResponse[]>(
          CHAT_QUERY_KEYS.liveMessages(conversationId),
          (old) => mergeMessagesByTime(old ?? [], missed),
        )
      }
      // Không invalidate timeline: missed đã nằm trong liveMessages, còn refetch
      // infinite query sẽ tải lại mọi trang đã load và presign lại toàn bộ media.
    }
    const handleConnect = () => {
      setConnectionStatus('connected')
      refreshInbox()
      if (activeConversationId) {
        void syncMissedMessages(activeConversationId).catch(() =>
          toast.error(t('chat.messagesLoadError')),
        )
      }
    }
    const handleDisconnect = () => {
      refreshedInboxOnConnection.current = false
      setConnectionStatus('disconnected')
    }
    const handleConnectError = () => setConnectionStatus('error')
    const handleReconnectAttempt = () => setConnectionStatus('connecting')

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleConnectError)
    socket.io.on('reconnect_attempt', handleReconnectAttempt)
    if (socket.connected && activeConversationId) {
      refreshInbox()
      void syncMissedMessages(activeConversationId).catch(() =>
        toast.error(t('chat.messagesLoadError')),
      )
    } else if (socket.connected) {
      refreshInbox()
    }

    const handleMessageCorrelated = ({
      conversationId,
      id,
      clientMsgId,
    }: {
      conversationId: string
      id: string
      clientMsgId: string
    }) => {
      queryClient.setQueryData<MessageResponse[]>(
        CHAT_QUERY_KEYS.liveMessages(conversationId),
        (old) => (old ? correlateSentMessage(old, id, clientMsgId) : old),
      )
    }

    // A. Nhận tin nhắn mới
    const handleNewMessage = (msg: MessageResponse) => {
      const convId = msg.conversationId

      // Cập nhật messages cache nếu đang có dữ liệu trong cache
      if (
        convId === activeConversationId ||
        queryClient.getQueryData(CHAT_QUERY_KEYS.messages(convId))
      ) {
        const timeline = queryClient.getQueryData<
          InfiniteData<MessageTimelineResponse, MessagePageParam>
        >(CHAT_QUERY_KEYS.messages(convId))
        queryClient.setQueryData<MessageResponse[]>(CHAT_QUERY_KEYS.liveMessages(convId), (old) => {
          const alreadyLoaded = timeline?.pages.some((page) =>
            page.items.some(
              (message) =>
                message.id === msg.id ||
                (message.clientMsgId && message.clientMsgId === msg.clientMsgId),
            ),
          )
          if (alreadyLoaded) {
            return old?.filter(
              (m) => m.id !== msg.id && (!msg.clientMsgId || m.clientMsgId !== msg.clientMsgId),
            )
          }

          if (!old) return [msg]
          let replaced = false
          const updated = old.map((m) => {
            if ((m.clientMsgId && m.clientMsgId === msg.clientMsgId) || m.id === msg.id) {
              replaced = true
              return m.clientMsgId ? { ...msg, clientMsgId: m.clientMsgId } : msg
            }
            return m
          })
          return replaced ? updated : [...updated, msg]
        })
      }

      // Cập nhật conversations list
      const conversations = queryClient.getQueryData<ConversationResponse[]>(
        CHAT_QUERY_KEYS.conversations,
      )
      if (conversations?.some((conversation) => conversation.id === convId)) {
        queryClient.setQueryData<ConversationResponse[]>(CHAT_QUERY_KEYS.conversations, (old) =>
          old?.map((conversation) => {
            if (conversation.id !== convId) return conversation
            const preview = msg.deletedAt
              ? '[message-revoked]'
              : (msg.body ?? (msg.attachments && msg.attachments.length > 0 ? '[attachment]' : ''))
            return {
              ...conversation,
              lastMessagePreview: preview,
              lastMessageSenderId: msg.senderId,
              lastMessageAt: msg.createdAt,
              unreadCount:
                  msg.senderId === userId
                  ? conversation.unreadCount
                  : (conversation.unreadCount || 0) + 1,
            }
          }),
        )
      } else {
        void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.conversations })
      }

      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.conversations })
    }

    // B. Tin nhắn được chỉnh sửa
    const handleMessageUpdated = (updated: {
      id: string
      conversationId: string
      body: string
      editedAt: string
    }) => {
      queryClient.setQueryData<InfiniteData<MessageTimelineResponse, MessagePageParam>>(
        CHAT_QUERY_KEYS.messages(updated.conversationId),
        (old) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((m) =>
                m.id === updated.id ? { ...m, body: updated.body, editedAt: updated.editedAt } : m,
              ),
            })),
          }
        },
      )
      queryClient.setQueryData<MessageResponse[]>(
        CHAT_QUERY_KEYS.liveMessages(updated.conversationId),
        (old) =>
          old?.map((message) =>
            message.id === updated.id
              ? { ...message, body: updated.body, editedAt: updated.editedAt }
              : message,
          ),
      )

      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.conversations })
    }

    // C. Tin nhắn bị thu hồi
    const handleMessageRevoked = (revoked: MessageRevokedPayload) => {
      queryClient.setQueryData<InfiniteData<MessageTimelineResponse, MessagePageParam>>(
        CHAT_QUERY_KEYS.messages(revoked.conversationId),
        (old) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((m) =>
                m.id === revoked.id ? { ...m, deletedAt: revoked.deletedAt } : m,
              ),
            })),
          }
        },
      )
      queryClient.setQueryData<MessageResponse[]>(
        CHAT_QUERY_KEYS.liveMessages(revoked.conversationId),
        (old) =>
          old?.map((message) =>
            message.id === revoked.id ? { ...message, deletedAt: revoked.deletedAt } : message,
          ),
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

    const handleReadUpdated = (event: { userId: string }) => {
      if (event.userId === userId) {
        void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.conversations })
      }
    }

    // F. Cập nhật cảm xúc tin nhắn (Điểm A)
    const handleMessageReaction = (payload: MessageReactionPayload) => {
      const convId = payload.conversationId
      queryClient.setQueryData<InfiniteData<MessageTimelineResponse, MessagePageParam>>(
        CHAT_QUERY_KEYS.messages(convId),
        (old) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((m) =>
                m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m,
              ),
            })),
          }
        },
      )
      queryClient.setQueryData<MessageResponse[]>(CHAT_QUERY_KEYS.liveMessages(convId), (old) =>
        old?.map((m) => (m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m)),
      )
    }

    socket.on('message:new', handleNewMessage)
    socket.on('message:correlated', handleMessageCorrelated)
    socket.on('read:updated', handleReadUpdated)
    socket.on('message:updated', handleMessageUpdated)
    socket.on('message:revoked', handleMessageRevoked)
    socket.on('typing', handleTyping)
    socket.on('message:reaction', handleMessageReaction)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleConnectError)
      socket.io.off('reconnect_attempt', handleReconnectAttempt)
      socket.off('message:new', handleNewMessage)
      socket.off('message:correlated', handleMessageCorrelated)
      socket.off('read:updated', handleReadUpdated)
      socket.off('message:updated', handleMessageUpdated)
      socket.off('message:revoked', handleMessageRevoked)
      socket.off('typing', handleTyping)
      socket.off('message:reaction', handleMessageReaction)
    }
  }, [status, activeConversationId, userId, queryClient, t])

  const isPartnerTyping = Boolean(activeConversationId && partnerTypingMap[activeConversationId])

  return {
    isPartnerTyping,
    connectionStatus,
  }
}
