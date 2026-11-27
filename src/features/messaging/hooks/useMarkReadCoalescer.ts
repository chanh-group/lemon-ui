import { useCallback, useEffect, useRef } from 'react'

export interface MarkReadRequest {
  conversationId: string
  messageId: string
}

/**
 * Gom các lần "thấy tin" rơi vào cùng cửa sổ ngắn thành 1 lần báo với tin mới nhất.
 * Đổi hội thoại / unmount flush ngay thay vì bỏ sót mark-read đang chờ; deadline
 * đầu tiên được giữ để chuỗi tin đến liên tục không trì hoãn mark-read vô hạn.
 */
export function useMarkReadCoalescer(
  conversationId: string | null,
  onFlush: (request: MarkReadRequest) => void,
  coalesceMs = 400,
  maxWaitMs = 1_000,
) {
  const pendingRef = useRef<
    | (MarkReadRequest & {
        timer: ReturnType<typeof setTimeout>
        maxTimer: ReturnType<typeof setTimeout>
      })
    | null
  >(null)
  const onFlushRef = useRef(onFlush)
  useEffect(() => {
    onFlushRef.current = onFlush
  }, [onFlush])

  const flush = useCallback(() => {
    const pending = pendingRef.current
    if (!pending) return
    pendingRef.current = null
    clearTimeout(pending.timer)
    clearTimeout(pending.maxTimer)
    onFlushRef.current({ conversationId: pending.conversationId, messageId: pending.messageId })
  }, [])

  useEffect(() => {
    return () => flush()
  }, [conversationId, flush])

  return useCallback(
    (request: MarkReadRequest) => {
      const queued = pendingRef.current
      if (
        queued &&
        queued.conversationId === request.conversationId &&
        queued.messageId === request.messageId
      ) {
        return // cùng tin: giữ timer hiện tại, không reset
      }
      let maxTimer: ReturnType<typeof setTimeout>
      if (queued && queued.conversationId !== request.conversationId) {
        flush() // không làm mất mark-read của hội thoại cũ
        maxTimer = setTimeout(flush, maxWaitMs)
      } else if (queued) {
        clearTimeout(queued.timer)
        maxTimer = queued.maxTimer // giữ deadline đầu tiên
      } else {
        maxTimer = setTimeout(flush, maxWaitMs)
      }
      pendingRef.current = {
        ...request,
        timer: setTimeout(flush, coalesceMs),
        maxTimer,
      }
    },
    [flush, coalesceMs, maxWaitMs],
  )
}
