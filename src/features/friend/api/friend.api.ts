import { api } from '@/infrastructure/api/client'
import { FRIENDS_PAGE_SIZE, FRIEND_REQUESTS_PAGE_SIZE } from '@/config/constants'
import type { ConversationResponse } from '@/features/conversation/types/conversation.types'
import type {
  ChatUser,
  FriendRequest,
  FriendRequestsPageResponse,
  UserSearchItem,
} from '../types/friend.types'
import type { CursorPage } from '@/types/common'

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
    params: { limit: FRIEND_REQUESTS_PAGE_SIZE },
  })
  return { incoming: res.data.incoming.items, outgoing: res.data.outgoing.items }
}

/** Danh sách bạn bè đã chấp nhận lời mời. */
export async function getFriends(): Promise<ChatUser[]> {
  const res = await api.get<CursorPage<ChatUser>>('/friends', {
    params: { limit: FRIENDS_PAGE_SIZE },
  })
  return res.data.items
}

/** Load every friend page when choosing a story audience; never treat a partial list as complete. */
export async function getAllStoryAudienceFriends(): Promise<ChatUser[]> {
  const friends: ChatUser[] = []
  const seen = new Set<string>()
  let cursor: string | undefined
  do {
    const res = await api.get<CursorPage<ChatUser>>('/friends', {
      params: { limit: FRIENDS_PAGE_SIZE, cursor },
    })
    friends.push(...res.data.items)
    if (!res.data.hasMore) break
    const next = res.data.nextCursor
    if (!next || seen.has(next)) throw new Error('Unable to load all friends')
    seen.add(next)
    cursor = next
  } while (cursor)
  return friends
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
