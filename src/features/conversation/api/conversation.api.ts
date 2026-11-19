import { isAuthBypass } from '@/config/env'
import { api } from '@/infrastructure/api/client'
import type { CursorPage } from '@/types/common'
import type { ConversationMemberResponse, ConversationResponse } from '../types/conversation.types'

/** Lấy danh sách hội thoại Inbox. */
export async function getConversations(limit = 20): Promise<ConversationResponse[]> {
  if (isAuthBypass()) return []
  const res = await api.get<CursorPage<ConversationResponse>>('/conversations', {
    params: { limit },
  })
  return res.data.items
}

/** Lấy thông tin chi tiết một cuộc hội thoại. */
export async function getConversationById(
  id: string,
  signal?: AbortSignal,
): Promise<ConversationResponse> {
  const res = await api.get<ConversationResponse>(`/conversations/${id}`, { signal })
  return res.data
}

/** Tạo hoặc lấy cuộc hội thoại 1-1 với một user. */
export async function getOrCreateDirectConversation(
  targetUserId: string,
): Promise<ConversationResponse> {
  const res = await api.post<ConversationResponse>('/conversations/direct', { targetUserId })
  return res.data
}

export async function createGroup(payload: {
  title: string
  memberIds: string[]
  clientRequestId: string
}): Promise<ConversationResponse> {
  const res = await api.post<ConversationResponse>('/conversations/groups', payload)
  return res.data
}

export async function uploadGroupAvatar(
  conversationId: string,
  file: File,
): Promise<ConversationResponse> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await api.post<ConversationResponse>(
    `/files/group-avatars/${conversationId}/upload`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return res.data
}

export async function getGroupMembers(
  conversationId: string,
  signal?: AbortSignal,
): Promise<ConversationMemberResponse[]> {
  const res = await api.get<ConversationMemberResponse[]>(
    `/conversations/${conversationId}/members`,
    { signal },
  )
  return res.data
}

export async function updateGroup(
  conversationId: string,
  title: string,
): Promise<ConversationResponse> {
  const res = await api.patch<ConversationResponse>(`/conversations/${conversationId}`, { title })
  return res.data
}

export async function addGroupMembers(
  conversationId: string,
  memberIds: string[],
): Promise<ConversationResponse> {
  const res = await api.post<ConversationResponse>(`/conversations/${conversationId}/members`, {
    memberIds,
  })
  return res.data
}

export async function removeGroupMember(conversationId: string, userId: string): Promise<void> {
  await api.delete(`/conversations/${conversationId}/members/${userId}`)
}

export async function updateGroupMemberRole(
  conversationId: string,
  userId: string,
  role: 'ADMIN' | 'MEMBER',
): Promise<void> {
  await api.patch(`/conversations/${conversationId}/members/${userId}/role`, { role })
}

export async function leaveGroup(conversationId: string): Promise<{ closed: boolean }> {
  const res = await api.post<{ closed: boolean }>(`/conversations/${conversationId}/leave`)
  return res.data
}

export async function disbandGroup(conversationId: string): Promise<void> {
  await api.delete(`/conversations/${conversationId}`)
}
