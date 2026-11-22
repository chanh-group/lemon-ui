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

// contract: LemonCore domain/user/constants.ts PASSWORD_MIN_LENGTH (issue #59)
export const PASSWORD_MIN_LENGTH = 8

// contract: LemonCore domain/user/constants.ts OTP_LENGTH (issue #59)
export const OTP_LENGTH = 6

// contract: LemonCore OTP format, exactly OTP_LENGTH digits (issue #59)
export const OTP_REGEX = new RegExp(`^\\d{${OTP_LENGTH}}$`)

// contract: LemonCore domain/user/constants.ts FULL_NAME_MIN_LENGTH (issue #59)
export const FULL_NAME_MIN_LENGTH = 2

// contract: LemonCore domain/user/constants.ts FULL_NAME_MAX_LENGTH (issue #59)
export const FULL_NAME_MAX_LENGTH = 100

// contract: LemonCore domain/user/constants.ts USERNAME_MIN_LENGTH (issue #59)
export const USERNAME_MIN_LENGTH = 3

// contract: LemonCore domain/user/constants.ts USERNAME_MAX_LENGTH (issue #59)
export const USERNAME_MAX_LENGTH = 30

// contract: LemonCore domain/user/constants.ts USER_BIO_MAX_LENGTH (issue #59)
export const USER_BIO_MAX_LENGTH = 500

// contract: LemonCore domain/story/constants.ts STORY_MAX_CAPTION_LENGTH (issue #59)
export const STORY_MAX_CAPTION_LENGTH = 500

// contract: LemonCore domain/user/constants.ts AVATAR_MAX_BYTES (issue #59)
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024

/** Giới hạn dung lượng file upload trong chat. */
export const CHAT_UPLOAD_MAX_BYTES = 25 * 1024 * 1024

// contract: LemonCore domain/message/constants.ts MESSAGE_MAX_BODY_LENGTH
export const MESSAGE_MAX_BODY_LENGTH = 4000

/** Bắt đầu hiện bộ đếm độ dài khi người dùng đã dùng 90% giới hạn tin nhắn. */
export const MESSAGE_LENGTH_WARNING_THRESHOLD = Math.floor(MESSAGE_MAX_BODY_LENGTH * 0.9)

// contract: LemonCore domain/user/constants.ts USER_SEARCH_MIN_LENGTH (issue #59)
export const USER_SEARCH_MIN_LENGTH = 2

/** Debounce ô tìm kiếm người dùng (ms). */
export const USER_SEARCH_DEBOUNCE_MS = 300

/** Kích thước trang danh sách lời mời kết bạn. */
export const FRIEND_REQUESTS_PAGE_SIZE = 20

/** Kích thước trang danh sách bạn bè. */
export const FRIENDS_PAGE_SIZE = 50

/** Kích thước trang tin nhắn. */
export const MESSAGE_PAGE_SIZE = 30

/** Thời gian coi dữ liệu hội thoại là tươi (ms). */
export const CONVERSATION_STALE_MS = 30_000

/** Thời gian coi dữ liệu bạn bè là tươi (ms). */
export const FRIEND_STALE_MS = 30_000

/** Thời gian coi dữ liệu /auth/me là tươi (ms). */
export const AUTH_ME_STALE_MS = 5 * 60_000

/** Thời gian coi dữ liệu reply target là tươi (ms). */
export const REPLY_TARGET_STALE_MS = 5 * 60_000

/** Thời gian giữ reply target trong cache trước khi dọn (ms). */
export const REPLY_TARGET_GC_MS = 10 * 60_000

/** Tuổi thọ mã OTP (2 phút). */
export const OTP_TTL_MS = 2 * 60_000

/** Cooldown nút gửi lại OTP (~60s). */
export const RESEND_COOLDOWN_MS = 60_000

/** Tổng lượt nhập sai OTP trước khi mã bị hủy. */
export const MAX_OTP_ATTEMPTS = 5

export const DEV_SESSION_KEY = 'lemonchat.dev_session'
