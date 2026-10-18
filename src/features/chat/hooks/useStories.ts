import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createMediaStory, createTextStory, listStories, type CreateMediaStoryPayload, type CreateTextStoryPayload } from '../api/stories.api'

const STORIES_KEY = ['chat', 'stories'] as const

export function useStoriesList() {
  return useQuery({
    queryKey: STORIES_KEY,
    queryFn: listStories,
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
