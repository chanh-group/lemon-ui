import type { CursorPage } from '@/types/common'

/** Các pane trong màn tạo chat — trạng thái điều hướng nội bộ. */
export type NewChatPane = 'main' | 'group' | 'username' | 'email' | 'requests'

/** Người dùng trong mạng lưới (bạn bè hoặc người lạ tìm được). */
export interface ChatUser {
  id: string
  name: string
  username: string
  email?: string
  avatarUrl?: string | null
}

/** Lời mời kết bạn — direction: 'incoming' (chờ mình chấp nhận) | 'outgoing' (chờ đối phương chấp nhận). */
export interface FriendRequest {
  id: string
  user: ChatUser
  direction: 'incoming' | 'outgoing'
  createdAt: string
}

export interface FriendRequestsPageResponse {
  incoming: CursorPage<FriendRequest>
  outgoing: CursorPage<FriendRequest>
}

export interface UserSearchItem {
  id: string
  name: string
  username: string
  avatarUrl?: string | null
}
