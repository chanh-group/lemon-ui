import { describe, expect, it, vi } from 'vitest'
import { processStoryVideo } from './storyVideoProcessor'

describe('processStoryVideo', () => {
  it('rejects an already cancelled request', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(
      processStoryVideo({
        file: new File(['x'], 'x.mp4', { type: 'video/mp4' }),
        startSeconds: 0,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
  it('rejects unreadable media instead of sharing the original', async () => {
    await expect(
      processStoryVideo({
        file: new File(['not video'], 'x.mp4', { type: 'video/mp4' }),
        startSeconds: 0,
      }),
    ).rejects.toThrow()
  })
})
