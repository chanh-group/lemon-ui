import { describe, expect, it } from 'bun:test'
import { mergeMessagesByTime } from './useChatRealtime'
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
})
