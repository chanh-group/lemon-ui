import { describe, expect, it } from 'vitest'
import type { StoryEntry } from '@/features/story/types/story.types'
import { groupStoriesByAuthor, groupStories } from './storyGroups'

describe('groupStoriesByAuthor', () => {
  it('keeps each friend together without merging stories missing an author', () => {
    const story = (id: string, authorId?: string): StoryEntry => ({
      id,
      authorId,
      name: id,
      time: '',
      viewed: false,
      online: false,
    })
    const groups = groupStoriesByAuthor([
      story('a1', 'a'),
      story('b1', 'b'),
      story('a2', 'a'),
      story('x'),
      story('y'),
    ])
    expect(groups.map((group) => group.map((item) => item.id))).toEqual([
      ['a1', 'a2'],
      ['b1'],
      ['x'],
      ['y'],
    ])
  })
})

describe('groupStories rich grouping', () => {
  const makeStory = (
    id: string,
    authorId: string,
    createdAt: string,
    viewed = false,
  ): StoryEntry => ({
    id,
    authorId,
    name: `User ${authorId}`,
    time: '',
    viewed,
    online: false,
    createdAt,
  })

  it('correctly sets displayStory, startStory, count, and viewed for multiple stories of same author', () => {
    const a1 = makeStory('a1', 'userA', '2026-11-20T10:00:00Z', true) // older, viewed
    const a2 = makeStory('a2', 'userA', '2026-11-20T12:00:00Z', false) // newer, unviewed
    const b1 = makeStory('b1', 'userB', '2026-11-20T11:00:00Z', false)

    const groups = groupStories([a1, b1, a2])
    expect(groups).toHaveLength(2)

    const groupA = groups.find((g) => g.authorId === 'userA')!
    expect(groupA).toBeDefined()
    expect(groupA.count).toBe(2)
    expect(groupA.displayStory.id).toBe('a2') // newest for preview
    expect(groupA.startStory.id).toBe('a2') // first unviewed
    expect(groupA.viewed).toBe(false)
    expect(groupA.stories.map((s) => s.id)).toEqual(['a1', 'a2']) // sorted ascending

    const groupB = groups.find((g) => g.authorId === 'userB')!
    expect(groupB).toBeDefined()
    expect(groupB.count).toBe(1)
    expect(groupB.displayStory.id).toBe('b1')
    expect(groupB.startStory.id).toBe('b1')
    expect(groupB.viewed).toBe(false)
  })

  it('starts at oldest story when all stories in group have been viewed', () => {
    const a1 = makeStory('a1', 'userA', '2026-11-20T10:00:00Z', true)
    const a2 = makeStory('a2', 'userA', '2026-11-20T12:00:00Z', true)

    const groups = groupStories([a1, a2])
    const groupA = groups[0]
    expect(groupA.count).toBe(2)
    expect(groupA.viewed).toBe(true)
    expect(groupA.displayStory.id).toBe('a2') // newest for preview
    expect(groupA.startStory.id).toBe('a1') // oldest so watching all starts from beginning
  })
})
