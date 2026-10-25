export const APP_NAME = 'LemonChat'

export const ROUTES = {
  home: '/',
  login: '/signin',
  register: '/signup',
  forgotPassword: '/forgot-password',
  messages: '/messages',
  /** Route pattern cho hội thoại đang mở — F5 giữ nguyên URL. */
  conversation: '/messages/:conversationId',
  calls: '/calls',
  newCall: '/calls/new',
  newChat: '/new-chat',
  storiesCreate: '/stories/create',
  settings: '/settings',
} as const

/** URL của một hội thoại cụ thể, dùng cho điều hướng và reload. */
export function conversationPath(conversationId: string): string {
  return `${ROUTES.messages}/${encodeURIComponent(conversationId)}`
}

export const PASSWORD_MIN_LENGTH = 8

/** Tuổi thọ mã OTP (2 phút). */
export const OTP_TTL_MS = 2 * 60_000

/** Cooldown nút gửi lại OTP (~60s). */
export const RESEND_COOLDOWN_MS = 60_000

/** Tổng lượt nhập sai OTP trước khi mã bị hủy. */
export const MAX_OTP_ATTEMPTS = 5

export const DEV_SESSION_KEY = 'lemonchat.dev_session'
