import { describe, expect, it } from 'bun:test'
import { buildDayGroupsFromMessages, mapMessageResponse } from './chat.mapper'
import type { MessageResponse } from '../types/chat.types'

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
})

