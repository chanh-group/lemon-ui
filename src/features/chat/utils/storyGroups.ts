import type { StoryEntry } from '../types/chat.types'

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
