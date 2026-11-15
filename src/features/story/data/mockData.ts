import type { StoryEntry } from '@/features/story/types/story.types'

export const MOCK_STORIES: StoryEntry[] = [
  { id: 's1', name: 'Mai Anh', time: '12 phút trước', viewed: false, online: true },
  { id: 's2', name: 'Anh Khoa', time: '40 phút trước', viewed: false, online: true },
  { id: 's3', name: 'Thu Phương', time: '2 giờ trước', viewed: false, online: false },
  { id: 's4', name: 'Chị Linh', time: '5 giờ trước', viewed: true, online: true },
  { id: 's5', name: 'Đức Minh', time: 'Hôm qua', viewed: true, online: false },
  { id: 's6', name: 'CLB Chạy bộ', time: 'Hôm qua', viewed: true, online: false },
]
