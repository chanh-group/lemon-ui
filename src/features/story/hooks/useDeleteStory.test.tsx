// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/infrastructure/query/keys'
import { useDeleteStory } from './useStories'

const mocks = vi.hoisted(() => ({ remove: vi.fn() }))
vi.mock('@/features/story/api/stories.api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/stories.api')>()),
  deleteStory: mocks.remove,
}))

describe('story storage after deletion', () => {
  it('refreshes the active storage query before deletion finishes', async () => {
    let usedBytes = 20
    const storage = vi.fn(async () => ({ usedBytes, limitBytes: 100 }))
    mocks.remove.mockImplementationOnce(async () => {
      usedBytes = 5
    })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result, unmount } = renderHook(
      () => ({
        storage: useQuery({ queryKey: queryKeys.chat.storyStorage, queryFn: storage }),
        deletion: useDeleteStory(),
      }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.storage.data?.usedBytes).toBe(20))
    await act(async () => {
      await result.current.deletion.mutateAsync('story-1')
    })
    expect(result.current.storage.data?.usedBytes).toBe(5)
    expect(storage).toHaveBeenCalledTimes(2)
    unmount()
    client.clear()
  })
})
