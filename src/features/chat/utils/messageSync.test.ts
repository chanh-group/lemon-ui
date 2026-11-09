import { describe, expect, it } from 'bun:test'
import { fetchMissedMessages } from './messageSync'
import type { MessageResponse, MessageTimelineResponse } from '../types/chat.types'

function page(ids: string[], nextCursor?: string): MessageTimelineResponse {
  return {
    items: ids.map((id): MessageResponse => ({
      id,
      conversationId: 'conversation',
      senderId: 'sender',
      kind: 'TEXT',
      body: id,
      replyToId: null,
      createdAt: '2026-11-01T00:00:00Z',
      editedAt: null,
      deletedAt: null,
    })),
    hasMore: Boolean(nextCursor),
    nextCursor,
  }
}

describe('fetchMissedMessages', () => {
  it('fetches every page after reconnect until the server has no cursor', async () => {
    const cursors: string[] = []
    const result = await fetchMissedMessages('last-known', async (cursor) => {
      cursors.push(cursor)
      if (cursor === 'last-known') return page(['1', '2'], '2')
      if (cursor === '2') return page(['3'], '3')
      return page(['4'])
    })

    expect(cursors).toEqual(['last-known', '2', '3'])
    expect(result.map(({ id }) => id)).toEqual(['1', '2', '3', '4'])
  })
})
