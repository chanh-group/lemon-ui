import { describe, expect, it } from 'bun:test'
import { correlateSentMessage, mergeMessagesByTime, reconnectCursor } from './useChatRealtime'
import type { MessageResponse } from '../types/chat.types'

function message(id: string, createdAt: string, body = id): MessageResponse {
  return {
    id,
    conversationId: 'conversation',
    senderId: 'sender',
    kind: 'TEXT',
    body,
    replyToId: null,
    createdAt,
    editedAt: null,
    deletedAt: null,
  }
}

describe('mergeMessagesByTime', () => {
  it('deduplicates by ID, keeps fresher data, and restores chronological order', () => {
    const result = mergeMessagesByTime(
      [message('2', '2026-11-01T00:02:00Z'), message('1', '2026-11-01T00:01:00Z')],
      [message('2', '2026-11-01T00:02:00Z', 'updated'), message('3', '2026-11-01T00:03:00Z')],
    )

    expect(result.map(({ id }) => id)).toEqual(['1', '2', '3'])
    expect(result[1].body).toBe('updated')
  })

  it('keeps a live update received while a reconnect request was in flight', () => {
    const fetched = message('1', '2026-11-01T00:01:00Z', 'before edit')
    const live = { ...fetched, body: 'after edit', editedAt: '2026-11-01T00:02:00Z' }
    expect(mergeMessagesByTime([fetched], [live])).toEqual([live])
  })
})

describe('reconnectCursor', () => {
  it('uses the newest server message in the loaded timeline, excluding optimistic IDs', () => {
    expect(
      reconnectCursor([
        {
          items: [
            message('a', '2026-11-01T00:01:00Z'),
            message('b', '2026-11-01T00:01:00Z'),
            message('temp-1', '2026-11-01T00:02:00Z'),
          ],
          hasMore: false,
        },
      ]),
    ).toBe('b')
    expect(reconnectCursor([])).toBeUndefined()
  })
})

describe('correlateSentMessage', () => {
  it('binds an optimistic message to the server ID before the broadcast', () => {
    const optimistic = { ...message('temp-1', '2026-11-01T00:00:00Z'), clientMsgId: 'client-1' }
    expect(correlateSentMessage([optimistic], 'server-1', 'client-1')).toEqual([
      { ...optimistic, id: 'server-1' },
    ])
  })

  it('removes the optimistic copy if the broadcast arrived first', () => {
    const optimistic = { ...message('temp-1', '2026-11-01T00:00:00Z'), clientMsgId: 'client-1' }
    const server = message('server-1', '2026-11-01T00:00:00Z')
    expect(correlateSentMessage([optimistic, server], 'server-1', 'client-1')).toEqual([
      { ...server, clientMsgId: 'client-1' },
    ])
  })
})
