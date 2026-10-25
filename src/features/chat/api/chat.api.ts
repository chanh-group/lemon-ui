import { api } from '@/infrastructure/api/client'
import { isAuthBypass } from '@/config/env'
import type { ChatUser, CursorPage, ConversationResponse, FriendRequest, FriendRequestsPageResponse, MessageResponse, MessageTimelineResponse, SendMessageDto, UserSearchItem } from '../types/chat.types'

/* ------------------------------------------------------------------ */
/* Chat API — Axios client unwraps the backend response envelope. */
/* ------------------------------------------------------------------ */

/** Tìm user gần đúng theo username. */
export async function findUserByUsername(username: string): Promise<ChatUser[]> {
  const normalized = username.trim().replace(/^@/, '')
  const res = await api.get<CursorPage<UserSearchItem>>('/users/search', {
    params: { q: normalized, field: 'username' },
  })
  return res.data.items
}

/** Tìm user gần đúng theo email. */
export async function findUserByEmail(email: string): Promise<ChatUser[]> {
  const normalized = email.trim().toLowerCase()
  const res = await api.get<CursorPage<UserSearchItem>>('/users/search', {
    params: { q: normalized, field: 'email' },
  })
  return res.data.items
}

/** Gửi lời mời kết bạn. */
export async function sendFriendRequest(userId: string): Promise<void> {
  await api.post('/friends/requests', { userId })
}

/** Danh sách lời mời:incoming chờ mình xử lý + outgoing chờ đối phương. */
export async function getFriendRequests(): Promise<{
  incoming: FriendRequest[]
  outgoing: FriendRequest[]
}> {
  const res = await api.get<FriendRequestsPageResponse>('/friends/requests', {
    params: { limit: 50 },
  })
  return {
    incoming: res.data.incoming.items,
    outgoing: res.data.outgoing.items,
  }
}

/** Danh sách bạn bè đã chấp nhận lời mời. */
export async function getFriends(): Promise<ChatUser[]> {
  const res = await api.get<CursorPage<ChatUser>>('/friends', { params: { limit: 50 } })
  return res.data.items
}

/** Chấp nhận lời mời kết bạn. */
export async function acceptFriendRequest(requestId: string): Promise<ConversationResponse> {
  const res = await api.post<ConversationResponse>(`/friends/requests/${requestId}/accept`)
  return res.data
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
  if (isAuthBypass()) return []
  const res = await api.get<CursorPage<ConversationResponse>>('/conversations', {
    params: { limit },
  })
  return res.data.items
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
export async function getConversationMessages(conversationId: string, cursor?: string, limit = 30, after?: string): Promise<MessageTimelineResponse> {
  const res = await api.get<MessageTimelineResponse>(`/conversations/${conversationId}/messages`, {
    params: { cursor, limit, after },
  })
  return res.data
}

/** Gửi tin nhắn mới vào cuộc hội thoại. */
export async function sendMessage(conversationId: string, payload: SendMessageDto): Promise<MessageResponse> {
  const res = await api.post<MessageResponse>(`/conversations/${conversationId}/messages`, payload)
  return res.data
}

/** Đánh dấu cuộc hội thoại đã đọc đến tin nhắn cụ thể. */
export async function markConversationRead(conversationId: string, lastReadMessageId: string): Promise<void> {
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

/* ------------------------------------------------------------------ */
/* File & Media Upload (Cloudflare R2 / S3)                           */
/* ------------------------------------------------------------------ */

export interface PresignFileRequest {
  kind: 'STORY_IMAGE' | 'STORY_VIDEO' | 'CHAT_IMAGE' | 'CHAT_VIDEO' | 'CHAT_AUDIO' | 'CHAT_FILE'
  sizeBytes: number
  mimeType: string
  fileName?: string
  conversationId?: string
}

export interface PresignFileResponse {
  uploadUrl: string
  objectKey: string
}

/** Cấp Presigned URL để upload trực tiếp lên Cloudflare R2. */
export async function presignFile(payload: PresignFileRequest): Promise<PresignFileResponse> {
  const res = await api.post<PresignFileResponse>('/files/presign', payload)
  return res.data
}

/** Upload binary trực tiếp lên R2 thông qua presigned URL. */
export async function uploadBinaryToUrl(
  uploadUrl: string,
  file: Blob | File,
  mimeType: string,
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType,
    },
    body: file,
  })
  if (!response.ok) {
    throw new Error(`Upload lên máy chủ lưu trữ thất bại (${response.status})`)
  }
}
