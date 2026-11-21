import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/infrastructure/query/keys'
import { useAuth } from '@/features/auth/api'
import { callApi } from '../api/call.api'
import type { CallEntry } from '../types/call.types'
import { MOCK_CALLS } from '../data/mockData'

export function useCallHistory() {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.calls.history,
    queryFn: async (): Promise<CallEntry[]> => {
      try {
        const res = await callApi.listCalls({ limit: 50 })
        if (!res.items || res.items.length === 0) {
          return MOCK_CALLS
        }
        return res.items.map((item): CallEntry => {
          const isOutgoing = item.callerId === user?.id
          const isMissed = item.status === 'MISSED'
          const direction = isOutgoing ? 'outgoing' : isMissed ? 'missed' : 'incoming'
          const kind = item.media === 'VIDEO' ? 'video' : 'voice'
          const date = new Date(item.startedAt)
          const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

          return {
            id: item.id,
            name: item.calleeId || item.conversationId,
            direction,
            kind,
            time,
            online: false,
          }
        })
      } catch (err) {
        console.warn('Failed to load call history, fallback to mock data:', err)
        return MOCK_CALLS
      }
    },
    staleTime: 30_000,
  })
}
