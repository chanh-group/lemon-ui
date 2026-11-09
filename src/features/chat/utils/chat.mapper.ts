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
    lastMessageSenderId: raw.lastMessageSenderId ?? null,
  }
}

/**
 * Rút gọn tên người dùng để hiển thị trong câu thông báo (ví dụ: "Hiệu đã gửi một file đính kèm.")
 * Tiếng Việt: lấy tên gọi (từ cuối cùng, ví dụ "Nguyễn Hiệu" -> "Hiệu", "Phạm Lan Nhi" -> "Nhi")
 * Tiếng Anh / Quốc tế: lấy First Name (từ đầu tiên, ví dụ "John Smith" -> "John")
 */
export function getShortName(fullName?: string | null, lang = 'vi'): string {
  if (!fullName) return ''
  const trimmed = fullName.trim()
  if (!trimmed) return ''
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return parts[0]
  if (lang.startsWith('vi')) {
    return parts[parts.length - 1]
  }
  return parts[0]
}

export interface ConversationPreviewOptions {
  conversation: Conversation
  currentUserId?: string | null
  lang?: string
  t: (key: string, options?: Record<string, unknown>) => string
}

export interface ConversationPreviewResult {
  text: string
  isUnread: boolean
  isBold: boolean
  showBlueDot: boolean
}

/**
 * Tính toán hiển thị xem trước của hội thoại theo phong cách Messenger:
 * 1. Nếu có tin chưa đọc: Hiển thị "{count} tin nhắn mới" in đậm, kèm chấm tròn xanh dương bên phải.
 * 2. Nếu người vừa gửi là bạn: Hiển thị "Bạn: <nội dung>" (VI) hoặc "You: <content>" (EN).
 * 3. Khi gửi file/ảnh/video/audio: Hiển thị "Bạn đã gửi một file đính kèm." (VI) hoặc "[Tên] đã gửi một file đính kèm." (VI) / Tiếng Anh tương ứng.
 * 4. Nếu đã đọc: chữ mờ thường, không có chấm xanh.
 */
export function getConversationPreview({
  conversation,
  currentUserId,
  lang = 'vi',
  t,
}: ConversationPreviewOptions): ConversationPreviewResult {
  const { unread, preview, previewKind, lastMessageSenderId, name, isGroup } = conversation
  const isVietnamese = lang.startsWith('vi')

  // 1. Nếu có tin nhắn chưa đọc -> hiện số lượng tin nhắn mới + chấm xanh bên phải
  if (unread > 0) {
    const text = isVietnamese
      ? t('chat.newMessagesCount', { count: unread })
      : unread === 1
        ? t('chat.newMessageCountSingle')
        : t('chat.newMessagesCount', { count: unread })

    return {
      text,
      isUnread: true,
      isBold: true,
      showBlueDot: true,
    }
  }

  // 2. Không có tin nhắn hoặc cuộc trò chuyện mới
  if (!preview && previewKind === 'text') {
    return {
      text: !isGroup ? t('chat.newConnectionPreview') : '',
      isUnread: false,
      isBold: false,
      showBlueDot: false,
    }
  }

  // 3. Tin nhắn bị thu hồi
  if (preview === '[message-revoked]' || preview === 'Tin nhắn đã bị thu hồi') {
    return {
      text: t('chat.messageRevokedText'),
      isUnread: false,
      isBold: false,
      showBlueDot: false,
    }
  }

  // Xác định người gửi có phải là mình không
  const isMe = Boolean(
    (currentUserId && lastMessageSenderId && lastMessageSenderId === currentUserId) ||
    preview.startsWith('Bạn: ') ||
    preview.startsWith('You: ')
  )

  const shortName = getShortName(name, lang)

  // 4. Tin nhắn bày tỏ cảm xúc Story
  if (preview === '[story-reaction]') {
    const text = isMe
      ? t('chat.youReactedStory')
      : t('chat.partnerReactedStory', { name: shortName })
    return {
      text,
      isUnread: false,
      isBold: false,
      showBlueDot: false,
    }
  }

  // 5. Tin nhắn đính kèm file (ảnh, video, audio, file)
  const isAttachment =
    preview === '[attachment]' ||
    preview === 'Đính kèm tệp' ||
    previewKind === 'photo' ||
    previewKind === 'file' ||
    previewKind === 'video' ||
    previewKind === 'audio'

  if (isAttachment) {
    const text = isMe
      ? t('chat.youSentAttachment')
      : t('chat.partnerSentAttachment', { name: shortName })

    return {
      text,
      isUnread: false,
      isBold: false,
      showBlueDot: false,
    }
  }

  // 6. Tin nhắn văn bản thông thường
  let cleanBody = preview
  if (cleanBody.startsWith('Bạn: ')) {
    cleanBody = cleanBody.slice(5)
  } else if (cleanBody.startsWith('You: ')) {
    cleanBody = cleanBody.slice(5)
  }

  const youPrefix = t('chat.youPrefix')
  const text = isMe ? `${youPrefix}${cleanBody}` : cleanBody

  return {
    text,
    isUnread: false,
    isBold: false,
    showBlueDot: false,
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
    reactions: raw.reactions,
    isForwarded: raw.isForwarded,
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

