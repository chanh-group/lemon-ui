import { isAuthBypass } from '@/config/env'
import { api } from '@/infrastructure/api/client'
import type {
  ChatUser,
  ConversationResponse,
  FriendRequest,
  MessageResponse,
  MessageTimelineResponse,
  SendMessageDto,
} from '../types/chat.types'

interface UserSearchResponse {
  id: string
  name: string
  username: string
  email: string
  avatarUrl?: string | null
}

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
/* Chat API — khi hết bypass gọi axios `api` (envelope đã unwrap)         */
/* ------------------------------------------------------------------ */

/** Tìm user gần đúng theo username. */
export async function findUserByUsername(username: string): Promise<ChatUser[]> {
  const normalized = username.trim().replace(/^@/, '')
  if (isAuthBypass()) {
    await delay()
    const query = normalized.toLowerCase()
    return DIRECTORY.filter((u) => u.username.toLowerCase().includes(query)).map((u) => ({ ...u }))
  }
  const res = await api.get<UserSearchResponse[]>('/users/search', { params: { q: normalized, field: 'username' } })
  return res.data.map((user) => ({ ...user, name: user.name || user.username }))
}

/** Tìm user gần đúng theo email. */
export async function findUserByEmail(email: string): Promise<ChatUser[]> {
  const normalized = email.trim().toLowerCase()
  if (isAuthBypass()) {
    await delay()
    return DIRECTORY.filter((u) => u.email.toLowerCase().includes(normalized)).map((u) => ({ ...u }))
  }
  const res = await api.get<UserSearchResponse[]>('/users/search', { params: { q: normalized, field: 'email' } })
  return res.data.map((user) => ({ ...user, name: user.name || user.username }))
}

/** Gửi lời mời kết bạn. */
export async function sendFriendRequest(userId: string): Promise<void> {
  if (isAuthBypass()) {
    await delay()
    const user = DIRECTORY.find((u) => u.id === userId)
    if (user) pendingRequests.push({ id: `fr-out-${userId}`, user: { ...user }, direction: 'outgoing', createdAt: Date.now() })
    return
  }
  await api.post('/friends/requests', { userId })
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
  const res = await api.get<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>('/friends/requests')
  return res.data
}

/** Chấp nhận lời mời kết bạn. */
export async function acceptFriendRequest(requestId: string): Promise<void> {
  if (isAuthBypass()) {
    await delay()
    const i = pendingRequests.findIndex((r) => r.id === requestId)
    if (i >= 0) pendingRequests.splice(i, 1)
    return
  }
  await api.post(`/friends/requests/${requestId}/accept`)
}

/** Từ chối lời mời kết bạn. */
export async function declineFriendRequest(requestId: string): Promise<void> {
  if (isAuthBypass()) {
    await delay()
    const i = pendingRequests.findIndex((r) => r.id === requestId)
    if (i >= 0) pendingRequests.splice(i, 1)
    return
  }
  await api.post(`/friends/requests/${requestId}/decline`)
}

/** Hủy lời mời mình đã gửi. */
export async function cancelFriendRequest(requestId: string): Promise<void> {
  if (isAuthBypass()) {
    await delay()
    const i = pendingRequests.findIndex((r) => r.id === requestId)
    if (i >= 0) pendingRequests.splice(i, 1)
    return
  }
  await api.delete(`/friends/requests/${requestId}`)
}

/** Xóa kết bạn. */
export async function removeFriend(friendId: string): Promise<void> {
  if (isAuthBypass()) {
    await delay()
    return
  }
  await api.delete(`/friends/${friendId}`)
}

/** Chặn người dùng. */
export async function blockUser(userId: string): Promise<void> {
  if (isAuthBypass()) {
    await delay()
    return
  }
  await api.post(`/users/${userId}/block`)
}

/** Tạo nhóm từ danh sách bạn bè đã chọn. */
export async function createGroup(payload: { name: string; memberIds: string[] }): Promise<{ id: string; name: string }> {
  if (isAuthBypass()) {
    await delay(500)
    return { id: `mock-group-${++groupSeq}`, name: payload.name }
  }
  const res = await api.post<{ id: string; name: string }>('/groups', payload)
  return res.data
}

/* ------------------------------------------------------------------ */
/* Direct 1-1 Conversation & Messages (docs/API_CHAT_1_1.md)         */
/* ------------------------------------------------------------------ */

/** Lấy danh sách hội thoại Inbox. */
export async function getConversations(limit = 20): Promise<ConversationResponse[]> {
  const res = await api.get<ConversationResponse[]>('/conversations', { params: { limit } })
  return res.data
}

/** Lấy thông tin chi tiết một cuộc hội thoại. */
export async function getConversationById(id: string): Promise<ConversationResponse> {
  const res = await api.get<ConversationResponse>(`/conversations/${id}`)
  return res.data
}

/** Tạo hoặc lấy cuộc hội thoại 1-1 với một user. */
export async function getOrCreateDirectConversation(targetUserId: string): Promise<ConversationResponse> {
  const res = await api.post<ConversationResponse>('/conversations/direct', { targetUserId })
  return res.data
}

/** Lấy lịch sử tin nhắn trong cuộc hội thoại (phân trang con trỏ). */
export async function getConversationMessages(
  conversationId: string,
  cursor?: string,
  limit = 30,
): Promise<MessageTimelineResponse> {
  const res = await api.get<MessageTimelineResponse>(`/conversations/${conversationId}/messages`, {
    params: { cursor, limit },
  })
  return res.data
}

/** Gửi tin nhắn mới vào cuộc hội thoại. */
export async function sendMessage(
  conversationId: string,
  payload: SendMessageDto,
): Promise<MessageResponse> {
  const res = await api.post<MessageResponse>(`/conversations/${conversationId}/messages`, payload)
  return res.data
}

/** Đánh dấu cuộc hội thoại đã đọc đến tin nhắn cụ thể. */
export async function markConversationRead(
  conversationId: string,
  lastReadMessageId: string,
): Promise<void> {
  await api.post(`/conversations/${conversationId}/read`, { lastReadMessageId })
}

/** Chỉnh sửa nội dung tin nhắn. */
export async function editMessage(messageId: string, body: string): Promise<MessageResponse> {
  const res = await api.patch<MessageResponse>(`/messages/${messageId}`, { body })
  return res.data
}

/** Thu hồi tin nhắn (soft delete). */
export async function revokeMessage(messageId: string): Promise<MessageResponse> {
  const res = await api.delete<MessageResponse>(`/messages/${messageId}`)
  return res.data
}
