import { isAuthBypass } from '@/config/env'
import { api } from '@/infrastructure/api/client'
import type { ChatUser, FriendRequest } from '../types/chat.types'

interface UserSearchResponse {
  id: string
  name: string
  username: string
  email: string
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
  return res.data
}

/** Tìm user gần đúng theo email. */
export async function findUserByEmail(email: string): Promise<ChatUser[]> {
  const normalized = email.trim().toLowerCase()
  if (isAuthBypass()) {
    await delay()
    return DIRECTORY.filter((u) => u.email.toLowerCase().includes(normalized)).map((u) => ({ ...u }))
  }
  const res = await api.get<UserSearchResponse[]>('/users/search', { params: { q: normalized, field: 'email' } })
  return res.data
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
