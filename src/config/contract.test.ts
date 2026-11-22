// Core↔UI contract (issue #59). Mirrored by LemonCore/test/unit/contract.spec.ts — change both together.
import { describe, expect, it } from 'vitest'
import {
  AVATAR_MAX_BYTES,
  FULL_NAME_MAX_LENGTH,
  FULL_NAME_MIN_LENGTH,
  OTP_LENGTH,
  OTP_REGEX,
  PASSWORD_MIN_LENGTH,
  STORY_MAX_CAPTION_LENGTH,
  USER_BIO_MAX_LENGTH,
  USER_SEARCH_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from './constants'

describe('Core↔UI contract (issue #59)', () => {
  it('password min length matches Core', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8)
  })

  it('OTP is 6 digits', () => {
    expect(OTP_LENGTH).toBe(6)
    expect(OTP_REGEX.test('123456')).toBe(true)
    expect(OTP_REGEX.test('12345')).toBe(false)
    expect(OTP_REGEX.test('1234567')).toBe(false)
  })

  it('full name bounds match Core', () => {
    expect(FULL_NAME_MIN_LENGTH).toBe(2)
    expect(FULL_NAME_MAX_LENGTH).toBe(100)
  })

  it('username bounds match Core', () => {
    expect(USERNAME_MIN_LENGTH).toBe(3)
    expect(USERNAME_MAX_LENGTH).toBe(30)
  })

  it('bio max length matches Core', () => {
    expect(USER_BIO_MAX_LENGTH).toBe(500)
  })

  it('story caption max length matches Core', () => {
    expect(STORY_MAX_CAPTION_LENGTH).toBe(500)
  })

  it('avatar max bytes matches Core', () => {
    expect(AVATAR_MAX_BYTES).toBe(5 * 1024 * 1024)
  })

  it('user search min length matches Core', () => {
    expect(USER_SEARCH_MIN_LENGTH).toBe(2)
  })
})
