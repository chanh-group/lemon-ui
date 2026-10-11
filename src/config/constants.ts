export const APP_NAME = 'LemonChat'

export const ROUTES = {
  home: '/',
  login: '/signin',
  register: '/signup',
  otp: '/otp',
  messages: '/messages',
} as const

export const PASSWORD_MIN_LENGTH = 8

/** Tuổi thọ mã OTP (2 phút). Toàn bộ flow signup phải xong trong khoảng này. */
export const OTP_TTL_MS = 2 * 60_000

/** Cooldown nút gửi lại OTP (~60s). */
export const RESEND_COOLDOWN_MS = 60_000

/** Tổng lượt nhập sai OTP trước khi mã bị hủy phía server. */
export const MAX_OTP_ATTEMPTS = 5

/**
 * Chỉ dùng khi VITE_APP_ENV=dev (đánh dấu phiên dev, không chứa token thật).
 * Production: không có key nào được ghi vào storage.
 */
export const DEV_SESSION_KEY = 'lemonchat.dev_session'
