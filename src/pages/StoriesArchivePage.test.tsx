// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StoriesArchivePage } from './StoriesArchivePage'

const { mutateAsync, toastSuccess, toastError } = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: toastError } }))
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en' } }),
}))
vi.mock('@/features/auth/api', () => ({
  useAuth: () => ({ user: { id: 'u1', fullName: 'Me', username: 'me', avatarUrl: null } }),
}))
vi.mock('@/features/story/api/stories.api', () => ({
  getStorageUsage: () => Promise.resolve({ usedBytes: 0, limitBytes: 100 }),
}))
vi.mock('@/features/shell/components/SideNav', () => ({ SideNav: () => <div /> }))
vi.mock('@/features/story/components/StoryViewer', () => ({ StoryViewer: () => <div /> }))
vi.mock('@/features/story/hooks/useStories', async () => {
  const { useState } = await import('react')
  return {
    useArchivedStories: () => ({
      data: {
        pages: [
          {
            items: [
              {
                id: 's1',
                name: 'Story',
                createdAt: '2026-01-01T00:00:00.000Z',
                viewed: false,
                online: false,
                mine: true,
                kind: 'MEDIA',
                mediaUrl: 'blob:test',
                mediaType: 'image',
              },
            ],
          },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    }),
    useStoryMedia: () => ({ data: null }),
    useDeleteStory: () => {
      const [isPending, setPending] = useState(false)
      return {
        isPending,
        mutateAsync: async (id: string) => {
          setPending(true)
          try {
            await mutateAsync(id)
          } finally {
            setPending(false)
          }
        },
      }
    },
  }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <StoriesArchivePage />
    </QueryClientProvider>,
  )
}

const openDeleteDialog = () =>
  fireEvent.click(screen.getByRole('button', { name: /^chat\.deleteStory:/ }))

describe('stories archive delete flow', () => {
  it('deletes the story after confirmation and reports success', async () => {
    mutateAsync.mockResolvedValueOnce(undefined)
    renderPage()
    openDeleteDialog()
    expect(screen.getByText('chat.deleteStoryConfirm')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'chat.deleteStory' }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith('s1'))
    expect(toastSuccess).toHaveBeenCalledWith('chat.storyDeleted')
    await waitFor(() => expect(screen.queryByText('chat.deleteStoryConfirm')).toBeNull())
  })

  it('keeps the dialog open and reports failure when deletion fails', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('boom'))
    renderPage()
    openDeleteDialog()
    fireEvent.click(screen.getByRole('button', { name: 'chat.deleteStory' }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('chat.storyActionError'))
    expect(mutateAsync).toHaveBeenCalledWith('s1')
    expect(screen.getByText('chat.deleteStoryConfirm')).toBeTruthy()
  })

  it('locks the dialog and blocks double-submit while deletion is pending', async () => {
    let resolveDelete!: () => void
    mutateAsync.mockReturnValueOnce(new Promise<void>((resolve) => (resolveDelete = resolve)))
    renderPage()
    openDeleteDialog()
    fireEvent.click(screen.getByRole('button', { name: 'chat.deleteStory' }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    const confirm = screen.getByRole('button', { name: 'chat.deleteStory' })
    expect((confirm as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    expect(mutateAsync).toHaveBeenCalledTimes(1)
    resolveDelete()
    await waitFor(() => expect(screen.queryByText('chat.deleteStoryConfirm')).toBeNull())
    expect(toastSuccess).toHaveBeenCalledWith('chat.storyDeleted')
  })

  it('closes the dialog without deleting when cancelled', () => {
    renderPage()
    openDeleteDialog()
    fireEvent.click(screen.getByRole('button', { name: 'chat.cancel' }))
    expect(screen.queryByText('chat.deleteStoryConfirm')).toBeNull()
    expect(mutateAsync).not.toHaveBeenCalled()
  })
})
