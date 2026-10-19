import { isAuthBypass } from '@/config/env'
import { DEV_SESSION_KEY } from '@/config/constants'
import { api, toApiError } from '@/infrastructure/api/client'
import { authEndpoints } from '@/infrastructure/api/endpoints'
import { useAuthStore } from '@/infrastructure/auth/auth-store'
import { getItem, removeItem } from '@/lib/storage'
import type { AuthUser } from '@/domain/auth'

const AUTH_CHANNEL = 'lemon-auth'

function broadcastAuth(message: 'logout' | 'login'): void {
  try {
    new BroadcastChannel(AUTH_CHANNEL).postMessage(message)
  } catch {
    // BroadcastChannel không khả dụng — tab hiện tại vẫn đúng.
  }
}

/**
 * Liên-tab: tab này logout → các tab khác clear token ngay.
 * Gọi 1 lần ở providers. Trả cleanup.
 */
export function subscribeCrossTabAuth(onLogout: () => void): () => void {
  let channel: BroadcastChannel | null = null
  try {
    channel = new BroadcastChannel(AUTH_CHANNEL)
  } catch {
    return () => undefined
  }
  channel.onmessage = (event: MessageEvent<string>) => {
    if (event.data === 'logout') onLogout()
  }
  return () => channel?.close()
}

/**
 * Boot khi F5/mở tab: memory rỗng → đổi refresh cookie lấy access mới.
 * Fail = anonymous. Module-level promise chống StrictMode double-rotate.
 */
export async function bootstrapSession(): Promise<void> {
  const { accessToken, setAccessToken, markAnonymous } = useAuthStore.getState()
  if (accessToken) return

  if (isAuthBypass()) {
    const devUser = getItem<AuthUser>(DEV_SESSION_KEY)
    if (devUser) {
      setAccessToken('dev.access.token')
    } else {
      markAnonymous()
    }
    return
  }

  try {
    const res = await api.post<{ accessToken: string }>(authEndpoints.refresh)
    setAccessToken(res.data.accessToken)
  } catch {
    markAnonymous()
  }
}

/** Đăng xuất: thu hồi server (idempotent) + clear local + báo tab khác. */
export async function signOutEverywhere(clearCache: () => void): Promise<void> {
  try {
    if (!isAuthBypass()) {
      await api.post(authEndpoints.logout)
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('logout failed, logging out locally', toApiError(error).code)
    }
  } finally {
    clearCache()
    removeItem(DEV_SESSION_KEY)
    useAuthStore.getState().reset()
    broadcastAuth('logout')
  }
}
