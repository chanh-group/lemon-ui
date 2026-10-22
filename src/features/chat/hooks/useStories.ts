import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/infrastructure/query/keys'
import {
  createMediaStory,
  createTextStory,
  getArchivedStories,
  getMutedAuthors,
  getStoryReactions,
  getStorySettings,
  getStoryViews,
  likeStory,
  listStories,
  muteAuthor,
  reactStory,
  replyStory,
  unlikeStory,
  unmuteAuthor,
  unreactStory,
  updateStorySettings,
  viewStory,
  type CreateMediaStoryPayload,
  type CreateTextStoryPayload,
  type ReplyStoryPayload,
  type UserStorySettings,
} from '../api/stories.api'
import type { StoryReactionType } from '../types/chat.types'

export const STORIES_KEY = queryKeys.chat.stories
export const STORY_REACTIONS_KEY = (storyId: string) => [...STORIES_KEY, storyId, 'reactions'] as const
export const STORY_VIEWS_KEY = (storyId: string) => [...STORIES_KEY, storyId, 'views'] as const

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

export function useLikeStory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (storyId: string) => likeStory(storyId),
    onSuccess: (_data, storyId) => {
      queryClient.invalidateQueries({ queryKey: STORIES_KEY })
      queryClient.invalidateQueries({ queryKey: STORY_VIEWS_KEY(storyId) })
      queryClient.invalidateQueries({ queryKey: STORY_REACTIONS_KEY(storyId) })
    },
  })
}

export function useUnlikeStory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (storyId: string) => unlikeStory(storyId),
    onSuccess: (_data, storyId) => {
      queryClient.invalidateQueries({ queryKey: STORIES_KEY })
      queryClient.invalidateQueries({ queryKey: STORY_VIEWS_KEY(storyId) })
      queryClient.invalidateQueries({ queryKey: STORY_REACTIONS_KEY(storyId) })
    },
  })
}

export const STORY_SETTINGS_KEY = ['stories', 'settings'] as const

export function useStorySettings() {
  return useQuery({
    queryKey: STORY_SETTINGS_KEY,
    queryFn: () => getStorySettings(),
  })
}

export function useUpdateStorySettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<UserStorySettings>) => updateStorySettings(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(STORY_SETTINGS_KEY, data)
      queryClient.invalidateQueries({ queryKey: STORY_SETTINGS_KEY })
    },
  })
}

export const MUTED_AUTHORS_KEY = ['stories', 'mutes'] as const

export function useMutedAuthors() {
  return useQuery({
    queryKey: MUTED_AUTHORS_KEY,
    queryFn: () => getMutedAuthors(),
  })
}

export function useMuteAuthor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (authorId: string) => muteAuthor(authorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORIES_KEY })
      queryClient.invalidateQueries({ queryKey: MUTED_AUTHORS_KEY })
    },
  })
}

export function useUnmuteAuthor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (authorId: string) => unmuteAuthor(authorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORIES_KEY })
      queryClient.invalidateQueries({ queryKey: MUTED_AUTHORS_KEY })
    },
  })
}

export const STORY_ARCHIVE_KEY = ['stories', 'archive'] as const

export function useArchivedStories(cursor?: string) {
  return useQuery({
    queryKey: [...STORY_ARCHIVE_KEY, cursor ?? 'initial'],
    queryFn: () => getArchivedStories(cursor),
  })
}
