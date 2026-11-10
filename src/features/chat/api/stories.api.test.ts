import { afterEach, describe, expect, it, mock } from 'bun:test'
import { api } from '@/infrastructure/api/client'
import { createMediaStory, getStoryViews, listStories, replyStory } from './stories.api'

const originalGet = api.get
const originalPost = api.post
const originalFetch = globalThis.fetch

afterEach(() => {
  api.get = originalGet
  api.post = originalPost
  globalThis.fetch = originalFetch
  mock.restore()
})

describe('story API contract', () => {
  it('maps the grouped feed with owner, video, view and reaction state', async () => {
    api.get = mock(() =>
      Promise.resolve({
        data: [
          {
            user: { id: 'u', fullName: 'Alice', avatarUrl: null },
            stories: [
              {
                id: 's',
                userId: 'u',
                kind: 'VIDEO',
                caption: 'hello',
                createdAt: new Date().toISOString(),
                hasViewed: true,
                myReaction: '👍',
                myReactionKind: 'REACTION',
              },
            ],
          },
        ],
      }),
    ) as unknown as typeof api.get
    const [story] = await listStories('u')
    expect(story).toMatchObject({
      id: 's',
      mine: true,
      name: 'Alice',
      kind: 'MEDIA',
      mediaType: 'video',
      viewed: true,
      viewerReaction: '👍',
    })
  })

  it('uploads the selected bytes before creating a media story', async () => {
    const calls: Array<{ path: string; body: unknown }> = []
    api.post = mock((path: string, body: unknown) => {
      calls.push({ path, body })
      return Promise.resolve({
        data:
          path === '/files/presign'
            ? { uploadUrl: 'https://example.test/upload', objectKey: 'stories/u/key.jpg' }
            : { id: 's', userId: 'u', kind: 'IMAGE', createdAt: new Date().toISOString() },
      })
    }) as unknown as typeof api.post
    const put = mock(() => Promise.resolve(new Response(null, { status: 200 })))
    globalThis.fetch = put as unknown as typeof fetch
    const file = new File(['image'], 'photo.jpg', { type: 'image/jpeg' })
    await createMediaStory({ file, captionText: 'hello' })
    expect(calls[0]).toMatchObject({
      path: '/files/presign',
      body: { kind: 'STORY_IMAGE', sizeBytes: file.size, mimeType: file.type },
    })
    expect(put).toHaveBeenCalledWith(
      'https://example.test/upload',
      expect.objectContaining({ method: 'PUT', body: file }),
    )
    expect(calls[1]).toMatchObject({
      path: '/stories',
      body: { kind: 'IMAGE', objectKey: 'stories/u/key.jpg', caption: 'hello' },
    })
  })

  it('uses the fallback object key after direct upload fails', async () => {
    const paths: string[] = []
    api.post = mock((path: string) => {
      paths.push(path)
      return Promise.resolve({
        data:
          path === '/files/presign'
            ? { uploadUrl: 'https://example.test/upload', objectKey: 'old' }
            : path === '/files/upload'
              ? { objectKey: 'fallback' }
              : { id: 's', userId: 'u', kind: 'VIDEO', createdAt: new Date().toISOString() },
      })
    }) as unknown as typeof api.post
    globalThis.fetch = mock(() => Promise.reject(new Error('CORS'))) as unknown as typeof fetch
    await createMediaStory({
      file: new File(['video'], 'video.mp4', { type: 'video/mp4' }),
      captionText: '',
    })
    expect(paths).toEqual(['/files/presign', '/files/upload', '/stories'])
  })

  it('uses backend view pagination and reply body', async () => {
    const get = mock(() =>
      Promise.resolve({
        data: { items: [], totalViewsCount: 3, nextCursor: 'next', hasMore: true },
      }),
    )
    const post = mock(() => Promise.resolve({ data: {} }))
    api.get = get as unknown as typeof api.get
    api.post = post as unknown as typeof api.post
    expect((await getStoryViews('s', 'cursor')).totalViewsCount).toBe(3)
    expect(get).toHaveBeenCalledWith('/stories/s/views', { params: { cursor: 'cursor' } })
    await replyStory('s', { content: 'hi' })
    expect(post).toHaveBeenCalledWith('/stories/s/reply', { body: 'hi' })
  })
})
