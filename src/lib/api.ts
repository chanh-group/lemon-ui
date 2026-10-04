import { env, isAuthBypass } from '@/config/env'
import { clearAccessToken, getAccessToken, setAccessToken } from '@/lib/token-manager'

export interface ApiError {
  message: string
  status: number
  code?: string
  fieldErrors?: Record<string, string[]>
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  /** Bỏ qua retry-refresh cho các request auth (login/refresh) để tránh vòng lặp */
  skipAuthRefresh?: boolean
}

export class RequestError extends Error {
  status: number
  code?: string
  fieldErrors?: Record<string, string[]>

  constructor(error: ApiError) {
    super(error.message)
    this.name = 'RequestError'
    this.status = error.status
    this.code = error.code
    this.fieldErrors = error.fieldErrors
  }
}

/* ------------------------------------------------------------------ */
/* Silent refresh — single flight: nhiều request 401 cùng lúc chỉ gọi   */
/* refresh 1 lần, các request còn lại chờ chung kết quả.               */
/* Refresh token nằm trong cookie httpOnly → gửi kèm credentials.      */
/* ------------------------------------------------------------------ */

interface RefreshResponse {
  accessToken: string
}

let refreshPromise: Promise<string | null> | null = null

export function refreshAccessToken(): Promise<string | null> {
  refreshPromise ??= (async () => {
    try {
      const response = await fetch(`${env.API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        clearAccessToken()
        return null
      }

      const data = (await response.json()) as RefreshResponse
      setAccessToken(data.accessToken)
      return data.accessToken
    } catch {
      clearAccessToken()
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

/** Gọi ngầm khi app mount / quay lại tab — không chặn UI. */
export function scheduleSilentRefresh(): void {
  if (isAuthBypass()) return
  void refreshAccessToken()
}

async function parseError(response: Response): Promise<RequestError> {
  let message = 'Đã có lỗi xảy ra, vui lòng thử lại'
  let fieldErrors: Record<string, string[]> | undefined

  try {
    const payload = (await response.json()) as {
      message?: string
      errors?: Record<string, string[]>
    }
    message = payload.message ?? message
    fieldErrors = payload.errors
  } catch {
    // Giữ thông điệp mặc định khi body không phải JSON
  }

  return new RequestError({ message, status: response.status, fieldErrors })
}

export async function request<T>(
  path: string,
  { body, headers, skipAuthRefresh = false, ...options }: RequestOptions = {},
): Promise<T> {
  const doFetch = (token: string | null) =>
    fetch(`${env.API_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : null),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })

  let response = await doFetch(getAccessToken())

  // Access token hết hạn → refresh ngầm rồi retry đúng request cũ (1 lần)
  if (response.status === 401 && !skipAuthRefresh) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      response = await doFetch(newToken)
    }
  }

  if (!response.ok) {
    throw await parseError(response)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
