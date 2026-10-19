import type { CallEntry, StoryEntry } from '../types/chat.types'

export const MOCK_CALLS: CallEntry[] = [
  { id: 'call-1', name: 'Mai Anh', direction: 'missed', kind: 'video', time: 'Hôm nay, 20:15', online: true },
  { id: 'call-2', name: 'Anh Khoa', direction: 'incoming', kind: 'voice', time: 'Hôm nay, 13:02', online: true },
  { id: 'call-3', name: 'Mẹ', direction: 'outgoing', kind: 'voice', time: 'Hôm qua, 19:44', online: false },
  { id: 'call-4', name: 'Thu Phương', direction: 'incoming', kind: 'video', time: 'Hôm qua, 12:20', online: false },
  { id: 'call-5', name: 'Chị Linh', direction: 'outgoing', kind: 'voice', time: 'Thứ 3, 09:10', online: true },
  { id: 'call-6', name: 'Đức Minh', direction: 'missed', kind: 'voice', time: 'Thứ 2, 22:05', online: false },
]

export const MOCK_STORIES: StoryEntry[] = [
  { id: 's1', name: 'Mai Anh', time: '12 phút trước', viewed: false, online: true },
  { id: 's2', name: 'Anh Khoa', time: '40 phút trước', viewed: false, online: true },
  { id: 's3', name: 'Thu Phương', time: '2 giờ trước', viewed: false, online: false },
  { id: 's4', name: 'Chị Linh', time: '5 giờ trước', viewed: true, online: true },
  { id: 's5', name: 'Đức Minh', time: 'Hôm qua', viewed: true, online: false },
  { id: 's6', name: 'CLB Chạy bộ', time: 'Hôm qua', viewed: true, online: false },
]

const AVATAR_BG = ['#F1E9A8', '#DDF4A7', '#EFEAD6', '#F6DFA8', '#E4EED2', '#FBF3C4']

export function avatarColor(name?: string | null): string {
  const safeName = (name || 'User').trim()
  let hash = 0
  for (let i = 0; i < safeName.length; i++) hash = (hash * 31 + safeName.charCodeAt(i)) >>> 0
  return AVATAR_BG[hash % AVATAR_BG.length]
}

export function initials(name?: string | null): string {
  const safeName = (name || 'U').trim()
  if (!safeName) return 'U'
  const parts = safeName.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
