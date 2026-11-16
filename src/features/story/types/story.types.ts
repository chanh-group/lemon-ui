export type StoryReactionType = '👍' | '❤️' | '🥰' | '😆' | '😂' | '😮' | '😢' | '😡' | '🔥' | '👏'

export interface StoryPreview {
  id: string
  kind: 'TEXT' | 'MEDIA' | 'IMAGE' | 'VIDEO' | 'text' | 'media'
  caption?: string | null
  mediaUrl?: string | null
  background?: string | null
  authorName?: string | null
}

export interface StoryReactionItem {
  id: string
  storyId: string
  userId: string
  reaction: string
  kind: 'REACTION' | 'LIKE'
  createdAt: string
  user: {
    id: string
    fullName: string
    avatarUrl?: string | null
  }
}

/** Một lượt xem story — khớp `StoryViewerResponse` của backend. */
export interface StoryViewerItem {
  viewedAt: string
  reaction?: string | null
  reactionKind?: 'REACTION' | 'LIKE' | null
  user: {
    id: string
    username?: string
    fullName: string
    avatarUrl?: string | null
  }
}

export interface StoryEntry {
  id: string
  name: string
  time: string
  createdAt?: string
  viewed: boolean
  /** Tin của chính ta — dành riêng cho hàng "Tin của bạn". */
  mine?: boolean
  online: boolean
  authorId?: string
  authorAvatar?: string | null
  kind?: 'text' | 'media' | 'TEXT' | 'MEDIA'
  caption?: string | null
  mediaUrl?: string | null
  mediaType?: 'image' | 'video'
  archived?: boolean
  background?: string | null
  viewsCount?: number
  reactionsCount?: number
  viewerReaction?: string | null
  viewerHasViewed?: boolean
  reactionsSummary?: { reaction: string; count: number }[]
  allowReplies?: boolean
  allowReactions?: boolean
  audienceMode?: 'ALL_FRIENDS' | 'CUSTOM' | 'EXCLUDE'
  myReactionKind?: 'REACTION' | 'LIKE' | null
}
