import { describe, expect, it } from 'bun:test'
import { buildMessageGroups, newestVisibleIncoming } from './MessageList'
import type { ChatMessage } from '../../types/chat.types'

describe('newestVisibleIncoming', () => {
  it('selects the newest incoming message whose bottom is visible', () => {
    expect(
      newestVisibleIncoming(
        [
          { id: 'above', fromMe: false, bottom: 0 },
          { id: 'seen', fromMe: false, bottom: 50 },
          { id: 'outgoing', fromMe: true, bottom: 60 },
          { id: 'temp-1', fromMe: false, bottom: 70 },
          { id: 'below', fromMe: false, bottom: 101 },
        ],
        0,
        100,
      ),
    ).toBe('seen')
  })
})

describe('MessageList buildMessageGroups & interaction data', () => {
  it('groups consecutive messages from the same sender within 5 minutes', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        fromMe: true,
        text: 'Hi there',
        kind: 'text',
        time: '10:00',
        createdAt: '2026-11-09T10:00:00Z',
      },
      {
        id: 'msg-2',
        fromMe: true,
        text: 'How are you?',
        kind: 'text',
        time: '10:02',
        createdAt: '2026-11-09T10:02:00Z',
      },
    ]

    const groups = buildMessageGroups(messages)
    expect(groups).toHaveLength(1)
    expect(groups[0].fromMe).toBe(true)
    expect(groups[0].messages).toHaveLength(2)
  })

  it('splits group when time difference between consecutive messages exceeds 5 minutes', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        fromMe: true,
        text: 'First message',
        kind: 'text',
        time: '10:00',
        createdAt: '2026-11-09T10:00:00Z',
      },
      {
        id: 'msg-2',
        fromMe: true,
        text: 'Delayed message',
        kind: 'text',
        time: '10:10',
        createdAt: '2026-11-09T10:10:00Z',
      },
    ]

    const groups = buildMessageGroups(messages)
    expect(groups).toHaveLength(2)
    expect(groups[0].messages[0].id).toBe('msg-1')
    expect(groups[1].messages[0].id).toBe('msg-2')
  })

  it('splits group when sender changes between me and partner', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        fromMe: false,
        sender: 'Alice',
        text: 'Hello!',
        kind: 'text',
        time: '10:00',
        createdAt: '2026-11-09T10:00:00Z',
      },
      {
        id: 'msg-2',
        fromMe: true,
        text: 'Hi Alice!',
        kind: 'text',
        time: '10:01',
        createdAt: '2026-11-09T10:01:00Z',
      },
    ]

    const groups = buildMessageGroups(messages)
    expect(groups).toHaveLength(2)
    expect(groups[0].fromMe).toBe(false)
    expect(groups[0].sender).toBe('Alice')
    expect(groups[1].fromMe).toBe(true)
  })

  it('preserves isForwarded flag and reactions in grouped messages', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-fwd',
        fromMe: true,
        text: 'Forwarded content',
        kind: 'text',
        time: '11:00',
        isForwarded: true,
        reactions: [
          { emoji: '👍', count: 3, userIds: ['u1', 'u2', 'u3'] },
          { emoji: '❤️', count: 1, userIds: ['u1'] },
        ],
        createdAt: '2026-11-09T11:00:00Z',
      },
    ]

    const groups = buildMessageGroups(messages)
    expect(groups).toHaveLength(1)
    const msg = groups[0].messages[0]
    expect(msg.isForwarded).toBe(true)
    expect(msg.reactions).toBeDefined()
    expect(msg.reactions).toHaveLength(2)
    expect(msg.reactions![0].emoji).toBe('👍')
    expect(msg.reactions![0].count).toBe(3)
    expect(msg.reactions![1].emoji).toBe('❤️')
  })

  it('preserves status sending and clientMsgId for optimistic UI messages', () => {
    const messages: ChatMessage[] = [
      {
        id: 'temp-client-123',
        clientMsgId: 'client-123',
        fromMe: true,
        text: 'Optimistic message sending...',
        kind: 'text',
        time: '11:05',
        status: 'sending',
        createdAt: '2026-11-09T11:05:00Z',
      },
    ]

    const groups = buildMessageGroups(messages)
    expect(groups).toHaveLength(1)
    const msg = groups[0].messages[0]
    expect(msg.id).toBe('temp-client-123')
    expect(msg.clientMsgId).toBe('client-123')
    expect(msg.status).toBe('sending')
  })
})
