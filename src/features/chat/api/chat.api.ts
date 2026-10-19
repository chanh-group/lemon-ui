import { isAuthBypass } from '@/config/env'
import { request } from '@/lib/api'
import type {
  ChatUser,
  ConversationResponse,
  FriendRequest,
  MessageResponse,
  MessageTimelineResponse,
  SendMessageDto,
} from '../types/chat.types'

/* ------------------------------------------------------------------ */
/* Mock directory — backend thật chưa có, dữ liệu chỉ nằm trong session */
/* ------------------------------------------------------------------ */

interface DirectoryUser extends ChatUser {
  isFriend: boolean
}

const DIRECTORY: DirectoryUser[] = [
  { id: 'dir-1', name: 'Nguyễn Công Anh', username: 'conganh.2810', email: 'conganh.2810@lemon.dev', isFriend: false },
  { id: 'dir-2', name: 'Trần Thị Mỹ Linh', username: 'mylinh.09', email: 'mylinh.09@lemon.dev', isFriend: false },
  { id: 'dir-3', name: 'Phạm Văn Hùng', username: 'hungpv.77', email: 'hungpv.77@lemon.dev', isFriend: false },
  { id: 'dir-4', name: 'Lê Hoài Bảo', username: 'hoaibao.le', email: 'hoaibao.le@lemon.dev', isFriend: false },
]

/** DB lời mời kết bạn tạm (mỗi lần F5 là reset — đúng nghĩa mock). */
const pendingRequests: FriendRequest[] = [
  {
    id: 'fr-in-1',
    user: { id: 'dir-5', name: 'Ngô Khánh Linh', username: 'khanhlinh.312', email: 'khanhlinh.312@lemon.dev' },
    direction: 'incoming',
    createdAt: Date.now() - 3 * 60 * 60 * 1000,
  },
  {
    id: 'fr-out-1',
    user: { id: 'dir-6', name: 'Vũ Minh Tuấn', username: 'tuanvu.05', email: 'tuanvu.05@lemon.dev' },
    direction: 'outgoing',
    createdAt: Date.now() - 26 * 60 * 60 * 1000,
  },
]

let groupSeq = 0
const delay = (ms = 350) => new Promise<void>((r) => setTimeout(r, ms))

/* ------------------------------------------------------------------ */
/* Chat API — khi hết bypass sẽ gọi thẳng request() như auth            */
/* ------------------------------------------------------------------ */

/** Tìm user theo username (chính xác, không phân biệt hoa thường). */
export async function findUserByUsername(username: string): Promise<ChatUser | null> {
  const clean = username.trim().toLowerCase().replace(/^@/, '')
  if (isAuthBypass()) {
    await delay()
    const hit = DIRECTORY.find((u) => u.username.toLowerCase() === clean)
    return hit ? { ...hit } : null
  }
  const raw = await request<{
    id: string
    username: string
    email: string
    fullName?: string
    name?: string
    avatarUrl?: string | null
  } | null>(`/users/by-username/${encodeURIComponent(clean)}`)
  if (!raw) return null
  return {
    id: raw.id,
    name: raw.fullName || raw.name || raw.username,
    username: raw.username,
    email: raw.email,
    avatarUrl: raw.avatarUrl,
  }
}

/** Tìm user theo email (chính xác, không phân biệt hoa thường). */
export async function findUserByEmail(email: string): Promise<ChatUser | null> {
  const normalized = email.trim().toLowerCase()
  if (isAuthBypass()) {
    await delay()
    const hit = DIRECTORY.find((u) => u.email.toLowerCase() === normalized)
    return hit ? { ...hit } : null
  }
  const raw = await request<{
    id: string
    username: string
    email: string
    fullName?: string
    name?: string
    avatarUrl?: string | null
  } | null>(`/users/by-email/${encodeURIComponent(normalized)}`)
  if (!raw) return null
  return {
    id: raw.id,
    name: raw.fullName || raw.name || raw.username,
    username: raw.username,
    email: raw.email,
    avatarUrl: raw.avatarUrl,
  }
}

/** Gửi lời mời kết bạn. */
export async function sendFriendRequest(userId: string): Promise<void> {
  if (isAuthBypass()) {
    await delay()
    const user = DIRECTORY.find((u) => u.id === userId)
    if (user) pendingRequests.push({ id: `fr-out-${userId}`, user: { ...user }, direction: 'outgoing', createdAt: Date.now() })
    return
  }
  await request<void>('/friends/requests', { method: 'POST', body: { userId } })
}

/** Danh sách lời mời:incoming chờ mình xử lý + outgoing chờ đối phương. */
export async function getFriendRequests(): Promise<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }> {
  if (isAuthBypass()) {
    await delay(200)
    return {
      incoming: pendingRequests.filter((r) => r.direction === 'incoming').map((r) => ({ ...r })),
      outgoing: pendingRequests.filter((r) => r.direction === 'outgoing').map((r) => ({ ...r })),
    }
  }
  try {
    return await request<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>('/friends/requests')
  } catch {
    // Backend chưa triển khai Friends module -> trả về rỗng không báo lỗi
    return { incoming: [], outgoing: [] }
  }
}

/** Chấp nhận lời mời kết bạn. */
export async function acceptFriendRequest(requestId: string): Promise<void> {
  if (isAuthBypass()) {
    await delay()
    const i = pendingRequests.findIndex((r) => r.id === requestId)
    if (i >= 0) pendingRequests.splice(i, 1)
    return
  }
  await request<void>(`/friends/requests/${requestId}/accept`, { method: 'POST' })
}

/** Từ chối lời mời kết bạn. */
export async function declineFriendRequest(requestId: string): Promise<void> {
  if (isAuthBypass()) {
    await delay()
    const i = pendingRequests.findIndex((r) => r.id === requestId)
    if (i >= 0) pendingRequests.splice(i, 1)
    return
  }
  await request<void>(`/friends/requests/${requestId}/decline`, { method: 'POST' })
}

/** Hủy lời mời mình đã gửi. */
export async function cancelFriendRequest(requestId: string): Promise<void> {
  if (isAuthBypass()) {
    await delay()
    const i = pendingRequests.findIndex((r) => r.id === requestId)
    if (i >= 0) pendingRequests.splice(i, 1)
    return
  }
  await request<void>(`/friends/requests/${requestId}`, { method: 'DELETE' })
}

/** Xóa kết bạn. */
export async function removeFriend(friendId: string): Promise<void> {
  if (isAuthBypass()) {
    await delay()
    return
  }
  await request<void>(`/friends/${friendId}`, { method: 'DELETE' })
}

/** Chặn người dùng. */
export async function blockUser(userId: string): Promise<void> {
  if (isAuthBypass()) {
    await delay()
    return
  }
  await request<void>(`/users/${userId}/block`, { method: 'POST' })
}

/** Tạo nhóm từ danh sách bạn bè đã chọn. */
export async function createGroup(payload: { name: string; memberIds: string[] }): Promise<{ id: string; name: string }> {
  if (isAuthBypass()) {
    await delay(500)
    return { id: `mock-group-${++groupSeq}`, name: payload.name }
  }
  return request<{ id: string; name: string }>('/groups', { method: 'POST', body: payload })
}

/* ------------------------------------------------------------------ */
/* Direct 1-1 Conversation & Messages (docs/API_CHAT_1_1.md)         */
/* ------------------------------------------------------------------ */

/** Lấy danh sách hội thoại Inbox. */
export async function getConversations(limit = 20): Promise<ConversationResponse[]> {
  return request<ConversationResponse[]>(`/conversations?limit=${limit}`)
}

/** Lấy thông tin chi tiết một cuộc hội thoại. */
export async function getConversationById(id: string): Promise<ConversationResponse> {
  return request<ConversationResponse>(`/conversations/${id}`)
}

/** Tạo hoặc lấy cuộc hội thoại 1-1 với một user. */
export async function getOrCreateDirectConversation(targetUserId: string): Promise<ConversationResponse> {
  return request<ConversationResponse>('/conversations/direct', {
    method: 'POST',
    body: { targetUserId },
  })
}

/** Lấy lịch sử tin nhắn trong cuộc hội thoại (phân trang con trỏ). */
export async function getConversationMessages(
  conversationId: string,
  cursor?: string,
  limit = 30,
): Promise<MessageTimelineResponse> {
  const query = new URLSearchParams()
  query.set('limit', String(limit))
  if (cursor) query.set('cursor', cursor)
  return request<MessageTimelineResponse>(`/conversations/${conversationId}/messages?${query.toString()}`)
}

/** Gửi tin nhắn mới vào cuộc hội thoại. */
export async function sendMessage(
  conversationId: string,
  payload: SendMessageDto,
): Promise<MessageResponse> {
  return request<MessageResponse>(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: payload,
  })
}

/** Đánh dấu cuộc hội thoại đã đọc đến tin nhắn cụ thể. */
export async function markConversationRead(
  conversationId: string,
  lastReadMessageId: string,
): Promise<void> {
  await request<void>(`/conversations/${conversationId}/read`, {
    method: 'POST',
    body: { lastReadMessageId },
  })
}

/** Chỉnh sửa nội dung tin nhắn. */
export async function editMessage(messageId: string, body: string): Promise<MessageResponse> {
  return request<MessageResponse>(`/messages/${messageId}`, {
    method: 'PATCH',
    body: { body },
  })
}

/** Thu hồi tin nhắn (soft delete). */
export async function revokeMessage(messageId: string): Promise<MessageResponse> {
  return request<MessageResponse>(`/messages/${messageId}`, {
    method: 'DELETE',
  })
}

