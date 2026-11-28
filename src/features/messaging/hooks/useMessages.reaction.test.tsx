// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/infrastructure/auth/auth-store'
import { applyRealtimeReaction, CHAT_QUERY_KEYS, useReactMessageMutation } from './useMessages'
import type {
  MessageReactionItem,
  MessageResponse,
  MessageTimelineResponse,
} from '../types/message.types'

const mocks = vi.hoisted(() => ({ react: vi.fn(), error: vi.fn(), window: vi.fn() }))
vi.mock('@/features/auth/api', () => ({ useAuth: () => ({ user: { id: 'me' } }) }))
vi.mock('@/infrastructure/api/client', () => ({
  api: { get: vi.fn().mockRejectedValue(new Error('offline')) },
}))
vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}))
vi.mock('sonner', () => ({ toast: { error: mocks.error } }))
vi.mock('@/features/messaging/api/message.api', () => ({
  reactToMessage: mocks.react,
  getMessageWindow: mocks.window,
}))

const reaction = (emoji: string, ...userIds: string[]): MessageReactionItem => ({
  emoji,
  count: userIds.length,
  userIds,
})
const message: MessageResponse = {
  id: 'm',
  conversationId: 'c',
  senderId: 'other',
  kind: 'TEXT',
  body: 'hello',
  replyToId: null,
  createdAt: '2025-01-01',
  editedAt: null,
  deletedAt: null,
  reactions: [reaction('👍', 'other')],
}
function setup() {
  vi.clearAllMocks()
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  client.setQueryData(CHAT_QUERY_KEYS.messages('c'), {
    pages: [{ items: [message], hasMore: false }],
    pageParams: [{}],
  })
  client.setQueryData(CHAT_QUERY_KEYS.liveMessages('c'), [message])
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const hook = renderHook(() => useReactMessageMutation('c'), { wrapper })
  const timeline = () =>
    client.getQueryData<InfiniteData<MessageTimelineResponse>>(CHAT_QUERY_KEYS.messages('c'))!
      .pages[0].items[0].reactions
  const live = () =>
    client.getQueryData<MessageResponse[]>(CHAT_QUERY_KEYS.liveMessages('c'))![0].reactions
  return { client, hook, timeline, live }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

describe('optimistic reactions', () => {
  it('updates both caches immediately and serializes rapid changes', async () => {
    const { hook, timeline, live } = setup()
    const first = deferred<{ messageId: string; reactions: MessageReactionItem[] }>()
    const second = deferred<{ messageId: string; reactions: MessageReactionItem[] }>()
    mocks.react.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    act(() => {
      hook.result.current.mutate({ messageId: 'm', emoji: '👍' })
    })
    await waitFor(() => expect(live()).toEqual([reaction('👍', 'other', 'me')]))
    act(() => {
      hook.result.current.mutate({ messageId: 'm', emoji: '❤️' })
    })
    await waitFor(() => expect(timeline()).toEqual([reaction('👍', 'other'), reaction('❤️', 'me')]))
    expect(mocks.react).toHaveBeenCalledTimes(1)
    await act(async () => {
      first.resolve({ messageId: 'm', reactions: [reaction('👍', 'other', 'me')] })
    })
    await waitFor(() => expect(mocks.react).toHaveBeenCalledTimes(2))
    expect(mocks.react).toHaveBeenLastCalledWith('m', '❤️')
    expect(live()).toEqual([reaction('👍', 'other'), reaction('❤️', 'me')])
    await act(async () => {
      second.resolve({ messageId: 'm', reactions: [reaction('👍', 'other'), reaction('❤️', 'me')] })
    })
  })

  it('rolls back only own reaction after a failure, preserving realtime changes', async () => {
    const { client, hook, timeline, live } = setup()
    const request = deferred<{ messageId: string; reactions: MessageReactionItem[] }>()
    mocks.react.mockReturnValue(request.promise)
    act(() => {
      hook.result.current.mutate({ messageId: 'm', emoji: '❤️' })
    })
    await waitFor(() => expect(mocks.react).toHaveBeenCalledTimes(1))
    act(() =>
      applyRealtimeReaction(client, {
        conversationId: 'c',
        messageId: 'm',
        userId: 'another',
        emoji: '👍',
        reactions: [reaction('👍', 'other', 'another')],
      }),
    )
    expect(live()).toEqual([reaction('👍', 'other', 'another'), reaction('❤️', 'me')])
    await act(async () => {
      request.reject(new Error('failed'))
    })
    await waitFor(() => expect(mocks.error).toHaveBeenCalled())
    expect(timeline()).toEqual([reaction('👍', 'other', 'another')])
    expect(live()).toEqual(timeline())
  })

  it('does not dispatch queued reactions or write cache after a new session', async () => {
    useAuthStore.getState().setAccessToken('old-session')
    const { client, hook, live } = setup()
    const first = deferred<{ messageId: string; reactions: MessageReactionItem[] }>()
    mocks.react.mockReturnValue(first.promise)
    act(() => {
      hook.result.current.mutate({ messageId: 'm', emoji: '❤️' })
      hook.result.current.mutate({ messageId: 'm', emoji: '👍' })
    })
    await waitFor(() => expect(mocks.react).toHaveBeenCalledTimes(1))
    useAuthStore.getState().setAccessToken('new-session')
    const newer = { ...message, reactions: [reaction('🔥', 'new-user')] }
    client.setQueryData(CHAT_QUERY_KEYS.liveMessages('c'), [newer])
    await act(async () => first.resolve({ messageId: 'm', reactions: [reaction('❤️', 'me')] }))
    await waitFor(() => expect(hook.result.current.isError).toBe(true))
    expect(mocks.react).toHaveBeenCalledTimes(1)
    expect(live()).toEqual(newer.reactions)
    expect(mocks.window).not.toHaveBeenCalled()
    expect(mocks.error).not.toHaveBeenCalled()
  })

  it('toggles off and reconciles a later click after an earlier failure', async () => {
    const { hook, live } = setup()
    const first = deferred<{ messageId: string; reactions: MessageReactionItem[] }>()
    mocks.react.mockReturnValueOnce(first.promise)
    act(() => {
      hook.result.current.mutate({ messageId: 'm', emoji: '❤️' })
    })
    await waitFor(() => expect(mocks.react).toHaveBeenCalledTimes(1))
    act(() => {
      hook.result.current.mutate({ messageId: 'm', emoji: '❤️' })
    })
    await waitFor(() => expect(live()).toEqual([reaction('👍', 'other')]))
    await act(async () => {
      first.reject(new Error('failed'))
    })
    await waitFor(() => expect(mocks.error).toHaveBeenCalled())
    expect(mocks.react).toHaveBeenCalledTimes(1)
    expect(live()).toEqual([reaction('👍', 'other')])
  })
})
