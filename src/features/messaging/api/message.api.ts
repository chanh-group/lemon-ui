import { api } from '@/infrastructure/api/client'
import type {
  MessageReactionItem,
  MessageReplyTarget,
  MessageResponse,
  MessageTimelineResponse,
  SendMessageDto,
} from '../types/message.types'

/** Lấy lịch sử tin nhắn trong cuộc hội thoại (phân trang con trỏ). */
export async function getConversationMessages(
  conversationId: string,
  cursor?: string,
  limit = 30,
  after?: string,
  signal?: AbortSignal,
): Promise<MessageTimelineResponse> {
  const res = await api.get<MessageTimelineResponse>(`/conversations/${conversationId}/messages`, {
    params: { cursor, limit, after },
    signal,
  })
  return res.data
}

/** Lấy cửa sổ tin nhắn xung quanh một tin cụ thể (cho jump-to-reply). */
export async function getMessageWindow(
  conversationId: string,
  messageId: string,
  limit = 30,
  signal?: AbortSignal,
): Promise<MessageTimelineResponse & { hasMoreNewer: boolean }> {
  const res = await api.get<MessageTimelineResponse & { hasMoreNewer: boolean }>(
    `/conversations/${conversationId}/messages/${messageId}/window`,
    { params: { limit }, signal },
  )
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

/** Ẩn tin nhắn ở tài khoản của người thao tác, không ảnh hưởng người khác. */
export async function deleteMessageForMe(messageId: string): Promise<void> {
  await api.delete(`/messages/${messageId}/for-me`)
}

/** Thả / toggle cảm xúc cho tin nhắn */
export async function reactToMessage(
  messageId: string,
  emoji: string,
): Promise<{ messageId: string; reactions: MessageReactionItem[] }> {
  const res = await api.post<{ messageId: string; reactions: MessageReactionItem[] }>(
    `/messages/${messageId}/react`,
    { emoji },
  )
  return res.data
}

/** Lấy thông tin reply target được ủy quyền cho tin nhắn cụ thể. */
export async function getReplyTarget(
  conversationId: string,
  messageId: string,
  signal?: AbortSignal,
): Promise<MessageReplyTarget> {
  const res = await api.get<MessageReplyTarget>(
    `/conversations/${conversationId}/messages/${messageId}/reply-target`,
    { signal },
  )
  return res.data
}
