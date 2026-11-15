import { describe, expect, it } from 'bun:test'
import type { StoryEntry } from '@/features/story/types/story.types'
import { resolveArchiveAuthor } from './storyAuthor'

const story = (overrides: Partial<StoryEntry> = {}): StoryEntry => ({
  id: 's1',
  name: 'Cuối tuần rồi, đi chill thôi',
  time: '',
  viewed: false,
  online: false,
  mine: true,
  authorId: 'u1',
  ...overrides,
})

describe('resolveArchiveAuthor', () => {
  it('prefers the signed-in profile for the owner of an archived story', () => {
    const result = resolveArchiveAuthor(story(), {
      id: 'u1',
      fullName: 'Linh Nguyễn',
      username: 'linh',
      avatarUrl: 'https://cdn.test/linh.png',
    })
    expect(result.name).toBe('Linh Nguyễn')
    expect(result.authorAvatar).toBe('https://cdn.test/linh.png')
  })

  it('falls back to the username when the profile has no full name', () => {
    const result = resolveArchiveAuthor(story(), { id: 'u1', fullName: '', username: 'linh' })
    expect(result.name).toBe('linh')
  })

  it('keeps the API values when the session is not ready', () => {
    const result = resolveArchiveAuthor(story({ name: 'Tin của bạn', authorAvatar: 'a.png' }), null)
    expect(result.name).toBe('Tin của bạn')
    expect(result.authorAvatar).toBe('a.png')
  })

  it('keeps the API values when the session profile has no avatar', () => {
    const result = resolveArchiveAuthor(story({ authorAvatar: 'a.png' }), {
      id: 'u1',
      fullName: 'Linh',
      avatarUrl: null,
    })
    expect(result.name).toBe('Linh')
    expect(result.authorAvatar).toBe('a.png')
  })

  it('does not relabel stories authored by somebody else', () => {
    const result = resolveArchiveAuthor(
      story({ mine: false, authorId: 'u2', name: 'Mai Anh', authorAvatar: 'mai.png' }),
      { id: 'u1', fullName: 'Linh', avatarUrl: 'linh.png' },
    )
    expect(result.name).toBe('Mai Anh')
    expect(result.authorAvatar).toBe('mai.png')
  })
})
