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
/* Chat API — Axios client unwraps the backend response envelope. */
/* ------------------------------------------------------------------ */

/** Tìm user gần đúng theo username. */
export async function findUserByUsername(username: string): Promise<ChatUser[]> {
  const normalized = username.trim().replace(/^@/, '')
  const res = await api.get<UserSearchResponse[]>('/users/search', { params: { q: normalized, field: 'username' } })
  return res.data.map((user) => ({ ...user, name: user.name || user.username }))
}

/** Tìm user gần đúng theo email. */
export async function findUserByEmail(email: string): Promise<ChatUser[]> {
  const normalized = email.trim().toLowerCase()
  const res = await api.get<UserSearchResponse[]>('/users/search', { params: { q: normalized, field: 'email' } })
  return res.data.map((user) => ({ ...user, name: user.name || user.username }))
}

/** Gửi lời mời kết bạn. */
export async function sendFriendRequest(userId: string): Promise<void> {
  await api.post('/friends/requests', { userId })
}

/** Danh sách lời mời:incoming chờ mình xử lý + outgoing chờ đối phương. */
export async function getFriendRequests(): Promise<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }> {
  const res = await api.get<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>('/friends/requests')
  return {
    incoming: res.data?.incoming ?? [],
    outgoing: res.data?.outgoing ?? [],
  }
}

/** Danh sách bạn bè đã chấp nhận lời mời. */
export async function getFriends(): Promise<ChatUser[]> {
  const res = await api.get<ChatUser[]>('/friends')
  return res.data
}

/** Chấp nhận lời mời kết bạn. */
export async function acceptFriendRequest(requestId: string): Promise<void> {
  await api.post(`/friends/requests/${requestId}/accept`)
}

/** Từ chối lời mời kết bạn. */
export async function declineFriendRequest(requestId: string): Promise<void> {
  await api.post(`/friends/requests/${requestId}/decline`)
}

/** Hủy lời mời mình đã gửi. */
export async function cancelFriendRequest(requestId: string): Promise<void> {
  await api.delete(`/friends/requests/${requestId}`)
}

/** Xóa kết bạn. */
export async function removeFriend(friendId: string): Promise<void> {
  await api.delete(`/friends/${friendId}`)
}

/** Chặn người dùng. */
export async function blockUser(userId: string): Promise<void> {
  await api.post(`/friends/${userId}/block`)
}

/** Tạo nhóm từ danh sách bạn bè đã chọn. */
export async function createGroup(payload: { name: string; memberIds: string[] }): Promise<{ id: string; name: string }> {
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
  after?: string,
): Promise<MessageTimelineResponse> {
  const res = await api.get<MessageTimelineResponse>(`/conversations/${conversationId}/messages`, {
    params: { cursor, limit, after },
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
