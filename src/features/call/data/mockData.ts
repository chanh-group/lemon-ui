import type { CallEntry } from '@/features/call/types/call.types'

export const MOCK_CALLS: CallEntry[] = [
  {
    id: 'call-1',
    name: 'Mai Anh',
    direction: 'missed',
    kind: 'video',
    time: 'Hôm nay, 20:15',
    online: true,
  },
  {
    id: 'call-2',
    name: 'Anh Khoa',
    direction: 'incoming',
    kind: 'voice',
    time: 'Hôm nay, 13:02',
    online: true,
  },
  {
    id: 'call-3',
    name: 'Mẹ',
    direction: 'outgoing',
    kind: 'voice',
    time: 'Hôm qua, 19:44',
    online: false,
  },
  {
    id: 'call-4',
    name: 'Thu Phương',
    direction: 'incoming',
    kind: 'video',
    time: 'Hôm qua, 12:20',
    online: false,
  },
  {
    id: 'call-5',
    name: 'Chị Linh',
    direction: 'outgoing',
    kind: 'voice',
    time: 'Thứ 3, 09:10',
    online: true,
  },
  {
    id: 'call-6',
    name: 'Đức Minh',
    direction: 'missed',
    kind: 'voice',
    time: 'Thứ 2, 22:05',
    online: false,
  },
]
