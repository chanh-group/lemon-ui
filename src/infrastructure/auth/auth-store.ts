import { create } from 'zustand'
import { clearAllGroupAvatarBlobs } from '@/lib/avatar-loader'

export type AuthStatus = 'unknown' | 'authenticated' | 'anonymous'

interface AuthState {
  /** Access token CHỈ trong memory — không localStorage/sessionStorage. */
  accessToken: string | null
  status: AuthStatus
  setAccessToken: (token: string) => void
  markAnonymous: () => void
  /** Xóa token + anonymous (refresh fail / logout / đổi pass). */
  reset: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  status: 'unknown',
  setAccessToken: (token: string) => set({ accessToken: token, status: 'authenticated' }),
  markAnonymous: () => {
    clearAllGroupAvatarBlobs()
    set({ accessToken: null, status: 'anonymous' })
  },
  reset: () => {
    clearAllGroupAvatarBlobs()
    set({ accessToken: null, status: 'anonymous' })
  },
}))
