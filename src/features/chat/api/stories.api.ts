import { isAuthBypass } from '@/config/env'
import { api } from '@/infrastructure/api/client'
import { MOCK_STORIES } from '../data/mockData'
import type {
  StoryEntry,
  StoryReactionItem,
  StoryReactionType,
  StoryViewerItem,
} from '../types/chat.types'

/* ------------------------------------------------------------------ */
/* Backend Response Models                                             */
/* ------------------------------------------------------------------ */

export interface BackendStoryUser {
  id: string
  fullName: string
  avatarUrl?: string | null
}

export interface BackendStoryReactionSummary {
  reaction: string
  count: number
}

export interface BackendStoryResponse {
  id: string
  userId: string
  kind: 'TEXT' | 'MEDIA' | 'IMAGE' | 'VIDEO'
  caption?: string | null
  mediaUrl?: string | null
  background?: string | null
  createdAt: string
  expiresAt: string
  user: BackendStoryUser
  viewsCount?: number
  reactionsCount?: number
  viewerReaction?: string | null
  viewerHasViewed?: boolean
  reactionsSummary?: BackendStoryReactionSummary[]
  allowReplies?: boolean
  allowReactions?: boolean
  audienceMode?: 'ALL_FRIENDS' | 'CUSTOM' | 'EXCLUDE'
  myReactionKind?: 'REACTION' | 'LIKE' | null
}

export interface StoryReplyResponse {
  message: {
    id: string
    conversationId: string
    senderId: string
    content: string
    storyId: string
    storyPreview?: {
      id: string
      kind: 'TEXT' | 'MEDIA'
      caption?: string | null
      mediaUrl?: string | null
      background?: string | null
      authorName?: string | null
    } | null
    createdAt: string
  }
  conversationId: string
  recipientId: string
}

/* ------------------------------------------------------------------ */
/* Mock store — stories nằm trong session, tạo mới là push vào đây     */
/* ------------------------------------------------------------------ */

let storyStore: StoryEntry[] = MOCK_STORIES.map((s, index) => ({
  ...s,
  authorId: `user-${index + 1}`,
  kind: 'TEXT' as const,
  caption: s.name === 'Mai Anh' ? 'Cuối tuần rồi, đi chill thôi các bạn ơi! ☕✨' : undefined,
  reactionsCount: index === 0 ? 3 : 0,
  viewsCount: index === 0 ? 12 : 5,
  viewerReaction: null,
  reactionsSummary: index === 0 ? [{ reaction: '❤️', count: 2 }, { reaction: '🔥', count: 1 }] : [],
}))

const delay = (ms = 300) => new Promise<void>((r) => setTimeout(r, ms))

function formatRelativeTime(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime()
    const diffMinutes = Math.floor(diffMs / (60 * 1000))
    if (diffMinutes < 1) return 'Vừa xong'
    if (diffMinutes < 60) return `${diffMinutes} phút trước`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours} giờ trước`
    return 'Hôm qua'
  } catch {
    return 'Vừa xong'
  }
}

export function mapBackendStoryToEntry(item: BackendStoryResponse, currentUserId?: string): StoryEntry {
  const isMine = currentUserId ? item.userId === currentUserId : false
  return {
    id: item.id,
    name: item.user?.fullName || item.caption?.slice(0, 18) || 'Story',
    time: formatRelativeTime(item.createdAt),
    viewed: Boolean(item.viewerHasViewed),
    mine: isMine,
    online: true,
    authorId: item.userId,
    authorAvatar: item.user?.avatarUrl,
    kind: item.kind === 'TEXT' ? 'TEXT' : 'MEDIA',
    caption: item.caption,
    mediaUrl: item.mediaUrl,
    background: item.background,
    viewsCount: item.viewsCount ?? 0,
    reactionsCount: item.reactionsCount ?? 0,
    viewerReaction: item.viewerReaction ?? null,
    viewerHasViewed: item.viewerHasViewed ?? false,
    reactionsSummary: item.reactionsSummary,
    allowReplies: item.allowReplies ?? true,
    allowReactions: item.allowReactions ?? true,
    audienceMode: item.audienceMode ?? 'ALL_FRIENDS',
    myReactionKind: item.myReactionKind ?? null,
  }
}

/* ------------------------------------------------------------------ */
/* Payloads                                                            */
/* ------------------------------------------------------------------ */

export interface CreateMediaStoryPayload {
  mediaKind: 'photo' | 'gif' | 'sticker' | 'video'
  label: string
  captionText: string
  allowReplies?: boolean
  allowReactions?: boolean
  audienceMode?: 'ALL_FRIENDS' | 'CUSTOM' | 'EXCLUDE'
  audienceUserIds?: string[]
}

export interface CreateTextStoryPayload {
  text: string
  background?: string
  allowReplies?: boolean
  allowReactions?: boolean
  audienceMode?: 'ALL_FRIENDS' | 'CUSTOM' | 'EXCLUDE'
  audienceUserIds?: string[]
}

export interface CreateStoryDto {
  kind: 'TEXT' | 'MEDIA'
  caption?: string
  objectKey?: string
  background?: string
}

export interface ReactStoryPayload {
  reaction: StoryReactionType | string
}

export interface ReplyStoryPayload {
  content: string
}

/* ------------------------------------------------------------------ */
/* API functions                                                      */
/* ------------------------------------------------------------------ */

/** Danh sách story hiển thị ở tab Stories (feed bạn bè + story của mình). */
export async function listStories(currentUserId?: string): Promise<StoryEntry[]> {
  if (isAuthBypass()) {
    await delay(150)
    return storyStore.map((s) => ({ ...s }))
  }
  try {
    const res = await api.get<any[]>('/stories/feed')
    const raw = res.data ?? []
    const flattened: StoryEntry[] = []

    for (const group of raw) {
      if (group && typeof group === 'object' && 'stories' in group && Array.isArray(group.stories)) {
        for (const item of group.stories) {
          flattened.push({
            id: item.id,
            name: group.user?.fullName || item.caption?.slice(0, 18) || 'Story',
            time: formatRelativeTime(item.createdAt),
            viewed: Boolean(item.hasViewed),
            mine: currentUserId ? item.userId === currentUserId : false,
            online: true,
            authorId: item.userId,
            authorAvatar: group.user?.avatarUrl,
            kind: item.kind === 'TEXT' ? 'TEXT' : 'MEDIA',
            caption: item.caption,
            background: item.background,
            viewsCount: 0,
            reactionsCount: item.reactionsCount ?? 0,
            viewerReaction: item.myReaction ?? null,
            viewerHasViewed: Boolean(item.hasViewed),
            allowReplies: item.allowReplies ?? true,
            allowReactions: item.allowReactions ?? true,
            audienceMode: item.audienceMode ?? 'ALL_FRIENDS',
            myReactionKind: item.myReactionKind ?? null,
          })
        }
      } else {
        flattened.push(mapBackendStoryToEntry(group as BackendStoryResponse, currentUserId))
      }
    }
    return flattened
  } catch {
    const res = await api.get<BackendStoryResponse[]>('/stories')
    return (res.data ?? []).map((item) => mapBackendStoryToEntry(item, currentUserId))
  }

}

/** Đăng tin dạng văn bản — nền cố định, không chủ đề/không tùy chọn kiểu chữ. */
export async function createTextStory(payload: CreateTextStoryPayload): Promise<StoryEntry> {
  if (isAuthBypass()) {
    await delay()
    const entry: StoryEntry = {
      id: `story-${Date.now()}`,
      name: payload.text.trim().slice(0, 18),
      time: 'Vừa xong',
      viewed: false,
      online: false,
      mine: true,
      kind: 'TEXT',
      caption: payload.text.trim(),
      reactionsCount: 0,
      viewsCount: 0,
      viewerReaction: null,
      allowReplies: payload.allowReplies ?? true,
      allowReactions: payload.allowReactions ?? true,
      audienceMode: payload.audienceMode ?? 'ALL_FRIENDS',
    }
    storyStore = [entry, ...storyStore]
    return { ...entry }
  }
  const res = await api.post<BackendStoryResponse>('/stories', {
    kind: 'TEXT',
    caption: payload.text.trim(),
    background: payload.background,
    allowReplies: payload.allowReplies ?? true,
    allowReactions: payload.allowReactions ?? true,
    audienceMode: payload.audienceMode ?? 'ALL_FRIENDS',
    audienceUserIds: payload.audienceUserIds,
  })
  return mapBackendStoryToEntry(res.data)
}

/** Đăng tin bằng ảnh / video (caption optional) — story chỉ còn loại media. */
export async function createMediaStory(payload: CreateMediaStoryPayload): Promise<StoryEntry> {
  if (isAuthBypass()) {
    await delay()
    const entry: StoryEntry = {
      id: `story-${Date.now()}`,
      name: payload.captionText.trim().slice(0, 18) || payload.label,
      time: 'Vừa xong',
      viewed: false,
      online: false,
      mine: true,
      kind: 'MEDIA',
      caption: payload.captionText.trim() || undefined,
      reactionsCount: 0,
      viewsCount: 0,
      viewerReaction: null,
      allowReplies: payload.allowReplies ?? true,
      allowReactions: payload.allowReactions ?? true,
      audienceMode: payload.audienceMode ?? 'ALL_FRIENDS',
    }
    storyStore = [entry, ...storyStore]
    return { ...entry }
  }
  const res = await api.post<BackendStoryResponse>('/stories', {
    kind: payload.mediaKind === 'video' ? 'VIDEO' : 'IMAGE',
    caption: payload.captionText.trim() || undefined,
    objectKey: payload.label,
    allowReplies: payload.allowReplies ?? true,
    allowReactions: payload.allowReactions ?? true,
    audienceMode: payload.audienceMode ?? 'ALL_FRIENDS',
    audienceUserIds: payload.audienceUserIds,
  })
  return mapBackendStoryToEntry(res.data)
}

/** Thả cảm xúc vào Story (❤️, 🔥, 😂, 😮, 😢, 👏, 👍). */
export async function reactStory(storyId: string, reaction: StoryReactionType | string): Promise<{ success: boolean; reaction: string }> {
  if (isAuthBypass()) {
    await delay(100)
    storyStore = storyStore.map((s) => {
      if (s.id !== storyId) return s
      const hadReaction = Boolean(s.viewerReaction)
      const countDiff = hadReaction ? 0 : 1
      return {
        ...s,
        viewerReaction: reaction,
        reactionsCount: (s.reactionsCount ?? 0) + countDiff,
      }
    })
    return { success: true, reaction }
  }
  const res = await api.post<{ id: string; emoji?: string; reaction?: string }>(`/stories/${storyId}/react`, {
    emoji: reaction,
    reaction,
  })
  return { success: true, reaction: res.data?.emoji ?? res.data?.reaction ?? reaction }
}

/** Gỡ cảm xúc khỏi Story. */
export async function unreactStory(storyId: string): Promise<{ success: boolean }> {
  if (isAuthBypass()) {
    await delay(100)
    storyStore = storyStore.map((s) => {
      if (s.id !== storyId) return s
      const hadReaction = Boolean(s.viewerReaction)
      return {
        ...s,
        viewerReaction: null,
        reactionsCount: Math.max(0, (s.reactionsCount ?? 0) - (hadReaction ? 1 : 0)),
      }
    })
    return { success: true }
  }
  await api.delete(`/stories/${storyId}/react`)
  return { success: true }
}

/** Danh sách cảm xúc đã thả của một Story. */
export async function getStoryReactions(storyId: string): Promise<StoryReactionItem[]> {
  if (isAuthBypass()) {
    await delay(100)
    const story = storyStore.find((s) => s.id === storyId)
    if (!story || !story.viewerReaction) return []
    return [
      {
        id: `react-${storyId}`,
        storyId,
        userId: 'me',
        reaction: story.viewerReaction,
        createdAt: new Date().toISOString(),
        user: {
          id: 'me',
          fullName: 'Bạn',
          avatarUrl: null,
        },
      },
    ]
  }
  const res = await api.get<StoryReactionItem[]>(`/stories/${storyId}/reactions`)
  return res.data ?? []
}

/** Phản hồi (reply) story bằng tin nhắn, tự động gửi vào hội thoại 1:1 với tác giả. */
export async function replyStory(storyId: string, payload: ReplyStoryPayload): Promise<StoryReplyResponse> {
  if (isAuthBypass()) {
    await delay(200)
    const story = storyStore.find((s) => s.id === storyId)
    return {
      message: {
        id: `msg-${Date.now()}`,
        conversationId: 'mai-anh',
        senderId: 'me',
        content: payload.content,
        storyId,
        storyPreview: {
          id: storyId,
          kind: story?.kind === 'MEDIA' ? 'MEDIA' : 'TEXT',
          caption: story?.caption ?? story?.name ?? null,
          mediaUrl: story?.mediaUrl ?? null,
          background: story?.background ?? null,
          authorName: story?.name ?? null,
        },
        createdAt: new Date().toISOString(),
      },
      conversationId: 'mai-anh',
      recipientId: story?.authorId ?? 'recipient',
    }
  }
  const res = await api.post<StoryReplyResponse>(`/stories/${storyId}/reply`, {
    body: payload.content,
    content: payload.content,
  })
  return res.data
}

/** Đánh dấu người dùng hiện tại đã xem Story. */
export async function viewStory(storyId: string): Promise<{ success: boolean }> {
  if (isAuthBypass()) {
    storyStore = storyStore.map((s) => (s.id === storyId ? { ...s, viewed: true, viewerHasViewed: true } : s))
    return { success: true }
  }
  await api.post(`/stories/${storyId}/view`)
  return { success: true }
}

/** Danh sách người đã xem Story (chỉ chủ sở hữu story xem được). */
export async function getStoryViews(storyId: string): Promise<StoryViewerItem[]> {
  if (isAuthBypass()) {
    await delay(100)
    return []
  }
  try {
    const res = await api.get<StoryViewerItem[]>(`/stories/${storyId}/viewers`)
    return res.data ?? []
  } catch {
    const res = await api.get<StoryViewerItem[]>(`/stories/${storyId}/views`)
    return res.data ?? []
  }
}


/** Thích story im lặng (silent like - chỉ hiện ở viewer list, không gửi tin nhắn DM). */
export async function likeStory(storyId: string): Promise<{ success: boolean; reaction: string; kind: 'LIKE' }> {
  if (isAuthBypass()) {
    await delay(100)
    storyStore = storyStore.map((s) => {
      if (s.id !== storyId) return s
      const hadReaction = Boolean(s.viewerReaction)
      return {
        ...s,
        viewerReaction: '❤️',
        reactionsCount: (s.reactionsCount ?? 0) + (hadReaction ? 0 : 1),
      }
    })
    return { success: true, reaction: '❤️', kind: 'LIKE' }
  }
  const res = await api.post<{ storyId: string; emoji: string; kind: 'LIKE' }>(`/stories/${storyId}/like`)
  return { success: true, reaction: res.data?.emoji ?? '❤️', kind: 'LIKE' }
}

/** Bỏ thích story im lặng. */
export async function unlikeStory(storyId: string): Promise<{ success: boolean }> {
  if (isAuthBypass()) {
    return unreactStory(storyId)
  }
  await api.delete(`/stories/${storyId}/like`)
  return { success: true }
}

export interface UserStorySettings {
  viewedReceiptsEnabled: boolean
  archiveEnabled: boolean
  archiveDurationSecs: number | null
}

/** Lấy cài đặt story của người dùng (view receipts, archive). */
export async function getStorySettings(): Promise<UserStorySettings> {
  if (isAuthBypass()) {
    return {
      viewedReceiptsEnabled: true,
      archiveEnabled: true,
      archiveDurationSecs: null,
    }
  }
  const res = await api.get<UserStorySettings>('/stories/settings')
  return res.data
}

/** Cập nhật cài đặt story của người dùng. */
export async function updateStorySettings(
  payload: Partial<UserStorySettings>,
): Promise<UserStorySettings> {
  if (isAuthBypass()) {
    return {
      viewedReceiptsEnabled: payload.viewedReceiptsEnabled ?? true,
      archiveEnabled: payload.archiveEnabled ?? true,
      archiveDurationSecs: payload.archiveDurationSecs ?? null,
    }
  }
  const res = await api.patch<UserStorySettings>('/stories/settings', payload)
  return res.data
}

/** Ẩn (mute) story của tác giả khác. */
export async function muteAuthor(authorId: string): Promise<{ success: boolean }> {
  if (isAuthBypass()) {
    storyStore = storyStore.filter((s) => s.authorId !== authorId)
    return { success: true }
  }
  await api.post(`/stories/mutes/${authorId}`)
  return { success: true }
}

/** Bỏ ẩn (unmute) story của tác giả khác. */
export async function unmuteAuthor(authorId: string): Promise<{ success: boolean }> {
  if (isAuthBypass()) {
    return { success: true }
  }
  await api.delete(`/stories/mutes/${authorId}`)
  return { success: true }
}

/** Lấy danh sách ID các tác giả bị ẩn story. */
export async function getMutedAuthors(): Promise<string[]> {
  if (isAuthBypass()) {
    return []
  }
  const res = await api.get<string[]>('/stories/mutes')
  return res.data ?? []
}

/** Lấy kho lưu trữ tin (archive) của người dùng hiện tại. */
export async function getArchivedStories(cursor?: string): Promise<{ items: StoryEntry[]; nextCursor: string | null }> {
  if (isAuthBypass()) {
    return { items: [], nextCursor: null }
  }
  const params = new URLSearchParams()
  if (cursor) params.append('cursor', cursor)
  const res = await api.get<any>(`/stories/archive?${params.toString()}`)
  const raw = res.data?.items ?? res.data ?? []
  return {
    items: raw.map((item: any) => mapBackendStoryToEntry(item)),
    nextCursor: res.data?.nextCursor ?? null,
  }
}
