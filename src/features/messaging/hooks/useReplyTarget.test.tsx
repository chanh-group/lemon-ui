// @vitest-environment happy-dom
import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { useReplyTarget, UNAVAILABLE_TARGET_SENTINEL } from './useReplyTarget'
import { getReplyTarget } from '../api/message.api'
import { ApiError } from '@/infrastructure/api/errors'
import type { MessageReplyTarget } from '../types/message.types'

vi.mock('../api/message.api', () => ({ getReplyTarget: vi.fn() }))
const mockedGetReplyTarget = vi.mocked(getReplyTarget)

function createWrapper() {
  const client = new QueryClient()
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

const incompleteTarget: MessageReplyTarget = {
  id: 'msg-1',
  senderId: 'u1',
  kind: 'TEXT',
  body: 'caption',
  deletedAt: null,
  contentCategory: 'ATTACHMENT',
}

const completeTarget: MessageReplyTarget = {
  id: 'msg-3',
  senderId: 'u1',
  kind: 'TEXT',
  body: 'hello',
  deletedAt: null,
  contentCategory: 'MESSAGE',
}

describe('useReplyTarget', () => {
  it('fetches the authorized target even when an incomplete initial target seeds the cache', async () => {
    mockedGetReplyTarget.mockResolvedValue({
      ...incompleteTarget,
      previewAttachment: {
        id: 'a1',
        kind: 'IMAGE',
        fileName: 'p.jpg',
        mimeType: 'image/jpeg',
        previewUrl: 'https://r2/p.jpg',
      },
    })

    const { result } = renderHook(() => useReplyTarget('conv-1', 'msg-1', incompleteTarget), {
      wrapper: createWrapper(),
    })

    await waitFor(() =>
      expect(mockedGetReplyTarget).toHaveBeenCalledWith('conv-1', 'msg-1', expect.anything()),
    )
    await waitFor(() =>
      expect(result.current.target?.previewAttachment?.previewUrl).toBe('https://r2/p.jpg'),
    )
  })

  it('skips the fetch entirely when the initial target already carries its quote data', async () => {
    const { result } = renderHook(() => useReplyTarget('conv-1', 'msg-3', completeTarget), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.target).toEqual(completeTarget))
    expect(mockedGetReplyTarget).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
  })

  it('maps a 404 target to the unavailable sentinel', async () => {
    mockedGetReplyTarget.mockRejectedValue(new ApiError('MESSAGE_NOT_FOUND', 404, 'not found'))

    const { result } = renderHook(() => useReplyTarget('conv-1', 'msg-2', null), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isUnavailable).toBe(true))
    expect(result.current.target).toBeNull()
  })

  it('keeps a real target with unknown content navigable instead of marking it unavailable', async () => {
    const systemTarget: MessageReplyTarget = {
      id: 'msg-4',
      senderId: 'u1',
      kind: 'SYSTEM',
      body: null,
      deletedAt: null,
      contentCategory: 'UNKNOWN',
    }
    const { result } = renderHook(() => useReplyTarget('conv-1', 'msg-4', systemTarget), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.target).toEqual(systemTarget))
    expect(result.current.isUnavailable).toBe(false)
    expect(systemTarget).not.toBe(UNAVAILABLE_TARGET_SENTINEL)
    expect(mockedGetReplyTarget).not.toHaveBeenCalled()
  })
})
