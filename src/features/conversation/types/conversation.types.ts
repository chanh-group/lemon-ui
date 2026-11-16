import type { MessageResponse } from '@/features/messaging/types/message.types'

export interface Conversation {
  id: string
  name: string
  preview: string
  previewKind: 'text' | 'photo' | 'video' | 'audio' | 'file' | 'gif' | 'sticker' | 'call'
  time: string
  unread: number
  online: boolean
  isGroup: boolean
  members?: string
  lastActive?: string
  partnerId?: string
  partnerUsername?: string
  partnerBio?: string | null
  partnerAvatar?: string | null
  lastMessageSenderId?: string | null
}

export interface ConversationPartnerResponse {
  id: string
  username: string
  fullName: string
  avatarUrl: string | null
  bio?: string | null
  isOnline: boolean
}

export interface ConversationResponse {
  id: string
  kind: 'DIRECT' | 'GROUP'
  partner?: ConversationPartnerResponse
  lastMessagePreview: string | null
  lastMessageSenderId?: string | null
  lastMessageAt: string | null
  unreadCount: number
  createdAt: string
  /** Client-side metadata, populated only when the corresponding message is known. */
  lastMessageDetail?: MessageResponse
}
