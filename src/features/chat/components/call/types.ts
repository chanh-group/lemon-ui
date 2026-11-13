import type { CallEndReason, CallMedia, CallPhase } from '@/config/constants'

export interface CallPreview {
  conversationId?: string
  media: CallMedia
  peerName: string
  peerAvatar?: string | null
  isGroup: boolean
}

/** Dữ liệu tối thiểu truyền qua navigation state để màn gọi hiện ngay khi API chưa trả về. */
export interface CallRouteState {
  peerName?: string
  peerAvatar?: string | null
  /** Nơi quay về khi đóng màn gọi. */
  from?: string
}

export type { CallEndReason, CallMedia, CallPhase }
