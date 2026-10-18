import { isAuthBypass } from '@/config/env'
import { request, refreshAccessToken } from '@/lib/api'
import { clearAccessToken, setAccessToken } from '@/lib/token-manager'
import type {
  AuthSession,
  LoginPayload,
  RequestOtpPayload,
  ResendOtpPayload,
  ResetPasswordPayload,
  SignupPayload,
  User,
  VerifyOtpEarlyPayload,
} from '@/features/auth/types/auth.types'

/* ------------------------------------------------------------------ */
/* Dev bypass (VITE_APP_ENV=dev)                                       */
/* ------------------------------------------------------------------ */

function createDevSession(payload: { email: string; fullName?: string; username?: string }): AuthSession {
  return {
    accessToken: 'dev.access.token',
    user: {
      id: 'dev-user',
      fullName: payload.fullName ?? payload.email.split('@')[0] ?? 'Dev User',
      username: payload.username ?? undefined,
      email: payload.email,
      createdAt: new Date().toISOString(),
    },
  }
}

function applySession(session: AuthSession): AuthSession {
  setAccessToken(session.accessToken)
  return session
}

/* ------------------------------------------------------------------ */
/* Auth API                                                            */
/* ------------------------------------------------------------------ */

export async function login(payload: LoginPayload): Promise<AuthSession> {
  if (isAuthBypass()) return applySession(createDevSession(payload))

  const session = await request<AuthSession>('/auth/login', {
    method: 'POST',
    body: payload,
  })
  return applySession(session)
}

/** Gửi OTP đăng ký. */
export async function requestOtp(payload: RequestOtpPayload): Promise<void> {
  if (isAuthBypass()) return
  await request<void>('/auth/request-otp', { method: 'POST', body: payload })
}

/** Verify OTP sớm, KHÔNG tiêu thụ mã. */
export async function verifyOtpEarly(payload: VerifyOtpEarlyPayload): Promise<boolean> {
  if (isAuthBypass()) return true
  return request<boolean>('/auth/verify-otp', { method: 'POST', body: payload })
}

/** Tạo user sau đối chiếu OTP. */
export async function signup(payload: SignupPayload): Promise<User> {
  if (isAuthBypass()) return createDevSession(payload).user
  return request<User>('/auth/signup', { method: 'POST', body: payload })
}

/** Gửi OTP quên mật khẩu. Luôn OK — chống enumerate email. */
export async function forgotPassword(payload: { email: string }): Promise<void> {
  if (isAuthBypass()) return
  await request<void>('/auth/forgot-password', { method: 'POST', body: payload })
}

/** Đặt lại mật khẩu — tiêu thụ OTP + thu hồi toàn bộ session. */
export async function resetPassword(payload: ResetPasswordPayload): Promise<void> {
  if (isAuthBypass()) return
  await request<void>('/auth/reset-password', { method: 'POST', body: payload })
}

export async function resendOtp(payload: ResendOtpPayload): Promise<void> {
  if (isAuthBypass()) return
  await request<void>('/auth/resend-otp', { method: 'POST', body: payload })
}

/** Khôi phục phiên làm việc sau F5. */
export async function restoreSession(): Promise<User | null> {
  if (isAuthBypass()) return null
  const token = await refreshAccessToken()
  if (!token) return null
  return request<User>('/auth/me')
}

export async function logout(): Promise<void> {
  clearAccessToken()
  if (isAuthBypass()) return
  await request<void>('/auth/logout', { method: 'POST', skipAuthRefresh: true })
}

export async function getMe(): Promise<User> {
  return request<User>('/auth/me')
}
