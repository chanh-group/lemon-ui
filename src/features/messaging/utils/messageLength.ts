import { MESSAGE_LENGTH_WARNING_THRESHOLD, MESSAGE_MAX_BODY_LENGTH } from '@/config/constants'

/**
 * Counts Unicode code points, matching LemonCore and PostgreSQL `char_length`.
 * It intentionally does not collapse grapheme clusters: the API contract is
 * based on code points, not rendered glyphs.
 */
export function countMessageCharacters(value: string): number {
  return Array.from(value).length
}

export function getMessageLengthState(value: string) {
  const count = countMessageCharacters(value)
  return {
    count,
    remaining: MESSAGE_MAX_BODY_LENGTH - count,
    isNearLimit: count >= MESSAGE_LENGTH_WARNING_THRESHOLD,
    isOverLimit: count > MESSAGE_MAX_BODY_LENGTH,
  }
}

export function isMessageWithinLimit(value: string): boolean {
  return !getMessageLengthState(value).isOverLimit
}
