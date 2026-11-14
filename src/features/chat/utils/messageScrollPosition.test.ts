import { describe, expect, it } from 'bun:test'
import { getMessageScrollPosition, saveMessageScrollPosition } from './messageScrollPosition'

describe('message scroll positions', () => {
  it('keeps each conversation position across view unmounts', () => {
    const first = { kind: 'message', messageId: 'first-message', offset: -12 } as const
    const second = { kind: 'bottom' } as const

    saveMessageScrollPosition('conversation-a', first)
    saveMessageScrollPosition('conversation-b', second)

    expect(getMessageScrollPosition('conversation-a')).toEqual(first)
    expect(getMessageScrollPosition('conversation-b')).toEqual(second)
    expect(getMessageScrollPosition('conversation-c')).toBeUndefined()
  })
})
