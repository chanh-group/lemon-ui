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
