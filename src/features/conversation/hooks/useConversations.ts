import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/infrastructure/query/keys'
import {
  getConversationById,
  getConversations,
  getOrCreateDirectConversation,
  createGroup,
  uploadGroupAvatar,
} from '../api/conversation.api'
import { getGroupMembers } from '../api/conversation.api'
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

export function useGroupMembersQuery(conversationId: string | null, enabled = true) {
  return useQuery({
    queryKey: conversationKeys.groupMembers(conversationId ?? 'none'),
    queryFn: () => {
      if (!conversationId) throw new Error('No group selected')
      return getGroupMembers(conversationId)
    },
    enabled: Boolean(conversationId) && enabled,
    staleTime: 30_000,
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

export function useCreateGroupMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createGroup,
    onSuccess: (group) => {
      queryClient.setQueryData<ConversationResponse[]>(conversationKeys.conversations, (current) =>
        current ? [group, ...current.filter((item) => item.id !== group.id)] : [group],
      )
      queryClient.setQueryData(conversationKeys.conversation(group.id), group)
      void queryClient.invalidateQueries({ queryKey: conversationKeys.conversations })
    },
  })
}

export function useUploadGroupAvatarMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId, file }: { conversationId: string; file: File }) =>
      uploadGroupAvatar(conversationId, file),
    onSuccess: (group) => {
      queryClient.setQueryData(conversationKeys.conversation(group.id), group)
      queryClient.setQueryData<ConversationResponse[]>(conversationKeys.conversations, (current) =>
        current?.map((item) => (item.id === group.id ? group : item)),
      )
      void queryClient.invalidateQueries({ queryKey: conversationKeys.conversations })
    },
  })
}
