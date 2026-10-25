import { useEffect, useRef } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { queryKeys } from '@/infrastructure/query/keys'
import {
  getConversationById,
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
const MESSAGE_PAGE_SIZE = 30
const INITIAL_MESSAGE_BUFFER_PAGES = 3

export interface MessagePageParam {
  cursor?: string
  after?: string
}

/** Hook lấy danh sách hội thoại Inbox */
export function useConversationsQuery() {
  return useQuery<ConversationResponse[], Error, Conversation[]>({
    queryKey: CHAT_QUERY_KEYS.conversations,
    queryFn: () => getConversations(50),
    select: (data) => data.map((item) => mapConversationResponse(item)),
    staleTime: 1000 * 30, // 30s
  })
}

/**
 * Lấy chi tiết hội thoại khi mở trực tiếp bằng URL nhưng không nằm trong
 * trang inbox đầu tiên (ví dụ hội thoại cũ hoặc danh sách đang lỗi).
 */
export function useConversationQuery(conversationId: string | null, enabled = true) {
  return useQuery<ConversationResponse, Error, Conversation>({
    queryKey: CHAT_QUERY_KEYS.conversation(conversationId ?? 'none'),
    queryFn: () => {
      if (!conversationId) throw new Error('No conversation selected')
      return getConversationById(conversationId)
    },
    select: (data) => mapConversationResponse(data),
    enabled: Boolean(conversationId) && enabled,
    staleTime: 1000 * 30,
  })
}

/** Giữ tối đa 5 trang quanh vùng đang đọc và tải sẵn 2 trang lịch sử gần nhất. */
export function useConversationMessagesQuery(conversationId: string | null) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const initialPrefetches = useRef(new Set<string>())
  const activeConversationId = useRef(conversationId)
  const query = useInfiniteQuery({
    queryKey: CHAT_QUERY_KEYS.messages(conversationId ?? 'none'),
    queryFn: ({ pageParam }: { pageParam: MessagePageParam }) => {
      if (!conversationId) {
        return Promise.resolve({ items: [], hasMore: false })
      }
      return getConversationMessages(conversationId, pageParam.cursor, MESSAGE_PAGE_SIZE, pageParam.after)
    },
    initialPageParam: {} as MessagePageParam,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.nextCursor ? { cursor: lastPage.nextCursor } : undefined,
    getPreviousPageParam: (firstPage, _allPages, firstPageParam) => {
      if (!firstPageParam.cursor && !firstPageParam.after) return undefined
      if (firstPageParam.after) {
        return firstPage.hasMore && firstPage.nextCursor
          ? { after: firstPage.nextCursor }
          : undefined
      }
      return firstPage.items[0]?.id ? { after: firstPage.items[0].id } : undefined
    },
    maxPages: 5,
    enabled: Boolean(conversationId),
    staleTime: 1000 * 60, // 1 phút
  })
  const liveMessagesQuery = useQuery<MessageResponse[]>({
    queryKey: CHAT_QUERY_KEYS.liveMessages(conversationId ?? 'none'),
    queryFn: () => [],
    enabled: Boolean(conversationId),
    initialData: [],
    staleTime: Infinity,
  })
  const { data, fetchNextPage, isFetchingNextPage } = query
  const latestPage = data?.pages.at(-1)
  const pageCount = data?.pages.length ?? 0

  useEffect(() => {
    activeConversationId.current = conversationId
  }, [conversationId])

  useEffect(() => {
    if (
      !conversationId ||
      pageCount === 0 ||
      !latestPage?.hasMore ||
      pageCount >= INITIAL_MESSAGE_BUFFER_PAGES ||
      isFetchingNextPage ||
      initialPrefetches.current.has(conversationId)
    ) {
      return
    }
    initialPrefetches.current.add(conversationId)
    const prefetchOlderPages = async () => {
      for (let pagesLoaded = pageCount; pagesLoaded < INITIAL_MESSAGE_BUFFER_PAGES; pagesLoaded += 1) {
        if (activeConversationId.current !== conversationId) return
        const current = queryClient.getQueryData<InfiniteData<MessageTimelineResponse, MessagePageParam>>(
          CHAT_QUERY_KEYS.messages(conversationId),
        )
        if (!current?.pages.at(-1)?.hasMore) return
        const result = await fetchNextPage({ cancelRefetch: false })
        if (result.isError) {
          toast.error(t('chat.messagesLoadError'))
          return
        }
      }
    }
    void prefetchOlderPages().catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : t('chat.messagesLoadError'))
    })
  }, [conversationId, fetchNextPage, isFetchingNextPage, latestPage?.hasMore, pageCount, queryClient, t])

  useEffect(() => {
    const loadedMessages = data?.pages.flatMap((page) => page.items)
    if (!loadedMessages?.length) return
    const loadedIds = new Set(loadedMessages.map((message) => message.id))
    const loadedClientIds = new Set(loadedMessages.flatMap((message) => message.clientMsgId ? [message.clientMsgId] : []))
    queryClient.setQueryData<MessageResponse[]>(
      CHAT_QUERY_KEYS.liveMessages(conversationId ?? 'none'),
      (liveMessages) => liveMessages?.filter(
        (message) => !loadedIds.has(message.id) && (!message.clientMsgId || !loadedClientIds.has(message.clientMsgId)),
      ),
    )
  }, [conversationId, data, queryClient])

  return { ...query, liveMessages: liveMessagesQuery.data }
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
      const timeline = queryClient.getQueryData<InfiniteData<MessageTimelineResponse, MessagePageParam>>(
        CHAT_QUERY_KEYS.messages(conversationId),
      )
      queryClient.setQueryData<MessageResponse[]>(
        CHAT_QUERY_KEYS.liveMessages(conversationId),
        (old) => {
          const alreadyLoaded = timeline?.pages.some((page) => page.items.some((message) =>
            message.id === newMessage.id ||
            (message.clientMsgId && message.clientMsgId === newMessage.clientMsgId),
          ))
          const alreadyLive = old?.some((message) =>
            message.id === newMessage.id ||
            (message.clientMsgId && message.clientMsgId === newMessage.clientMsgId),
          )
          return alreadyLoaded || alreadyLive ? old : [...(old ?? []), newMessage]
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
      queryClient.setQueryData<InfiniteData<MessageTimelineResponse, MessagePageParam>>(
        CHAT_QUERY_KEYS.messages(conversationId),
        (old) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((m) =>
                m.id === revokedMsg.id ? { ...m, deletedAt: revokedMsg.deletedAt } : m,
              ),
            })),
          }
        },
      )
      queryClient.setQueryData<MessageResponse[]>(
        CHAT_QUERY_KEYS.liveMessages(conversationId),
        (old) => old?.map((message) =>
          message.id === revokedMsg.id ? { ...message, deletedAt: revokedMsg.deletedAt } : message,
        ),
      )
    },
  })
}
