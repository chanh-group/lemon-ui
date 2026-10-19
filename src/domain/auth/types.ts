/** User profile client cần (header/menu + `/auth/me`). */
export interface AuthUser {
  id: string
  fullName: string
  username: string
  email: string
  avatarUrl?: string | null
  bio?: string | null
  phone?: string | null
  createdAt: string
}

export type VerificationErrorCode = 'incorrect' | 'expired' | 'too-many-attempts' | 'network'

/** Bước trong signup wizard */
export type SignupStep = 'email' | 'otp' | 'info'

/** Bước trong forgot password wizard */
export type ForgotStep = 'email' | 'reset'
