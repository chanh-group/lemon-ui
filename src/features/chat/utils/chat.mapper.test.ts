import { describe, expect, it } from 'bun:test'
import {
  buildDayGroupsFromMessages,
  getConversationPreview,
  getShortName,
  mapConversationResponse,
  mapMessageResponse,
} from './chat.mapper'
import type { Conversation, ConversationResponse, MessageResponse } from '../types/chat.types'
import vi from '@/locales/vi.json'
import en from '@/locales/en.json'

function makeMockT(lang: 'vi' | 'en') {
  const dict = lang === 'vi' ? (vi.chat as Record<string, string>) : (en.chat as Record<string, string>)
  return (key: string, options?: Record<string, unknown>) => {
    const k = key.replace(/^chat\./, '')
    let val = dict[k] || key
    if (options) {
      for (const [prop, v] of Object.entries(options)) {
        val = val.replace(`{{${prop}}}`, String(v))
      }
    }
    return val
  }
}

describe('chat.mapper', () => {
  it('maps an image attachment message correctly', () => {
    const raw: MessageResponse = {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'user-me',
      body: 'Check this image',
      kind: 'IMAGE',
      replyToId: null,
      editedAt: null,
      deletedAt: null,
      attachments: [
        {
          id: 'att-1',
          fileName: 'photo.png',
          sizeBytes: 1024,
          mimeType: 'image/png',
          previewUrl: 'https://r2/photo.png',
          downloadUrl: 'https://r2/photo.png?dl=1',
          kind: 'IMAGE',
        },
      ],
      createdAt: '2026-10-25T10:00:00Z',
    }

    const mapped = mapMessageResponse(raw, 'user-me')
    expect(mapped.id).toBe('msg-1')
    expect(mapped.fromMe).toBe(true)
    expect(mapped.text).toBe('Check this image')
    expect(mapped.kind).toBe('photo')
    expect(mapped.attachments?.length).toBe(1)
    expect(mapped.photoLabel).toBe('photo.png')
    expect(mapped.status).toBe('sent')
  })

  it('maps a file attachment message for another sender', () => {
    const raw: MessageResponse = {
      id: 'msg-2',
      conversationId: 'conv-1',
      senderId: 'user-other',
      body: 'Here is the report',
      kind: 'FILE',
      replyToId: null,
      editedAt: null,
      deletedAt: null,
      attachments: [
        {
          id: 'att-2',
          fileName: 'report.pdf',
          sizeBytes: 2048,
          mimeType: 'application/pdf',
          previewUrl: 'https://r2/report.pdf',
          downloadUrl: 'https://r2/report.pdf?dl=1',
          kind: 'FILE',
        },
      ],
      createdAt: '2026-10-25T10:05:00Z',
    }

    const mapped = mapMessageResponse(raw, 'user-me')
    expect(mapped.fromMe).toBe(false)
    expect(mapped.kind).toBe('file')
    expect(mapped.photoLabel).toBe('report.pdf')
    expect(mapped.status).toBeUndefined()
  })

  it('maps revoked message with fallback text', () => {
    const raw: MessageResponse = {
      id: 'msg-3',
      conversationId: 'conv-1',
      senderId: 'user-me',
      body: 'Secret message',
      kind: 'TEXT',
      replyToId: null,
      editedAt: null,
      createdAt: '2026-10-25T10:10:00Z',
      deletedAt: '2026-10-25T10:15:00Z',
    }

    const mapped = mapMessageResponse(raw, 'user-me')
    expect(mapped.text).toBe('Tin nhắn đã bị thu hồi')
    expect(mapped.deletedAt).toBe('2026-10-25T10:15:00Z')
  })

  it('groups messages by day correctly', () => {
    const messages = [
      {
        id: '1',
        fromMe: true,
        text: 'Morning',
        kind: 'text' as const,
        time: '09:00',
        createdAt: '2026-10-25T09:00:00.000Z',
      },
      {
        id: '2',
        fromMe: false,
        text: 'Hello',
        kind: 'text' as const,
        time: '09:05',
        createdAt: '2026-10-25T09:05:00.000Z',
      },
    ]

    const groups = buildDayGroupsFromMessages(messages)
    expect(groups.length).toBe(1)
    expect(groups[0].messages.length).toBe(2)
  })

  it('maps conversation partner avatar correctly', () => {
    const raw: ConversationResponse = {
      id: 'conv-1',
      kind: 'DIRECT',
      createdAt: '2026-11-09T10:00:00Z',
      lastMessageAt: '2026-11-09T10:30:00Z',
      lastMessagePreview: 'Xin chào',
      unreadCount: 2,
      partner: {
        id: 'user-partner',
        username: 'lemon_friend',
        fullName: 'Lemon Friend',
        avatarUrl: 'https://images.example.com/avatar.jpg',
        isOnline: true,
      },
    }

    const mapped = mapConversationResponse(raw)
    expect(mapped.id).toBe('conv-1')
    expect(mapped.name).toBe('Lemon Friend')
    expect(mapped.partnerAvatar).toBe('https://images.example.com/avatar.jpg')
    expect(mapped.online).toBe(true)
    expect(mapped.unread).toBe(2)
  })

  it('maps conversation when partner has null avatar', () => {
    const raw: ConversationResponse = {
      id: 'conv-2',
      kind: 'DIRECT',
      createdAt: '2026-11-09T10:00:00Z',
      partner: {
        id: 'user-partner-2',
        username: 'no_avatar_user',
        fullName: 'No Avatar',
        avatarUrl: null,
      },
    }

    const mapped = mapConversationResponse(raw)
    expect(mapped.partnerAvatar).toBeNull()
    expect(mapped.name).toBe('No Avatar')
  })

  it('preserves the revoked marker so each locale can translate it', () => {
    const raw: ConversationResponse = {
      id: 'conv-revoked',
      kind: 'DIRECT',
      createdAt: '2026-11-09T10:00:00Z',
      lastMessagePreview: '[message-revoked]',
      unreadCount: 0,
    }
    const mapped = mapConversationResponse(raw)
    const preview = getConversationPreview({
      conversation: mapped,
      currentUserId: 'user-me',
      lang: 'en',
      t: makeMockT('en'),
    })

    expect(mapped.preview).toBe('[message-revoked]')
    expect(preview.text).toBe('This message was unsent')
  })

  it('maps reactions and isForwarded flag correctly', () => {
    const raw: MessageResponse = {
      id: 'msg-fwd',
      conversationId: 'conv-1',
      senderId: 'user-me',
      body: 'Forwarded text',
      kind: 'TEXT',
      replyToId: null,
      editedAt: null,
      deletedAt: null,
      isForwarded: true,
      reactions: [
        { emoji: '❤️', count: 2, userIds: ['user-me', 'user-other'] },
        { emoji: '👍', count: 1, userIds: ['user-other'] },
      ],
      createdAt: '2026-11-09T10:00:00Z',
    }

    const mapped = mapMessageResponse(raw, 'user-me')
    expect(mapped.isForwarded).toBe(true)
    expect(mapped.reactions).toHaveLength(2)
    expect(mapped.reactions![0].emoji).toBe('❤️')
    expect(mapped.reactions![0].count).toBe(2)
  })

  describe('getShortName', () => {
    it('extracts given name in Vietnamese (last word)', () => {
      expect(getShortName('Nguyễn Hiệu', 'vi')).toBe('Hiệu')
      expect(getShortName('Phạm Lan Nhi', 'vi')).toBe('Nhi')
      expect(getShortName('Nam Pham', 'vi')).toBe('Pham')
      expect(getShortName('Hiệu', 'vi')).toBe('Hiệu')
    })

    it('extracts first name in English (first word)', () => {
      expect(getShortName('John Smith', 'en')).toBe('John')
      expect(getShortName('Alice', 'en')).toBe('Alice')
    })

    it('handles empty or null safely', () => {
      expect(getShortName('', 'vi')).toBe('')
      expect(getShortName(null, 'vi')).toBe('')
    })
  })

  describe('getConversationPreview', () => {
    const tVi = makeMockT('vi')
    const tEn = makeMockT('en')

    const baseConv: Conversation = {
      id: 'c1',
      name: 'Nguyễn Hiệu',
      preview: 'Hello',
      previewKind: 'text',
      time: '18:40',
      unread: 0,
      online: true,
      isGroup: false,
      partnerId: 'user-partner',
      lastMessageSenderId: 'user-partner',
    }

    it('Rule 1: shows "{count} tin nhắn mới", bold and blue dot when unread > 0 (VI)', () => {
      const res = getConversationPreview({
        conversation: { ...baseConv, unread: 29 },
        currentUserId: 'user-me',
        lang: 'vi',
        t: tVi,
      })
      expect(res.text).toBe('29 tin nhắn mới')
      expect(res.isBold).toBe(true)
      expect(res.showBlueDot).toBe(true)
    })

    it('Rule 1: shows "{count} new messages", bold and blue dot when unread > 0 (EN)', () => {
      const res1 = getConversationPreview({
        conversation: { ...baseConv, unread: 1 },
        currentUserId: 'user-me',
        lang: 'en',
        t: tEn,
      })
      expect(res1.text).toBe('1 new message')
      expect(res1.isBold).toBe(true)
      expect(res1.showBlueDot).toBe(true)

      const res29 = getConversationPreview({
        conversation: { ...baseConv, unread: 29 },
        currentUserId: 'user-me',
        lang: 'en',
        t: tEn,
      })
      expect(res29.text).toBe('29 new messages')
      expect(res29.isBold).toBe(true)
      expect(res29.showBlueDot).toBe(true)
    })

    it('Rule 1: shows normal message text, muted and no blue dot when unread === 0 from partner', () => {
      const res = getConversationPreview({
        conversation: {
          ...baseConv,
          unread: 0,
          preview: 'Ừm, cho ra túi cầm cho dễ',
          lastMessageSenderId: 'user-partner',
        },
        currentUserId: 'user-me',
        lang: 'vi',
        t: tVi,
      })
      expect(res.text).toBe('Ừm, cho ra túi cầm cho dễ')
      expect(res.isBold).toBe(false)
      expect(res.showBlueDot).toBe(false)
    })

    it('Rule 2: shows "Bạn: ..." when last sender was me (VI)', () => {
      const res = getConversationPreview({
        conversation: {
          ...baseConv,
          unread: 0,
          preview: 'Hicc',
          lastMessageSenderId: 'user-me',
        },
        currentUserId: 'user-me',
        lang: 'vi',
        t: tVi,
      })
      expect(res.text).toBe('Bạn: Hicc')
      expect(res.isBold).toBe(false)
      expect(res.showBlueDot).toBe(false)
    })

    it('Rule 2: shows "You: ..." when last sender was me (EN)', () => {
      const res = getConversationPreview({
        conversation: {
          ...baseConv,
          unread: 0,
          preview: 'Hello there',
          lastMessageSenderId: 'user-me',
        },
        currentUserId: 'user-me',
        lang: 'en',
        t: tEn,
      })
      expect(res.text).toBe('You: Hello there')
      expect(res.isBold).toBe(false)
      expect(res.showBlueDot).toBe(false)
    })

    it('Rule 3: shows "Bạn đã gửi một file đính kèm." when me sent attachment (VI & EN)', () => {
      const resVi = getConversationPreview({
        conversation: {
          ...baseConv,
          unread: 0,
          preview: '[attachment]',
          lastMessageSenderId: 'user-me',
        },
        currentUserId: 'user-me',
        lang: 'vi',
        t: tVi,
      })
      expect(resVi.text).toBe('Bạn đã gửi một file đính kèm.')

      const resEn = getConversationPreview({
        conversation: {
          ...baseConv,
          unread: 0,
          preview: '[attachment]',
          lastMessageSenderId: 'user-me',
        },
        currentUserId: 'user-me',
        lang: 'en',
        t: tEn,
      })
      expect(resEn.text).toBe('You sent an attachment.')
    })

    it('Rule 3: shows "[Name] đã gửi một file đính kèm." when partner sent attachment (VI & EN)', () => {
      const resVi = getConversationPreview({
        conversation: {
          ...baseConv,
          name: 'Nguyễn Hiệu',
          unread: 0,
          preview: '[attachment]',
          lastMessageSenderId: 'user-partner',
        },
        currentUserId: 'user-me',
        lang: 'vi',
        t: tVi,
      })
      expect(resVi.text).toBe('Hiệu đã gửi một file đính kèm.')

      const resEn = getConversationPreview({
        conversation: {
          ...baseConv,
          name: 'John Smith',
          unread: 0,
          preview: '[attachment]',
          lastMessageSenderId: 'user-partner',
        },
        currentUserId: 'user-me',
        lang: 'en',
        t: tEn,
      })
      expect(resEn.text).toBe('John sent an attachment.')
    })

    it('handles revoked message', () => {
      const res = getConversationPreview({
        conversation: {
          ...baseConv,
          unread: 0,
          preview: '[message-revoked]',
        },
        currentUserId: 'user-me',
        lang: 'vi',
        t: tVi,
      })
      expect(res.text).toBe('Tin nhắn đã bị thu hồi')
    })
  })
})
