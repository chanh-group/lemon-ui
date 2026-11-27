import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/infrastructure/query/keys'
import { STORY_MEDIA_STALE_MS } from '@/features/story/constants'
import {
  createMediaStory,
  deleteStory,
  updateStory,
  type UpdateStoryPayload,
  createTextStory,
  getArchivedStories,
  getStoryReactions,
  getStorySettings,
  getStoryViews,
  getStoryMediaUrl,
  likeStory,
  listStories,
  reactStory,
  replyStory,
  unlikeStory,
  unreactStory,
  updateStorySettings,
  viewStory,
  type CreateMediaStoryPayload,
  type CreateTextStoryPayload,
  type ReplyStoryPayload,
  type UserStorySettings,
} from '@/features/story/api/stories.api'
import type { StoryReactionType } from '@/features/story/types/story.types'

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
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.storyStorage })
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
    // Toggle phải lật ngay: áp payload lên cache ở onMutate, chỉ hoàn tác các trường
    // của chính mutation khi lỗi để không đè thao tác toggle khác đang bay.
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: STORY_SETTINGS_KEY })
      const previous = queryClient.getQueryData<UserStorySettings>(STORY_SETTINGS_KEY)
      queryClient.setQueryData<UserStorySettings>(STORY_SETTINGS_KEY, (old) =>
        old ? { ...old, ...payload } : old,
      )
      return { previous }
    },
    onError: (_error, payload, context) => {
      const previous = context?.previous
      if (!previous) return
      queryClient.setQueryData<UserStorySettings>(STORY_SETTINGS_KEY, (old) => {
        if (!old) return old
        // Chỉ hoàn tác trường còn đúng giá trị mutation này vừa set — không đè
        // thao tác toggle cùng field diễn ra sau đó.
        return Object.fromEntries(
          Object.entries(old).map(([key, value]) => [
            key,
            key in payload && value === payload[key as keyof UserStorySettings]
              ? previous[key as keyof UserStorySettings]
              : value,
          ]),
        ) as UserStorySettings
      })
    },
    // Chỉ áp các field thuộc payload khi reconcile thành công — response của request
    // khác field về muộn có thể chứa giá trị cũ, không được đè thao tác đang bay;
    // và không đè field đã có ý định mới hơn (giá trị hiện tại khác payload của mình).
    onSuccess: (data, payload) => {
      queryClient.setQueryData<UserStorySettings>(STORY_SETTINGS_KEY, (old) => {
        if (!old) return data
        const applied = Object.fromEntries(
          (Object.keys(payload) as Array<keyof UserStorySettings>)
            .filter((key) => old[key] === payload[key])
            .map((key) => [key, data[key]]),
        ) as Partial<UserStorySettings>
        return { ...old, ...applied }
      })
      void queryClient.invalidateQueries({ queryKey: STORY_SETTINGS_KEY })
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
    staleTime: STORY_MEDIA_STALE_MS,
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
      void client
        .cancelQueries({ queryKey: queryKeys.chat.storyStorage })
        .then(() => client.refetchQueries({ queryKey: queryKeys.chat.storyStorage }))
    },
  })
}

export function useDeleteStory() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: deleteStory,
    onSuccess: async () => {
      await client.cancelQueries({ queryKey: queryKeys.chat.storyStorage })
      await Promise.all([
        client.invalidateQueries({ queryKey: STORIES_KEY }),
        client.invalidateQueries({ queryKey: STORY_ARCHIVE_KEY }),
      ])
    },
  })
}
