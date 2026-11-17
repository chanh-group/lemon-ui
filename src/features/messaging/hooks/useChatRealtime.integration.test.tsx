// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/infrastructure/api/errors'
import { queryKeys } from '@/infrastructure/query/keys'
import { CHAT_QUERY_KEYS } from './useMessages'
import { useChatRealtime } from './useMessagingRealtime'

const mocks = vi.hoisted(() => ({
  getSocket: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
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
  return {
    connected: false,
    active: false,
    io: { on: vi.fn(), off: vi.fn() },
    on(event: string, listener: (value?: unknown) => void) {
      const handlers = listeners.get(event) ?? new Set()
      handlers.add(listener)
      listeners.set(event, handlers)
    },
    off(event: string, listener: (value?: unknown) => void) {
      listeners.get(event)?.delete(listener)
    },
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
    })
    await waitFor(() => expect(result.current.conversationAccess).toBe('revoked'))

    await act(async () => {
      resolveFirst(group)
      await firstResponse
    })
    expect(queryClient.getQueryData(queryKeys.chat.conversation(group.id))).toBeUndefined()
    expect(queryClient.getQueryData(CHAT_QUERY_KEYS.conversations)).toEqual([])
  })
})
