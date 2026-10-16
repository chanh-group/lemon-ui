import type { CallEntry, Conversation, DayGroup, StoryEntry } from '../types'

/**
 * Mock data dựng UI khi backend chat chưa sẵn sàng.
 * Toàn bộ nội dung dưới đây là dữ liệu mẫu (không phải dữ liệu thật).
 */
export const MOCK_ME = 'Minh Anh'

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'roommates',
    name: 'Bạn cùng phòng',
    preview: 'Thu: 7h tối nay lẩu nhé, tớ qua đón',
    previewKind: 'text',
    time: '2p',
    unread: 2,
    online: true,
    isGroup: true,
    members: 'Thu, Hải, Minh Anh',
  },
  {
    id: 'mai-anh',
    name: 'Mai Anh',
    preview: 'Đã gửi một ảnh',
    previewKind: 'photo',
    time: '1p',
    unread: 1,
    online: true,
    isGroup: false,
    lastActive: 'Đang hoạt động',
  },
  {
    id: 'family',
    name: 'Gia đình',
    preview: 'Mẹ: Cuối tuần về quê, bố đặt vé xe rồi nhé',
    previewKind: 'text',
    time: '10p',
    unread: 4,
    online: false,
    isGroup: true,
    members: 'Bố, Mẹ, Chị Lan, Minh Anh',
  },
  {
    id: 'khoa',
    name: 'Anh Khoa',
    preview: 'Đã gửi một ảnh GIF',
    previewKind: 'gif',
    time: '14:30',
    unread: 0,
    online: true,
    isGroup: false,
    lastActive: 'Đang hoạt động',
  },
  {
    id: 'phuong',
    name: 'Thu Phương',
    preview: 'Quán Ý ở số 21 ngon lắm, hôm nào đi thử',
    previewKind: 'text',
    time: '18p',
    unread: 0,
    online: false,
    isGroup: false,
    lastActive: 'Hoạt động 25 phút trước',
  },
  {
    id: 'duc',
    name: 'Đức Minh',
    preview: 'Đã gửi một nhãn dán',
    previewKind: 'sticker',
    time: 'Thứ 3',
    unread: 0,
    online: false,
    isGroup: false,
    lastActive: 'Hoạt động hôm qua',
  },
  {
    id: 'linh',
    name: 'Chị Linh',
    preview: 'Em gửi file báo cáo qua mail rồi nhé',
    previewKind: 'text',
    time: 'Thứ 3',
    unread: 0,
    online: true,
    isGroup: false,
    lastActive: 'Đang hoạt động',
  },
  {
    id: 'clb-chay',
    name: 'CLB Chạy bộ',
    preview: 'Hùng: Sáng chủ nhật 5h30 hồ Gươm nhé mọi người',
    previewKind: 'text',
    time: 'Thứ 2',
    unread: 0,
    online: false,
    isGroup: true,
    members: '12 thành viên',
  },
]

export const MOCK_THREADS: Record<string, DayGroup[]> = {
  roommates: [
    {
      date: 'Hôm nay',
      messages: [
        { id: 'r1', fromMe: false, sender: 'Thu', text: 'Tối nay mọi người rảnh không?', kind: 'text', time: '19:02' },
        { id: 'r2', fromMe: false, sender: 'Hải', text: 'Tớ rảnh nè, cả tuần chưa tụ tập rồi', kind: 'text', time: '19:05' },
        { id: 'r3', fromMe: true, text: 'Đi ăn lẩu nhé? Quán hôm bữa ngon mà rẻ', kind: 'text', time: '19:06', status: 'read' },
        { id: 'r4', fromMe: false, sender: 'Thu', text: 'Chốt! 7h tối nay, tớ qua đón nhé?', kind: 'text', time: '19:08', reactions: ['👍', '🔥'] },
      ],
    },
  ],
  'mai-anh': [
    {
      date: 'Hôm nay',
      messages: [
        { id: 'm1', fromMe: false, text: 'Ê, xem ảnh quán cafe mới mở gần nhà tớ nè', kind: 'text', time: '20:40' },
        { id: 'm2', fromMe: false, kind: 'photo', photoLabel: 'Ảnh · Quán chanh vàng, view siêu chill', time: '20:40' },
        { id: 'm3', fromMe: true, text: 'Nhìn chill thật, cuối tuần đi thử không? 😍', kind: 'text', time: '20:42', status: 'read' },
      ],
    },
  ],
  family: [
    {
      date: 'Hôm qua',
      messages: [
        { id: 'f1', fromMe: false, sender: 'Mẹ', text: 'Cuối tuần này cả nhà về quê nhé', kind: 'text', time: '18:12' },
        { id: 'f2', fromMe: false, sender: 'Bố', text: 'Bố đặt vé xe rồi, sáng thứ 7 khởi hành', kind: 'text', time: '18:15' },
      ],
    },
    {
      date: 'Hôm nay',
      messages: [
        { id: 'f3', fromMe: false, sender: 'Chị Lan', text: 'Em mang ít chanh nhà mình lên nhé', kind: 'text', time: '09:20' },
        { id: 'f4', fromMe: true, text: 'Dạ, để em chuẩn bị thêm ít quà cho ông bà nữa', kind: 'text', time: '09:25', status: 'sent' },
      ],
    },
  ],
  khoa: [
    {
      date: 'Hôm nay',
      messages: [
        { id: 'k1', fromMe: false, text: 'Deadline dời sang thứ 6 rồi, thở phào 😮‍💨', kind: 'text', time: '14:28' },
        { id: 'k2', fromMe: false, kind: 'gif', photoLabel: 'GIF · Mừng rớt nước mắt', time: '14:30' },
        { id: 'k3', fromMe: true, text: 'Ngon! Vậy tối nay review code thoải mái rồi', kind: 'text', time: '14:32', status: 'read' },
      ],
    },
  ],
  phuong: [
    {
      date: 'Hôm nay',
      messages: [
        { id: 'p1', fromMe: false, text: 'Quán Ý ở số 21 ngon lắm, hôm nào đi thử', kind: 'text', time: '17:40' },
        { id: 'p2', fromMe: true, text: 'Tớ biết quán đó, mì cua siêu đỉnh 🍝', kind: 'text', time: '17:55', status: 'read' },
        { id: 'p3', fromMe: false, text: 'Cuối tuần này luôn không? Tớ đặt bàn trước cho', kind: 'text', time: '18:02' },
      ],
    },
  ],
  duc: [
    {
      date: 'Thứ 3',
      messages: [
        { id: 'd1', fromMe: false, kind: 'sticker', photoLabel: 'Nhãn dán · Chanh vẫy tay', time: '11:15' },
        { id: 'd2', fromMe: true, text: 'Cute vậy 😄 sticker này ở bộ nào thế?', kind: 'text', time: '11:20', status: 'read' },
      ],
    },
  ],
  linh: [
    {
      date: 'Thứ 3',
      messages: [
        { id: 'l1', fromMe: false, text: 'Em gửi file báo cáo qua mail rồi nhé', kind: 'text', time: '10:05' },
        { id: 'l2', fromMe: true, text: 'Dạ chị, để em kiểm tra rồi phản hồi trong sáng nay ạ', kind: 'text', time: '10:09', status: 'read' },
      ],
    },
  ],
  'clb-chay': [
    {
      date: 'Thứ 2',
      messages: [
        { id: 'c1', fromMe: false, sender: 'Hùng', text: 'Sáng chủ nhật 5h30 hồ Gươm nhé mọi người 🏃', kind: 'text', time: '21:10' },
        { id: 'c2', fromMe: true, text: 'Em tham gia ạ, ai chạy 5km cùng em không?', kind: 'text', time: '21:15', status: 'read' },
        { id: 'c3', fromMe: false, sender: 'Ngọc', text: 'Chị chạy cùng nè, nhớ mang nước nhé', kind: 'text', time: '21:18' },
      ],
    },
  ],
}

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

/** Màu nền avatar suy ra từ tên — giữ trong tông chanh / trung tính, không neon. */
const AVATAR_BG = ['#F1E9A8', '#DDF4A7', '#EFEAD6', '#F6DFA8', '#E4EED2', '#FBF3C4']

export function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_BG[hash % AVATAR_BG.length]
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
