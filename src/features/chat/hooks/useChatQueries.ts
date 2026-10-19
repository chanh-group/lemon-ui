import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { queryKeys } from '@/infrastructure/query/keys'
import {
  getConversations,
  getConversationMessages,
  getOrCreateDirectConversation,
  markConversationRead,
  revokeMessage,
  sendMessage,
} from '../api/chat.api'
import { mapConversationResponse } from '../utils/chat.mapper'
import type {
  Conversation,
  ConversationResponse,
  MessageResponse,
  MessageTimelineResponse,
} from '../types/chat.types'

export const CHAT_QUERY_KEYS = queryKeys.chat

/** Hook lấy danh sách hội thoại Inbox */
export function useConversationsQuery() {
  return useQuery<ConversationResponse[], Error, Conversation[]>({
    queryKey: CHAT_QUERY_KEYS.conversations,
    queryFn: () => getConversations(50),
    select: (data) => data.map((item) => mapConversationResponse(item)),
    staleTime: 1000 * 30, // 30s
  })
}

/** Hook lấy lịch sử tin nhắn của một cuộc hội thoại */
export function useConversationMessagesQuery(conversationId: string | null) {
  return useQuery<MessageTimelineResponse>({
    queryKey: CHAT_QUERY_KEYS.messages(conversationId ?? 'none'),
    queryFn: () => {
      if (!conversationId) {
        return Promise.resolve({ items: [], hasMore: false })
      }
      return getConversationMessages(conversationId)
    },
    enabled: Boolean(conversationId),
    staleTime: 1000 * 60, // 1 phút
  })
}

/** Hook gửi tin nhắn mới */
export function useSendMessageMutation(conversationId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (text: string) => {
      if (!conversationId) throw new Error('No conversation selected')
      const clientMsgId = crypto.randomUUID()
      return sendMessage(conversationId, {
        body: text,
        clientMsgId,
        kind: 'TEXT',
      })
    },
    onSuccess: (newMessage: MessageResponse) => {
      if (!conversationId) return

      // Cập nhật messages cache
      queryClient.setQueryData<MessageTimelineResponse>(
        CHAT_QUERY_KEYS.messages(conversationId),
        (old) => {
          if (!old) return { items: [newMessage], hasMore: false }
          // Tránh duplicate nếu socket đã add trước đó
          if (old.items.some((m) => m.id === newMessage.id || (m.clientMsgId && m.clientMsgId === newMessage.clientMsgId))) {
            return old
          }
          return {
            ...old,
            items: [...old.items, newMessage],
          }
        },
      )

      // Cập nhật preview trong conversations cache
      queryClient.setQueryData<ConversationResponse[]>(
        CHAT_QUERY_KEYS.conversations,
        (old) => {
          if (!old) return old
          return old.map((conv) => {
            if (conv.id === conversationId) {
              return {
                ...conv,
                lastMessagePreview: newMessage.body,
                lastMessageAt: newMessage.createdAt,
              }
            }
            return conv
          })
        },
      )
    },
  })
}

/** Hook tạo hoặc mở phòng chat 1-1 với user */
export function useCreateDirectChatMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (targetUserId: string) => getOrCreateDirectConversation(targetUserId),
    onSuccess: (newConv: ConversationResponse) => {
      // Invalidate hoặc thêm vào danh sách conversations
      queryClient.setQueryData<ConversationResponse[]>(
        CHAT_QUERY_KEYS.conversations,
        (old) => {
          if (!old) return [newConv]
          if (old.some((c) => c.id === newConv.id)) {
            return old.map((c) => (c.id === newConv.id ? newConv : c))
          }
          return [newConv, ...old]
        },
      )
    },
  })
}

/** Hook đánh dấu đã đọc */
export function useMarkReadMutation() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: ({ conversationId, lastReadMessageId }: { conversationId: string; lastReadMessageId: string }) =>
      markConversationRead(conversationId, lastReadMessageId),
    onSuccess: (_, { conversationId }) => {
      // Reset unreadCount trong conversations cache
      queryClient.setQueryData<ConversationResponse[]>(
        CHAT_QUERY_KEYS.conversations,
        (old) => {
          if (!old) return old
          return old.map((conv) => (conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv))
        },
      )
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('chat.markReadError'))
    },
  })
}

/** Hook thu hồi tin nhắn */
export function useRevokeMessageMutation(conversationId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (messageId: string) => revokeMessage(messageId),
    onSuccess: (revokedMsg) => {
      if (!conversationId) return
      queryClient.setQueryData<MessageTimelineResponse>(
        CHAT_QUERY_KEYS.messages(conversationId),
        (old) => {
          if (!old) return old
          return {
            ...old,
            items: old.items.map((m) =>
              m.id === revokedMsg.id ? { ...m, deletedAt: revokedMsg.deletedAt } : m,
            ),
          }
        },
      )
    },
  })
}
