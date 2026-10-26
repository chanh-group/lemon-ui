import type {
  ChatMessage,
  Conversation,
  ConversationResponse,
  DayGroup,
  MessageResponse,
} from '../types/chat.types'

/** Định dạng giờ HH:mm */
export function formatTimeHHmm(dateStrOrObj?: string | Date | null): string {
  if (!dateStrOrObj) return ''
  const d = typeof dateStrOrObj === 'string' ? new Date(dateStrOrObj) : dateStrOrObj
  if (isNaN(d.getTime())) return ''
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/** Định dạng ngày hiển thị (Hôm nay, Hôm qua, hoặc DD/MM/YYYY) */
export function formatDateLabel(dateStrOrObj?: string | Date | null, todayLabel = 'Hôm nay'): string {
  if (!dateStrOrObj) return todayLabel
  const d = typeof dateStrOrObj === 'string' ? new Date(dateStrOrObj) : dateStrOrObj
  if (isNaN(d.getTime())) return todayLabel

  const now = new Date()
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()

  if (isToday) return todayLabel

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()

  if (isYesterday) return 'Hôm qua'

  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

/** Chuyển đổi từ ConversationResponse của Backend sang Conversation của UI */
export function mapConversationResponse(
  raw: ConversationResponse,
): Conversation {
  const isGroup = raw.kind === 'GROUP'
  const partner = raw.partner
  const name = isGroup
    ? 'Nhóm trò chuyện'
    : partner?.fullName || partner?.username || 'Người dùng Lemon'

  const dateToUse = raw.lastMessageAt || raw.createdAt

  return {
    id: raw.id,
    name,
    preview: raw.lastMessagePreview || '',
    previewKind: 'text',
    time: formatTimeHHmm(dateToUse),
    unread: raw.unreadCount || 0,
    online: partner?.isOnline ?? false,
    isGroup,
    partnerId: partner?.id,
    partnerAvatar: partner?.avatarUrl,
  }
}

/** Chuyển đổi từ MessageResponse của Backend sang ChatMessage của UI */
export function mapMessageResponse(
  raw: MessageResponse,
  currentUserId?: string,
): ChatMessage {
  const isRevoked = Boolean(raw.deletedAt)
  const isMe = currentUserId ? raw.senderId === currentUserId : false

  let uiKind: ChatMessage['kind'] = 'text'
  if (raw.kind === 'IMAGE') uiKind = 'photo'
  else if (raw.kind === 'VIDEO') uiKind = 'video'
  else if (raw.kind === 'AUDIO') uiKind = 'audio'
  else if (raw.kind === 'FILE') uiKind = 'file'
  else if (raw.attachments && raw.attachments.length > 0) {
    const firstKind = raw.attachments[0].kind
    if (firstKind === 'IMAGE') uiKind = 'photo'
    else if (firstKind === 'VIDEO') uiKind = 'video'
    else if (firstKind === 'AUDIO') uiKind = 'audio'
    else uiKind = 'file'
  }

  return {
    id: raw.id,
    fromMe: isMe,
    sender: undefined,
    text: isRevoked ? 'Tin nhắn đã bị thu hồi' : raw.body || '',
    kind: uiKind,
    attachments: raw.attachments,
    photoLabel: raw.attachments?.[0]?.fileName,
    time: formatTimeHHmm(raw.createdAt),
    status: isMe ? 'sent' : undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date(raw.createdAt).toISOString(),
    editedAt: raw.editedAt ? (typeof raw.editedAt === 'string' ? raw.editedAt : new Date(raw.editedAt).toISOString()) : null,
    deletedAt: raw.deletedAt ? (typeof raw.deletedAt === 'string' ? raw.deletedAt : new Date(raw.deletedAt).toISOString()) : null,
  }
}

/** Gom danh sách ChatMessage thành DayGroup[] theo ngày */
export function buildDayGroupsFromMessages(
  messages: ChatMessage[],
  todayLabel = 'Hôm nay',
): DayGroup[] {
  const groupMap = new Map<string, ChatMessage[]>()

  for (const msg of messages) {
    const label = formatDateLabel(msg.createdAt, todayLabel)
    const existing = groupMap.get(label)
    if (existing) {
      existing.push(msg)
    } else {
      groupMap.set(label, [msg])
    }
  }

  const result: DayGroup[] = []
  for (const [date, msgs] of groupMap.entries()) {
    result.push({ date, messages: msgs })
  }
  return result
}

