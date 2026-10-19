import { isAuthBypass } from '@/config/env'
import { request } from '@/lib/api'
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
/* API — khi hết bypass sẽ gọi thẳng request() như auth                */
/* ------------------------------------------------------------------ */

/** Danh sách story hiển thị ở tab Stories. */
export async function listStories(): Promise<StoryEntry[]> {
  if (isAuthBypass()) {
    await delay(200)
    return storyStore.map((s) => ({ ...s }))
  }
  try {
    const raw = await request<Array<{
      id: string
      caption?: string | null
      createdAt?: string | Date
      user?: { fullName?: string; username?: string }
      isOnline?: boolean
      hasViewed?: boolean
    }>>('/stories/feed')
    return (raw || []).map((s) => ({
      id: s.id,
      name: s.caption || s.user?.fullName || s.user?.username || 'Story',
      time: s.createdAt ? String(s.createdAt) : '',
      viewed: Boolean(s.hasViewed),
      online: Boolean(s.isOnline),
    }))
  } catch {
    return []
  }
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
  return request<StoryEntry>('/stories/text', { method: 'POST', body: payload })
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
  return request<StoryEntry>('/stories/media', { method: 'POST', body: payload })
}
