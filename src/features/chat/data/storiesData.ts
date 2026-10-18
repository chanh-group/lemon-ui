import type { TFunction } from 'i18next'
import type { StoryEntry } from '../types/chat.types'

/** Nền cố định cho tin văn bản — không còn chọn chủ đề. */
export const TEXT_STORY_BG = 'from-lime-300 via-emerald-400 to-teal-500'

/** Thời gian hiển thị — '' trong mock đặt tin mới nghĩa là "Bây giờ". */
export function storyTime(story: StoryEntry, nowLabel: string): string {
  return story.time || nowLabel
}

/** Tên hiển thị của tin — tin không caption fallback nhãn trung tính (i18n). */
export function storyDisplayName(story: StoryEntry, t: TFunction): string {
  return story.name || t('chat.unnamedStory')
}
