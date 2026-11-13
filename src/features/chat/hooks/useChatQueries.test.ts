import { describe, expect, it } from 'bun:test'
import { rollbackOptimisticConversationPreview, upsertOptimisticMessage, windowHasLatest } from './useChatQueries'
import type { ConversationResponse, MessageResponse } from '../types/chat.types'

const previousConversation: ConversationResponse = {
  id: 'conversation-1',
  kind: 'DIRECT',
  partner: {
    id: 'user-1',
    username: 'user',
    fullName: 'User',
    avatarUrl: null,
    isOnline: false,
  },
  lastMessagePreview: 'older message',
  lastMessageSenderId: 'user-1',
  lastMessageAt: '2026-01-01T10:00:00Z',
  unreadCount: 0,
  createdAt: '2026-01-01T09:00:00Z',
}

describe('rollbackOptimisticConversationPreview', () => {
  it('keeps a newer realtime update instead of restoring a stale snapshot', () => {
    const current = [
      {
        ...previousConversation,
        lastMessagePreview: 'incoming message',
        lastMessageSenderId: 'user-1',
        lastMessageAt: '2026-01-01T10:02:00Z',
        unreadCount: 1,
      },
    ]

    expect(
      rollbackOptimisticConversationPreview(
        current,
        [previousConversation],
        'conversation-1',
        '2026-01-01T10:01:00Z',
      ),
    ).toEqual(current)
  })

  it('restores the previous preview when the failed optimistic preview is still current', () => {
    const optimistic = {
      ...previousConversation,
      lastMessagePreview: 'my unsent message',
      lastMessageSenderId: 'me',
      lastMessageAt: '2026-01-01T10:01:00Z',
    }

    expect(
      rollbackOptimisticConversationPreview(
        [optimistic],
        [previousConversation],
        'conversation-1',
        optimistic.lastMessageAt,
      ),
    ).toEqual([previousConversation])
  })
})

describe('windowHasLatest', () => {
  it('distinguishes the initial or completed newer page from an older window', () => {
    const page = { items: [], hasMore: false }
    expect(windowHasLatest(undefined)).toBe(false)
    expect(windowHasLatest({ pages: [page], pageParams: [{}] })).toBe(true)
    expect(windowHasLatest({ pages: [page], pageParams: [{ cursor: 'old' }] })).toBe(false)
    expect(windowHasLatest({ pages: [page], pageParams: [{ after: 'old' }] })).toBe(true)
    expect(windowHasLatest({ pages: [{ ...page, hasMore: true }], pageParams: [{ after: 'old' }] })).toBe(false)
  })
})

describe('upsertOptimisticMessage', () => {
  it('reuses an uncertain message and its retry data rather than appending a duplicate', () => {
    const message: MessageResponse = {
      id: 'temp-key', conversationId: 'c', senderId: 'me', kind: 'TEXT', body: 'hi',
      clientMsgId: 'key', sendState: 'uncertain', retryPayload: { clientMsgId: 'key', body: 'hi' },
      replyToId: null, createdAt: '2026-01-01T00:00:00Z', editedAt: null, deletedAt: null,
    }
    expect(upsertOptimisticMessage([message], message)).toEqual([{ ...message, sendState: undefined }])
  })
})
