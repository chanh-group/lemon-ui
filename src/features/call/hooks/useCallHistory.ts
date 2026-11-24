import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/infrastructure/query/keys'
import { useAuth } from '@/features/auth/api'
import { callApi } from '../api/call.api'
import type { CallEntry } from '../types/call.types'

export function useCallHistory() {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.calls.history,
    queryFn: async (): Promise<CallEntry[]> => {
      const res = await callApi.listCalls({ limit: 50 })
      return res.items.map((item): CallEntry => {
        const isOutgoing = item.callerId === user?.id
        const peer = isOutgoing ? item.callee : item.caller
        const isMissed = item.status === 'MISSED'
        const direction = isOutgoing ? 'outgoing' : isMissed ? 'missed' : 'incoming'
        const kind = item.media === 'VIDEO' ? 'video' : 'voice'
        const date = new Date(item.startedAt)
        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

        return {
          id: item.id,
          name: peer?.fullName || peer?.username || '',
          direction,
          kind,
          time,
          online: false,
        }
      })
    },
    staleTime: 30_000,
  })
}
