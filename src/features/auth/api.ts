import { useRef } from 'react'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { isAuthBypass } from '@/config/env'
import { AUTH_ME_STALE_MS, DEV_SESSION_KEY } from '@/config/constants'
import { api, toApiError } from '@/infrastructure/api/client'
import { clearAllDrafts } from '@/features/messaging/utils/draftStore'
import { authEndpoints, userEndpoints } from '@/infrastructure/api/endpoints'
import { ApiError, INVALID_SESSION } from '@/infrastructure/api/errors'
import { useAuthStore } from '@/infrastructure/auth/auth-store'
import { signOutEverywhere } from '@/infrastructure/auth/session'
import { queryKeys } from '@/infrastructure/query/keys'
import { getItem, removeItem, setItem } from '@/lib/storage'
import type {
  AuthUser,
  ForgotOtpInput,
  LoginInput,
  RequestOtpInput,
  SignupInput,
  VerifyOtpInput,
} from '@/domain/auth'

function createDevUser(partial: {
  identifier?: string
  email?: string
  fullName?: string
  username?: string
}): AuthUser {
  const identifier = partial.identifier ?? partial.email ?? 'devuser'
  const email = partial.email ?? (identifier.includes('@') ? identifier : `${identifier}@lemon.dev`)
  return {
    id: 'dev-user',
    fullName: partial.fullName ?? (identifier.split('@')[0] || 'Dev User'),
    username: partial.username ?? 'devuser',
    email,
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
    staleTime: AUTH_ME_STALE_MS,
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
        clearAllDrafts()
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
        clearAllDrafts()
        useAuthStore.getState().reset()
      } catch (error) {
        throw toApiError(error)
      }
    },
  })
}

export type ChangePasswordPayload = {
  oldPassword: string
  newPassword: string
}

/**
 * Đổi mật khẩu — backend thu hồi toàn bộ refresh session và xóa cookie.
 * Client phải xóa token/cache local và quay về trang đăng nhập.
 */
export function useChangePassword() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, ChangePasswordPayload>({
    mutationFn: async (input) => {
      if (isAuthBypass()) {
        queryClient.clear()
        clearAllDrafts()
        removeItem(DEV_SESSION_KEY)
        useAuthStore.getState().reset()
        return
      }
      try {
        await api.post(authEndpoints.changePassword, input)
        queryClient.clear()
        clearAllDrafts()
        useAuthStore.getState().reset()
      } catch (error) {
        throw toApiError(error)
      }
    },
  })
}

export interface UpdateProfileInput {
  fullName?: string
  avatarUrl?: string | null
  bio?: string | null
  phone?: string | null
}

/** Cập nhật profile người dùng (PATCH /users/me). */
export async function updateProfile(input: UpdateProfileInput): Promise<AuthUser> {
  if (isAuthBypass()) {
    const current = getItem<AuthUser>(DEV_SESSION_KEY) || createDevUser({})
    const updated: AuthUser = {
      ...current,
      ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
      ...(input.bio !== undefined ? { bio: input.bio } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
    }
    setItem(DEV_SESSION_KEY, updated)
    return updated
  }
  try {
    const res = await api.patch<AuthUser>(userEndpoints.me, input)
    return res.data
  } catch (error) {
    throw toApiError(error)
  }
}

type ProfileField = keyof UpdateProfileInput

type ProfileUpdates = {
  generation: number
  userId?: string
  pending: number
  fields: Partial<Record<ProfileField, { confirmed: unknown; latest: symbol }>>
}

type ProfileUpdateContext = {
  token: symbol
  userId?: string
  previous?: AuthUser
  state: ProfileUpdates
}

const profileUpdates = new WeakMap<QueryClient, ProfileUpdates>()
const profileFields = ['fullName', 'bio', 'avatarUrl', 'phone'] as const

/** Hook cập nhật profile cá nhân và đồng bộ cache query 'me'. */
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const generations = useRef(new WeakMap<UpdateProfileInput, number>()).current
  const mutation = useMutation<AuthUser, ApiError, UpdateProfileInput, ProfileUpdateContext>({
    scope: { id: 'update-profile' },
    mutationFn: async (input) => {
      const generation = generations.get(input)
      if (generation !== useAuthStore.getState().generation)
        throw new ApiError(INVALID_SESSION, 401, 'Session changed')
      const result = await updateProfile(input)
      if (generation !== useAuthStore.getState().generation)
        throw new ApiError(INVALID_SESSION, 401, 'Session changed')
      return result
    },
    onMutate: (input) => {
      const generation = generations.get(input)
      if (generation === undefined || generation !== useAuthStore.getState().generation)
        throw new ApiError(INVALID_SESSION, 401, 'Session changed')
      void queryClient.cancelQueries({ queryKey: queryKeys.me })
      const previous = queryClient.getQueryData<AuthUser>(queryKeys.me)
      const active = profileUpdates.get(queryClient)
      const state: ProfileUpdates =
        active && active.generation === generation && active.userId === previous?.id
          ? active
          : { generation, userId: previous?.id, pending: 0, fields: {} }
      profileUpdates.set(queryClient, state)
      state.pending++
      const token = Symbol()
      if (previous) {
        const changes: Partial<AuthUser> = {}
        for (const field of profileFields) {
          if (input[field] === undefined) continue
          const entry = state.fields[field] ?? { confirmed: previous[field], latest: token }
          entry.latest = token
          state.fields[field] = entry
          if (field === 'fullName' || field === 'bio')
            Object.assign(changes, { [field]: input[field] })
        }
        queryClient.setQueryData<AuthUser>(queryKeys.me, { ...previous, ...changes })
      }
      return { token, userId: previous?.id, previous, state }
    },
    onSuccess: (data, input, context) => {
      if (!context?.previous || context.state.generation !== useAuthStore.getState().generation)
        return
      queryClient.setQueryData<AuthUser>(queryKeys.me, (current) => {
        if (!current || current.id !== context.userId) return current
        const changes: Partial<AuthUser> = {}
        for (const field of profileFields) {
          if (input[field] === undefined) continue
          const entry = context.state.fields[field]
          if (!entry) continue
          entry.confirmed = data[field]
          const expected =
            field === 'fullName' || field === 'bio' ? input[field] : context.previous?.[field]
          if (entry.latest === context.token && current[field] === expected)
            Object.assign(changes, { [field]: data[field] })
        }
        return { ...current, ...changes }
      })
    },
    onError: (_error, input, context) => {
      if (!context?.previous || context.state.generation !== useAuthStore.getState().generation)
        return
      queryClient.setQueryData<AuthUser>(queryKeys.me, (current) => {
        if (!current || current.id !== context.userId) return current
        const changes: Partial<AuthUser> = {}
        for (const field of ['fullName', 'bio'] as const) {
          const entry = context.state.fields[field]
          if (
            input[field] !== undefined &&
            entry?.latest === context.token &&
            current[field] === input[field]
          )
            Object.assign(changes, { [field]: entry.confirmed })
        }
        return { ...current, ...changes }
      })
    },
    onSettled: (_data, _error, input, context) => {
      if (!context) return
      for (const field of profileFields) {
        if (input[field] !== undefined && context.state.fields[field]?.latest === context.token)
          delete context.state.fields[field]
      }
      context.state.pending--
      if (context.state.pending === 0 && profileUpdates.get(queryClient) === context.state) {
        profileUpdates.delete(queryClient)
        if (context.state.generation === useAuthStore.getState().generation)
          void queryClient.invalidateQueries({ queryKey: queryKeys.me })
      }
    },
  })
  const capture = (input: UpdateProfileInput) => {
    const copy = { ...input }
    generations.set(copy, useAuthStore.getState().generation)
    return copy
  }
  return {
    ...mutation,
    mutate: (input: UpdateProfileInput, options?: Parameters<typeof mutation.mutate>[1]) =>
      mutation.mutate(capture(input), options),
    mutateAsync: (
      input: UpdateProfileInput,
      options?: Parameters<typeof mutation.mutateAsync>[1],
    ) => mutation.mutateAsync(capture(input), options),
  }
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, void>({
    mutationFn: () =>
      signOutEverywhere(() => {
        queryClient.clear()
        clearAllDrafts()
      }),
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
