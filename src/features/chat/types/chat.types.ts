export type ChatTab = 'messages' | 'calls' | 'stories'

/** Người dùng trong mạng lưới (bạn bè hoặc người lạ tìm được). */
export interface ChatUser {
  id: string
  name: string
  username: string
  email?: string
  avatarUrl?: string | null
}

/** Lời mời kết bạn — direction: 'incoming' (chờ mình chấp nhận) | 'outgoing' (chờ đối phương chấp nhận). */
export interface FriendRequest {
  id: string
  user: ChatUser
  direction: 'incoming' | 'outgoing'
  createdAt: string
}

export interface CursorPage<T> {
  items: T[]
  nextCursor?: string
  hasMore: boolean
}

export interface FriendRequestsPageResponse {
  incoming: CursorPage<FriendRequest>
  outgoing: CursorPage<FriendRequest>
}

export interface UserSearchItem {
  id: string
  name: string
  username: string
  email: string
}

export interface Conversation {
  id: string
  name: string
  preview: string
  previewKind: 'text' | 'photo' | 'gif' | 'sticker' | 'call'
  time: string
  unread: number
  online: boolean
  isGroup: boolean
  members?: string
  lastActive?: string
  partnerId?: string
  partnerAvatar?: string | null
}

export interface ChatMessage {
  id: string
  fromMe: boolean
  sender?: string
  text?: string
  kind: 'text' | 'photo' | 'gif' | 'sticker'
  photoLabel?: string
  time: string
  status?: 'sent' | 'read'
  reactions?: string[]
  createdAt?: string
  editedAt?: string | null
  deletedAt?: string | null
}

export interface DayGroup {
  date: string
  messages: ChatMessage[]
}

export interface CallEntry {
  id: string
  name: string
  direction: 'incoming' | 'outgoing' | 'missed'
  kind: 'voice' | 'video'
  time: string
  online: boolean
}

export interface StoryEntry {
  id: string
  name: string
  time: string
  viewed: boolean
  /** Tin của chính ta — dành riêng cho hàng "Tin của bạn". */
  mine?: boolean
  online: boolean
  avatarUrl?: string | null
}

/* ------------------------------------------------------------------ */
/* Backend DTOs & Realtime Payloads (API_CHAT_1_1.md)                */
/* ------------------------------------------------------------------ */

export interface ConversationPartnerResponse {
  id: string
  username: string
  fullName: string
  avatarUrl: string | null
  isOnline: boolean
}

export interface ConversationResponse {
  id: string
  kind: 'DIRECT' | 'GROUP'
  partner?: ConversationPartnerResponse
  lastMessagePreview: string | null
  lastMessageAt: string | null
  unreadCount: number
  createdAt: string
}

export interface MessageResponse {
  id: string
  conversationId: string
  senderId: string
  kind: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'SYSTEM'
  body: string | null
  replyToId: string | null
  clientMsgId?: string | null
  createdAt: string
  editedAt: string | null
  deletedAt: string | null
}

export interface MessageTimelineResponse {
  items: MessageResponse[]
  nextCursor?: string
  hasMore: boolean
}

export interface SendMessageDto {
  body: string
  clientMsgId: string
  replyToId?: string | null
  kind?: 'TEXT'
}

export interface TypingEventPayload {
  conversationId: string
  userId: string
  isTyping: boolean
}

export interface ReadUpdatedPayload {
  conversationId: string
  userId: string
  lastReadMessageId: string
  readAt: string
}

export interface MessageRevokedPayload {
  id: string
  conversationId: string
  deletedAt: string
}
