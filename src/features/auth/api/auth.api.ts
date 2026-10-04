import { isAuthBypass } from '@/config/env'
import { request, refreshAccessToken } from '@/lib/api'
import { clearAccessToken, setAccessToken } from '@/lib/token-manager'
import type {
  AuthSession,
  LoginPayload,
  RegisterPayload,
  User,
} from '@/features/auth/types/auth.types'

export interface VerifyOtpPayload {
  email: string
  code: string
}

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

export async function register(payload: RegisterPayload): Promise<AuthSession> {
  if (isAuthBypass()) return applySession(createDevSession(payload))

  const session = await request<AuthSession>('/auth/register', {
    method: 'POST',
    body: payload,
  })
  return applySession(session)
}

export async function verifyOtp(payload: VerifyOtpPayload): Promise<AuthSession> {
  if (isAuthBypass()) return applySession(createDevSession(payload))

  const session = await request<AuthSession>('/auth/verify-otp', {
    method: 'POST',
    body: payload,
  })
  return applySession(session)
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
