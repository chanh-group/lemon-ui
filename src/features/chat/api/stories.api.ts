import { isAuthBypass } from '@/config/env'
import { api } from '@/infrastructure/api/client'
import { MOCK_STORIES } from '../data/mockData'
import type { StoryEntry } from '../types/chat.types'

/* ------------------------------------------------------------------ */
/* Mock store — stories nằm trong session, tạo mới là push vào đây     */
/* ------------------------------------------------------------------ */

let storyStore: StoryEntry[] = [...MOCK_STORIES]

const delay = (ms = 400) => new Promise<void>((r) => setTimeout(r, ms))

/* ------------------------------------------------------------------ */
/* Payloads                                                            */
/* ------------------------------------------------------------------ */

export interface CreateMediaStoryPayload {
  mediaKind: 'photo' | 'gif' | 'sticker' | 'video'
  label: string
  captionText: string
}

export interface CreateTextStoryPayload {
  text: string
}

/* ------------------------------------------------------------------ */
/* API — khi hết bypass gọi axios `api` (envelope đã unwrap)             */
/* ------------------------------------------------------------------ */

/** Danh sách story hiển thị ở tab Stories. */
export async function listStories(): Promise<StoryEntry[]> {
  if (isAuthBypass()) {
    await delay(200)
    return storyStore.map((s) => ({ ...s }))
  }
  const res = await api.get<Array<{
    id: string
    caption?: string | null
    createdAt?: string | Date
    user?: { fullName?: string; username?: string }
    isOnline?: boolean
    hasViewed?: boolean
  }>>('/stories/feed')
  return res.data.map((story) => ({
    id: story.id,
    name: story.caption || story.user?.fullName || story.user?.username || 'Story',
    time: story.createdAt ? String(story.createdAt) : '',
    viewed: Boolean(story.hasViewed),
    online: Boolean(story.isOnline),
  }))
}

/** Đăng tin dạng văn bản — nền cố định, không chủ đề/không tùy chọn kiểu chữ. */
export async function createTextStory(payload: CreateTextStoryPayload): Promise<StoryEntry> {
  if (isAuthBypass()) {
    await delay()
    const entry: StoryEntry = {
      id: `story-${Date.now()}`,
      name: payload.text.trim().slice(0, 18),
      time: '',
      viewed: false,
      online: false,
      mine: true,
    }
    storyStore = [entry, ...storyStore]
    return { ...entry }
  }
  const res = await api.post<StoryEntry>('/stories/text', payload)
  return res.data
}

/** Đăng tin bằng ảnh / video (caption optional) — story chỉ còn loại media. */
export async function createMediaStory(payload: CreateMediaStoryPayload): Promise<StoryEntry> {
  if (isAuthBypass()) {
    await delay()
    const entry: StoryEntry = {
      id: `story-${Date.now()}`,
      name: payload.captionText.trim().slice(0, 18),
      time: '',
      viewed: false,
      online: false,
      mine: true,
    }
    storyStore = [entry, ...storyStore]
    return { ...entry }
  }
  const res = await api.post<StoryEntry>('/stories/media', payload)
  return res.data
}
