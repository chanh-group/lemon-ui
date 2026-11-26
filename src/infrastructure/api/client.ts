import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import i18n from '@/i18n'
import { env } from '@/config/env'
import { useAuthStore } from '@/infrastructure/auth/auth-store'
import { ApiError, INVALID_SESSION, UNAUTHORIZED } from '@/infrastructure/api/errors'
import { NO_SILENT_REFRESH_PATHS, authEndpoints } from '@/infrastructure/api/endpoints'

/** Envelope thành công từ LemonCore `utils/response.ts`. */
interface SuccessEnvelope<T> {
  success: true
  message: string
  data?: T
}

/** Envelope lỗi từ LemonCore `ErrorFilter`. */
interface ErrorEnvelope {
  success: false
  code: string
  message: string
}

interface RetryableConfig extends InternalAxiosRequestConfig {
  _refreshed?: boolean
  _sessionGeneration?: number
}

function assertSession(generation: number) {
  if (useAuthStore.getState().generation !== generation) {
    throw new ApiError(INVALID_SESSION, 401, 'Session changed')
  }
}

export const API_BASE_URL = env.API_URL

/**
 * Axios instance duy nhất. `withCredentials: true` bắt buộc để gửi/nhận
 * cookie `refreshCookie` (httpOnly). Mọi network features phải đi qua `api`.
 */
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(
  (config) => {
    const request = config as RetryableConfig
    const { accessToken, generation } = useAuthStore.getState()
    request._sessionGeneration ??= generation
    assertSession(request._sessionGeneration)
    if (accessToken) config.headers.set('Authorization', `Bearer ${accessToken}`)
    config.headers.set('Accept-Language', i18n.language.startsWith('vi') ? 'vi' : 'en')
    return config
  },
  (error: unknown) => {
    throw error
  },
  { synchronous: true },
)

/** Unwrap `{ success: true, data }` → caller đọc `res.data` là payload thật. */
api.interceptors.response.use((response) => {
  const generation = (response.config as RetryableConfig)._sessionGeneration
  if (generation !== undefined) assertSession(generation)
  const payload = response.data as SuccessEnvelope<unknown> | undefined
  if (payload && payload.success === true) {
    response.data = payload.data
  }
  return response
})

/** Singleflight refresh: N request 401 cùng lúc chỉ 1 lần POST /auth/refresh. */
const refreshPromises = new Map<number, Promise<string>>()

function silentRefresh(generation: number): Promise<string> {
  assertSession(generation)
  let refreshPromise = refreshPromises.get(generation)
  if (!refreshPromise) {
    refreshPromise = axios
      .post<SuccessEnvelope<{ accessToken: string }>>(authEndpoints.refresh, undefined, {
        baseURL: API_BASE_URL,
        withCredentials: true,
        headers: {
          'Accept-Language': i18n.language.startsWith('vi') ? 'vi' : 'en',
        },
      })
      .then((res) => {
        const token = res.data.data?.accessToken
        if (!token) throw new ApiError(INVALID_SESSION, 401, 'Missing access token')
        assertSession(generation)
        useAuthStore.getState().refreshAccessToken(token, generation)
        return token
      })
      .catch((error: unknown) => {
        throw toApiError(error)
      })
      .finally(() => {
        refreshPromises.delete(generation)
      })
    refreshPromises.set(generation, refreshPromise)
  }
  return refreshPromise
}

function isAuthCredentialPath(url: string | undefined): boolean {
  if (!url) return false
  return NO_SILENT_REFRESH_PATHS.some((path) => url.includes(path))
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ErrorEnvelope>) => {
    const original = error.config as RetryableConfig | undefined
    const status = error.response?.status ?? 0

    if (status === 401 && original && !original._refreshed && !isAuthCredentialPath(original.url)) {
      const generation = original._sessionGeneration
      if (generation === undefined) throw toApiError(error)
      assertSession(generation)
      original._refreshed = true
      try {
        await silentRefresh(generation)
      } catch (refreshError) {
        if (useAuthStore.getState().generation === generation) useAuthStore.getState().reset()
        throw refreshError
      }
      assertSession(generation)
      return api.request(original)
    }
    throw toApiError(error)
  },
)

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0
    const data = error.response?.data as ErrorEnvelope | undefined
    if (data && data.success === false) {
      return new ApiError(data.code || UNAUTHORIZED, status, data.message || 'Request failed')
    }
    return new ApiError(status === 0 ? 'NETWORK_ERROR' : UNAUTHORIZED, status, error.message)
  }
  return new ApiError('UNKNOWN_ERROR', 0, error instanceof Error ? error.message : 'Unknown error')
}
