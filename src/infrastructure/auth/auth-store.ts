import { create } from 'zustand'
import { clearAllGroupAvatarBlobs } from '@/lib/avatar-loader'
import { clearAllPendingMessagePreviews } from '@/features/messaging/utils/messageSend'

export type AuthStatus = 'unknown' | 'authenticated' | 'anonymous'

interface AuthState {
  /** Access token CHỈ trong memory — không localStorage/sessionStorage. */
  accessToken: string | null
  status: AuthStatus
  generation: number
  setAccessToken: (token: string) => void
  refreshAccessToken: (token: string, generation: number) => void
  markAnonymous: () => void
  /** Xóa token + anonymous (refresh fail / logout / đổi pass). */
  reset: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  status: 'unknown',
  generation: 0,
  setAccessToken: (token: string) =>
    set((current) => {
      if (current.accessToken !== token) clearAllGroupAvatarBlobs()
      return { accessToken: token, status: 'authenticated', generation: current.generation + 1 }
    }),
  refreshAccessToken: (token, generation) =>
    set((current) => {
      if (current.generation !== generation || current.status !== 'authenticated') return current
      if (current.accessToken !== token) clearAllGroupAvatarBlobs()
      return { accessToken: token }
    }),
  markAnonymous: () => {
    clearAllGroupAvatarBlobs()
    clearAllPendingMessagePreviews()
    set((current) => ({
      accessToken: null,
      status: 'anonymous',
      generation: current.generation + 1,
    }))
  },
  reset: () => {
    clearAllGroupAvatarBlobs()
    clearAllPendingMessagePreviews()
    set((current) => ({
      accessToken: null,
      status: 'anonymous',
      generation: current.generation + 1,
    }))
  },
}))
