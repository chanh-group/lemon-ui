import { describe, expect, it } from 'bun:test'
import { visibleLiveMessages } from './ChatShell'
import type { MessageResponse } from '../types/chat.types'

function message(id: string, createdAt: string): MessageResponse {
  return {
    id,
    conversationId: 'conversation',
    senderId: 'sender',
    kind: 'TEXT',
    body: id,
    replyToId: null,
    createdAt,
    editedAt: null,
    deletedAt: null,
  }
}

describe('visibleLiveMessages', () => {
  const old = message('old', '2026-01-01T00:00:00.000Z')
  const newest = message('newest', '2026-01-03T00:00:00.000Z')
  const live = message('live', '2026-01-04T00:00:00.000Z')

  it('does not join realtime messages onto a window with missing newer pages', () => {
    expect(visibleLiveMessages([old], [live], false)).toEqual([])
  })

  it('hides cached live messages older than the loaded latest window', () => {
    expect(visibleLiveMessages([newest], [old, live], true)).toEqual([live])
  })

  it('keeps optimistic messages when the latest window is loaded', () => {
    const optimistic = message('temp-1', '2025-12-01T00:00:00.000Z')
    expect(visibleLiveMessages([newest], [optimistic], true)).toEqual([optimistic])
  })
})
