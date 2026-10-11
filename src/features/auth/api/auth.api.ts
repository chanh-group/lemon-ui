import { isAuthBypass } from '@/config/env'
import { request, refreshAccessToken } from '@/lib/api'
import { clearAccessToken, setAccessToken } from '@/lib/token-manager'
import type {
  AuthSession,
  LoginPayload,
  RequestOtpPayload,
  ResendOtpPayload,
  SignupPayload,
  User,
  VerifyOtpEarlyPayload,
  VerifyOtpPayload,
} from '@/features/auth/types/auth.types'

/* ------------------------------------------------------------------ */
/* Dev bypass (VITE_APP_ENV=dev): bỏ qua API thật, chỉ còn zod validate */
/* ------------------------------------------------------------------ */

function createDevSession(payload: { email: string; fullName?: string }): AuthSession {
  return {
    accessToken: 'dev.access.token',
    user: {
      id: 'dev-user',
      fullName: payload.fullName ?? payload.email.split('@')[0] ?? 'Người dùng dev',
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
/* Auth API — refresh token luôn nằm trong cookie httpOnly              */
/* ------------------------------------------------------------------ */

export async function login(payload: LoginPayload): Promise<AuthSession> {
  if (isAuthBypass()) return applySession(createDevSession(payload))

  const session = await request<AuthSession>('/auth/login', {
    method: 'POST',
    body: payload,
  })
  return applySession(session)
}

/** Gửi OTP đăng ký. 429 nếu spam — UI đếm ngược, không spam. */
export async function requestOtp(payload: RequestOtpPayload): Promise<void> {
  if (isAuthBypass()) return

  await request<void>('/auth/request-otp', {
    method: 'POST',
    body: payload,
  })
}

/**
 * Verify OTP sớm, KHÔNG tiêu thụ mã (signup sau vẫn dùng được).
 * Sai cộng dồn — đủ MAX_OTP_ATTEMPTS mã bị hủy phía server.
 */
export async function verifyOtpEarly(payload: VerifyOtpEarlyPayload): Promise<boolean> {
  if (isAuthBypass()) return true

  return request<boolean>('/auth/verify-otp', {
    method: 'POST',
    body: payload,
  })
}

/** Tạo user sau đối chiếu OTP. Thành công → caller auto-signin. */
export async function signup(payload: SignupPayload): Promise<User> {
  if (isAuthBypass()) {
    return createDevSession(payload).user
  }

  return request<User>('/auth/signup', {
    method: 'POST',
    body: payload,
  })
}

/** Verify OTP (cho forgot-password flow) — tiêu thụ mã. */
export async function verifyOtp(payload: VerifyOtpPayload): Promise<AuthSession> {
  if (isAuthBypass()) return applySession(createDevSession(payload))

  const session = await request<AuthSession>('/auth/verify-otp', {
    method: 'POST',
    body: payload,
  })
  return applySession(session)
}

export async function resendOtp(payload: ResendOtpPayload): Promise<void> {
  if (isAuthBypass()) return

  await request<void>('/auth/resend-otp', {
    method: 'POST',
    body: payload,
  })
}

export async function forgotPassword(payload: { email: string }): Promise<void> {
  if (isAuthBypass()) return

  await request<void>('/auth/forgot-password', {
    method: 'POST',
    body: payload,
  })
}

/** Khôi phục phiên làm việc sau F5: cookie refresh → access token mới. */
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
