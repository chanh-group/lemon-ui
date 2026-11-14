import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/infrastructure/query/keys'
import {
  createMediaStory,
  deleteStory,
  updateStory,
  type UpdateStoryPayload,
  createTextStory,
  getArchivedStories,
  getMutedAuthors,
  getStoryReactions,
  getStorySettings,
  getStoryViews,
  getStoryMediaUrl,
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
export const STORY_REACTIONS_KEY = (storyId: string) =>
  [...STORIES_KEY, storyId, 'reactions'] as const
export const STORY_VIEWS_KEY = (storyId: string) => [...STORIES_KEY, storyId, 'views'] as const
export const STORY_MEDIA_KEY = (storyId: string) => ['stories', 'media', storyId] as const

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
    mutationFn: ({
      storyId,
      reaction,
    }: {
      storyId: string
      reaction: StoryReactionType | string
    }) => reactStory(storyId, reaction),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: STORIES_KEY })
      queryClient.invalidateQueries({ queryKey: STORY_REACTIONS_KEY(variables.storyId) })
      queryClient.invalidateQueries({ queryKey: STORY_VIEWS_KEY(variables.storyId) })
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
      queryClient.invalidateQueries({ queryKey: STORY_VIEWS_KEY(storyId) })
    },
  })
}

export function useStoryReactions(storyId?: string) {
  return useInfiniteQuery({
    queryKey: STORY_REACTIONS_KEY(storyId ?? ''),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => getStoryReactions(storyId!, pageParam),
    getNextPageParam: (page) => (page.hasMore ? (page.nextCursor ?? undefined) : undefined),
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
  return useInfiniteQuery({
    queryKey: STORY_VIEWS_KEY(storyId ?? ''),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => getStoryViews(storyId!, pageParam),
    getNextPageParam: (page) => (page.hasMore ? (page.nextCursor ?? undefined) : undefined),
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

export function useArchivedStories() {
  return useInfiniteQuery({
    queryKey: STORY_ARCHIVE_KEY,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => getArchivedStories(pageParam),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })
}

export function useStoryMedia(story: { id: string; kind?: string; mediaUrl?: string | null }) {
  return useQuery({
    queryKey: STORY_MEDIA_KEY(story.id),
    queryFn: () => getStoryMediaUrl(story.id),
    enabled:
      story.kind?.toUpperCase() === 'MEDIA' && !story.mediaUrl && !story.id.startsWith('story-'),
    staleTime: 60_000,
  })
}

export function useUpdateStory() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateStoryPayload }) =>
      updateStory(id, payload),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: STORIES_KEY })
      void client.invalidateQueries({ queryKey: STORY_ARCHIVE_KEY })
    },
  })
}

export function useDeleteStory() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: deleteStory,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: STORIES_KEY })
      void client.invalidateQueries({ queryKey: STORY_ARCHIVE_KEY })
    },
  })
}
