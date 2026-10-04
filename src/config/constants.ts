export const APP_NAME = 'LemonChat'

export const ROUTES = {
  home: '/',
  login: '/signin',
  register: '/signup',
  messages: '/messages',
} as const

export const PASSWORD_MIN_LENGTH = 8

/**
 * Chỉ dùng khi VITE_APP_ENV=dev (đánh dấu phiên dev, không chứa token thật).
 * Production: không có key nào được ghi vào storage.
 */
export const DEV_SESSION_KEY = 'lemonchat.dev_session'
