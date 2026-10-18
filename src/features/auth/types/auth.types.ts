export interface User {
  id: string
  fullName: string
  username?: string
  email: string
  avatarUrl?: string
  createdAt: string
}

export interface AuthSession {
  accessToken: string
  user: User
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  fullName: string
  email: string
  password: string
}

/* ------------------------------------------------------------------ */
/* OTP                                                                 */
/* ------------------------------------------------------------------ */

export type VerificationErrorCode = 'incorrect' | 'expired' | 'too-many-attempts' | 'network'

export interface RequestOtpPayload {
  email: string
}

export interface VerifyOtpEarlyPayload {
  email: string
  otp: string
  purpose: 'signup' | 'reset'
}

export interface SignupPayload {
  email: string
  fullName: string
  username: string
  password: string
  otp: string
}

export interface ResetPasswordPayload {
  email: string
  otp: string
  newPassword: string
}

export interface ResendOtpPayload {
  email: string
}

/** Bước trong signup wizard */
export type SignupStep = 'email' | 'otp' | 'info'

/** Bước trong forgot password wizard */
export type ForgotStep = 'email' | 'reset'
