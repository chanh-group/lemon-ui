import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { CHAT_QUERY_KEYS, type MessagePageParam } from '@/features/messaging/hooks/useMessages'
import { getConversationMessages } from '@/features/messaging/api/message.api'
import { getConversationById, getGroupMembers } from '@/features/conversation/api/conversation.api'
import { updateConversationLastMessage } from '@/features/conversation/utils/chat.mapper'
import { fetchMissedMessages } from '@/features/messaging/utils/messageSync'
import { releaseConversationMessagePreviews } from '@/features/messaging/utils/messageSend'
import type {
  MessageReactionPayload,
  MessageResponse,
  MessageRevokedPayload,
  MessageTimelineResponse,
  TypingEventPayload,
} from '@/features/messaging/types/message.types'
import type { ConversationResponse } from '@/features/conversation/types/conversation.types'
import { queryKeys } from '@/infrastructure/query/keys'
import { ROUTES } from '@/config/constants'
import { ApiError } from '@/infrastructure/api/errors'

const TYPING_STALE_TIMEOUT_MS = 4_500

export type PartnerTypingMap = Record<string, string[]>

export function updateTypingUsers(
  current: PartnerTypingMap,
  data: TypingEventPayload,
  currentUserId?: string,
): PartnerTypingMap {
  if (data.userId === currentUserId) return current

  const existing = current[data.conversationId] ?? []
  const users = data.isTyping
    ? existing.includes(data.userId)
      ? existing
      : [...existing, data.userId]
    : existing.filter((id) => id !== data.userId)

  if (users.length === 0) {
    const next = { ...current }
    delete next[data.conversationId]
    return next
  }
  return { ...current, [data.conversationId]: users }
}

export function removeTypingUser(
  current: PartnerTypingMap,
  conversationId: string,
  userId: string,
): PartnerTypingMap {
  const currentUsers = current[conversationId]
  if (!currentUsers?.includes(userId)) return current

  const users = currentUsers.filter((id) => id !== userId)
  if (users.length === 0) {
    const next = { ...current }
    delete next[conversationId]
    return next
  }
  return { ...current, [conversationId]: users }
}

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

export function reconnectCursor(pages: MessageTimelineResponse[]): string | undefined {
  return mergeMessagesByTime(
    [],
    pages.flatMap((page) => page.items).filter((message) => !message.id.startsWith('temp-')),
  ).at(-1)?.id
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
  const navigate = useNavigate()
  const [partnerTypingMap, setPartnerTypingMap] = useState<PartnerTypingMap>({})
  const typingExpiryTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const refreshedInboxOnConnection = useRef(false)
  const verificationGeneration = useRef(0)
  const verificationAbort = useRef<AbortController | null>(null)
  const retryVerification = useRef<(() => void) | null>(null)
  const revokedConversationIds = useRef(new Set<string>())
  const [conversationAccess, setConversationAccess] = useState<
    'verifying' | 'allowed' | 'revoked' | 'retryable-error'
  >(activeConversationId ? 'verifying' : 'allowed')
  const [verifiedConversationId, setVerifiedConversationId] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<SocketConnectionStatus | null>(() => {
    if (status !== 'authenticated') return null
    const socket = getChatSocket()
    return socket.connected ? 'connected' : socket.active ? 'connecting' : 'disconnected'
  })
  const userId = user?.id

  useEffect(() => {
    if (!activeConversationId) {
      // oxlint-disable-next-line react/set-state-in-effect
      setVerifiedConversationId(null)
    }
  }, [activeConversationId])

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
    const timersForEffect = typingExpiryTimers.current
    const refreshInbox = () => {
      if (refreshedInboxOnConnection.current) return
      refreshedInboxOnConnection.current = true
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.conversations })
    }
    const removeTypingMember = (conversationId: string, typingUserId: string) => {
      const timerKey = `${conversationId}:${typingUserId}`
      const timer = timersForEffect.get(timerKey)
      if (timer) clearTimeout(timer)
      timersForEffect.delete(timerKey)
      setPartnerTypingMap((current) => removeTypingUser(current, conversationId, typingUserId))
    }
    const clearConversationTyping = (conversationId: string) => {
      const timerPrefix = `${conversationId}:`
      for (const [timerKey, timer] of timersForEffect) {
        if (!timerKey.startsWith(timerPrefix)) continue
        clearTimeout(timer)
        timersForEffect.delete(timerKey)
      }
      setPartnerTypingMap((current) => {
        if (!current[conversationId]) return current
        const next = { ...current }
        delete next[conversationId]
        return next
      })
    }
    const syncMissedMessages = async (conversationId: string) => {
      const timeline = queryClient.getQueryData<
        InfiniteData<MessageTimelineResponse, MessagePageParam>
      >(CHAT_QUERY_KEYS.messages(conversationId))
      const cursor = reconnectCursor(timeline?.pages ?? [])
      if (!cursor) {
        void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.messages(conversationId) })
        return
      }

      const missed = await fetchMissedMessages(cursor, (after) =>
        getConversationMessages(conversationId, undefined, 50, after),
      )

      if (missed.length > 0) {
        queryClient.setQueryData<MessageResponse[]>(
          CHAT_QUERY_KEYS.liveMessages(conversationId),
          (old) => mergeMessagesByTime(missed, old ?? []),
        )
      }
      // Không invalidate timeline: missed đã nằm trong liveMessages, còn refetch
      // infinite query sẽ tải lại mọi trang đã load và presign lại toàn bộ media.
    }

    const clearRemovedConversation = (conversationId: string) => {
      revokedConversationIds.current.add(conversationId)
      clearConversationTyping(conversationId)
      releaseConversationMessagePreviews(conversationId)
      queryClient.removeQueries({ queryKey: CHAT_QUERY_KEYS.messages(conversationId) })
      queryClient.removeQueries({ queryKey: CHAT_QUERY_KEYS.liveMessages(conversationId) })
      queryClient.removeQueries({ queryKey: CHAT_QUERY_KEYS.mediaArchive(conversationId) })
      queryClient.removeQueries({ queryKey: queryKeys.chat.conversation(conversationId) })
      queryClient.removeQueries({ queryKey: queryKeys.chat.groupMembers(conversationId) })
      queryClient.setQueryData<ConversationResponse[]>(CHAT_QUERY_KEYS.conversations, (old) =>
        old?.filter((conversation) => conversation.id !== conversationId),
      )
      if (activeConversationId === conversationId) {
        setConversationAccess('revoked')
        navigate(ROUTES.messages)
      }
    }

    const verifyConversation = async (conversationId: string) => {
      const generation = ++verificationGeneration.current
      verificationAbort.current?.abort()
      const abortController = new AbortController()
      verificationAbort.current = abortController
      setConversationAccess('verifying')
      try {
        await queryClient.cancelQueries({ queryKey: CHAT_QUERY_KEYS.messages(conversationId) })
        await queryClient.cancelQueries({ queryKey: queryKeys.chat.groupMembers(conversationId) })
        const cached = queryClient.getQueryData<ConversationResponse>(
          queryKeys.chat.conversation(conversationId),
        )
        const conversation = await getConversationById(conversationId, abortController.signal)
        if (generation !== verificationGeneration.current) return

        if (
          cached?.joinGeneration &&
          conversation.joinGeneration &&
          cached.joinGeneration !== conversation.joinGeneration
        ) {
          releaseConversationMessagePreviews(conversationId)
          queryClient.removeQueries({ queryKey: CHAT_QUERY_KEYS.messages(conversationId) })
          queryClient.removeQueries({ queryKey: CHAT_QUERY_KEYS.liveMessages(conversationId) })
          queryClient.removeQueries({ queryKey: CHAT_QUERY_KEYS.mediaArchive(conversationId) })
        }

        revokedConversationIds.current.delete(conversationId)

        queryClient.setQueryData(queryKeys.chat.conversation(conversationId), conversation)
        if (conversation.kind === 'GROUP') {
          const members = await getGroupMembers(conversationId, abortController.signal)
          if (generation !== verificationGeneration.current) return
          queryClient.setQueryData(queryKeys.chat.groupMembers(conversationId), members)
        }
        await queryClient.refetchQueries({
          queryKey: CHAT_QUERY_KEYS.conversations,
          type: 'active',
        })
        if (generation !== verificationGeneration.current) return
        setVerifiedConversationId(conversationId)
        setConversationAccess('allowed')
        await syncMissedMessages(conversationId)
      } catch (error: unknown) {
        if (generation !== verificationGeneration.current) return
        if (abortController.signal.aborted) return
        if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
          clearRemovedConversation(conversationId)
          return
        }
        setConversationAccess('retryable-error')
        toast.error(t('chat.messagesLoadError'))
      } finally {
        if (verificationAbort.current === abortController) verificationAbort.current = null
      }
    }
    retryVerification.current = () => {
      if (activeConversationId) void verifyConversation(activeConversationId)
    }

    const handleConnect = () => {
      setConnectionStatus('connected')
      refreshInbox()
      if (activeConversationId) {
        void verifyConversation(activeConversationId)
      } else {
        setConversationAccess('allowed')
      }
    }
    const handleDisconnect = () => {
      refreshedInboxOnConnection.current = false
      setConnectionStatus('disconnected')
      if (activeConversationId) setConversationAccess('verifying')
      timersForEffect.forEach((timer) => clearTimeout(timer))
      timersForEffect.clear()
      setPartnerTypingMap({})
    }
    const handleConnectError = () => setConnectionStatus('error')
    const handleReconnectAttempt = () => setConnectionStatus('connecting')

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleConnectError)
    socket.io.on('reconnect_attempt', handleReconnectAttempt)
    if (socket.connected && activeConversationId) {
      refreshInbox()
      void verifyConversation(activeConversationId)
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
      if (revokedConversationIds.current.has(convId)) return
      if (msg.senderId !== userId) removeTypingMember(convId, msg.senderId)

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
            return {
              ...updateConversationLastMessage(conversation, msg),
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
                m.id === updated.id
                  ? { ...m, body: updated.body, editedAt: updated.editedAt }
                  : m.replyTarget?.id === updated.id && !m.replyTarget.deletedAt
                    ? { ...m, replyTarget: { ...m.replyTarget, body: updated.body } }
                    : m,
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
              : message.replyTarget?.id === updated.id && !message.replyTarget.deletedAt
                ? { ...message, replyTarget: { ...message.replyTarget, body: updated.body } }
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
                m.id === revoked.id
                  ? {
                      ...m,
                      body: null,
                      attachments: undefined,
                      reactions: undefined,
                      storyPreview: null,
                      replyToId: null,
                      replyTarget: null,
                      isForwarded: false,
                      deletedAt: revoked.deletedAt,
                    }
                  : m.replyTarget?.id === revoked.id
                    ? {
                        ...m,
                        replyTarget: {
                          ...m.replyTarget,
                          body: null,
                          storyPreview: null,
                          deletedAt: revoked.deletedAt,
                        },
                      }
                    : m,
              ),
            })),
          }
        },
      )
      queryClient.setQueryData<MessageResponse[]>(
        CHAT_QUERY_KEYS.liveMessages(revoked.conversationId),
        (old) =>
          old?.map((message) =>
            message.id === revoked.id
              ? {
                  ...message,
                  body: null,
                  attachments: undefined,
                  reactions: undefined,
                  storyPreview: null,
                  replyToId: null,
                  replyTarget: null,
                  isForwarded: false,
                  deletedAt: revoked.deletedAt,
                }
              : message.replyTarget?.id === revoked.id
                ? {
                    ...message,
                    replyTarget: {
                      ...message.replyTarget,
                      body: null,
                      storyPreview: null,
                      deletedAt: revoked.deletedAt,
                    },
                  }
                : message,
          ),
      )

      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.conversations })
      void queryClient.invalidateQueries({
        queryKey: CHAT_QUERY_KEYS.mediaArchive(revoked.conversationId),
      })
    }

    const handleMessageHidden = ({
      conversationId,
      messageId,
    }: {
      conversationId: string
      messageId: string
    }) => {
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
    }

    // D. Đối phương đang gõ phím
    const handleTyping = (data: TypingEventPayload) => {
      if (data.userId === userId) return

      const timerKey = `${data.conversationId}:${data.userId}`
      const oldTimer = timersForEffect.get(timerKey)
      if (oldTimer) clearTimeout(oldTimer)
      timersForEffect.delete(timerKey)

      setPartnerTypingMap((prev) => updateTypingUsers(prev, data, userId))

      if (data.isTyping) {
        const timer = setTimeout(() => {
          timersForEffect.delete(timerKey)
          setPartnerTypingMap((prev) => removeTypingUser(prev, data.conversationId, data.userId))
        }, TYPING_STALE_TIMEOUT_MS)
        timersForEffect.set(timerKey, timer)
      }
    }

    const handleReadUpdated = (event: { userId: string }) => {
      if (event.userId === userId) {
        void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.conversations })
      }
    }

    const handleConversationChanged = (event: { conversationId?: string }) => {
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.conversations })
      if (event.conversationId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.chat.conversation(event.conversationId),
        })
        void queryClient.invalidateQueries({
          queryKey: queryKeys.chat.groupMembers(event.conversationId),
        })
      }
    }
    const handleMemberRemoved = (event: { conversationId: string; userId: string }) => {
      handleConversationChanged(event)
      if (event.userId === userId) clearRemovedConversation(event.conversationId)
      else removeTypingMember(event.conversationId, event.userId)
    }
    const handleConversationDisbanded = (event: { conversationId: string }) => {
      handleConversationChanged(event)
      clearRemovedConversation(event.conversationId)
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
    socket.on('message:hidden', handleMessageHidden)
    socket.on('typing', handleTyping)
    socket.on('message:reaction', handleMessageReaction)
    socket.on('conversation:created', handleConversationChanged)
    socket.on('conversation:updated', handleConversationChanged)
    socket.on('member:added', handleConversationChanged)
    socket.on('member:role-changed', handleConversationChanged)
    socket.on('member:removed', handleMemberRemoved)
    socket.on('conversation:disbanded', handleConversationDisbanded)

    return () => {
      verificationGeneration.current += 1
      verificationAbort.current?.abort()
      verificationAbort.current = null
      retryVerification.current = null
      timersForEffect.forEach((timer) => clearTimeout(timer))
      timersForEffect.clear()
      setPartnerTypingMap({})
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleConnectError)
      socket.io.off('reconnect_attempt', handleReconnectAttempt)
      socket.off('message:new', handleNewMessage)
      socket.off('message:correlated', handleMessageCorrelated)
      socket.off('read:updated', handleReadUpdated)
      socket.off('message:updated', handleMessageUpdated)
      socket.off('message:revoked', handleMessageRevoked)
      socket.off('message:hidden', handleMessageHidden)
      socket.off('typing', handleTyping)
      socket.off('message:reaction', handleMessageReaction)
      socket.off('conversation:created', handleConversationChanged)
      socket.off('conversation:updated', handleConversationChanged)
      socket.off('member:added', handleConversationChanged)
      socket.off('member:role-changed', handleConversationChanged)
      socket.off('member:removed', handleMemberRemoved)
      socket.off('conversation:disbanded', handleConversationDisbanded)
    }
  }, [status, activeConversationId, userId, queryClient, t, navigate])

  const typingUserCount = activeConversationId
    ? (partnerTypingMap[activeConversationId]?.length ?? 0)
    : 0
  const isPartnerTyping = typingUserCount > 0
  const effectiveConversationAccess =
    conversationAccess === 'allowed' &&
    activeConversationId &&
    verifiedConversationId !== activeConversationId
      ? 'verifying'
      : conversationAccess

  return {
    isPartnerTyping,
    typingUserCount,
    typingUserIds: activeConversationId ? (partnerTypingMap[activeConversationId] ?? []) : [],
    connectionStatus,
    conversationAccess: effectiveConversationAccess,
    retryConversationAccess: () => retryVerification.current?.(),
  }
}
