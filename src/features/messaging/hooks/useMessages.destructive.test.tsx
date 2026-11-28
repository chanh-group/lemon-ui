// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/infrastructure/api/errors'
import {
  CHAT_QUERY_KEYS,
  UnresolvedMessageActionError,
  useDeleteMessageForMeMutation,
  useRevokeMessageMutation,
} from './useMessages'
import type { MessageResponse, MessageTimelineResponse } from '../types/message.types'

const mocks = vi.hoisted(() => ({
  revoke: vi.fn(),
  deleteForMe: vi.fn(),
  window: vi.fn(),
}))
vi.mock('@/features/auth/api', () => ({ useAuth: () => ({ user: { id: 'me' } }) }))
vi.mock('@/infrastructure/api/client', () => ({
  api: { get: vi.fn().mockRejectedValue(new Error('offline')) },
}))
vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/features/messaging/api/message.api', () => ({
  revokeMessage: mocks.revoke,
  deleteMessageForMe: mocks.deleteForMe,
  getMessageWindow: mocks.window,
}))

const message: MessageResponse = {
  id: 'm',
  conversationId: 'c',
  senderId: 'me',
  kind: 'TEXT',
  body: 'hello',
  replyToId: null,
  createdAt: '2025-01-01',
  editedAt: null,
  deletedAt: null,
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
  const timeline = () =>
    client.getQueryData<InfiniteData<MessageTimelineResponse>>(CHAT_QUERY_KEYS.messages('c'))!
  return { client, wrapper, timeline }
}

describe('destructive actions with uncertain network results', () => {
  it('reconciles a revoke that already applied on the server despite a timeout', async () => {
    const { wrapper, timeline } = setup()
    mocks.revoke.mockRejectedValue(new ApiError('NETWORK_ERROR', 0, 'timeout'))
    mocks.window.mockResolvedValue({
      items: [{ ...message, body: null, deletedAt: '2025-01-02' }],
      hasMore: false,
    })
    const hook = renderHook(() => useRevokeMessageMutation('c'), { wrapper })

    act(() => hook.result.current.mutate('m'))
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true))

    const item = timeline().pages[0].items[0]
    expect(item.deletedAt).toBe('2025-01-02')
    expect(item.body).toBeNull()
  })

  it('reports unresolved after a bounded re-read still shows the message alive', async () => {
    const { wrapper, timeline } = setup()
    mocks.revoke.mockRejectedValue(new ApiError('NETWORK_ERROR', 0, 'timeout'))
    mocks.window.mockResolvedValue({ items: [{ ...message }], hasMore: false })
    const hook = renderHook(() => useRevokeMessageMutation('c'), { wrapper })

    act(() => hook.result.current.mutate('m'))
    await waitFor(() => expect(hook.result.current.isError).toBe(true))
    expect(mocks.window).toHaveBeenCalledTimes(2)
    expect(hook.result.current.error).toBeInstanceOf(UnresolvedMessageActionError)
    expect(timeline().pages[0].items[0]).toEqual(message)
  })

  it('accepts a later reconcile read that confirms the action was applied', async () => {
    const { wrapper, timeline } = setup()
    mocks.revoke.mockRejectedValue(new ApiError('NETWORK_ERROR', 0, 'timeout'))
    mocks.window
      .mockResolvedValueOnce({ items: [{ ...message }], hasMore: false })
      .mockResolvedValueOnce({
        items: [{ ...message, body: null, deletedAt: '2025-01-02' }],
        hasMore: false,
      })
    const hook = renderHook(() => useRevokeMessageMutation('c'), { wrapper })

    act(() => hook.result.current.mutate('m'))
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true))
    expect(timeline().pages[0].items[0].deletedAt).toBe('2025-01-02')
  })

  it('does not reconcile a definite server rejection', async () => {
    const { wrapper } = setup()
    mocks.revoke.mockRejectedValue(new ApiError('FORBIDDEN', 403, 'nope'))
    const hook = renderHook(() => useRevokeMessageMutation('c'), { wrapper })

    act(() => hook.result.current.mutate('m'))
    await waitFor(() => expect(hook.result.current.isError).toBe(true))
    expect(mocks.window).not.toHaveBeenCalled()
  })

  it('treats MESSAGE_NOT_FOUND from the window endpoint as an already-applied delete-for-me', async () => {
    const { client, wrapper, timeline } = setup()
    mocks.deleteForMe.mockRejectedValue(new ApiError('NETWORK_ERROR', 0, 'timeout'))
    mocks.window.mockRejectedValue(new ApiError('MESSAGE_NOT_FOUND', 404, 'not found'))
    const hook = renderHook(() => useDeleteMessageForMeMutation('c'), { wrapper })

    act(() => hook.result.current.mutate('m'))
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true))

    expect(timeline().pages[0].items).toHaveLength(0)
    expect(client.getQueryData<MessageResponse[]>(CHAT_QUERY_KEYS.liveMessages('c'))).toHaveLength(
      0,
    )
  })

  it('keeps re-reading a still-visible tombstone instead of concluding delete-for-me', async () => {
    const { wrapper, timeline } = setup()
    mocks.deleteForMe.mockRejectedValue(new ApiError('NETWORK_ERROR', 0, 'timeout'))
    // Tin thu hồi vẫn còn nhìn thấy được ở lần đọc đầu = chưa xác nhận ẩn xong;
    // lần đọc sau MESSAGE_NOT_FOUND (đã ẩn) mới là thành công.
    mocks.window
      .mockResolvedValueOnce({
        items: [{ ...message, body: null, deletedAt: '2025-01-02' }],
        hasMore: false,
      })
      .mockRejectedValueOnce(new ApiError('MESSAGE_NOT_FOUND', 404, 'hidden'))
    const hook = renderHook(() => useDeleteMessageForMeMutation('c'), { wrapper })

    act(() => hook.result.current.mutate('m'))
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true))
    expect(mocks.window).toHaveBeenCalledTimes(2)
    expect(timeline().pages[0].items).toHaveLength(0)
  })

  it('preserves an unresolved outcome when revoke reconciliation also fails', async () => {
    const { wrapper, timeline } = setup()
    mocks.revoke.mockRejectedValue(new ApiError('NETWORK_ERROR', 0, 'timeout'))
    mocks.window.mockRejectedValue(new ApiError('SERVER_ERROR', 503, 'unavailable'))
    const hook = renderHook(() => useRevokeMessageMutation('c'), { wrapper })

    act(() => hook.result.current.mutate('m'))
    await waitFor(() => expect(hook.result.current.isError).toBe(true))

    expect(hook.result.current.error).toBeInstanceOf(UnresolvedMessageActionError)
    expect(timeline().pages[0].items[0]).toEqual(message)
  })

  it('preserves an unresolved outcome when delete reconciliation also fails', async () => {
    const { wrapper, timeline } = setup()
    mocks.deleteForMe.mockRejectedValue(new ApiError('NETWORK_ERROR', 0, 'timeout'))
    mocks.window.mockRejectedValue(new ApiError('SERVER_ERROR', 503, 'unavailable'))
    const hook = renderHook(() => useDeleteMessageForMeMutation('c'), { wrapper })

    act(() => hook.result.current.mutate('m'))
    await waitFor(() => expect(hook.result.current.isError).toBe(true))

    expect(hook.result.current.error).toBeInstanceOf(UnresolvedMessageActionError)
    expect(timeline().pages[0].items[0]).toEqual(message)
  })
})
