import { isAuthBypass } from '@/config/env'
import { api } from '@/infrastructure/api/client'
import type { CursorPage } from '@/types/common'
import type { ConversationResponse } from '../types/conversation.types'

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
export async function getOrCreateDirectConversation(
  targetUserId: string,
): Promise<ConversationResponse> {
  const res = await api.post<ConversationResponse>('/conversations/direct', { targetUserId })
  return res.data
}
