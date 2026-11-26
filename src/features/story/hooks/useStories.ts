import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { queryKeys } from '@/infrastructure/query/keys'
import { useAuthStore } from '@/infrastructure/auth/auth-store'
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
      generation,
    }: {
      storyId: string
      reaction: StoryReactionType | string
      generation: number
    }) => {
      if (generation !== useAuthStore.getState().generation) throw new Error('Session changed')
      return reactStory(storyId, reaction)
    },
    onSuccess: (_data, variables) => {
      if (variables.generation !== useAuthStore.getState().generation) return
      queryClient.invalidateQueries({ queryKey: STORIES_KEY })
      queryClient.invalidateQueries({ queryKey: STORY_REACTIONS_KEY(variables.storyId) })
      queryClient.invalidateQueries({ queryKey: STORY_VIEWS_KEY(variables.storyId) })
    },
  })
}

export function useUnreactStory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ storyId, generation }: { storyId: string; generation: number }) => {
      if (generation !== useAuthStore.getState().generation) throw new Error('Session changed')
      return unreactStory(storyId)
    },
    onSuccess: (_data, { storyId, generation }) => {
      if (generation !== useAuthStore.getState().generation) return
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
    mutationFn: ({ storyId, generation }: { storyId: string; generation: number }) => {
      if (generation !== useAuthStore.getState().generation) throw new Error('Session changed')
      return likeStory(storyId)
    },
    onSuccess: (_data, { storyId, generation }) => {
      if (generation !== useAuthStore.getState().generation) return
      queryClient.invalidateQueries({ queryKey: STORIES_KEY })
      queryClient.invalidateQueries({ queryKey: STORY_VIEWS_KEY(storyId) })
      queryClient.invalidateQueries({ queryKey: STORY_REACTIONS_KEY(storyId) })
    },
  })
}

export function useUnlikeStory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ storyId, generation }: { storyId: string; generation: number }) => {
      if (generation !== useAuthStore.getState().generation) throw new Error('Session changed')
      return unlikeStory(storyId)
    },
    onSuccess: (_data, { storyId, generation }) => {
      if (generation !== useAuthStore.getState().generation) return
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

type SettingsUpdates = {
  generation: number
  pending: number
  fields: Partial<Record<keyof UserStorySettings, { confirmed: unknown; latest: symbol }>>
}
const settingsUpdates = new WeakMap<QueryClient, SettingsUpdates>()
const settingsSessions = new WeakMap<object, number[]>()

export function useUpdateStorySettings() {
  const queryClient = useQueryClient()
  return useMutation({
    scope: { id: 'story-settings' },
    mutationFn: (payload: Partial<UserStorySettings>) => {
      const sessions = settingsSessions.get(payload)
      const generation = sessions?.shift()
      if (!sessions?.length) settingsSessions.delete(payload)
      if (generation !== useAuthStore.getState().generation) throw new Error('Session changed')
      return updateStorySettings(payload)
    },
    onMutate: async (payload) => {
      const generation = useAuthStore.getState().generation
      const sessions = settingsSessions.get(payload) ?? []
      sessions.push(generation)
      settingsSessions.set(payload, sessions)
      await queryClient.cancelQueries({ queryKey: STORY_SETTINGS_KEY })
      const active = settingsUpdates.get(queryClient)
      const state: SettingsUpdates =
        active?.generation === generation ? active : { generation, pending: 0, fields: {} }
      if (generation !== useAuthStore.getState().generation)
        return { state, token: Symbol(), active: false }
      const previous = queryClient.getQueryData<UserStorySettings>(STORY_SETTINGS_KEY)
      settingsUpdates.set(queryClient, state)
      state.pending++
      const token = Symbol()
      if (previous) {
        for (const key of Object.keys(payload) as (keyof UserStorySettings)[]) {
          const field = state.fields[key] ?? { confirmed: previous[key], latest: token }
          field.latest = token
          state.fields[key] = field
        }
        queryClient.setQueryData(STORY_SETTINGS_KEY, { ...previous, ...payload })
      }
      return { state, token, active: true }
    },
    onSuccess: (data, payload, context) => {
      if (!context.active || context.state.generation !== useAuthStore.getState().generation) return
      queryClient.setQueryData<UserStorySettings>(STORY_SETTINGS_KEY, (current) => {
        if (!current) return current
        const next = { ...current }
        for (const key of Object.keys(payload) as (keyof UserStorySettings)[]) {
          const field = context.state.fields[key]
          if (!field) continue
          field.confirmed = data[key]
          if (field.latest === context.token && current[key] === payload[key])
            Object.assign(next, { [key]: data[key] })
        }
        return next
      })
    },
    onError: (_error, payload, context) => {
      if (!context?.active || context.state.generation !== useAuthStore.getState().generation)
        return
      queryClient.setQueryData<UserStorySettings>(STORY_SETTINGS_KEY, (current) => {
        if (!current) return current
        const next = { ...current }
        for (const key of Object.keys(payload) as (keyof UserStorySettings)[]) {
          const field = context.state.fields[key]
          if (field?.latest === context.token && current[key] === payload[key])
            Object.assign(next, { [key]: field.confirmed })
        }
        return next
      })
    },
    onSettled: (_data, _error, payload, context) => {
      if (!context?.active) return
      for (const key of Object.keys(payload) as (keyof UserStorySettings)[]) {
        if (context.state.fields[key]?.latest === context.token) delete context.state.fields[key]
      }
      context.state.pending--
      if (context.state.pending === 0 && settingsUpdates.get(queryClient) === context.state) {
        settingsUpdates.delete(queryClient)
        if (context.state.generation === useAuthStore.getState().generation)
          return queryClient.invalidateQueries({ queryKey: STORY_SETTINGS_KEY })
      }
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
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: STORIES_KEY })
      void client.invalidateQueries({ queryKey: STORY_ARCHIVE_KEY })
      void client
        .cancelQueries({ queryKey: queryKeys.chat.storyStorage })
        .then(() => client.refetchQueries({ queryKey: queryKeys.chat.storyStorage }))
    },
  })
}
