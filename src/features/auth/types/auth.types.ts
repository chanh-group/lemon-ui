export interface User {
  id: string
  fullName: string
  email: string
  avatarUrl?: string
  createdAt: string
}

/**
 * Refresh token KHÔNG nằm ở đây — server set cookie httpOnly (SameSite=Strict,
 * Secure) khi login/refresh; client chỉ giữ access token trong memory.
 */
export interface AuthSession {
  accessToken: string
  user: User
}

export interface LoginPayload {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterPayload {
  fullName: string
  email: string
  password: string
}

/* ------------------------------------------------------------------ */
/* OTP verification                                                    */
/* ------------------------------------------------------------------ */

export type OtpFlow = 'registration' | 'forgot-password'

export type OtpLocationState = {
  email?: string
  flow?: OtpFlow
}

export type VerificationState = 'idle' | 'loading' | 'error' | 'success'

export type VerificationErrorCode = 'incorrect' | 'expired' | 'too-many-attempts' | 'network'

export interface VerifyOtpPayload {
  email: string
  code: string
}

export interface ResendOtpPayload {
  email: string
}
