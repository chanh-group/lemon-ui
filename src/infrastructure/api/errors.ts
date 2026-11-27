import { AxiosError } from 'axios'

/**
 * Lỗi API typed. Giữ `code` ổn định từ LemonCore envelope
 * `{ success: false, code, message }` để UI map i18n thay vì message thô.
 */
export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

/** Access token hết hạn / không hợp lệ. */
export const UNAUTHORIZED = 'UNAUTHORIZED'
/** Refresh hết hạn / bị thu hồi — client phải logout. */
export const INVALID_SESSION = 'INVALID_SESSION'

/**
 * Lỗi không xác định kết quả (timeout / mất kết nối / 5xx): server có thể đã áp dụng
 * thao tác — cần reconcile với trạng thái authoritative trước khi kết luận thất bại.
 */
export function isUncertainApiError(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 0 || error.status >= 500
  if (error instanceof AxiosError) {
    const status = error.response?.status
    return status === undefined || status === 0 || status >= 500
  }
  return false
}
