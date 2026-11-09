import { describe, expect, it } from 'bun:test'
import { resolveSendMessageKind } from './messageSend'
import type { MessageAttachmentInput } from '../types/chat.types'

const image: MessageAttachmentInput = {
  objectKey: 'image',
  fileName: 'image.png',
  mimeType: 'image/png',
  sizeBytes: 1,
  kind: 'IMAGE',
}

describe('resolveSendMessageKind', () => {
  it('uses TEXT when a file message has a caption', () => {
    expect(resolveSendMessageKind('caption', 'IMAGE', [image])).toBe('TEXT')
  })

  it('uses TEXT for mixed attachment kinds', () => {
    expect(resolveSendMessageKind(undefined, undefined, [
      image,
      { ...image, objectKey: 'video', fileName: 'video.mp4', mimeType: 'video/mp4', kind: 'VIDEO' },
    ])).toBe('TEXT')
  })

  it('uses the attachment kind for a single uncaptained attachment', () => {
    expect(resolveSendMessageKind(undefined, undefined, [image])).toBe('IMAGE')
  })
})
