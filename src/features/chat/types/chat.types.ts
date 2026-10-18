export type ChatTab = 'messages' | 'calls' | 'stories'

/** Người dùng trong mạng lưới (bạn bè hoặc người lạ tìm được). */
export interface ChatUser {
  id: string
  name: string
  username: string
  email: string
}

/** Lời mời kết bạn — direction: 'incoming' (chờ mình chấp nhận) | 'outgoing' (chờ đối phương chấp nhận). */
export interface FriendRequest {
  id: string
  user: ChatUser
  direction: 'incoming' | 'outgoing'
  createdAt: number
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
}
