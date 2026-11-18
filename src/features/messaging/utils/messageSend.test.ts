import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clearAllPendingMessagePreviews,
  registerPendingMessagePreviews,
  releaseConversationMessagePreviews,
  resolveSendMessageKind,
  retryUncertainSend,
} from './messageSend'
import { ApiError } from '@/infrastructure/api/errors'
import type { MessageAttachmentInput } from '@/features/messaging/types/message.types'

const image: MessageAttachmentInput = {
  objectKey: 'image',
  fileName: 'image.png',
  mimeType: 'image/png',
  sizeBytes: 1,
  kind: 'IMAGE',
}

afterEach(() => clearAllPendingMessagePreviews())

describe('pending message preview ownership', () => {
  it('releases only the removed conversation and then clears the rest on logout', () => {
    const revoke = vi.fn()
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke })
    registerPendingMessagePreviews('group-a', 'client-1', [{ previewUrl: 'blob:a' }])
    registerPendingMessagePreviews('group-b', 'client-2', [{ previewUrl: 'blob:b' }])

    releaseConversationMessagePreviews('group-a')
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:a')
    clearAllPendingMessagePreviews()
    expect(revoke).toHaveBeenCalledWith('blob:b')
    expect(revoke).toHaveBeenCalledTimes(2)
  })
})

describe('resolveSendMessageKind', () => {
  it('uses TEXT when a file message has a caption', () => {
    expect(resolveSendMessageKind('caption', 'IMAGE', [image])).toBe('TEXT')
  })

  it('uses TEXT for mixed attachment kinds', () => {
    expect(
      resolveSendMessageKind(undefined, undefined, [
        image,
        {
          ...image,
          objectKey: 'video',
          fileName: 'video.mp4',
          mimeType: 'video/mp4',
          kind: 'VIDEO',
        },
      ]),
    ).toBe('TEXT')
  })

  it('uses the attachment kind for a single uncaptained attachment', () => {
    expect(resolveSendMessageKind(undefined, undefined, [image])).toBe('IMAGE')
  })
})
describe('retryUncertainSend', () => {
  it('retries a network failure with the same send operation', async () => {
    let attempts = 0
    expect(
      await retryUncertainSend(async () => {
        if (++attempts === 1) throw new ApiError('NETWORK_ERROR', 0, 'offline')
        return 'sent'
      }),
    ).toBe('sent')
    expect(attempts).toBe(2)
  })

  it('does not retry a definite server rejection', async () => {
    let attempts = 0
    await expect(
      retryUncertainSend(async () => {
        attempts += 1
        throw new ApiError('BAD_REQUEST', 400, 'rejected')
      }),
    ).rejects.toThrow('rejected')
    expect(attempts).toBe(1)
  })

  it('also retries an ambiguous server error', async () => {
    let attempts = 0
    await retryUncertainSend(async () => {
      if (++attempts === 1) throw new ApiError('UNAVAILABLE', 503, 'unavailable')
    })
    expect(attempts).toBe(2)
  })
})
