// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MessageResponse, MessageTimelineResponse } from '../types/message.types'
import { CHAT_QUERY_KEYS, useEditMessageMutation, useMarkReadMutation } from './useMessages'
import { useAuthStore } from '@/infrastructure/auth/auth-store'
import { queryKeys } from '@/infrastructure/query/keys'

const token = (id: string, version = 1) => `x.${btoa(JSON.stringify({ sub: id, version }))}.x`

const mocks = vi.hoisted(() => ({ read: vi.fn(), edit: vi.fn(), error: vi.fn() }))
vi.mock('@/features/auth/api', () => ({ useAuth: () => ({ user: { id: 'me' } }) }))
vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}))
vi.mock('sonner', () => ({ toast: { error: mocks.error } }))
vi.mock('@/features/messaging/api/message.api', () => ({
  markConversationRead: mocks.read,
  editMessage: mocks.edit,
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

let client: QueryClient
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  useAuthStore.getState().setAccessToken(token('me'))
  client.setQueryData(queryKeys.me, { id: 'me' })
})
afterEach(() => {
  cleanup()
  client.clear()
})

describe('message mutation races', () => {
  it('does not overwrite a revoked message or quote with an older edit response', async () => {
    const message: MessageResponse = {
      id: 'm',
      conversationId: 'c',
      senderId: 'me',
      kind: 'TEXT',
      body: 'before',
      replyToId: null,
      createdAt: '2026-01-01T00:00:00Z',
      editedAt: null,
      deletedAt: null,
    }
    const reply: MessageResponse = {
      ...message,
      id: 'r',
      replyToId: 'm',
      replyTarget: {
        id: 'm',
        senderId: 'me',
        kind: 'TEXT',
        body: 'before',
        deletedAt: null,
      },
    }
    const request = deferred<MessageResponse>()
    mocks.edit.mockReturnValue(request.promise)
    client.setQueryData(CHAT_QUERY_KEYS.messages('c'), {
      pages: [{ items: [message, reply], hasMore: false }],
      pageParams: [undefined],
    })
    client.setQueryData(CHAT_QUERY_KEYS.liveMessages('c'), [message, reply])
    const { result } = renderHook(() => useEditMessageMutation('c'), { wrapper })
    act(() => result.current.mutate({ messageId: 'm', body: 'after' }))
    await waitFor(() => expect(mocks.edit).toHaveBeenCalled())
    const deletedAt = '2026-01-02T00:00:00Z'
    const revoked = { ...message, body: null, deletedAt }
    const revokedReply = { ...reply, replyTarget: { ...reply.replyTarget!, body: null, deletedAt } }
    client.setQueryData(CHAT_QUERY_KEYS.messages('c'), {
      pages: [{ items: [revoked, revokedReply], hasMore: false }],
      pageParams: [undefined],
    })
    client.setQueryData(CHAT_QUERY_KEYS.liveMessages('c'), [revoked, revokedReply])
    await act(async () =>
      request.resolve({ ...message, body: 'after', editedAt: '2026-01-01T12:00:00Z' }),
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(client.getQueryData(CHAT_QUERY_KEYS.liveMessages('c'))).toEqual([revoked, revokedReply])
    expect(
      client.getQueryData<InfiniteData<MessageTimelineResponse>>(CHAT_QUERY_KEYS.messages('c'))
        ?.pages[0].items,
    ).toEqual([revoked, revokedReply])
  })

  it('serializes reads for each conversation without clearing a newer message', async () => {
    const first = deferred<void>()
    const second = deferred<void>()
    mocks.read.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const conversation = { id: 'c', unreadCount: 2, lastMessageDetail: { id: 'new' } }
    client.setQueryData(CHAT_QUERY_KEYS.conversations, [conversation])
    const invalidation = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useMarkReadMutation(), { wrapper })
    act(() => {
      result.current.mutate({ conversationId: 'c', lastReadMessageId: 'old' })
      result.current.mutate({ conversationId: 'c', lastReadMessageId: 'new' })
    })
    await waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(1))
    await act(async () => first.resolve())
    await waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(2))
    expect(client.getQueryData(CHAT_QUERY_KEYS.conversations)).toEqual([conversation])
    expect(invalidation).toHaveBeenCalledWith({ queryKey: CHAT_QUERY_KEYS.conversations })
    await act(async () => second.resolve())
    await waitFor(() =>
      expect(client.getQueryData(CHAT_QUERY_KEYS.conversations)).toEqual([
        { ...conversation, unreadCount: 0 },
      ]),
    )
  })

  it.each(['success', 'failure'])(
    'discards old reads after account change on %s',
    async (outcome) => {
      const first = deferred<void>()
      mocks.read.mockReturnValue(first.promise)
      const { result } = renderHook(() => useMarkReadMutation(), { wrapper })
      act(() => {
        result.current.mutate({ conversationId: 'c', lastReadMessageId: 'old' })
        result.current.mutate({ conversationId: 'c', lastReadMessageId: 'new' })
      })
      await waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(1))
      useAuthStore.getState().reset()
      useAuthStore.getState().setAccessToken(token('other'))
      client.setQueryData(queryKeys.me, { id: 'other' })
      const conversation = { id: 'c', unreadCount: 4, lastMessageDetail: { id: 'old' } }
      client.setQueryData(CHAT_QUERY_KEYS.conversations, [conversation])
      await act(async () => {
        if (outcome === 'success') first.resolve()
        else first.reject(new Error('offline'))
      })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mocks.read).toHaveBeenCalledTimes(1)
      expect(mocks.error).not.toHaveBeenCalled()
      expect(client.getQueryData(CHAT_QUERY_KEYS.conversations)).toEqual([conversation])
    },
  )

  it.each([token('me'), 'dev.access.token'])(
    'marks read before the current user query finishes with token %s',
    async (accessToken) => {
      useAuthStore.getState().setAccessToken(accessToken)
      client.removeQueries({ queryKey: queryKeys.me })
      const request = deferred<void>()
      mocks.read.mockReturnValueOnce(request.promise)
      const conversation = { id: 'c', unreadCount: 1, lastMessageDetail: { id: 'new' } }
      client.setQueryData(CHAT_QUERY_KEYS.conversations, [conversation])
      const { result } = renderHook(() => useMarkReadMutation(), { wrapper })
      act(() => result.current.mutate({ conversationId: 'c', lastReadMessageId: 'new' }))
      await waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(1))
      client.setQueryData(queryKeys.me, { id: 'me' })
      await act(async () => request.resolve())
      await waitFor(() =>
        expect(client.getQueryData(CHAT_QUERY_KEYS.conversations)).toEqual([
          { ...conversation, unreadCount: 0 },
        ]),
      )
    },
  )

  it('discards queued reads after logging in again as the same account', async () => {
    const first = deferred<void>()
    mocks.read.mockReturnValue(first.promise)
    const { result } = renderHook(() => useMarkReadMutation(), { wrapper })
    act(() => {
      result.current.mutate({ conversationId: 'c', lastReadMessageId: 'old' })
      result.current.mutate({ conversationId: 'c', lastReadMessageId: 'new' })
    })
    await waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(1))
    useAuthStore.getState().setAccessToken(token('me'))
    await act(async () => first.resolve())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mocks.read).toHaveBeenCalledTimes(1)
  })

  it('keeps queued reads after refreshing the same account token', async () => {
    const first = deferred<void>()
    mocks.read.mockReturnValueOnce(first.promise).mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useMarkReadMutation(), { wrapper })
    act(() => {
      result.current.mutate({ conversationId: 'c', lastReadMessageId: 'old' })
      result.current.mutate({ conversationId: 'c', lastReadMessageId: 'new' })
    })
    await waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(1))
    useAuthStore.getState().refreshAccessToken(token('me', 2), useAuthStore.getState().generation)
    await act(async () => first.resolve())
    await waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(2))
  })

  it('continues the read queue after an earlier request fails', async () => {
    const first = deferred<void>()
    mocks.read.mockReturnValueOnce(first.promise).mockResolvedValueOnce(undefined)
    client.setQueryData(CHAT_QUERY_KEYS.conversations, [
      { id: 'c', unreadCount: 1, lastMessageDetail: { id: 'new' } },
    ])
    const { result } = renderHook(() => useMarkReadMutation(), { wrapper })
    act(() => {
      result.current.mutate({ conversationId: 'c', lastReadMessageId: 'old' })
      result.current.mutate({ conversationId: 'c', lastReadMessageId: 'new' })
    })
    await waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(1))
    await act(async () => first.reject(new Error('offline')))
    await waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(mocks.error).toHaveBeenCalled())
  })
})
