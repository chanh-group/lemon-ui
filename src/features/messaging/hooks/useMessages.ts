import { useEffect, useRef } from 'react'
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { generateUUID } from '@/lib/utils'
import {
  isUncertainSendError,
  registerPendingMessagePreviews,
  releasePendingMessagePreviews,
  resolveSendMessageKind,
  retryUncertainSend,
} from '@/features/messaging/utils/messageSend'
import { queryKeys } from '@/infrastructure/query/keys'
import {
  getConversationMessages,
  getMessageWindow,
  editMessage,
  deleteMessageForMe,
  markConversationRead,
  reactToMessage,
  revokeMessage,
  sendMessage,
} from '@/features/messaging/api/message.api'
import { presignFile, uploadBinaryToUrl, uploadFileViaBackend } from '@/features/file/api/file.api'
import { getKindFromMime, isImage } from '@/features/file/utils/fileTypes'
import { useAuth } from '@/features/auth/api'
import { updateConversationLastMessage } from '@/features/conversation/utils/chat.mapper'
import type {
  MessageAttachmentInput,
  MessageAttachmentItem,
  MessageResponse,
  MessageReactionItem,
  MessageReactionPayload,
  MessageTimelineResponse,
  SendMessageDto,
  SendMessageArg,
} from '@/features/messaging/types/message.types'
export type { SendMessagePendingFile } from '@/features/messaging/types/message.types'
import type { ConversationResponse } from '@/features/conversation/types/conversation.types'

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
    conversation.id === conversationId &&
    ((conversation.lastMessageDetail?.id.startsWith('temp-') &&
      conversation.lastMessageDetail.createdAt === optimisticCreatedAt) ||
      conversation.lastMessageAt === optimisticCreatedAt)
      ? previousConversation
      : conversation,
  )
}

export function applyOptimisticConversationPreview(
  conversation: ConversationResponse,
  message: MessageResponse,
): ConversationResponse {
  if (conversation.id !== message.conversationId) return conversation
  return {
    ...conversation,
    lastMessagePreview: message.body || (message.attachments?.length ? '[attachment]' : ''),
    lastMessageSenderId: message.senderId,
    lastMessageDetail: message,
  }
}

export function upsertOptimisticMessage(
  messages: MessageResponse[],
  optimistic: MessageResponse,
): MessageResponse[] {
  const exists = messages.some((message) => message.clientMsgId === optimistic.clientMsgId)
  if (!exists) return [...messages, optimistic]
  return messages.map((message) => {
    if (message.clientMsgId !== optimistic.clientMsgId || !message.id.startsWith('temp-'))
      return message
    return { ...message, sendState: undefined }
  })
}

export interface MessagePageParam {
  cursor?: string
  after?: string
  around?: string
}

export function windowHasLatest(
  data: InfiniteData<MessageTimelineResponse, unknown> | undefined,
): boolean {
  const page = data?.pages[0]
  const param = data?.pageParams[0] as MessagePageParam | undefined
  if (!page || !param) return false
  if (param.around)
    return !(page as MessageTimelineResponse & { hasMoreNewer: boolean }).hasMoreNewer
  return (!param.cursor && !param.after) || (Boolean(param.after) && !page.hasMore)
}

/** Giữ cửa sổ 3 trang (-1, 0, +1) quanh vùng đang đọc và tải sẵn 2 trang cũ. */
export function useConversationMessagesQuery(conversationId: string | null, enabled = true) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const initialPrefetches = useRef(new Set<string>())
  const activeConversationId = useRef(conversationId)
  const windowGeneration = useRef(0)
  const query = useInfiniteQuery({
    queryKey: CHAT_QUERY_KEYS.messages(conversationId ?? 'none'),
    queryFn: ({ pageParam, signal }: { pageParam: MessagePageParam; signal: AbortSignal }) => {
      if (!conversationId) {
        return Promise.resolve<MessageTimelineResponse>({ items: [], hasMore: false })
      }
      if (pageParam.around) {
        return getMessageWindow(conversationId, pageParam.around, MESSAGE_PAGE_SIZE, signal)
      }
      return getConversationMessages(
        conversationId,
        pageParam.cursor,
        MESSAGE_PAGE_SIZE,
        pageParam.after,
        signal,
      )
    },
    initialPageParam: {} as MessagePageParam,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.nextCursor ? { cursor: lastPage.nextCursor } : undefined,
    getPreviousPageParam: (firstPage, _allPages, firstPageParam) => {
      if (firstPageParam.around) {
        return (firstPage as MessageTimelineResponse & { hasMoreNewer: boolean }).hasMoreNewer &&
          firstPage.items[0]?.id
          ? { after: firstPage.items[0].id }
          : undefined
      }
      if (!firstPageParam.cursor && !firstPageParam.after) return undefined
      if (firstPageParam.after) {
        return firstPage.hasMore && firstPage.nextCursor
          ? { after: firstPage.nextCursor }
          : undefined
      }
      return firstPage.items[0]?.id ? { after: firstPage.items[0].id } : undefined
    },
    maxPages: MAX_MESSAGE_PAGES,
    enabled: Boolean(conversationId) && enabled,
    staleTime: 1000 * 60, // 1 phút
  })
  const liveMessagesQuery = useQuery<MessageResponse[]>({
    queryKey: CHAT_QUERY_KEYS.liveMessages(conversationId ?? 'none'),
    queryFn: () => [],
    enabled: Boolean(conversationId) && enabled,
    initialData: [],
    staleTime: Infinity,
  })
  const { data, fetchNextPage, isFetchingNextPage } = query
  const latestRequests = useRef(new Map<string, Promise<void>>())
  const latestPage = data?.pages.at(-1)
  const pageCount = data?.pages.length ?? 0

  useEffect(() => {
    activeConversationId.current = conversationId
    return () => {
      windowGeneration.current += 1
    }
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
    // Hydrate only a unique newest loaded message that is not older than the
    // inbox entry. Never infer metadata for conversations without a timeline.
    const newestTime = Math.max(
      ...loadedMessages.map((message) => Date.parse(message.createdAt)).filter(Number.isFinite),
    )
    const newest = loadedMessages.filter((message) => Date.parse(message.createdAt) === newestTime)
    if (newest.length === 1) {
      queryClient.setQueryData<ConversationResponse[]>(
        CHAT_QUERY_KEYS.conversations,
        (conversations) =>
          conversations?.map((conversation) => {
            if (conversation.id !== conversationId || !conversation.lastMessageAt)
              return conversation
            const inboxTime = Date.parse(conversation.lastMessageAt)
            if (!Number.isFinite(inboxTime) || newestTime < inboxTime) return conversation
            if (
              newestTime === inboxTime &&
              conversation.lastMessageDetail &&
              conversation.lastMessageDetail.id !== newest[0].id
            )
              return conversation
            return updateConversationLastMessage(conversation, newest[0])
          }),
      )
    }
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

  // Keep the loaded window when switching conversations; allow an interrupted
  // initial prefetch to continue if the conversation is reopened.
  useEffect(() => {
    const prefetched = initialPrefetches.current
    return () => {
      if (conversationId) prefetched.delete(conversationId)
    }
  }, [conversationId])

  const loadLatest = async () => {
    if (!conversationId) return
    const existing = latestRequests.current.get(conversationId)
    if (existing) return existing
    const key = CHAT_QUERY_KEYS.messages(conversationId)
    const generation = ++windowGeneration.current
    const request = (async () => {
      const page = await getConversationMessages(conversationId, undefined, MESSAGE_PAGE_SIZE)
      if (
        generation !== windowGeneration.current ||
        activeConversationId.current !== conversationId
      )
        return
      await queryClient.cancelQueries({ queryKey: key, exact: true })
      if (
        generation !== windowGeneration.current ||
        activeConversationId.current !== conversationId
      )
        return
      queryClient.setQueryData<InfiniteData<MessageTimelineResponse, MessagePageParam>>(key, {
        pages: [page],
        pageParams: [{}],
      })
    })()
    latestRequests.current.set(conversationId, request)
    try {
      await request
    } finally {
      if (latestRequests.current.get(conversationId) === request)
        latestRequests.current.delete(conversationId)
    }
  }

  const loadMessageWindow = async (messageId: string) => {
    if (!conversationId) return
    const generation = ++windowGeneration.current
    const key = CHAT_QUERY_KEYS.messages(conversationId)
    const response = await getMessageWindow(conversationId, messageId, MESSAGE_PAGE_SIZE)
    if (generation !== windowGeneration.current || activeConversationId.current !== conversationId)
      return
    await queryClient.cancelQueries({ queryKey: key, exact: true })
    if (generation !== windowGeneration.current || activeConversationId.current !== conversationId)
      return
    queryClient.setQueryData<InfiniteData<MessageTimelineResponse, MessagePageParam>>(key, {
      pages: [response],
      pageParams: [{ around: messageId }],
    })
  }

  return {
    ...query,
    liveMessages: liveMessagesQuery.data,
    hasLatest: windowHasLatest(data),
    loadLatest,
    loadMessageWindow,
  }
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

export function isMessageConfirmed(
  queryClient: QueryClient,
  conversationId: string,
  clientMsgId: string,
): boolean {
  const live =
    queryClient.getQueryData<MessageResponse[]>(CHAT_QUERY_KEYS.liveMessages(conversationId)) ?? []
  const timeline =
    queryClient
      .getQueryData<InfiniteData<MessageTimelineResponse>>(CHAT_QUERY_KEYS.messages(conversationId))
      ?.pages.flatMap((page: MessageTimelineResponse) => page.items) ?? []
  return [...live, ...timeline].some(
    (message) => message.clientMsgId === clientMsgId && !message.id.startsWith('temp-'),
  )
}

/** Hook gửi tin nhắn mới với Optimistic UI */
export function useSendMessageMutation(conversationId: string | null) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const currentUserId = user?.id || 'me'
  const { t } = useTranslation()

  return useMutation({
    onMutate: async (arg: SendMessageArg) => {
      const targetConversationId = arg.targetConversationId ?? conversationId
      if (!targetConversationId) return

      await queryClient.cancelQueries({
        queryKey: CHAT_QUERY_KEYS.liveMessages(targetConversationId),
      })
      await queryClient.cancelQueries({ queryKey: CHAT_QUERY_KEYS.conversations })

      const previousConversations = queryClient.getQueryData<ConversationResponse[]>(
        CHAT_QUERY_KEYS.conversations,
      )

      const clientMsgId = arg.clientMsgId || generateUUID()
      arg.clientMsgId = clientMsgId
      const wasUncertain =
        queryClient
          .getQueryData<MessageResponse[]>(CHAT_QUERY_KEYS.liveMessages(targetConversationId))
          ?.some(
            (message) => message.clientMsgId === clientMsgId && message.sendState === 'uncertain',
          ) ?? false

      // Chuẩn bị attachments tạm thời cho UI lạc quan (dùng local blob URL cho media)
      let optimisticAttachments: MessageAttachmentItem[] | undefined
      if (arg.pendingFiles && arg.pendingFiles.length > 0) {
        optimisticAttachments = arg.pendingFiles.map((pf) => {
          const mimeType = pf.file.type || 'application/octet-stream'
          const kindRaw = getKindFromMime(mimeType, pf.file.name)
          const kind = kindRaw.replace('CHAT_', '') as 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE'
          const previewUrl =
            pf.previewUrl || (isImage(mimeType, pf.file.name) ? URL.createObjectURL(pf.file) : '')
          if (previewUrl && !pf.previewUrl) pf.previewUrl = previewUrl
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
      } else if (arg.attachments && arg.attachments.length > 0) {
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
      registerPendingMessagePreviews(targetConversationId, clientMsgId, arg.pendingFiles ?? [])

      const bodyText = arg.body
      const kind = resolveSendMessageKind(
        bodyText,
        arg.kind,
        optimisticAttachments || arg.attachments,
      )

      const optimisticMessage: MessageResponse = {
        id: `temp-${clientMsgId}`,
        conversationId: targetConversationId,
        senderId: currentUserId,
        kind,
        body: bodyText || null,
        replyToId: arg.replyToId ?? null,
        clientMsgId,
        retryAttempt: arg,
        attachments:
          optimisticAttachments && optimisticAttachments.length > 0
            ? optimisticAttachments
            : undefined,
        reactions: [],
        isForwarded: arg.isForwarded,
        createdAt: new Date().toISOString(),
        editedAt: null,
        deletedAt: null,
      }

      // 1. Thêm tin nhắn tạm vào liveMessages ngay tức thì
      queryClient.setQueryData<MessageResponse[]>(
        CHAT_QUERY_KEYS.liveMessages(targetConversationId),
        (old) => upsertOptimisticMessage(old ?? [], optimisticMessage),
      )

      // 2. Cập nhật preview của danh sách hội thoại ở thanh bên trái
      queryClient.setQueryData<ConversationResponse[]>(CHAT_QUERY_KEYS.conversations, (old) => {
        if (!old) return old
        return old.map((conv) => applyOptimisticConversationPreview(conv, optimisticMessage))
      })

      return {
        previousConversations,
        clientMsgId,
        targetConversationId,
        optimisticCreatedAt: optimisticMessage.createdAt,
        wasUncertain,
      }
    },

    mutationFn: async (arg: SendMessageArg) => {
      const targetConversationId = arg.targetConversationId ?? conversationId
      if (!targetConversationId) throw new Error('No conversation selected')
      const clientMsgId = arg.clientMsgId || generateUUID()

      let finalAttachments: MessageAttachmentInput[] | undefined
      if (arg.pendingFiles && arg.pendingFiles.length > 0) {
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
          const uploadedAttachment = {
            objectKey,
            fileName: file.name,
            mimeType,
            sizeBytes: file.size,
            kind: kind.replace('CHAT_', '') as 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE',
          }
          // Keep the completed upload on the attempt. If a later file or the
          // message request fails, retry must reuse this object key.
          item.uploadedAttachment = uploadedAttachment
          finalAttachments.push(uploadedAttachment)
        }
      } else {
        finalAttachments = arg.attachments
      }

      const bodyText = arg.body
      const payload: SendMessageDto = {
        body: bodyText,
        clientMsgId,
        kind: resolveSendMessageKind(bodyText, arg.kind, finalAttachments),
        attachments: finalAttachments,
        isForwarded: arg.isForwarded,
        sourceMessageId: arg.sourceMessageId,
        replyToId: arg.replyToId,
      }
      queryClient.setQueryData<MessageResponse[]>(
        CHAT_QUERY_KEYS.liveMessages(targetConversationId),
        (old) =>
          old?.map((message) =>
            message.clientMsgId === clientMsgId ? { ...message, retryPayload: payload } : message,
          ),
      )
      return retryUncertainSend(() => sendMessage(targetConversationId, payload))
    },

    onError: (error: unknown, _arg: SendMessageArg, context) => {
      const confirmed =
        context?.targetConversationId && context.clientMsgId
          ? isMessageConfirmed(queryClient, context.targetConversationId, context.clientMsgId)
          : false
      if (confirmed && context?.targetConversationId && context.clientMsgId) {
        releasePendingMessagePreviews(context.targetConversationId, context.clientMsgId)
        return
      }

      const sendState = isUncertainSendError(error) ? 'uncertain' : 'failed'

      if (context?.targetConversationId) {
        queryClient.setQueryData<MessageResponse[]>(
          CHAT_QUERY_KEYS.liveMessages(context.targetConversationId),
          (old) =>
            old?.map((message) =>
              message.clientMsgId === context.clientMsgId ? { ...message, sendState } : message,
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
      toast.error(
        isUncertainSendError(error)
          ? t('chat.sendUncertain')
          : error instanceof Error
            ? error.message
            : t('chat.sendMessageError'),
      )
    },

    onSuccess: (newMessage: MessageResponse, arg: SendMessageArg, context) => {
      const targetConversationId =
        context?.targetConversationId || (arg.targetConversationId ?? conversationId)
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
        return old.map((conv) => updateConversationLastMessage(conv, newMessage))
      })
      releasePendingMessagePreviews(
        targetConversationId,
        arg.clientMsgId ?? newMessage.clientMsgId ?? '',
      )
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
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.conversations })
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.conversation(conversationId) })
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
                m.id === revokedMsg.id
                  ? {
                      ...m,
                      body: null,
                      attachments: undefined,
                      reactions: undefined,
                      storyPreview: null,
                      deletedAt: revokedMsg.deletedAt,
                    }
                  : m.replyTarget?.id === revokedMsg.id
                    ? {
                        ...m,
                        replyTarget: {
                          ...m.replyTarget,
                          body: null,
                          storyPreview: null,
                          deletedAt: revokedMsg.deletedAt,
                        },
                      }
                    : m,
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
              ? {
                  ...message,
                  body: null,
                  attachments: undefined,
                  reactions: undefined,
                  storyPreview: null,
                  deletedAt: revokedMsg.deletedAt,
                }
              : message.replyTarget?.id === revokedMsg.id
                ? {
                    ...message,
                    replyTarget: {
                      ...message.replyTarget,
                      body: null,
                      storyPreview: null,
                      deletedAt: revokedMsg.deletedAt,
                    },
                  }
                : message,
          ),
      )
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.conversations })
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.mediaArchive(conversationId) })
    },
  })
}

/** Cập nhật tin đã sửa trong lịch sử, tin realtime và các trích dẫn trả lời. */
export function useEditMessageMutation(conversationId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ messageId, body }: { messageId: string; body: string }) =>
      editMessage(messageId, body),
    onSuccess: (edited) => {
      if (!conversationId) return
      const updateMessage = (message: MessageResponse): MessageResponse =>
        message.id === edited.id
          ? { ...message, body: edited.body, editedAt: edited.editedAt }
          : message.replyTarget?.id === edited.id && !message.replyTarget.deletedAt
            ? { ...message, replyTarget: { ...message.replyTarget, body: edited.body } }
            : message

      queryClient.setQueryData<InfiniteData<MessageTimelineResponse, MessagePageParam>>(
        CHAT_QUERY_KEYS.messages(conversationId),
        (old) =>
          old && {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map(updateMessage),
            })),
          },
      )
      queryClient.setQueryData<MessageResponse[]>(
        CHAT_QUERY_KEYS.liveMessages(conversationId),
        (old) => old?.map(updateMessage),
      )
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.conversations })
    },
  })
}

export function useDeleteMessageForMeMutation(conversationId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteMessageForMe,
    onSuccess: (_, messageId) => {
      if (!conversationId) return
      queryClient.setQueryData<InfiniteData<MessageTimelineResponse, MessagePageParam>>(
        CHAT_QUERY_KEYS.messages(conversationId),
        (old) =>
          old && {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.filter((message) => message.id !== messageId),
            })),
          },
      )
      queryClient.setQueryData<MessageResponse[]>(
        CHAT_QUERY_KEYS.liveMessages(conversationId),
        (old) => old?.filter((message) => message.id !== messageId),
      )
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.conversations })
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.mediaArchive(conversationId) })
    },
  })
}

type ReactionState = {
  userId: string
  desired: string | null
  confirmed: string | null
  pending: number
  revision: number
  sync: number
  queue: Promise<void>
}

const reactionStates = new WeakMap<QueryClient, Map<string, ReactionState>>()
const reactionKey = (conversationId: string, messageId: string) =>
  JSON.stringify([conversationId, messageId])

function ownReaction(reactions: MessageReactionItem[] | undefined, userId: string) {
  return reactions?.find((reaction) => reaction.userIds.includes(userId))?.emoji ?? null
}

function setOwnReaction(
  reactions: MessageReactionItem[] | undefined,
  userId: string,
  emoji: string | null,
) {
  const result = (reactions ?? []).flatMap((reaction) => {
    const userIds = reaction.userIds.filter((id) => id !== userId)
    const count = reaction.count - (reaction.userIds.length - userIds.length)
    return count > 0 ? [{ ...reaction, count, userIds }] : []
  })
  if (emoji) {
    const existing = result.find((reaction) => reaction.emoji === emoji)
    if (existing) {
      existing.userIds = [...existing.userIds, userId]
      existing.count += 1
    } else result.push({ emoji, count: 1, userIds: [userId] })
  }
  return result
}

function updateReactions(
  queryClient: QueryClient,
  conversationId: string,
  messageId: string,
  update: (reactions: MessageReactionItem[] | undefined) => MessageReactionItem[],
) {
  const updateMessage = (message: MessageResponse) =>
    message.id === messageId && !message.deletedAt
      ? { ...message, reactions: update(message.reactions) }
      : message
  queryClient.setQueryData<InfiniteData<MessageTimelineResponse, MessagePageParam>>(
    CHAT_QUERY_KEYS.messages(conversationId),
    (old) =>
      old && {
        ...old,
        pages: old.pages.map((page) => ({ ...page, items: page.items.map(updateMessage) })),
      },
  )
  queryClient.setQueryData<MessageResponse[]>(CHAT_QUERY_KEYS.liveMessages(conversationId), (old) =>
    old?.map(updateMessage),
  )
}

/** Apply a socket snapshot while preserving the latest local intent. */
export function applyRealtimeReaction(queryClient: QueryClient, payload: MessageReactionPayload) {
  const state = reactionStates
    .get(queryClient)
    ?.get(reactionKey(payload.conversationId, payload.messageId))
  if (state) {
    state.revision += 1
    state.confirmed = ownReaction(payload.reactions, state.userId)
    if (state.pending === 0) state.desired = state.confirmed
  }
  updateReactions(queryClient, payload.conversationId, payload.messageId, () =>
    state ? setOwnReaction(payload.reactions, state.userId, state.desired) : payload.reactions,
  )
}

/** Serialize toggle requests per message while showing the most recent choice immediately. */
export function useReactMessageMutation(conversationId: string | null) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { t } = useTranslation()
  const operations = useRef(new WeakMap<object, { state: ReactionState; target: string | null }>())

  return useMutation({
    onMutate: (arg: { messageId: string; emoji: string }) => {
      if (!conversationId || !user?.id) return
      void queryClient.cancelQueries({
        queryKey: CHAT_QUERY_KEYS.messages(conversationId),
        exact: true,
      })
      let states = reactionStates.get(queryClient)
      if (!states) reactionStates.set(queryClient, (states = new Map()))
      const key = reactionKey(conversationId, arg.messageId)
      let state = states.get(key)
      if (!state) {
        const timeline = queryClient.getQueryData<InfiniteData<MessageTimelineResponse>>(
          CHAT_QUERY_KEYS.messages(conversationId),
        )
        const message =
          timeline?.pages.flatMap((page) => page.items).find((item) => item.id === arg.messageId) ??
          queryClient
            .getQueryData<MessageResponse[]>(CHAT_QUERY_KEYS.liveMessages(conversationId))
            ?.find((item) => item.id === arg.messageId)
        const confirmed = ownReaction(message?.reactions, user.id)
        state = {
          userId: user.id,
          desired: confirmed,
          confirmed,
          pending: 0,
          revision: 0,
          sync: 0,
          queue: Promise.resolve(),
        }
        states.set(key, state)
      }
      state.revision += 1
      state.sync += 1
      state.desired = state.desired === arg.emoji ? null : arg.emoji
      state.pending += 1
      operations.current.set(arg, { state, target: state.desired })
      updateReactions(queryClient, conversationId, arg.messageId, (reactions) =>
        setOwnReaction(reactions, state!.userId, state!.desired),
      )
    },
    mutationFn: async (arg: { messageId: string; emoji: string }) => {
      const operation = operations.current.get(arg)
      if (!conversationId || !operation)
        throw new Error('Cannot react without a conversation and user')
      const { state, target } = operation
      const run = state.queue.then(async () => {
        if (target === state.confirmed) return
        const revision = state.revision
        const data = await reactToMessage(arg.messageId, target ?? state.confirmed!)
        state.confirmed = ownReaction(data.reactions, state.userId)
        updateReactions(queryClient, conversationId, arg.messageId, (current) =>
          setOwnReaction(
            state.revision === revision ? data.reactions : current,
            state.userId,
            state.desired,
          ),
        )
      })
      state.queue = run.catch(() => {})
      try {
        await run
      } catch (error) {
        if (state.pending === 1) {
          state.desired = state.confirmed
          updateReactions(queryClient, conversationId, arg.messageId, (current) =>
            setOwnReaction(current, state.userId, state.confirmed),
          )
        }
        throw error
      } finally {
        state.pending -= 1
        if (state.pending === 0) {
          const revision = state.revision
          const sync = ++state.sync
          void getMessageWindow(conversationId, arg.messageId, 1)
            .then((response) => {
              const message = response.items.find((item) => item.id === arg.messageId)
              if (!message || state.pending || state.revision !== revision) return
              state.confirmed = ownReaction(message.reactions, state.userId)
              state.desired = state.confirmed
              updateReactions(
                queryClient,
                conversationId,
                arg.messageId,
                () => message.reactions ?? [],
              )
            })
            .catch(() => {
              if (state.pending || state.sync !== sync) return
              reactionStates.get(queryClient)?.delete(reactionKey(conversationId, arg.messageId))
              void queryClient.invalidateQueries({
                queryKey: CHAT_QUERY_KEYS.messages(conversationId),
                exact: true,
              })
            })
            .finally(() => {
              if (state.pending || state.sync !== sync) return
              reactionStates.get(queryClient)?.delete(reactionKey(conversationId, arg.messageId))
            })
        }
      }
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : t('chat.sendMessageError')),
  })
}
