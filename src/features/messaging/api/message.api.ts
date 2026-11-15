import { api } from '@/infrastructure/api/client'
import type {
  MessageReactionItem,
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
