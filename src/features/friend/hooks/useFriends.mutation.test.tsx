// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/infrastructure/query/keys'
import type { FriendRequest } from '../types/friend.types'
import {
  useAcceptFriendRequest,
  useCancelFriendRequest,
  useDeclineFriendRequest,
} from './useFriends'

const mocks = vi.hoisted(() => ({ accept: vi.fn(), decline: vi.fn(), cancel: vi.fn() }))
vi.mock('@/features/friend/api/friend.api', () => ({
  acceptFriendRequest: mocks.accept,
  declineFriendRequest: mocks.decline,
  cancelFriendRequest: mocks.cancel,
}))

const request = (id: string, direction: 'incoming' | 'outgoing' = 'incoming'): FriendRequest => ({
  id,
  direction,
  createdAt: '2025-01-01T00:00:00Z',
  user: { id: `user-${id}`, name: id, username: id },
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  client.setQueryData(queryKeys.chat.friendRequests, {
    incoming: [request('a'), request('b')],
    outgoing: [request('c', 'outgoing')],
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const get = () =>
    client.getQueryData<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>(
      queryKeys.chat.friendRequests,
    )!
  return { client, wrapper, get }
}

beforeEach(() => vi.resetAllMocks())

describe('friend request mutations', () => {
  it.each([
    ['accept', useAcceptFriendRequest, mocks.accept],
    ['decline', useDeclineFriendRequest, mocks.decline],
    ['cancel', useCancelFriendRequest, mocks.cancel],
  ] as const)(
    '%s retains the request while pending and removes it only on success',
    async (_, useHook, mock) => {
      const { wrapper, get } = setup()
      const pending = deferred<unknown>()
      mock.mockReturnValueOnce(pending.promise)
      const { result } = renderHook(() => useHook(), { wrapper })
      act(() => result.current.mutate('a'))
      await waitFor(() => expect(result.current.isPending).toBe(true))
      expect(get().incoming.map((item) => item.id)).toEqual(['a', 'b'])
      await act(async () => {
        pending.resolve({ id: 'conversation' })
        await pending.promise
      })
      await waitFor(() => expect(get().incoming.map((item) => item.id)).toEqual(['b']))
      expect(get().outgoing.map((item) => item.id)).toEqual(['c'])
    },
  )

  it('does not restore an externally deleted request or erase concurrent changes after failure', async () => {
    const { client, wrapper, get } = setup()
    const pending = deferred<void>()
    mocks.decline.mockReturnValueOnce(pending.promise)
    const { result } = renderHook(() => useDeclineFriendRequest(), { wrapper })
    act(() => result.current.mutate('a'))
    await waitFor(() => expect(result.current.isPending).toBe(true))
    act(() => {
      client.setQueryData(queryKeys.chat.friendRequests, {
        incoming: [request('b'), request('new')],
        outgoing: [],
      })
    })
    await act(async () => {
      pending.reject(new Error('offline'))
      await pending.promise.catch(() => undefined)
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(get().incoming.map((item) => item.id)).toEqual(['b', 'new'])
    expect(get().outgoing).toEqual([])
  })

  it('keeps concurrent removals when a different mutation fails', async () => {
    const { wrapper, get } = setup()
    const first = deferred<void>()
    const second = deferred<void>()
    mocks.decline.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { result } = renderHook(
      () => [useDeclineFriendRequest(), useDeclineFriendRequest()] as const,
      {
        wrapper,
      },
    )
    act(() => {
      result.current[0].mutate('a')
      result.current[1].mutate('b')
    })
    await waitFor(() =>
      expect(result.current[0].isPending && result.current[1].isPending).toBe(true),
    )
    await act(async () => {
      second.resolve()
      await second.promise
    })
    await waitFor(() => expect(get().incoming.map((item) => item.id)).toEqual(['a']))
    await act(async () => {
      first.reject(new Error('offline'))
      await first.promise.catch(() => undefined)
    })
    await waitFor(() => expect(result.current[0].isError).toBe(true))
    expect(get().incoming.map((item) => item.id)).toEqual(['a'])
  })

  it('removes a request reported not found even if the subsequent refetch fails', async () => {
    const { client, wrapper, get } = setup()
    mocks.cancel.mockRejectedValueOnce({ status: 404 })
    const fetch = vi.fn().mockRejectedValue(new Error('offline'))
    const { result } = renderHook(
      () => ({
        cancel: useCancelFriendRequest(),
        requests: useQuery({
          queryKey: queryKeys.chat.friendRequests,
          queryFn: fetch,
          staleTime: Infinity,
        }),
      }),
      { wrapper },
    )
    act(() => result.current.cancel.mutate('c'))
    await waitFor(() => expect(result.current.cancel.isError).toBe(true))
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    await waitFor(() =>
      expect(client.getQueryState(queryKeys.chat.friendRequests)?.fetchStatus).toBe('idle'),
    )
    expect(get().outgoing).toEqual([])
    expect(get().incoming.map((item) => item.id)).toEqual(['a', 'b'])
  })
})
