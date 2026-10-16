import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { isAuthBypass } from '@/config/env'
import { DEV_SESSION_KEY } from '@/config/constants'
import { clearAccessToken, setAccessToken } from '@/lib/token-manager'
import { getItem, removeItem, setItem } from '@/lib/storage'
import {
  login as loginApi,
  logout as logoutApi,
  restoreSession,
} from '@/features/auth/api/auth.api'
import type {
  AuthSession,
  LoginPayload,
  User,
} from '@/features/auth/types/auth.types'

export type AuthStatus = 'restoring' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  user: User | null
  status: AuthStatus
  login: (payload: LoginPayload) => Promise<User>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth phải được dùng bên trong AuthProvider')
  return ctx
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<{ user: User | null; status: AuthStatus }>(() => {
    if (!isAuthBypass()) return { user: null, status: 'restoring' }
    const devUser = getItem<User>(DEV_SESSION_KEY)
    return { user: devUser, status: devUser ? 'authenticated' : 'anonymous' }
  })
  const restored = useRef(false)

  const { user, status } = session

  useEffect(() => {
    if (restored.current || isAuthBypass()) return
    restored.current = true

    restoreSession()
      .then((restoredUser) => {
        setSession({ user: restoredUser, status: restoredUser ? 'authenticated' : 'anonymous' })
      })
      .catch(() => {
        clearAccessToken()
        setSession({ user: null, status: 'anonymous' })
      })
  }, [])

  const establishSession = useCallback((next: AuthSession) => {
    setAccessToken(next.accessToken)
    setSession({ user: next.user, status: 'authenticated' })
    if (isAuthBypass()) {
      setItem(DEV_SESSION_KEY, next.user)
    }
  }, [])

  const login = useCallback(
    async (payload: LoginPayload) => {
      const next = await loginApi(payload)
      establishSession(next)
      return next.user
    },
    [establishSession],
  )

  const logout = useCallback(async () => {
    try {
      await logoutApi()
    } finally {
      clearAccessToken()
      removeItem(DEV_SESSION_KEY)
      setSession({ user: null, status: 'anonymous' })
    }
  }, [])

  const value = useMemo(
    () => ({ user, status, login, logout }),
    [user, status, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
