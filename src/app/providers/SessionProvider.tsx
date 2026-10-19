import { useEffect, useState, type ReactNode } from 'react'
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { createQueryClient } from '@/infrastructure/query/client'
import { useAuthStore } from '@/infrastructure/auth/auth-store'
import { bootstrapSession, subscribeCrossTabAuth } from '@/infrastructure/auth/session'

/**
 * Guard chống double-bootstrap StrictMode: 2 effect cùng lúc chia sẻ 1 promise.
 * Refresh là rotation stateful — gọi song song đá nhau → INVALID_SESSION oan.
 */
let bootPromise: Promise<void> | null = null

function useSessionLifecycle() {
  const status = useAuthStore((s) => s.status)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (status !== 'unknown') return
    if (!bootPromise) bootPromise = bootstrapSession()
    void bootPromise
  }, [status])

  useEffect(
    () =>
      subscribeCrossTabAuth(() => {
        queryClient.clear()
        useAuthStore.getState().reset()
      }),
    [queryClient],
  )
}

function SessionLifecycle() {
  useSessionLifecycle()
  return null
}

/** Compose QueryClient + session bootstrap/cross-tab. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)
  return (
    <QueryClientProvider client={queryClient}>
      <SessionLifecycle />
      {children}
    </QueryClientProvider>
  )
}
