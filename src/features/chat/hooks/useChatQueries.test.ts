import { describe, expect, it } from 'bun:test'
import { rollbackOptimisticConversationPreview } from './useChatQueries'
import type { ConversationResponse } from '../types/chat.types'

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
