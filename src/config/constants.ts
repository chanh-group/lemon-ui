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
  /** Màn gọi đang hoạt động — tách khỏi danh sách cuộc gọi để F5 vẫn giữ trạng thái. */
  call: '/call/:conversationId',
  newChat: '/new-chat',
  storiesCreate: '/stories/create',
  storiesArchive: '/stories/archive',
  settings: '/settings',
} as const

/** URL của một hội thoại cụ thể, dùng cho điều hướng và reload. */
export function conversationPath(conversationId: string): string {
  return `${ROUTES.messages}/${encodeURIComponent(conversationId)}`
}

export type CallMedia = 'voice' | 'video'
export type CallPhase = 'ringing' | 'incoming' | 'active' | 'ended'
export type CallEndReason = 'ended' | 'declined' | 'cancelled'

export interface CallPathOptions {
  media?: CallMedia
  state?: CallPhase
  reason?: CallEndReason
}

/** URL màn gọi; query giữ loại cuộc gọi và trạng thái để reload không mất màn hình. */
export function callPath(conversationId: string, options: CallPathOptions = {}): string {
  const params = new URLSearchParams()
  if (options.media) params.set('media', options.media)
  if (options.state) params.set('state', options.state)
  if (options.reason) params.set('reason', options.reason)
  const query = params.toString()
  return `${ROUTES.call.replace(':conversationId', encodeURIComponent(conversationId))}${query ? `?${query}` : ''}`
}

export const PASSWORD_MIN_LENGTH = 8

/** Tuổi thọ mã OTP (2 phút). */
export const OTP_TTL_MS = 2 * 60_000

/** Cooldown nút gửi lại OTP (~60s). */
export const RESEND_COOLDOWN_MS = 60_000

/** Tổng lượt nhập sai OTP trước khi mã bị hủy. */
export const MAX_OTP_ATTEMPTS = 5

export const DEV_SESSION_KEY = 'lemonchat.dev_session'
