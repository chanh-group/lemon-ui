import type { StoryEntry } from '@/features/story/types/story.types'

export interface StoryGroup {
  authorId?: string
  displayStory: StoryEntry
  startStory: StoryEntry
  count: number
  viewed: boolean
  stories: StoryEntry[]
}

/** Keep each author's stories together, preserving the feed order within each group. */
export function groupStoriesByAuthor(stories: StoryEntry[]): StoryEntry[][] {
  const groups = new Map<string, StoryEntry[]>()
  for (const story of stories) {
    const key = story.authorId ? `author:${story.authorId}` : `story:${story.id}`
    const group = groups.get(key)
    if (group) group.push(story)
    else groups.set(key, [story])
  }
  return [...groups.values()]
}

/**
 * Group stories by author into rich StoryGroup models.
 * - displayStory: newest for avatar/timestamp preview
 * - startStory: first unviewed, or oldest if all viewed
 * - count: total stories by author
 * - stories: sorted chronologically (ascending by createdAt)
 */
export function groupStories(stories: StoryEntry[]): StoryGroup[] {
  const authorGroups = groupStoriesByAuthor(stories)
  return authorGroups.map((group) => {
    const sorted = [...group].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return timeA - timeB
    })
    const displayStory = sorted[sorted.length - 1]
    const startStory = sorted.find((s) => !s.viewed) ?? sorted[0]
    const viewed = sorted.every((s) => s.viewed)
    return {
      authorId: displayStory.authorId,
      displayStory,
      startStory,
      count: sorted.length,
      viewed,
      stories: sorted,
    }
  })
}
