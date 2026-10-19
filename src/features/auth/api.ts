import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAuthBypass } from '@/config/env'
import { DEV_SESSION_KEY } from '@/config/constants'
import { api, toApiError } from '@/infrastructure/api/client'
import { authEndpoints } from '@/infrastructure/api/endpoints'
import type { ApiError } from '@/infrastructure/api/errors'
import { useAuthStore } from '@/infrastructure/auth/auth-store'
import { signOutEverywhere } from '@/infrastructure/auth/session'
import { queryKeys } from '@/infrastructure/query/keys'
import { getItem, setItem } from '@/lib/storage'
import type {
  AuthUser,
  ForgotOtpInput,
  LoginInput,
  RequestOtpInput,
  SignupInput,
  VerifyOtpInput,
} from '@/domain/auth'

function createDevUser(partial: {
  email: string
  fullName?: string
  username?: string
}): AuthUser {
  return {
    id: 'dev-user',
    fullName: partial.fullName ?? partial.email.split('@')[0] ?? 'Dev User',
    username: partial.username ?? 'devuser',
    email: partial.email,
    createdAt: new Date().toISOString(),
  }
}

/** Profile — bootstrap sau login/refresh. Chỉ chạy khi authenticated. */
export function useMe() {
  const status = useAuthStore((s) => s.status)
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async (): Promise<AuthUser> => {
      if (isAuthBypass()) {
        const dev = getItem<AuthUser>(DEV_SESSION_KEY)
        if (!dev) throw toApiError(new Error('No dev session'))
        return dev
      }
      try {
        const res = await api.get<AuthUser>(authEndpoints.me)
        return res.data
      } catch (error) {
        throw toApiError(error)
      }
    },
    enabled: status === 'authenticated',
    staleTime: 5 * 60_000,
  })
}

function useInvalidateSession() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.me })
  }
}

/** Đăng nhập: access ở body, refresh ở cookie (backend set). */
export function useLogin() {
  const invalidate = useInvalidateSession()
  return useMutation<AuthUser, ApiError, LoginInput>({
    mutationFn: async (input): Promise<AuthUser> => {
      if (isAuthBypass()) {
        const user = createDevUser(input)
        setItem(DEV_SESSION_KEY, user)
        useAuthStore.getState().setAccessToken('dev.access.token')
        return user
      }
      try {
        const res = await api.post<{ accessToken: string; user: AuthUser }>(
          authEndpoints.login,
          input,
        )
        useAuthStore.getState().setAccessToken(res.data.accessToken)
        invalidate()
        return res.data.user
      } catch (error) {
        throw toApiError(error)
      }
    },
  })
}

export function useRequestOtp() {
  return useMutation<void, ApiError, RequestOtpInput>({
    mutationFn: async (input) => {
      if (isAuthBypass()) return
      try {
        await api.post(authEndpoints.requestOtp, input)
      } catch (error) {
        throw toApiError(error)
      }
    },
  })
}

/**
 * Verify OTP sớm, KHÔNG tiêu thụ mã.
 * LemonCore trả `{ valid: boolean }` trong data.
 */
export function useVerifyOtp() {
  return useMutation<boolean, ApiError, VerifyOtpInput>({
    mutationFn: async (input) => {
      if (isAuthBypass()) return true
      try {
        const res = await api.post<{ valid: boolean }>(authEndpoints.verifyOtp, input)
        return res.data.valid
      } catch (error) {
        throw toApiError(error)
      }
    },
  })
}

/** Alias giữ tên cũ cho wizard. */
export const useVerifyOtpEarly = useVerifyOtp

export function useSignup() {
  return useMutation<AuthUser, ApiError, SignupInput>({
    mutationFn: async (input) => {
      if (isAuthBypass()) return createDevUser(input)
      try {
        const res = await api.post<AuthUser>(authEndpoints.signup, input)
        return res.data
      } catch (error) {
        throw toApiError(error)
      }
    },
  })
}

export function useForgotOtp() {
  return useMutation<void, ApiError, ForgotOtpInput>({
    mutationFn: async (input) => {
      if (isAuthBypass()) return
      try {
        await api.post(authEndpoints.forgotOtp, input)
      } catch (error) {
        throw toApiError(error)
      }
    },
  })
}

/** Alias tên cũ. */
export const useForgotPassword = useForgotOtp

export type ResetPasswordPayload = {
  email: string
  otp: string
  newPassword: string
  /** Chỉ client — strip trước khi POST. */
  confirmPassword?: string
}

/** Đặt mật khẩu mới — server thu hồi mọi session. */
export function useResetPassword() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, ResetPasswordPayload>({
    mutationFn: async (input) => {
      if (isAuthBypass()) {
        queryClient.clear()
        useAuthStore.getState().reset()
        return
      }
      try {
        await api.post(authEndpoints.resetPassword, {
          email: input.email,
          otp: input.otp,
          newPassword: input.newPassword,
        })
        queryClient.clear()
        useAuthStore.getState().reset()
      } catch (error) {
        throw toApiError(error)
      }
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, void>({
    mutationFn: () => signOutEverywhere(() => queryClient.clear()),
  })
}

/**
 * Convenience: user + status cho UI shell.
 * status `unknown` = đang bootstrap (tương đương `restoring` cũ).
 */
export function useAuth() {
  const status = useAuthStore((s) => s.status)
  const { data: user = null } = useMe()
  return {
    user,
    status: status === 'unknown' ? ('restoring' as const) : status,
  }
}
