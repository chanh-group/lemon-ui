// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/infrastructure/api/errors'
import { useAuthStore } from '@/infrastructure/auth/auth-store'
import { queryKeys } from '@/infrastructure/query/keys'
import type { MessageResponse } from '@/features/messaging/types/message.types'
import { CHAT_QUERY_KEYS } from './useMessages'
import { useChatRealtime } from './useMessagingRealtime'

const mocks = vi.hoisted(() => ({
  getSocket: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  isSocketReady: vi.fn(() => true),
  navigate: vi.fn(),
  getConversation: vi.fn(),
  getMembers: vi.fn(),
  fetchMissedMessages: vi.fn(),
}))

vi.mock('@/features/auth/api', () => ({
  useAuth: () => ({ user: { id: 'viewer' }, status: 'authenticated' }),
}))
vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>()
  const t = (key: string) => key
  return { ...actual, useTranslation: () => ({ t }) }
})
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }))
vi.mock('@/lib/socket', () => ({
  getChatSocket: mocks.getSocket,
  connectChatSocket: mocks.connect,
  disconnectChatSocket: mocks.disconnect,
  isChatSocketReady: mocks.isSocketReady,
}))
vi.mock('@/features/conversation/api/conversation.api', () => ({
  getConversationById: mocks.getConversation,
  getGroupMembers: mocks.getMembers,
}))
vi.mock('@/features/messaging/utils/messageSync', () => ({
  fetchMissedMessages: mocks.fetchMissedMessages,
}))

function createSocket() {
  const listeners = new Map<string, Set<(value?: unknown) => void>>()
  const on = vi.fn((event: string, listener: (value?: unknown) => void) => {
    const handlers = listeners.get(event) ?? new Set()
    handlers.add(listener)
    listeners.set(event, handlers)
  })
  const off = vi.fn((event: string, listener: (value?: unknown) => void) => {
    listeners.get(event)?.delete(listener)
  })
  return {
    connected: false,
    active: false,
    io: { on: vi.fn(), off: vi.fn() },
    on,
    off,
    emit(event: string, value?: unknown) {
      listeners.get(event)?.forEach((listener) => listener(value))
    },
  }
}

let socket: ReturnType<typeof createSocket>
let queryClient: QueryClient
const group = { id: 'group-1', kind: 'GROUP', title: 'Fresh group' }

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
  socket = createSocket()
  mocks.getSocket.mockReturnValue(socket)
  mocks.fetchMissedMessages.mockResolvedValue([])
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

afterEach(() => {
  cleanup()
  queryClient.clear()
})

describe('useChatRealtime reconnect access', () => {
  it('removes an inaccessible group and ignores late messages after an offline removal', async () => {
    queryClient.setQueryData(CHAT_QUERY_KEYS.conversations, [group])
    queryClient.setQueryData(CHAT_QUERY_KEYS.messages(group.id), {
      pages: [{ items: [{ id: 'old-message' }], hasMore: false }],
      pageParams: [undefined],
    })
    queryClient.setQueryData(CHAT_QUERY_KEYS.liveMessages(group.id), [{ id: 'old-message' }])
    queryClient.setQueryData(queryKeys.chat.groupMembers(group.id), [{ userId: 'viewer' }])
    mocks.getConversation.mockRejectedValue(new ApiError('NOT_PARTICIPANT', 403, 'removed'))

    const { result } = renderHook(() => useChatRealtime(group.id), { wrapper })
    act(() => {
      socket.connected = true
      socket.emit('connect')
    })

    await waitFor(() => expect(result.current.conversationAccess).toBe('revoked'))
    expect(mocks.navigate).toHaveBeenCalled()
    expect(queryClient.getQueryData(CHAT_QUERY_KEYS.messages(group.id))).toBeUndefined()
    expect(queryClient.getQueryData(CHAT_QUERY_KEYS.liveMessages(group.id))).toBeUndefined()
    expect(queryClient.getQueryData(queryKeys.chat.groupMembers(group.id))).toBeUndefined()
    expect(queryClient.getQueryData(CHAT_QUERY_KEYS.conversations)).toEqual([])

    act(() => {
      socket.emit('message:new', { id: 'late-message', conversationId: group.id, body: 'secret' })
    })
    expect(queryClient.getQueryData(CHAT_QUERY_KEYS.liveMessages(group.id))).toBeUndefined()
  })

  it('refreshes group metadata and members before allowing the conversation', async () => {
    queryClient.setQueryData(queryKeys.chat.conversation(group.id), { ...group, title: 'Stale' })
    queryClient.setQueryData(queryKeys.chat.groupMembers(group.id), [{ userId: 'stale' }])
    mocks.getConversation.mockResolvedValue(group)
    mocks.getMembers.mockResolvedValue([{ userId: 'viewer', role: 'MEMBER' }])

    const { result } = renderHook(() => useChatRealtime(group.id), { wrapper })
    act(() => {
      socket.connected = true
      socket.emit('connect')
    })

    await waitFor(() => expect(result.current.conversationAccess).toBe('allowed'))
    expect(queryClient.getQueryData(queryKeys.chat.conversation(group.id))).toEqual(group)
    expect(queryClient.getQueryData(queryKeys.chat.groupMembers(group.id))).toEqual([
      { userId: 'viewer', role: 'MEMBER' },
    ])
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('keeps cached data hidden on a transient failure and permits retry', async () => {
    queryClient.setQueryData(CHAT_QUERY_KEYS.messages(group.id), {
      pages: [{ items: [{ id: 'old-message' }], hasMore: false }],
      pageParams: [undefined],
    })
    mocks.getConversation.mockRejectedValueOnce(new Error('network')).mockResolvedValue(group)
    mocks.getMembers.mockResolvedValue([{ userId: 'viewer' }])

    const { result } = renderHook(() => useChatRealtime(group.id), { wrapper })
    act(() => {
      socket.connected = true
      socket.emit('connect')
    })
    await waitFor(() => expect(result.current.conversationAccess).toBe('retryable-error'))
    expect(queryClient.getQueryData(CHAT_QUERY_KEYS.messages(group.id))).toBeDefined()
    expect(mocks.navigate).not.toHaveBeenCalled()

    act(() => result.current.retryConversationAccess())
    await waitFor(() => expect(result.current.conversationAccess).toBe('allowed'))
    expect(mocks.getConversation).toHaveBeenCalledTimes(2)
  })

  it('does not restore a stale verification response after access was revoked', async () => {
    let resolveFirst!: (value: typeof group) => void
    const firstResponse = new Promise<typeof group>((resolve) => {
      resolveFirst = resolve
    })
    mocks.getConversation
      .mockImplementationOnce(() => firstResponse)
      .mockRejectedValueOnce(new ApiError('NOT_PARTICIPANT', 403, 'removed'))
    queryClient.setQueryData(CHAT_QUERY_KEYS.conversations, [group])

    const { result } = renderHook(() => useChatRealtime(group.id), { wrapper })
    act(() => {
      socket.connected = true
      socket.emit('connect')
    })
    await waitFor(() => expect(mocks.getConversation).toHaveBeenCalledTimes(1))
    act(() => {
      socket.connected = false
      socket.emit('disconnect')
      socket.connected = true
      socket.emit('connect')
      socket.emit('ready')
    })
    await waitFor(() => expect(result.current.conversationAccess).toBe('revoked'))

    await act(async () => {
      resolveFirst(group)
      await firstResponse
    })
    expect(queryClient.getQueryData(queryKeys.chat.conversation(group.id))).toBeUndefined()
    expect(queryClient.getQueryData(CHAT_QUERY_KEYS.conversations)).toEqual([])
  })

  it('allows switching between friends instantly from cache without blocking network verify', async () => {
    const friend1 = { id: 'friend-1', kind: 'DIRECT', isGroup: false }
    const friend2 = { id: 'friend-2', kind: 'DIRECT', isGroup: false }
    queryClient.setQueryData(CHAT_QUERY_KEYS.conversations, [friend1, friend2])
    queryClient.setQueryData(CHAT_QUERY_KEYS.messages(friend2.id), {
      pages: [{ items: [{ id: 'm-1' }], hasMore: false }],
      pageParams: [undefined],
    })

    const { result, rerender } = renderHook(
      ({ convId }: { convId: string }) => useChatRealtime(convId),
      { wrapper, initialProps: { convId: friend1.id } },
    )

    expect(result.current.conversationAccess).toBe('allowed')
    expect(mocks.getConversation).not.toHaveBeenCalled()

    // Switch to friend 2
    rerender({ convId: friend2.id })
    expect(result.current.conversationAccess).toBe('allowed')
    expect(mocks.getConversation).not.toHaveBeenCalled()
    await waitFor(() => expect(mocks.fetchMissedMessages).toHaveBeenCalled())
  })

  it('keeps socket listeners bound while switching conversations', () => {
    const friend1 = { id: 'friend-1', kind: 'DIRECT', isGroup: false }
    const friend2 = { id: 'friend-2', kind: 'DIRECT', isGroup: false }
    queryClient.setQueryData(CHAT_QUERY_KEYS.conversations, [friend1, friend2])

    const { rerender } = renderHook(({ convId }: { convId: string }) => useChatRealtime(convId), {
      wrapper,
      initialProps: { convId: friend1.id },
    })
    const listenerCount = socket.on.mock.calls.length

    rerender({ convId: friend2.id })

    expect(socket.on).toHaveBeenCalledTimes(listenerCount)
    expect(socket.off).not.toHaveBeenCalled()
  })

  it('deduplicates an in-flight missed-message sync and updates read state locally', async () => {
    const friend1 = {
      id: 'friend-1',
      kind: 'DIRECT',
      isGroup: false,
      unreadCount: 2,
      lastMessageDetail: { id: 'm-1' },
    }
    const friend2 = { id: 'friend-2', kind: 'DIRECT', isGroup: false, unreadCount: 1 }
    queryClient.setQueryData(CHAT_QUERY_KEYS.conversations, [friend1, friend2])
    queryClient.setQueryData(CHAT_QUERY_KEYS.messages(friend1.id), {
      pages: [{ items: [{ id: 'm-1' }], hasMore: false }],
      pageParams: [undefined],
    })
    let resolveMissed!: (messages: MessageResponse[]) => void
    mocks.fetchMissedMessages.mockImplementation(
      () => new Promise<MessageResponse[]>((resolve) => (resolveMissed = resolve)),
    )

    const { rerender } = renderHook(({ convId }: { convId: string }) => useChatRealtime(convId), {
      wrapper,
      initialProps: { convId: friend1.id },
    })
    await waitFor(() => expect(mocks.fetchMissedMessages).toHaveBeenCalledTimes(1))

    rerender({ convId: friend2.id })
    rerender({ convId: friend1.id })
    expect(mocks.fetchMissedMessages).toHaveBeenCalledTimes(1)

    act(() => {
      socket.emit('read:updated', {
        conversationId: friend1.id,
        userId: 'viewer',
        lastReadMessageId: 'm-1',
        readAt: '2026-11-20T00:00:00.000Z',
      })
    })
    expect(
      queryClient.getQueryData<(typeof friend1)[]>(CHAT_QUERY_KEYS.conversations)?.[0],
    ).toEqual({
      ...friend1,
      unreadCount: 0,
    })

    await act(async () => resolveMissed([]))
  })

  it('does not clear newer unread messages when an older read event arrives', () => {
    const conversation = {
      id: 'friend-1',
      kind: 'DIRECT',
      unreadCount: 2,
      lastMessageDetail: { id: 'new-message' },
    }
    queryClient.setQueryData(CHAT_QUERY_KEYS.conversations, [conversation])
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    renderHook(() => useChatRealtime(conversation.id), { wrapper })

    act(() => {
      socket.emit('read:updated', {
        conversationId: conversation.id,
        userId: 'viewer',
        lastReadMessageId: 'old-message',
        readAt: '2026-11-20T00:00:00.000Z',
      })
    })

    expect(queryClient.getQueryData(CHAT_QUERY_KEYS.conversations)).toEqual([conversation])
    expect(invalidate).toHaveBeenCalledWith({ queryKey: CHAT_QUERY_KEYS.conversations })
  })

  it('does not count a delayed message as unread after its read event', () => {
    const conversation = {
      id: 'friend-1',
      kind: 'DIRECT',
      unreadCount: 0,
      lastMessageDetail: { id: 'previous-message' },
    }
    queryClient.setQueryData(CHAT_QUERY_KEYS.conversations, [conversation])
    renderHook(() => useChatRealtime(conversation.id), { wrapper })

    act(() => {
      socket.emit('read:updated', {
        conversationId: conversation.id,
        userId: 'viewer',
        lastReadMessageId: 'new-message',
        readAt: '2026-11-20T00:00:01.000Z',
      })
      socket.emit('message:new', {
        id: 'new-message',
        conversationId: conversation.id,
        senderId: 'friend',
        kind: 'TEXT',
        body: 'Already read',
        createdAt: '2026-11-20T00:00:00.000Z',
      })
    })

    expect(
      queryClient.getQueryData<(typeof conversation)[]>(CHAT_QUERY_KEYS.conversations)?.[0]
        .unreadCount,
    ).toBe(0)
  })

  it('reconciles newer messages without guessing their unread state', async () => {
    const conversation = { id: 'friend-1', kind: 'DIRECT', unreadCount: 0 }
    queryClient.setQueryData(CHAT_QUERY_KEYS.conversations, [conversation])
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    renderHook(() => useChatRealtime(conversation.id), { wrapper })
    act(() => {
      socket.emit('read:updated', {
        conversationId: conversation.id,
        userId: 'viewer',
        lastReadMessageId: 'old-message',
        readAt: '2026-11-20T00:00:00.000Z',
      })
    })
    invalidate.mockClear()
    act(() => {
      socket.emit('message:new', {
        id: 'new-message',
        conversationId: conversation.id,
        senderId: 'friend',
        kind: 'TEXT',
        body: 'New',
        createdAt: '2026-11-20T00:00:01.000Z',
      })
    })
    expect(
      queryClient.getQueryData<(typeof conversation)[]>(CHAT_QUERY_KEYS.conversations)?.[0]
        .unreadCount,
    ).toBe(0)
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: CHAT_QUERY_KEYS.conversations }),
    )
    expect(invalidate).not.toHaveBeenCalledWith({
      queryKey: CHAT_QUERY_KEYS.messages(conversation.id),
    })
  })

  it('does not reuse a read cursor across conversations or sessions', async () => {
    const first = { id: 'first', kind: 'DIRECT', unreadCount: 0 }
    const second = { id: 'second', kind: 'DIRECT', unreadCount: 0 }
    queryClient.setQueryData(CHAT_QUERY_KEYS.conversations, [first, second])
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { rerender } = renderHook(({ id }: { id: string }) => useChatRealtime(id), {
      wrapper,
      initialProps: { id: first.id },
    })
    act(() =>
      socket.emit('read:updated', {
        conversationId: first.id,
        userId: 'viewer',
        lastReadMessageId: 'message',
        readAt: '2026-11-20T00:00:00.000Z',
      }),
    )
    rerender({ id: second.id })
    invalidate.mockClear()
    act(() =>
      socket.emit('message:new', {
        id: 'message',
        conversationId: second.id,
        senderId: 'friend',
        kind: 'TEXT',
        body: 'New',
        createdAt: '2026-11-20T00:00:01.000Z',
      }),
    )
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: CHAT_QUERY_KEYS.conversations }),
    )
    invalidate.mockClear()
    useAuthStore.getState().setAccessToken('new-session')
    act(() =>
      socket.emit('message:new', {
        id: 'message',
        conversationId: first.id,
        senderId: 'friend',
        kind: 'TEXT',
        body: 'New',
        createdAt: '2026-11-20T00:00:01.000Z',
      }),
    )
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: CHAT_QUERY_KEYS.conversations }),
    )
  })

  it('does not restore revoked content when a stale edit event arrives', () => {
    const revoked = {
      id: 'm-1',
      conversationId: 'friend-1',
      body: null,
      deletedAt: '2026-11-20T00:00:00.000Z',
    }
    const reply = {
      id: 'm-2',
      conversationId: 'friend-1',
      replyTarget: { id: 'm-1', body: null, deletedAt: revoked.deletedAt },
    }
    queryClient.setQueryData(CHAT_QUERY_KEYS.messages('friend-1'), {
      pages: [{ items: [revoked, reply], hasMore: false }],
      pageParams: [undefined],
    })
    queryClient.setQueryData(CHAT_QUERY_KEYS.liveMessages('friend-1'), [revoked, reply])
    renderHook(() => useChatRealtime('friend-1'), { wrapper })

    act(() => {
      socket.emit('message:updated', {
        id: 'm-1',
        conversationId: 'friend-1',
        body: 'sensitive stale content',
        editedAt: '2026-11-19T00:00:00.000Z',
      })
    })

    expect(queryClient.getQueryData(CHAT_QUERY_KEYS.liveMessages('friend-1'))).toEqual([
      revoked,
      reply,
    ])
    expect(queryClient.getQueryData(CHAT_QUERY_KEYS.messages('friend-1'))).toEqual({
      pages: [{ items: [revoked, reply], hasMore: false }],
      pageParams: [undefined],
    })
  })

  it('purges stale message cache when switching to a group with an epoch mismatch', async () => {
    const groupGen1 = { id: 'group-epoch', kind: 'GROUP', joinGeneration: 'gen-1' }
    const staleGroup = { id: 'group-epoch', kind: 'GROUP', joinGeneration: 'gen-2' }
    mocks.getConversation.mockResolvedValueOnce(groupGen1).mockResolvedValueOnce(staleGroup)
    mocks.getMembers.mockResolvedValue([])

    queryClient.setQueryData(CHAT_QUERY_KEYS.conversations, [groupGen1])
    queryClient.setQueryData(CHAT_QUERY_KEYS.messages('group-epoch'), {
      pages: [{ items: [{ id: 'old-epoch-msg' }], hasMore: false }],
      pageParams: [undefined],
    })

    const { result, rerender } = renderHook(
      ({ convId }: { convId: string }) => useChatRealtime(convId),
      { wrapper, initialProps: { convId: 'group-epoch' } },
    )

    // First mount verifies gen-1
    await waitFor(() => expect(result.current.conversationAccess).toBe('allowed'))

    // Now server inbox updates with gen-2 (user was kicked and re-added)
    queryClient.setQueryData(CHAT_QUERY_KEYS.conversations, [staleGroup])
    queryClient.setQueryData(CHAT_QUERY_KEYS.messages('group-epoch'), {
      pages: [{ items: [{ id: 'old-epoch-msg' }], hasMore: false }],
      pageParams: [undefined],
    })

    // Switch away and back
    rerender({ convId: 'other-conv' })
    rerender({ convId: 'group-epoch' })

    // Old cache should be purged immediately upon detecting epoch mismatch
    expect(queryClient.getQueryData(CHAT_QUERY_KEYS.messages('group-epoch'))).toBeUndefined()
  })
})

describe('useChatRealtime group typing', () => {
  it('keeps other members typing when one member sends a message', () => {
    const { result } = renderHook(() => useChatRealtime(group.id), { wrapper })

    act(() => {
      socket.emit('typing', { conversationId: group.id, userId: 'member-a', isTyping: true })
      socket.emit('typing', { conversationId: group.id, userId: 'member-b', isTyping: true })
    })
    expect(result.current.typingUserIds).toEqual(['member-a', 'member-b'])

    act(() => {
      socket.emit('message:new', {
        id: 'message-a',
        conversationId: group.id,
        senderId: 'member-a',
        kind: 'TEXT',
        body: 'Sent',
        replyToId: null,
        createdAt: '2026-11-17T12:00:00.000Z',
        editedAt: null,
        deletedAt: null,
      })
    })

    expect(result.current.typingUserIds).toEqual(['member-b'])
  })

  it('removes only a departed member and clears all typing after disconnect', () => {
    const { result } = renderHook(() => useChatRealtime(group.id), { wrapper })

    act(() => {
      socket.emit('typing', { conversationId: group.id, userId: 'member-a', isTyping: true })
      socket.emit('typing', { conversationId: group.id, userId: 'member-b', isTyping: true })
      socket.emit('member:removed', { conversationId: group.id, userId: 'member-a' })
    })
    expect(result.current.typingUserIds).toEqual(['member-b'])

    act(() => socket.emit('disconnect'))
    expect(result.current.typingUserIds).toEqual([])
  })
})
