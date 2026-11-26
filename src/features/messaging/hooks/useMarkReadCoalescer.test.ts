// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMarkReadCoalescer } from './useMarkReadCoalescer'

describe('useMarkReadCoalescer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('coalesces a burst into one flush with the newest message', () => {
    const onFlush = vi.fn()
    const { result, rerender } = renderHook(
      ({ conversationId }: { conversationId: string }) =>
        useMarkReadCoalescer(conversationId, onFlush),
      { initialProps: { conversationId: 'c1' } },
    )

    act(() => result.current({ conversationId: 'c1', messageId: 'm1' }))
    act(() => result.current({ conversationId: 'c1', messageId: 'm2' }))
    vi.advanceTimersByTime(399)
    expect(onFlush).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onFlush).toHaveBeenCalledExactlyOnceWith({ conversationId: 'c1', messageId: 'm2' })
    rerender({ conversationId: 'c2' })
  })

  it('flushes the queued request immediately when the conversation changes', () => {
    const onFlush = vi.fn()
    const { result, rerender } = renderHook(
      ({ conversationId }: { conversationId: string }) =>
        useMarkReadCoalescer(conversationId, onFlush),
      { initialProps: { conversationId: 'c1' } },
    )

    act(() => result.current({ conversationId: 'c1', messageId: 'm1' }))
    rerender({ conversationId: 'c2' }) // đổi hội thoại: không được bỏ mark-read của c1
    expect(onFlush).toHaveBeenCalledExactlyOnceWith({ conversationId: 'c1', messageId: 'm1' })

    act(() => result.current({ conversationId: 'c2', messageId: 'm2' }))
    vi.advanceTimersByTime(400)
    expect(onFlush).toHaveBeenLastCalledWith({ conversationId: 'c2', messageId: 'm2' })
  })

  it('keeps the first deadline under a stream of new messages', () => {
    const onFlush = vi.fn()
    const { result } = renderHook(() => useMarkReadCoalescer('c1', onFlush))

    act(() => result.current({ conversationId: 'c1', messageId: 'm1' }))
    vi.advanceTimersByTime(350)
    act(() => result.current({ conversationId: 'c1', messageId: 'm2' }))
    vi.advanceTimersByTime(350)
    act(() => result.current({ conversationId: 'c1', messageId: 'm3' }))
    // Deadline đầu là +1000ms dù timer gom liên tục bị reset.
    vi.advanceTimersByTime(300)
    expect(onFlush).toHaveBeenCalledExactlyOnceWith({ conversationId: 'c1', messageId: 'm3' })
  })

  it('flushes a pending request on unmount', () => {
    const onFlush = vi.fn()
    const { result, unmount } = renderHook(() => useMarkReadCoalescer('c1', onFlush))

    act(() => result.current({ conversationId: 'c1', messageId: 'm1' }))
    unmount()
    expect(onFlush).toHaveBeenCalledExactlyOnceWith({ conversationId: 'c1', messageId: 'm1' })
    vi.advanceTimersByTime(2000)
    expect(onFlush).toHaveBeenCalledOnce()
  })
})
