export type ChatTab = 'messages' | 'calls' | 'stories'

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
  online: boolean
}
