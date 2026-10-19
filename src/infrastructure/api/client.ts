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

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  config.headers.set('Accept-Language', i18n.language.startsWith('vi') ? 'vi' : 'en')
  return config
})

/** Unwrap `{ success: true, data }` → caller đọc `res.data` là payload thật. */
api.interceptors.response.use((response) => {
  const payload = response.data as SuccessEnvelope<unknown> | undefined
  if (payload && payload.success === true) {
    response.data = payload.data
  }
  return response
})

/** Singleflight refresh: N request 401 cùng lúc chỉ 1 lần POST /auth/refresh. */
let refreshPromise: Promise<string> | null = null

function silentRefresh(): Promise<string> {
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
        useAuthStore.getState().setAccessToken(token)
        return token
      })
      .catch((error: unknown) => {
        throw toApiError(error)
      })
      .finally(() => {
        refreshPromise = null
      })
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
      original._refreshed = true
      try {
        const token = await silentRefresh()
        original.headers.set('Authorization', `Bearer ${token}`)
        return await api.request(original)
      } catch (refreshError) {
        useAuthStore.getState().reset()
        throw refreshError
      }
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
