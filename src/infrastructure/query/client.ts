import { QueryClient } from '@tanstack/react-query'

/** Default staleTime cho mọi query (ms). */
const DEFAULT_QUERY_STALE_MS = 60_000

/**
 * `refetchOnWindowFocus: false` có chủ ý: mỗi refetch focus có thể dính
 * access hết hạn → kéo refresh rotation không cần thiết.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          const status = (error as { status?: number }).status ?? 0
          if ([401, 403, 422, 429].includes(status)) return false
          return failureCount < 1
        },
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        staleTime: DEFAULT_QUERY_STALE_MS,
      },
      mutations: { retry: false },
    },
  })
}
