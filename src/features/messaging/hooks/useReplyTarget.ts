import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/infrastructure/query/keys'
import { getReplyTarget } from '../api/message.api'
import { isReplyTargetComplete } from '../utils/replyQuote'
import type { MessageReplyTarget } from '../types/message.types'
import { ApiError } from '@/infrastructure/api/errors'

export const UNAVAILABLE_TARGET_SENTINEL: MessageReplyTarget = {
  id: '',
  senderId: '',
  kind: 'TEXT',
  body: null,
  deletedAt: null,
  contentCategory: 'UNKNOWN',
}

export function useReplyTarget(
  conversationId: string | undefined,
  replyToId: string | null | undefined,
  initialTarget?: MessageReplyTarget | null,
  enabled = true,
) {
  // A null initial target is the payload saying "gone" — render it, never fetch.
  const queryEnabled = Boolean(
    enabled &&
      conversationId &&
      replyToId &&
      initialTarget !== null &&
      !isReplyTargetComplete(initialTarget),
  )

  const query = useQuery({
    queryKey: queryKeys.chat.replyTarget(conversationId ?? '', replyToId ?? ''),
    queryFn: async ({ signal }) => {
      try {
        return await getReplyTarget(conversationId!, replyToId!, signal)
      } catch (err: unknown) {
        if (err instanceof ApiError && (err.status === 404 || err.code === 'MESSAGE_NOT_FOUND')) {
          return UNAVAILABLE_TARGET_SENTINEL
        }
        throw err
      }
    },
    enabled: queryEnabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
    initialData: initialTarget ?? undefined,
    // Incomplete seeds must not count as fresh or TanStack skips fetching the preview.
    initialDataUpdatedAt: 0,
  })

  const target = query.data ?? initialTarget ?? null
  const isUnavailable =
    target === UNAVAILABLE_TARGET_SENTINEL || (initialTarget === null && !query.data)

  return {
    target: isUnavailable ? null : target,
    isLoading: queryEnabled && query.isLoading,
    isUnavailable,
  }
}
