import { describe, expect, it } from 'vitest'
import { clearConversationDraft, getConversationDraft, setConversationDraft } from './draftStore'

describe('draftStore', () => {
  it('stores, retrieves, and clears drafts per conversation', () => {
    expect(getConversationDraft('conv-1')).toBe('')

    setConversationDraft('conv-1', 'Hello friend')
    expect(getConversationDraft('conv-1')).toBe('Hello friend')
    expect(getConversationDraft('conv-2')).toBe('')

    setConversationDraft('conv-2', 'Hi team')
    expect(getConversationDraft('conv-1')).toBe('Hello friend')
    expect(getConversationDraft('conv-2')).toBe('Hi team')

    clearConversationDraft('conv-1')
    expect(getConversationDraft('conv-1')).toBe('')
    expect(getConversationDraft('conv-2')).toBe('Hi team')

    // Empty/whitespace draft auto-clears
    setConversationDraft('conv-2', '   ')
    expect(getConversationDraft('conv-2')).toBe('')
  })
})
