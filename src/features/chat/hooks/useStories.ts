import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createMediaStory,
  createTextStory,
  getStoryReactions,
  getStoryViews,
  listStories,
  reactStory,
  replyStory,
  unreactStory,
  viewStory,
  type CreateMediaStoryPayload,
  type CreateTextStoryPayload,
  type ReplyStoryPayload,
} from '../api/stories.api'
import type { StoryReactionType } from '../types/chat.types'

export const STORIES_KEY = ['chat', 'stories'] as const
export const STORY_REACTIONS_KEY = (storyId: string) => ['chat', 'stories', storyId, 'reactions'] as const
export const STORY_VIEWS_KEY = (storyId: string) => ['chat', 'stories', storyId, 'views'] as const

export function useStoriesList(currentUserId?: string) {
  return useQuery({
    queryKey: [...STORIES_KEY, currentUserId ?? 'all'],
    queryFn: () => listStories(currentUserId),
  })
}

export function useCreateTextStory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateTextStoryPayload) => createTextStory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORIES_KEY })
    },
  })
}

export function useCreateMediaStory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateMediaStoryPayload) => createMediaStory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORIES_KEY })
    },
  })
}

export function useReactStory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ storyId, reaction }: { storyId: string; reaction: StoryReactionType | string }) =>
      reactStory(storyId, reaction),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: STORIES_KEY })
      queryClient.invalidateQueries({ queryKey: STORY_REACTIONS_KEY(variables.storyId) })
    },
  })
}

export function useUnreactStory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (storyId: string) => unreactStory(storyId),
    onSuccess: (_data, storyId) => {
      queryClient.invalidateQueries({ queryKey: STORIES_KEY })
      queryClient.invalidateQueries({ queryKey: STORY_REACTIONS_KEY(storyId) })
    },
  })
}

export function useStoryReactions(storyId?: string) {
  return useQuery({
    queryKey: STORY_REACTIONS_KEY(storyId ?? ''),
    queryFn: () => (storyId ? getStoryReactions(storyId) : Promise.resolve([])),
    enabled: Boolean(storyId),
  })
}

export function useReplyStory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ storyId, payload }: { storyId: string; payload: ReplyStoryPayload }) =>
      replyStory(storyId, payload),
    onSuccess: () => {
      // Invalidate chat threads or messages query if exists
      queryClient.invalidateQueries({ queryKey: ['chat', 'threads'] })
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] })
    },
  })
}

export function useViewStory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (storyId: string) => viewStory(storyId),
    onSuccess: (_data, storyId) => {
      queryClient.invalidateQueries({ queryKey: STORIES_KEY })
      queryClient.invalidateQueries({ queryKey: STORY_VIEWS_KEY(storyId) })
    },
  })
}

export function useStoryViews(storyId?: string) {
  return useQuery({
    queryKey: STORY_VIEWS_KEY(storyId ?? ''),
    queryFn: () => (storyId ? getStoryViews(storyId) : Promise.resolve([])),
    enabled: Boolean(storyId),
  })
}
