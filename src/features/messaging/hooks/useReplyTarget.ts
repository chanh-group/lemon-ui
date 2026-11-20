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
  const queryEnabled = Boolean(
    enabled && conversationId && replyToId && !isReplyTargetComplete(initialTarget),
  )

  const query = useQuery({
    queryKey: queryKeys.chat.replyTarget(conversationId ?? '', replyToId ?? ''),
    queryFn: async ({ signal }) => {
      try {
        return await getReplyTarget(conversationId!, replyToId!, signal)
      } catch (err: unknown) {
        if (err instanceof ApiError && (err.status === 404 || err.code === 'MESSAGE_NOT_FOUND')) {
          return {
            ...UNAVAILABLE_TARGET_SENTINEL,
            id: replyToId!,
          }
        }
        throw err
      }
    },
    enabled: queryEnabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
    initialData: initialTarget ?? undefined,
  })

  const target = query.data ?? initialTarget ?? null
  const isUnavailable =
    target === UNAVAILABLE_TARGET_SENTINEL ||
    (Boolean(target) &&
      target?.id === replyToId &&
      target?.contentCategory === 'UNKNOWN' &&
      !target?.body &&
      !target?.deletedAt)

  return {
    target: isUnavailable ? null : target,
    isLoading: queryEnabled && query.isLoading,
    isUnavailable,
  }
}
