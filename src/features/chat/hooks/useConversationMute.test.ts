import { beforeEach, describe, expect, it } from 'bun:test'
import { isConversationMuted } from './useConversationMute'

const storageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(globalThis, 'window', {
  value: {
    localStorage: storageMock,
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  },
  writable: true,
})
Object.defineProperty(globalThis, 'localStorage', {
  value: storageMock,
  writable: true,
})

describe('useConversationMute utility', () => {
  beforeEach(() => {
    storageMock.clear()
  })

  it('returns false when no conversation is muted', () => {
    expect(isConversationMuted('conv-1')).toBe(false)
  })

  it('correctly reads muted state from localStorage', () => {
    storageMock.setItem('lemon_muted_conversations', JSON.stringify(['conv-1', 'conv-2']))
    expect(isConversationMuted('conv-1')).toBe(true)
    expect(isConversationMuted('conv-2')).toBe(true)
    expect(isConversationMuted('conv-3')).toBe(false)
  })

  it('handles corrupted localStorage gracefully', () => {
    storageMock.setItem('lemon_muted_conversations', 'invalid-json')
    expect(isConversationMuted('conv-1')).toBe(false)
  })
})
