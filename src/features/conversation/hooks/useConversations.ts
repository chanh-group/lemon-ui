import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/infrastructure/query/keys'
import {
  getConversationById,
  getConversations,
  getOrCreateDirectConversation,
} from '../api/conversation.api'
import { mapConversationResponse } from '../utils/chat.mapper'
import type { Conversation, ConversationResponse } from '../types/conversation.types'

const conversationKeys = queryKeys.chat

/** Hook lấy danh sách hội thoại Inbox */
export function useConversationsQuery() {
  return useQuery<ConversationResponse[], Error, Conversation[]>({
    queryKey: conversationKeys.conversations,
    queryFn: () => getConversations(50),
    select: (data) => data.map(mapConversationResponse),
    staleTime: 1000 * 30,
  })
}

/** Lấy chi tiết hội thoại khi mở trực tiếp bằng URL nhưng chưa có trong inbox. */
export function useConversationQuery(conversationId: string | null, enabled = true) {
  return useQuery<ConversationResponse, Error, Conversation>({
    queryKey: conversationKeys.conversation(conversationId ?? 'none'),
    queryFn: () => {
      if (!conversationId) throw new Error('No conversation selected')
      return getConversationById(conversationId)
    },
    select: mapConversationResponse,
    enabled: Boolean(conversationId) && enabled,
    staleTime: 1000 * 30,
  })
}

/** Hook tạo hoặc mở phòng chat 1-1 với user. */
export function useCreateDirectChatMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (targetUserId: string) => getOrCreateDirectConversation(targetUserId),
    onSuccess: (newConversation: ConversationResponse) => {
      queryClient.setQueryData<ConversationResponse[]>(
        conversationKeys.conversations,
        (current) => {
          if (!current) return [newConversation]
          if (current.some((conversation) => conversation.id === newConversation.id)) {
            return current.map((conversation) =>
              conversation.id === newConversation.id ? newConversation : conversation,
            )
          }
          return [newConversation, ...current]
        },
      )
    },
  })
}
