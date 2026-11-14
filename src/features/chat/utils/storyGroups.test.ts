import { describe, expect, it } from 'bun:test'
import type { StoryEntry } from '../types/chat.types'
import { groupStoriesByAuthor } from './storyGroups'

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
