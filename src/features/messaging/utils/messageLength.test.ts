import { describe, expect, it } from 'vitest'
import {
  countMessageCharacters,
  getMessageLengthState,
  isMessageWithinLimit,
} from './messageLength'

describe('messageLength', () => {
  it('counts Unicode code points instead of UTF-16 code units', () => {
    expect(countMessageCharacters('a😀e\u0301\n')).toBe(5)
    expect('a😀e\u0301\n'.length).toBe(6)
  })

  it('accepts exactly 4000 code points and rejects 4001', () => {
    expect(isMessageWithinLimit('😀'.repeat(4000))).toBe(true)
    expect(isMessageWithinLimit('😀'.repeat(4001))).toBe(false)
  })

  it('reports the warning and error states at the contract boundaries', () => {
    expect(getMessageLengthState('a'.repeat(3599))).toMatchObject({
      count: 3599,
      isNearLimit: false,
      isOverLimit: false,
    })
    expect(getMessageLengthState('a'.repeat(3600))).toMatchObject({
      count: 3600,
      isNearLimit: true,
      isOverLimit: false,
    })
    expect(getMessageLengthState('a'.repeat(4001))).toMatchObject({
      count: 4001,
      isNearLimit: true,
      isOverLimit: true,
    })
  })
})
