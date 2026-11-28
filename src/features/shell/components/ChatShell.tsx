import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ApiError } from '@/infrastructure/api/errors'
import { BrandMark } from '@/components/common/BrandMark'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { conversationPath, ROUTES, type CallMedia } from '@/config/constants'
import { emitTypingStart, emitTypingStop } from '@/lib/socket'
import type {
  MessageAttachmentInput,
  MessageResponse,
} from '@/features/messaging/types/message.types'
import type { ChatTab } from '@/types/common'
import type { StoryEntry } from '@/features/story/types/story.types'
import {
  isMessageConfirmed,
  useConversationMessagesQuery,
  useMarkReadMutation,
  useSendMessageMutation,
  type SendMessagePendingFile,
} from '@/features/messaging/hooks/useMessages'
import {
  useConversationsQuery,
  useConversationQuery,
  useGroupMembersQuery,
} from '@/features/conversation/hooks/useConversations'
import { useChatRealtime } from '@/features/messaging/hooks/useMessagingRealtime'
import { useMarkReadCoalescer } from '@/features/messaging/hooks/useMarkReadCoalescer'
import { useStoriesList } from '@/features/story/hooks/useStories'
import { getStoryById } from '@/features/story/api/stories.api'
import {
  buildDayGroupsFromMessages,
  mapMessageResponse,
} from '@/features/conversation/utils/chat.mapper'
import { groupStoriesByAuthor } from '@/features/story/utils/storyGroups'
import {
  getMessageScrollPosition,
  saveMessageScrollPosition,
  type MessageScrollPosition,
} from '@/features/messaging/utils/messageScrollPosition'
import { SideNav } from '@/features/shell/components/SideNav'
import { MiddlePanel } from '@/features/shell/components/MiddlePanel'
import { ConversationView } from '@/features/messaging/components/conversation'
import { StoryViewer } from '@/features/story/components/StoryViewer'
import { useAuth } from '@/features/auth/api'
import { useCall, useCallHistory } from '@/features/call'

const TYPING_HEARTBEAT_MS = 1_500

export function visibleLiveMessages(
  timeline: MessageResponse[],
  live: MessageResponse[],
  hasLatest: boolean,
): MessageResponse[] {
  if (!hasLatest) return []
  if (timeline.length === 0) return live
  const compare = (a: MessageResponse, b: MessageResponse) =>
    Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id)
  const oldest = timeline.reduce((a, b) => (compare(a, b) <= 0 ? a : b))
  return live.filter((message) => message.id.startsWith('temp-') || compare(message, oldest) >= 0)
}

export function ChatShell() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { conversationId } = useParams<{ conversationId: string }>()

  // Hội thoại đang mở được lấy từ URL để F5/reload không mất màn chat.
  const selectedId = conversationId ?? null
  const initialTab = (location.state as { tab?: ChatTab } | null)?.tab ?? 'messages'
  const legacySelect = (location.state as { select?: string } | null)?.select ?? null
  const isMdDown = useMediaQuery('(max-width: 48rem)') // Breakpoint md của Tailwind (768px)
  const [tab, setTab] = useState<ChatTab>(initialTab)
  const [query, setQuery] = useState('')
  const [viewingStory, setViewingStory] = useState<StoryEntry | null>(null)
  const [conversationStory, setConversationStory] = useState<StoryEntry | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const todayLabel = t('chat.today')

  // Tương thích với các entry cũ còn truyền `state.select` — chuyển sang URL.
  useEffect(() => {
    if (!selectedId && legacySelect) {
      navigate(conversationPath(legacySelect), { replace: true, state: { tab } })
    }
  }, [legacySelect, navigate, selectedId, tab])

  // Realtime Socket.IO sync
  const {
    isPartnerTyping,
    typingUserCount,
    typingUserIds,
    conversationAccess,
    retryConversationAccess,
  } = useChatRealtime(selectedId)

  // API Queries & Mutations
  const conversationsQuery = useConversationsQuery()
  const messagesQuery = useConversationMessagesQuery(selectedId, Boolean(selectedId))
  const sendMessageMutation = useSendMessageMutation(selectedId)
  const markReadMutation = useMarkReadMutation()
  const { startCall: initiateCallSession } = useCall()
  const lastTypingSentAt = useRef(0)
  const lastReadAttempt = useRef<string | null>(null)

  const rawConversations = useMemo(() => conversationsQuery.data ?? [], [conversationsQuery.data])

  const q = query.trim().toLowerCase()
  const conversations = useMemo(
    () =>
      rawConversations.filter(
        (c) => !q || c.name.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q),
      ),
    [rawConversations, q],
  )

  const callHistoryQuery = useCallHistory()
  const calls = useMemo(() => {
    const list = callHistoryQuery.data ?? []
    return list.filter((c) => !q || c.name.toLowerCase().includes(q))
  }, [callHistoryQuery.data, q])

  const storiesQuery = useStoriesList(user?.id)
  useEffect(() => {
    if (storiesQuery.isError) {
      toast.error(
        storiesQuery.error instanceof Error
          ? storiesQuery.error.message
          : t('chat.storiesLoadError'),
      )
    }
  }, [storiesQuery.isError, storiesQuery.error, t])
  const allStories = useMemo(
    () => groupStoriesByAuthor(storiesQuery.data ?? []).flat(),
    [storiesQuery.data],
  )
  const stories = useMemo(
    () => allStories.filter((s) => !q || s.name.toLowerCase().includes(q)),
    [allStories, q],
  )

  const totalUnread = useMemo(
    () => rawConversations.reduce((n, c) => n + (c.unread || 0), 0),
    [rawConversations],
  )

  // Tìm trong danh sách chưa lọc: gõ ô tìm kiếm không được làm viewer đang mở biến mất.
  const currentStory =
    tab === 'stories' && viewingStory
      ? (allStories.find((item) => item.id === viewingStory.id) ?? null)
      : null

  // Fallback khi URL trỏ tới hội thoại không có trong trang inbox đầu tiên.
  const selectedFromList = rawConversations.find((c) => c.id === selectedId) ?? null
  const needsConversationDetail =
    Boolean(selectedId) && !selectedFromList && !conversationsQuery.isPending
  const conversationDetailQuery = useConversationQuery(selectedId, needsConversationDetail)
  const selected = selectedFromList ?? conversationDetailQuery.data ?? null
  const hasCachedMessages = Boolean(messagesQuery.data)
  const canRenderCachedConversation =
    Boolean(selected) &&
    (conversationAccess === 'allowed' || (conversationAccess === 'verifying' && hasCachedMessages))
  const groupMembersQuery = useGroupMembersQuery(
    selected?.isGroup ? selected.id : null,
    Boolean(selected?.isGroup) && (conversationAccess === 'allowed' || canRenderCachedConversation),
  )
  const typingNames = typingUserIds.flatMap((id) => {
    const member = groupMembersQuery.data?.find((item) => item.id === id)
    return member ? [member.fullName || member.username] : []
  })
  const partnerStories =
    selected && !selected.isGroup && selected.partnerId
      ? allStories.filter((story) => story.authorId === selected.partnerId && !story.mine)
      : []
  const partnerStory = partnerStories.find((story) => !story.viewed) ?? partnerStories[0]

  const restoringConversation =
    Boolean(selectedId) &&
    ((!hasCachedMessages && conversationAccess === 'verifying') ||
      (!selected && (conversationsQuery.isPending || conversationDetailQuery.isPending)))
  const restoreFailed =
    Boolean(selectedId) &&
    !selected &&
    !restoringConversation &&
    (conversationsQuery.isError || conversationDetailQuery.isError)
  const restoreListError = conversationsQuery.isError && !conversationDetailQuery.isSuccess

  const messageItems = useMemo(() => {
    const timeline = messagesQuery.data?.pages.flatMap((page) => page.items) ?? []
    const messages = [
      ...timeline,
      ...visibleLiveMessages(timeline, messagesQuery.liveMessages ?? [], messagesQuery.hasLatest),
    ]
    const uniqueMap = new Map<string, MessageResponse>()
    for (const msg of messages) {
      const key = msg.clientMsgId ? `client-${msg.clientMsgId}` : msg.id
      const existing = uniqueMap.get(key)
      if (!existing || (existing.id.startsWith('temp-') && !msg.id.startsWith('temp-'))) {
        uniqueMap.set(key, msg)
      }
    }
    return [...uniqueMap.values()].sort(
      (left, right) =>
        Date.parse(left.createdAt) - Date.parse(right.createdAt) || left.id.localeCompare(right.id),
    )
  }, [messagesQuery.data, messagesQuery.liveMessages, messagesQuery.hasLatest])

  // API trả từng trang mới nhất trước; UI cần timeline cũ đến mới.
  const groups = useMemo(() => {
    if (!selected || !messageItems) return []
    const byId = new Map(messageItems.map((message) => [message.id, message]))
    const chatMsgs = messageItems.map((message) => {
      const target = message.replyToId ? byId.get(message.replyToId) : undefined
      return mapMessageResponse(
        {
          ...message,
          replyTarget: target
            ? {
                id: target.id,
                senderId: target.senderId,
                kind: target.kind,
                body: target.deletedAt ? null : target.body,
                attachments: target.deletedAt ? undefined : target.attachments,
                deletedAt: target.deletedAt,
                storyPreview: target.deletedAt ? null : target.storyPreview,
              }
            : message.replyTarget,
        },
        user?.id,
      )
    })
    return buildDayGroupsFromMessages(chatMsgs, todayLabel)
  }, [selected, messageItems, user?.id, todayLabel])

  const handleSelect = (id: string) => {
    setTab('messages')
    setQuery('')
    navigate(conversationPath(id))
  }

  const startCall = (media: CallMedia) => {
    if (!selected || selected.isGroup) return
    initiateCallSession({
      conversationId: selected.id,
      media,
      peerName: selected.name,
      peerAvatar: selected.partnerAvatar,
    })
  }

  // Gom các lần check thấy tin trong thời gian ngắn thành 1 POST /read (mở hội thoại
  // bắn nhiều lần); đổi hội thoại/unmount flush ngay, không bỏ mark-read đang chờ.
  const queueMarkRead = useMarkReadCoalescer(selectedId, ({ conversationId, messageId }) => {
    const attempt = `${conversationId}:${messageId}`
    lastReadAttempt.current = attempt
    markReadMutation.mutate(
      { conversationId, lastReadMessageId: messageId },
      {
        onError: () => {
          if (lastReadAttempt.current === attempt) lastReadAttempt.current = null
        },
      },
    )
  })

  const markVisibleMessageRead = (messageId: string) => {
    if (!selectedId) return
    const attempt = `${selectedId}:${messageId}`
    if (lastReadAttempt.current === attempt) return
    queueMarkRead({ conversationId: selectedId, messageId })
  }

  const handleSend = async (
    text: string,
    attachments?: MessageAttachmentInput[],
    pendingFiles?: SendMessagePendingFile[],
    replyToId?: string | null,
    clientMsgId?: string,
    onUploadProgress?: (percent: number | null) => void,
  ): Promise<boolean> => {
    if (!selectedId) return false
    try {
      handleTypingStop()
      await sendMessageMutation.mutateAsync({
        body: text,
        attachments,
        pendingFiles,
        replyToId,
        clientMsgId,
        onUploadProgress,
      })
      return true
    } catch {
      // A network error can arrive after the server committed the message and
      // realtime reconciliation replaced the optimistic row. Treat that case
      // as success so the composer does not create a false failed-attempt banner.
      return Boolean(clientMsgId && isMessageConfirmed(queryClient, selectedId, clientMsgId))
    }
  }

  const handleRetrySend = (messageId: string) => {
    const message = messagesQuery.liveMessages?.find((item) => item.id === messageId)
    const attempt = message?.retryAttempt ?? message?.retryPayload
    if (!attempt || sendMessageMutation.isPending) return
    void sendMessageMutation.mutateAsync(attempt).catch(() => undefined)
  }

  const handlePositionChange = useCallback(
    (position: MessageScrollPosition) => {
      if (selectedId) saveMessageScrollPosition(selectedId, position)
    },
    [selectedId],
  )

  const handleTypingStart = () => {
    if (!selectedId) return
    const now = Date.now()
    if (now - lastTypingSentAt.current < TYPING_HEARTBEAT_MS) return
    lastTypingSentAt.current = now
    emitTypingStart(selectedId)
  }

  const handleTypingStop = () => {
    if (!selectedId) return
    lastTypingSentAt.current = 0
    emitTypingStop(selectedId)
  }

  const userName = user?.fullName ?? user?.username ?? 'Lemon User'
  const savedScrollPosition =
    selected && !selected.unread ? getMessageScrollPosition(selected.id) : undefined
  const restorePosition =
    savedScrollPosition?.kind === 'bottom' ||
    (savedScrollPosition?.kind === 'message' &&
      messageItems.some((message) => message.id === savedScrollPosition.messageId))
      ? savedScrollPosition
      : undefined

  return (
    <main
      className={cn(
        'flex h-dvh w-full overflow-hidden bg-background text-foreground md:pb-0',
        !selectedId && 'pb-16',
      )}
    >
      <SideNav
        active={tab}
        onChange={(nextTab) => {
          setTab(nextTab)
          setQuery('')
          // Desktop giữ hội thoại đang mở trên URL; mobile quay về danh sách.
          const targetPath =
            !isMdDown && selectedId ? conversationPath(selectedId) : ROUTES.messages
          navigate(targetPath, { replace: true, state: { tab: nextTab } })
        }}
        totalUnread={totalUnread}
        onOpenSettings={() => navigate(ROUTES.settings)}
        settingsActive={false}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        mobileBarVisible={!selectedId}
      />

      {/* Panel B — danh sách (tin nhắn / cuộc gọi / story) */}
      <div
        className={cn(
          (tab === 'messages' && selectedId) || (tab === 'stories' && currentStory)
            ? 'hidden h-full min-h-0 md:flex md:h-full md:min-w-0'
            : 'flex h-full min-h-0 min-w-0 flex-1 md:flex-none',
          !sidebarOpen && 'hidden md:hidden',
        )}
      >
        <MiddlePanel
          tab={tab}
          conversations={conversations}
          conversationsLoading={conversationsQuery.isPending}
          conversationsError={conversationsQuery.error?.message}
          onRetryConversations={() => {
            void conversationsQuery.refetch()
          }}
          calls={calls}
          stories={tab === 'stories' ? stories : (storiesQuery.data ?? [])}
          selectedId={selectedId}
          activeStoryId={tab === 'stories' ? currentStory?.id : null}
          query={query}
          onQuery={setQuery}
          onSelectConversation={handleSelect}
          onOpenStory={(s) => {
            setQuery('')
            setViewingStory(s)
            setTab('stories')
          }}
          onCall={() => navigate(ROUTES.calls)}
          onNewCall={() => navigate(ROUTES.newCall)}
          onNewChat={() => navigate(ROUTES.newChat)}
        />
      </div>

      {/* Panel C — Hội thoại hoặc Story Viewer trực tiếp trên màn hình chính */}
      <div
        className={
          (tab === 'messages' && selectedId) || (tab === 'stories' && currentStory)
            ? 'flex h-full min-h-0 w-full min-w-0 flex-1'
            : 'hidden h-full min-h-0 w-full min-w-0 flex-1 md:flex'
        }
      >
        {tab === 'stories' ? (
          currentStory ? (
            <StoryViewer
              key={currentStory.id}
              story={currentStory}
              stories={allStories}
              embedded={true}
              onSelectStory={setViewingStory}
              onClose={() => setViewingStory(null)}
            />
          ) : (
            <section
              className="hidden h-full min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 bg-background p-8 text-center md:flex"
              aria-label="Chọn tin để xem"
            >
              <span className="grid size-20 place-items-center rounded-[28px] bg-primary/20 text-primary shadow-md">
                <BrandMark animated className="size-12" />
              </span>
              <div>
                <h2 className="text-lg font-bold">Chọn một tin để xem</h2>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                  Chọn tin của bạn bè ở danh sách bên trái để xem nội dung và tương tác.
                </p>
              </div>
            </section>
          )
        ) : selected && canRenderCachedConversation ? (
          <ConversationView
            key={selected.id}
            conversation={selected}
            isVisible={!isMdDown || tab === 'messages'}
            onOpenStory={partnerStory ? () => setConversationStory(partnerStory) : undefined}
            onLoadMessage={messagesQuery.loadMessageWindow}
            onOpenStoryReply={(storyId) => {
              void getStoryById(storyId, user?.id)
                .then((story) => {
                  const known = allStories.find((item) => item.id === storyId)
                  setConversationStory(
                    known
                      ? { ...known, ...story, name: known.name, authorAvatar: known.authorAvatar }
                      : story,
                  )
                })
                .catch((err: unknown) => {
                  if (
                    err instanceof ApiError &&
                    (err.status === 404 ||
                      err.code === 'STORY_NOT_FOUND' ||
                      err.status === 403 ||
                      err.code === 'STORY_VIEW_FORBIDDEN')
                  ) {
                    toast.info(t('chat.replyUnavailableStory'))
                    return
                  }
                  toast.error(t('chat.storyMediaError'))
                })
            }}
            groups={groups}
            messagesLoading={messagesQuery.isPending}
            messagesError={
              messagesQuery.isError && !messagesQuery.data ? messagesQuery.error.message : undefined
            }
            onRetryMessages={() => {
              void messagesQuery.refetch()
            }}
            hasOlderMessages={Boolean(messagesQuery.hasNextPage)}
            isLoadingOlderMessages={messagesQuery.isFetchingNextPage}
            isFetchingMessages={messagesQuery.isFetching}
            onLoadOlderMessages={async () => {
              const result = await messagesQuery.fetchNextPage()
              if (result.isError) throw result.error
            }}
            hasNewerMessages={Boolean(messagesQuery.hasPreviousPage)}
            hasLatest={messagesQuery.hasLatest}
            onLoadLatest={messagesQuery.loadLatest}
            onVisibleMessage={markVisibleMessageRead}
            onRetryMessage={handleRetrySend}
            restorePosition={restorePosition}
            onPositionChange={handlePositionChange}
            isLoadingNewerMessages={messagesQuery.isFetchingPreviousPage}
            onLoadNewerMessages={async () => {
              const result = await messagesQuery.fetchPreviousPage()
              if (result.isError) throw result.error
            }}
            onSend={handleSend}
            isSending={sendMessageMutation.isPending}
            showBack
            onBack={() => navigate(ROUTES.messages, { state: { tab } })}
            typingUserCount={isPartnerTyping ? typingUserCount : 0}
            typingNames={typingNames}
            onTypingStart={handleTypingStart}
            onTypingStop={handleTypingStop}
            onVoiceCall={() => startCall('voice')}
            onVideoCall={() => startCall('video')}
          />
        ) : selectedId ? (
          <section
            className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center gap-3 bg-background p-8 text-center"
            aria-busy={restoringConversation || conversationAccess === 'retryable-error'}
            aria-label={t('chat.loadingConversation')}
          >
            {conversationAccess === 'retryable-error' ? (
              <>
                <p className="text-sm text-muted-foreground">{t('chat.messagesLoadError')}</p>
                <button
                  type="button"
                  className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                  onClick={retryConversationAccess}
                >
                  {t('common.retry', 'Thử lại')}
                </button>
              </>
            ) : restoringConversation ? (
              <>
                <span
                  className="size-8 animate-spin rounded-full border-2 border-border border-t-brand-ink"
                  aria-hidden="true"
                />
                <p className="text-sm text-muted-foreground">{t('chat.loadingConversation')}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-foreground">
                  {restoreListError
                    ? t('chat.conversationsLoadError')
                    : t('chat.conversationNotFound')}
                </p>
                <div className="flex items-center gap-2">
                  {restoreFailed && (
                    <button
                      type="button"
                      onClick={() => {
                        void conversationsQuery.refetch()
                        void conversationDetailQuery.refetch()
                      }}
                      className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                    >
                      {t('common.retry')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate(ROUTES.messages)}
                    className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
                  >
                    {t('chat.backToList')}
                  </button>
                </div>
              </>
            )}
          </section>
        ) : (
          <section
            className="hidden h-full min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 bg-background p-8 text-center md:flex"
            aria-label={t('chat.noConversationSelected')}
          >
            <span className="grid size-20 place-items-center rounded-[28px] bg-primary shadow-md">
              <BrandMark animated className="size-12" />
            </span>
            <div>
              <h2 className="text-lg font-bold">{t('chat.emptyThread', { name: userName })}</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                {t('chat.emptyThreadHint')}
              </p>
            </div>
            <span className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground">
              {t('chat.tagline')}
            </span>
          </section>
        )}
      </div>
      {conversationStory && (
        <StoryViewer
          key={conversationStory.id}
          story={conversationStory}
          stories={
            partnerStories.some((story) => story.id === conversationStory.id)
              ? partnerStories
              : [conversationStory]
          }
          onSelectStory={setConversationStory}
          onClose={() => setConversationStory(null)}
        />
      )}
    </main>
  )
}
