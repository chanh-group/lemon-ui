import { useEffect, useRef } from 'react'
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { generateUUID } from '@/lib/utils'
import { resolveSendMessageKind } from '../utils/messageSend'
import { queryKeys } from '@/infrastructure/query/keys'
import {
  getConversationById,
  getConversations,
  getConversationMessages,
  getOrCreateDirectConversation,
  markConversationRead,
  presignFile,
  reactToMessage,
  revokeMessage,
  sendMessage,
  uploadBinaryToUrl,
  uploadFileViaBackend,
} from '../api/chat.api'
import { getKindFromMime, isImage } from '../utils/fileTypes'
import { useAuth } from '@/features/auth/api'
import { mapConversationResponse } from '../utils/chat.mapper'
import type {
  Conversation,
  ConversationResponse,
  MessageAttachmentInput,
  MessageAttachmentItem,
  MessageResponse,
  MessageTimelineResponse,
  SendMessageDto,
} from '../types/chat.types'

export const CHAT_QUERY_KEYS = queryKeys.chat
const MESSAGE_PAGE_SIZE = 30
/** Cửa sổ 3 trang: -1 (mới hơn), 0 (đang đọc), +1 (cũ hơn). */
const MAX_MESSAGE_PAGES = 3
/** Mở hội thoại tải sẵn trang hiện tại + 2 trang cũ để cuộn không chạm mép. */
const INITIAL_MESSAGE_BUFFER_PAGES = 3

export function rollbackOptimisticConversationPreview(
  current: ConversationResponse[] | undefined,
  previous: ConversationResponse[] | undefined,
  conversationId: string | undefined,
  optimisticCreatedAt: string | undefined,
) {
  if (!current || !previous || !conversationId || !optimisticCreatedAt) return current
  const previousConversation = previous.find((conversation) => conversation.id === conversationId)
  if (!previousConversation) return current
  return current.map((conversation) =>
    conversation.id === conversationId && conversation.lastMessageAt === optimisticCreatedAt
      ? previousConversation
      : conversation,
  )
}

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

/** Giữ cửa sổ 3 trang (-1, 0, +1) quanh vùng đang đọc và tải sẵn 2 trang cũ. */
export function useConversationMessagesQuery(conversationId: string | null) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const initialPrefetches = useRef(new Set<string>())
  const activeConversationId = useRef(conversationId)
  const query = useInfiniteQuery({
    queryKey: CHAT_QUERY_KEYS.messages(conversationId ?? 'none'),
    queryFn: ({ pageParam }: { pageParam: MessagePageParam }) => {
      if (!conversationId) {
        return Promise.resolve<MessageTimelineResponse>({ items: [], hasMore: false })
      }
      return getConversationMessages(
        conversationId,
        pageParam.cursor,
        MESSAGE_PAGE_SIZE,
        pageParam.after,
      )
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
    maxPages: MAX_MESSAGE_PAGES,
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
      for (
        let pagesLoaded = pageCount;
        pagesLoaded < INITIAL_MESSAGE_BUFFER_PAGES;
        pagesLoaded += 1
      ) {
        if (activeConversationId.current !== conversationId) return
        const current = queryClient.getQueryData<
          InfiniteData<MessageTimelineResponse, MessagePageParam>
        >(CHAT_QUERY_KEYS.messages(conversationId))
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
  }, [
    conversationId,
    fetchNextPage,
    isFetchingNextPage,
    latestPage?.hasMore,
    pageCount,
    queryClient,
    t,
  ])

  useEffect(() => {
    const loadedMessages = data?.pages.flatMap((page) => page.items)
    if (!loadedMessages?.length) return
    const loadedIds = new Set(loadedMessages.map((message) => message.id))
    const loadedClientIds = new Set(
      loadedMessages.flatMap((message) => (message.clientMsgId ? [message.clientMsgId] : [])),
    )
    queryClient.setQueryData<MessageResponse[]>(
      CHAT_QUERY_KEYS.liveMessages(conversationId ?? 'none'),
      (liveMessages) =>
        liveMessages?.filter(
          (message) =>
            !loadedIds.has(message.id) &&
            (!message.clientMsgId || !loadedClientIds.has(message.clientMsgId)),
        ),
    )
  }, [conversationId, data, queryClient])

  // maxPages cắt trang mới nhất khi cuộn lên. Rời hội thoại lúc cửa sổ không
  // còn neo ở trang mới nhất thì reset để lần mở sau vào đúng tin mới nhất.
  useEffect(() => {
    const prefetched = initialPrefetches.current
    return () => {
      if (!conversationId) return
      const key = CHAT_QUERY_KEYS.messages(conversationId)
      const cached =
        queryClient.getQueryData<InfiniteData<MessageTimelineResponse, MessagePageParam>>(key)
      const firstParam = cached?.pageParams[0]
      if (!firstParam?.cursor && !firstParam?.after) return
      prefetched.delete(conversationId)
      void queryClient.resetQueries({ queryKey: key, exact: true })
    }
  }, [conversationId, queryClient])

  return { ...query, liveMessages: liveMessagesQuery.data }
}

/** Paginate the full message history for the media archive without expanding the chat window. */
export function useConversationMediaArchiveQuery(conversationId: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: CHAT_QUERY_KEYS.mediaArchive(conversationId),
    queryFn: async ({ pageParam }: { pageParam: MessagePageParam }) => {
      const page = await getConversationMessages(
        conversationId,
        pageParam.cursor,
        MESSAGE_PAGE_SIZE,
        pageParam.after,
      )
      return {
        ...page,
        items: page.items.map(({ id, createdAt, attachments }) => ({
          id,
          createdAt,
          attachments,
        })),
      }
    },
    initialPageParam: {} as MessagePageParam,
    getNextPageParam: (lastPage): MessagePageParam | undefined =>
      lastPage.hasMore && lastPage.nextCursor ? { cursor: lastPage.nextCursor } : undefined,
    enabled,
    staleTime: 1000 * 60,
  })
}

export interface SendMessagePendingFile {
  id: string
  file: File
  previewUrl?: string
  uploadedAttachment?: MessageAttachmentInput
}

export type SendMessageArg =
  | string
  | {
      body?: string
      kind?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'SYSTEM'
      attachments?: MessageAttachmentInput[]
      pendingFiles?: SendMessagePendingFile[]
      isForwarded?: boolean
      sourceMessageId?: string
      targetConversationId?: string
      clientMsgId?: string
    }

/** Hook gửi tin nhắn mới với Optimistic UI */
export function useSendMessageMutation(conversationId: string | null) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const currentUserId = user?.id || 'me'
  const { t } = useTranslation()

  return useMutation({
    onMutate: async (arg: SendMessageArg) => {
      const targetConversationId =
        typeof arg === 'string' ? conversationId : (arg.targetConversationId ?? conversationId)
      if (!targetConversationId) return

      await queryClient.cancelQueries({
        queryKey: CHAT_QUERY_KEYS.liveMessages(targetConversationId),
      })
      await queryClient.cancelQueries({ queryKey: CHAT_QUERY_KEYS.conversations })

      const previousConversations = queryClient.getQueryData<ConversationResponse[]>(
        CHAT_QUERY_KEYS.conversations,
      )

      const clientMsgId = (typeof arg !== 'string' && arg.clientMsgId) || generateUUID()
      if (typeof arg !== 'string') {
        arg.clientMsgId = clientMsgId
      }

      // Chuẩn bị attachments tạm thời cho UI lạc quan (dùng local blob URL cho media)
      let optimisticAttachments: MessageAttachmentItem[] | undefined
      if (typeof arg !== 'string' && arg.pendingFiles && arg.pendingFiles.length > 0) {
        optimisticAttachments = arg.pendingFiles.map((pf) => {
          const mimeType = pf.file.type || 'application/octet-stream'
          const kindRaw = getKindFromMime(mimeType, pf.file.name)
          const kind = kindRaw.replace('CHAT_', '') as 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE'
          const previewUrl =
            pf.previewUrl || (isImage(mimeType, pf.file.name) ? URL.createObjectURL(pf.file) : '')
          return {
            id: pf.id || generateUUID(),
            kind,
            fileName: pf.file.name,
            mimeType,
            sizeBytes: pf.file.size,
            previewUrl,
            downloadUrl: previewUrl,
          }
        })
      } else if (typeof arg !== 'string' && arg.attachments && arg.attachments.length > 0) {
        optimisticAttachments = arg.attachments.map((att) => ({
          id: generateUUID(),
          kind: att.kind || 'FILE',
          fileName: att.fileName,
          mimeType: att.mimeType,
          sizeBytes: att.sizeBytes,
          previewUrl: '',
          downloadUrl: '',
        }))
      }

      const bodyText = typeof arg === 'string' ? arg : arg.body
      const kind = resolveSendMessageKind(
        bodyText,
        typeof arg === 'string' ? undefined : arg.kind,
        optimisticAttachments || (typeof arg !== 'string' ? arg.attachments : undefined),
      )

      const optimisticMessage: MessageResponse = {
        id: `temp-${clientMsgId}`,
        conversationId: targetConversationId,
        senderId: currentUserId,
        kind,
        body: bodyText || null,
        replyToId: null,
        clientMsgId,
        attachments:
          optimisticAttachments && optimisticAttachments.length > 0
            ? optimisticAttachments
            : undefined,
        reactions: [],
        isForwarded: typeof arg !== 'string' ? arg.isForwarded : false,
        createdAt: new Date().toISOString(),
        editedAt: null,
        deletedAt: null,
      }

      // 1. Thêm tin nhắn tạm vào liveMessages ngay tức thì
      queryClient.setQueryData<MessageResponse[]>(
        CHAT_QUERY_KEYS.liveMessages(targetConversationId),
        (old) => [...(old ?? []), optimisticMessage],
      )

      // 2. Cập nhật preview của danh sách hội thoại ở thanh bên trái
      queryClient.setQueryData<ConversationResponse[]>(CHAT_QUERY_KEYS.conversations, (old) => {
        if (!old) return old
        const preview = bodyText || (optimisticAttachments?.length ? '[attachment]' : '')
        return old.map((conv) => {
          if (conv.id === targetConversationId) {
            return {
              ...conv,
              lastMessagePreview: preview,
              lastMessageSenderId: currentUserId,
              lastMessageAt: optimisticMessage.createdAt,
            }
          }
          return conv
        })
      })

      return {
        previousConversations,
        clientMsgId,
        targetConversationId,
        optimisticCreatedAt: optimisticMessage.createdAt,
      }
    },

    mutationFn: async (arg: SendMessageArg) => {
      const targetConversationId =
        typeof arg === 'string' ? conversationId : (arg.targetConversationId ?? conversationId)
      if (!targetConversationId) throw new Error('No conversation selected')
      const clientMsgId = (typeof arg !== 'string' && arg.clientMsgId) || generateUUID()

      let finalAttachments: MessageAttachmentInput[] | undefined
      if (typeof arg !== 'string' && arg.pendingFiles && arg.pendingFiles.length > 0) {
        finalAttachments = []
        for (const item of arg.pendingFiles) {
          if (item.uploadedAttachment) {
            finalAttachments.push(item.uploadedAttachment)
            continue
          }
          const file = item.file
          const mimeType = file.type || 'application/octet-stream'
          const kind = getKindFromMime(mimeType, file.name)
          let objectKey: string
          try {
            const presignRes = await presignFile({
              kind,
              sizeBytes: file.size,
              mimeType,
              fileName: file.name,
              conversationId: targetConversationId,
            })
            await uploadBinaryToUrl(presignRes.uploadUrl, file, mimeType)
            objectKey = presignRes.objectKey
          } catch (r2Err) {
            console.warn('R2 upload failed, using backend fallback:', r2Err)
            const fallbackRes = await uploadFileViaBackend(
              file,
              kind,
              targetConversationId,
              file.name,
            )
            objectKey = fallbackRes.objectKey
          }
          finalAttachments.push({
            objectKey,
            fileName: file.name,
            mimeType,
            sizeBytes: file.size,
            kind: kind.replace('CHAT_', '') as 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE',
          })
        }
      } else if (typeof arg !== 'string') {
        finalAttachments = arg.attachments
      }

      const bodyText = typeof arg === 'string' ? arg : arg.body
      const payload: SendMessageDto = {
        body: bodyText,
        clientMsgId,
        kind: resolveSendMessageKind(
          bodyText,
          typeof arg === 'string' ? undefined : arg.kind,
          finalAttachments,
        ),
        attachments: finalAttachments,
        isForwarded: typeof arg !== 'string' ? arg.isForwarded : undefined,
        sourceMessageId: typeof arg !== 'string' ? arg.sourceMessageId : undefined,
      }
      return sendMessage(targetConversationId, payload)
    },

    onError: (error: unknown, _arg: SendMessageArg, context) => {
      // Nếu gửi thất bại thì hiển thị thông báo lỗi và xoá tin nhắn đó đi
      if (context?.targetConversationId) {
        queryClient.setQueryData<MessageResponse[]>(
          CHAT_QUERY_KEYS.liveMessages(context.targetConversationId),
          (old) =>
            old?.filter(
              (m) =>
                m.clientMsgId !== context.clientMsgId && m.id !== `temp-${context.clientMsgId}`,
            ),
        )
      }
      if (context?.previousConversations) {
        queryClient.setQueryData<ConversationResponse[]>(CHAT_QUERY_KEYS.conversations, (current) =>
          rollbackOptimisticConversationPreview(
            current,
            context.previousConversations,
            context.targetConversationId,
            context.optimisticCreatedAt,
          ),
        )
      }
      toast.error(error instanceof Error ? error.message : t('chat.sendMessageError'))
    },

    onSuccess: (newMessage: MessageResponse, arg: SendMessageArg, context) => {
      const targetConversationId =
        context?.targetConversationId ||
        (typeof arg === 'string' ? conversationId : (arg.targetConversationId ?? conversationId))
      if (!targetConversationId) return

      // Cập nhật messages cache: Thay thế tin nhắn tạm bằng tin nhắn chính thức từ backend
      queryClient.setQueryData<MessageResponse[]>(
        CHAT_QUERY_KEYS.liveMessages(targetConversationId),
        (old) => {
          const timeline = queryClient.getQueryData<
            InfiniteData<MessageTimelineResponse, MessagePageParam>
          >(CHAT_QUERY_KEYS.messages(targetConversationId))
          const alreadyLoaded = timeline?.pages.some((page) =>
            page.items.some(
              (message) =>
                message.id === newMessage.id ||
                (message.clientMsgId && message.clientMsgId === newMessage.clientMsgId),
            ),
          )
          if (alreadyLoaded) {
            return old?.filter(
              (m) =>
                m.clientMsgId !== newMessage.clientMsgId &&
                m.id !== newMessage.id &&
                m.id !== `temp-${context?.clientMsgId}`,
            )
          }

          if (!old) return [newMessage]
          let replaced = false
          const updated = old.map((m) => {
            if (
              (m.clientMsgId && m.clientMsgId === newMessage.clientMsgId) ||
              m.id === `temp-${context?.clientMsgId}` ||
              m.id === newMessage.id
            ) {
              replaced = true
              return newMessage
            }
            return m
          })
          return replaced ? updated : [...updated, newMessage]
        },
      )

      // Cập nhật preview trong conversations cache
      queryClient.setQueryData<ConversationResponse[]>(CHAT_QUERY_KEYS.conversations, (old) => {
        if (!old) return old
        return old.map((conv) => {
          if (conv.id === targetConversationId) {
            const preview = newMessage.body
              ? newMessage.body
              : newMessage.attachments && newMessage.attachments.length > 0
                ? '[attachment]'
                : ''
            return {
              ...conv,
              lastMessagePreview: preview,
              lastMessageSenderId: newMessage.senderId,
              lastMessageAt: newMessage.createdAt,
            }
          }
          return conv
        })
      })
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
      queryClient.setQueryData<ConversationResponse[]>(CHAT_QUERY_KEYS.conversations, (old) => {
        if (!old) return [newConv]
        if (old.some((c) => c.id === newConv.id)) {
          return old.map((c) => (c.id === newConv.id ? newConv : c))
        }
        return [newConv, ...old]
      })
    },
  })
}

/** Hook đánh dấu đã đọc */
export function useMarkReadMutation() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: ({
      conversationId,
      lastReadMessageId,
    }: {
      conversationId: string
      lastReadMessageId: string
    }) => markConversationRead(conversationId, lastReadMessageId),
    onSuccess: (_, { conversationId }) => {
      // Reset unreadCount trong conversations cache
      queryClient.setQueryData<ConversationResponse[]>(CHAT_QUERY_KEYS.conversations, (old) => {
        if (!old) return old
        return old.map((conv) => (conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv))
      })
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
        (old) =>
          old?.map((message) =>
            message.id === revokedMsg.id
              ? { ...message, deletedAt: revokedMsg.deletedAt }
              : message,
          ),
      )
    },
  })
}

/** Hook thả / toggle cảm xúc tin nhắn */
export function useReactMessageMutation(conversationId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      reactToMessage(messageId, emoji),
    onSuccess: (data) => {
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
                m.id === data.messageId ? { ...m, reactions: data.reactions } : m,
              ),
            })),
          }
        },
      )
      queryClient.setQueryData<MessageResponse[]>(
        CHAT_QUERY_KEYS.liveMessages(conversationId),
        (old) =>
          old?.map((message) =>
            message.id === data.messageId ? { ...message, reactions: data.reactions } : message,
          ),
      )
    },
  })
}
