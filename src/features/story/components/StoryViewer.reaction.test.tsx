// @vitest-environment happy-dom
import {
  act,
  fireEvent,
  render as testingRender,
  screen,
  waitFor,
  cleanup,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StoryViewer } from './StoryViewer'
import type { StoryEntry } from '../types/story.types'
import { useAuthStore } from '@/infrastructure/auth/auth-store'

const mocks = vi.hoisted(() => ({
  like: vi.fn(),
  unlike: vi.fn(),
  react: vi.fn(),
  unreact: vi.fn(),
  getStory: vi.fn(),
  error: vi.fn(),
}))
vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  }),
}))
vi.mock('sonner', () => ({ toast: { error: mocks.error, success: vi.fn() } }))
vi.mock('@/features/story/api/stories.api', () => ({ getStoryById: mocks.getStory }))
vi.mock('../hooks/useStories', () => {
  const mutation = (fn = vi.fn()) => ({ mutate: vi.fn(), mutateAsync: fn, isPending: false })
  return {
    useStoryMedia: () => ({ data: null }),
    useStoryViews: () => ({}),
    useStoryReactions: () => ({}),
    useViewStory: () => mutation(),
    useReactStory: () => mutation(mocks.react),
    useUnreactStory: () => mutation(mocks.unreact),
    useLikeStory: () => mutation(mocks.like),
    useUnlikeStory: () => mutation(mocks.unlike),
    useReplyStory: () => mutation(),
    useUpdateStory: () => mutation(),
    useDeleteStory: () => mutation(),
    useMuteAuthor: () => mutation(),
  }
})

const story: StoryEntry = {
  id: 'story-a',
  name: 'Author',
  time: 'now',
  viewed: true,
  online: false,
  kind: 'TEXT',
  caption: 'Test story',
  allowReactions: true,
  allowReplies: true,
}
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((ok, fail) => {
    resolve = ok
    reject = fail
  })
  return { promise, resolve, reject }
}

let client: QueryClient
function render(ui: ReactElement) {
  return testingRender(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  })
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.getStory.mockRejectedValue(new Error('offline'))
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(() => {
  cleanup()
  client.clear()
})

describe('story reaction feedback', () => {
  it('shows the chosen reaction before the server responds and blocks a duplicate', async () => {
    const request = deferred<void>()
    mocks.like.mockReturnValueOnce(request.promise)
    render(<StoryViewer story={story} onClose={vi.fn()} />)
    const heart = screen.getByRole('button', { name: '❤️' })
    fireEvent.click(heart)
    await waitFor(() => expect(heart.getAttribute('aria-pressed')).toBe('true'))
    expect(heart.hasAttribute('disabled')).toBe(true)
    fireEvent.click(heart)
    expect(mocks.like).toHaveBeenCalledTimes(1)
    request.resolve()
    await waitFor(() => expect(heart.hasAttribute('disabled')).toBe(false))
  })

  it('does not apply a failed reaction response to a different selected story', async () => {
    const request = deferred<void>()
    mocks.like.mockReturnValueOnce(request.promise)
    mocks.getStory.mockResolvedValueOnce({ ...story, viewerReaction: '❤️', myReactionKind: 'LIKE' })
    const { rerender } = render(<StoryViewer story={story} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '❤️' }))
    rerender(
      <StoryViewer
        story={{ ...story, id: 'story-b', viewerReaction: '👍', myReactionKind: 'REACTION' }}
        onClose={vi.fn()}
      />,
    )
    request.reject(new Error('offline'))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '👍' }).getAttribute('aria-pressed')).toBe('true'),
    )
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '❤️' }).hasAttribute('disabled')).toBe(false),
    )
    expect(screen.getByRole('button', { name: '❤️' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('keeps each story independent and preserves the pending reaction after returning', async () => {
    const first = deferred<void>()
    const second = deferred<void>()
    mocks.like.mockReturnValueOnce(first.promise)
    mocks.react.mockReturnValueOnce(second.promise)
    mocks.unlike.mockResolvedValueOnce(undefined)
    const other = { ...story, id: 'story-b' }
    const { rerender } = render(<StoryViewer story={story} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '❤️' }))
    rerender(<StoryViewer story={other} onClose={vi.fn()} />)
    const thumb = screen.getByRole('button', { name: '👍' })
    expect(thumb.hasAttribute('disabled')).toBe(false)
    fireEvent.click(thumb)
    expect(mocks.react).toHaveBeenCalledWith({ storyId: 'story-b', reaction: '👍', generation: 0 })
    rerender(<StoryViewer story={story} onClose={vi.fn()} />)
    const heart = screen.getByRole('button', { name: '❤️' })
    await waitFor(() => expect(heart.getAttribute('aria-pressed')).toBe('true'))
    expect(heart.hasAttribute('disabled')).toBe(true)
    first.resolve()
    await waitFor(() => expect(heart.hasAttribute('disabled')).toBe(false))
    fireEvent.click(heart)
    expect(mocks.unlike).toHaveBeenCalledWith({ storyId: 'story-a', generation: 0 })
    second.resolve()
  })

  it('keeps pending reaction across keyed unmount and prevents duplicate requests', async () => {
    const request = deferred<void>()
    mocks.like.mockReturnValueOnce(request.promise)
    mocks.getStory.mockResolvedValue({ ...story, viewerReaction: '❤️', myReactionKind: 'LIKE' })
    const other = { ...story, id: 'story-b' }
    const { rerender } = render(<StoryViewer key={story.id} story={story} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '❤️' }))
    rerender(<StoryViewer key={other.id} story={other} onClose={vi.fn()} />)
    rerender(<StoryViewer key={story.id} story={story} onClose={vi.fn()} />)
    const heart = screen.getByRole('button', { name: '❤️' })
    await waitFor(() => expect(heart.getAttribute('aria-pressed')).toBe('true'))
    expect(heart.hasAttribute('disabled')).toBe(true)
    fireEvent.click(heart)
    expect(mocks.like).toHaveBeenCalledTimes(1)
    request.resolve()
    await waitFor(() => expect(heart.hasAttribute('disabled')).toBe(false))
  })

  it('ignores a mount read that returns after a new reaction intent', async () => {
    const oldRead = deferred<StoryEntry>()
    const request = deferred<void>()
    mocks.getStory.mockReturnValueOnce(oldRead.promise)
    mocks.like.mockReturnValueOnce(request.promise)
    render(<StoryViewer story={story} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '❤️' }))
    await act(async () => oldRead.resolve(story))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '❤️' }).getAttribute('aria-pressed')).toBe('true'),
    )
    request.resolve()
  })

  it('ignores an old focus read during mutation and accepts a later focus read', async () => {
    const oldRead = deferred<StoryEntry>()
    const request = deferred<void>()
    mocks.getStory.mockRejectedValueOnce(new Error('offline'))
    mocks.getStory.mockReturnValueOnce(oldRead.promise)
    mocks.getStory.mockResolvedValueOnce({ ...story, viewerReaction: '❤️', myReactionKind: 'LIKE' })
    mocks.getStory.mockResolvedValueOnce({
      ...story,
      viewerReaction: '👍',
      myReactionKind: 'REACTION',
    })
    mocks.like.mockReturnValueOnce(request.promise)
    render(<StoryViewer story={story} onClose={vi.fn()} />)
    fireEvent.focus(window)
    fireEvent.click(screen.getByRole('button', { name: '❤️' }))
    oldRead.resolve(story)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '❤️' }).getAttribute('aria-pressed')).toBe('true'),
    )
    request.resolve()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '❤️' }).hasAttribute('disabled')).toBe(false),
    )
    fireEvent.focus(window)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '👍' }).getAttribute('aria-pressed')).toBe('true'),
    )
  })

  it('does not update a new session after the query cache is cleared', async () => {
    const request = deferred<void>()
    mocks.like.mockReturnValueOnce(request.promise)
    mocks.getStory.mockResolvedValueOnce({ ...story, viewerReaction: '❤️', myReactionKind: 'LIKE' })
    render(<StoryViewer story={story} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '❤️' }))
    client.clear()
    await act(async () => request.resolve())
    expect(mocks.getStory).toHaveBeenCalledTimes(1)
    expect(client.getQueryData(['story-viewer-reaction', 0, story.id])).toBeUndefined()
  })

  it('retains the last known reaction if both mutation and reconciliation fail', async () => {
    mocks.react.mockRejectedValueOnce(new Error('timeout'))
    mocks.getStory.mockRejectedValueOnce(new Error('offline'))
    render(<StoryViewer story={story} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '👍' }))
    await waitFor(() => expect(mocks.error).toHaveBeenCalled())
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '👍' }).hasAttribute('disabled')).toBe(false),
    )
    expect(screen.getByRole('button', { name: '👍' }).getAttribute('aria-pressed')).toBe('false')
    expect(mocks.react).toHaveBeenCalledTimes(1)
  })

  it('ignores a mount read that resolves after logout', async () => {
    const read = deferred<StoryEntry>()
    mocks.getStory.mockReturnValueOnce(read.promise)
    const generation = useAuthStore.getState().generation
    render(<StoryViewer story={story} onClose={vi.fn()} />)
    act(() => useAuthStore.getState().reset())
    await act(async () => read.resolve({ ...story, viewerReaction: '❤️', myReactionKind: 'LIKE' }))
    expect(
      client.getQueryData<{ reaction: string | null }>([
        'story-viewer-reaction',
        generation,
        story.id,
      ])?.reaction,
    ).toBeNull()
  })

  it('restores server state after a failed reaction without retrying the action', async () => {
    const request = deferred<void>()
    mocks.react.mockReturnValueOnce(request.promise)
    mocks.getStory.mockResolvedValueOnce(story)
    render(<StoryViewer story={story} onClose={vi.fn()} />)
    const thumb = screen.getByRole('button', { name: '👍' })
    fireEvent.click(thumb)
    await waitFor(() => expect(thumb.getAttribute('aria-pressed')).toBe('true'))
    request.reject(new Error('offline'))
    await waitFor(() => expect(thumb.getAttribute('aria-pressed')).toBe('false'))
    await waitFor(() => expect(thumb.hasAttribute('disabled')).toBe(false))
    expect(mocks.getStory).toHaveBeenCalledWith(story.id)
    expect(mocks.react).toHaveBeenCalledTimes(1)
    expect(mocks.error).toHaveBeenCalled()
  })
})
