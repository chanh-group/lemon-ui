import type { StoryPreview } from '@/features/story/types/story.types'

export interface MessageAttachmentItem {
  id: string
  kind: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE'
  fileName: string
  mimeType: string
  sizeBytes: number
  width?: number | null
  height?: number | null
  durationMs?: number | null
  previewUrl: string
  downloadUrl: string
}

export interface MessageReactionItem {
  emoji: string
  count: number
  userIds: string[]
}

export interface ChatMessage {
  id: string
  fromMe: boolean
  sender?: string
  text?: string
  kind: 'text' | 'photo' | 'video' | 'audio' | 'file' | 'gif' | 'sticker'
  canEdit?: boolean
  photoLabel?: string
  attachments?: MessageAttachmentItem[]
  time: string
  status?: 'sent' | 'read' | 'sending' | 'failed' | 'uncertain'
  reactions?: MessageReactionItem[]
  isForwarded?: boolean
  storyId?: string | null
  storyPreview?: StoryPreview | null
  replyToId?: string | null
  replyTarget?: MessageReplyTarget | null
  createdAt?: string
  editedAt?: string | null
  deletedAt?: string | null
}

export interface DayGroup {
  date: string
  messages: ChatMessage[]
}

export interface MessageResponse {
  id: string
  conversationId: string
  senderId: string
  kind: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'SYSTEM' | 'STORY_REPLY' | 'STORY_REACTION'
  body: string | null
  replyToId: string | null
  replyTarget?: MessageReplyTarget | null
  storyId?: string | null
  storyPreview?: StoryPreview | null
  clientMsgId?: string | null
  sendState?: 'uncertain'
  retryPayload?: SendMessageDto
  attachments?: MessageAttachmentItem[]
  reactions?: MessageReactionItem[]
  isForwarded?: boolean
  createdAt: string
  editedAt: string | null
  deletedAt: string | null
}

export interface MessageReplyTarget {
  id: string
  senderId: string
  kind: MessageResponse['kind']
  body: string | null
  deletedAt: string | null
  storyPreview?: StoryPreview | null
}

export interface MessageTimelineResponse {
  items: MessageResponse[]
  nextCursor?: string
  hasMore: boolean
}

export interface MessageAttachmentInput {
  objectKey: string
  fileName: string
  mimeType: string
  sizeBytes: number
  kind?: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE'
  width?: number
  height?: number
  durationMs?: number
  checksum?: string
}

export interface SendMessageDto {
  body?: string
  clientMsgId: string
  replyToId?: string | null
  kind?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'SYSTEM'
  attachments?: MessageAttachmentInput[]
  isForwarded?: boolean
  sourceMessageId?: string
}

export interface MessageReactionPayload {
  messageId: string
  conversationId: string
  userId: string
  emoji: string
  reactions: MessageReactionItem[]
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
