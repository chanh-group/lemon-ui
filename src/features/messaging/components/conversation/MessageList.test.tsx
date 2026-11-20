// @vitest-environment happy-dom
import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MessageReplyBubbleQuote, StoryReplyQuote } from './MessageList'
import { getStoryById } from '@/features/story/api/stories.api'
import { useReplyTarget } from '@/features/messaging/hooks/useReplyTarget'
import type { MessageReplyTarget } from '@/features/messaging/types/message.types'

vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal()),
  useTranslation: () => ({ t: (key: string) => key }),
}))
vi.mock('@/features/story/api/stories.api', () => ({ getStoryById: vi.fn() }))
vi.mock('@/features/story/hooks/useStories', () => ({
  useStoryMedia: () => ({ data: null }),
}))
vi.mock('@/features/messaging/hooks/useReplyTarget', () => ({
  useReplyTarget: vi.fn(),
}))

const mockedGetStoryById = getStoryById as unknown as ReturnType<typeof vi.fn>
const mockedUseReplyTarget = useReplyTarget as unknown as ReturnType<typeof vi.fn>

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
}

const preview = {
  id: 's1',
  kind: 'IMAGE' as const,
  caption: 'At the beach',
  mediaUrl: null,
  background: null,
}

const aliveStory = {
  id: 's1',
  kind: 'MEDIA',
  mediaType: 'image',
  mediaUrl: null,
  caption: 'At the beach',
  background: null,
}

describe('StoryReplyQuote', () => {
  it('shows the gone label and stays inert when the story is expired', async () => {
    mockedGetStoryById.mockRejectedValue(new Error('404'))
    const onOpen = vi.fn()

    render(<StoryReplyQuote preview={preview} onOpen={onOpen} />, { wrapper })

    expect(await screen.findByText('chat.replyUnavailableStory')).toBeTruthy()
    expect(screen.queryByText('At the beach')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
    fireEvent.click(screen.getByText('chat.replyUnavailableStory'))
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('shows the story caption and opens the story when it is alive', async () => {
    mockedGetStoryById.mockResolvedValue(aliveStory)
    const onOpen = vi.fn()

    render(<StoryReplyQuote preview={preview} onOpen={onOpen} />, { wrapper })

    expect(await screen.findByText('At the beach')).toBeTruthy()
    fireEvent.click(screen.getByRole('button'))
    expect(onOpen).toHaveBeenCalledWith('s1')
  })
})

describe('MessageReplyBubbleQuote', () => {
  const storyTarget: MessageReplyTarget = {
    id: 'm1',
    senderId: 'u1',
    kind: 'STORY_REPLY',
    body: 'Bạn nam kdc à',
    deletedAt: null,
    storyPreview: preview,
  }

  it('replaces dead story content with the gone label and cannot navigate', async () => {
    mockedUseReplyTarget.mockReturnValue({
      target: storyTarget,
      isLoading: false,
      isUnavailable: false,
    })
    mockedGetStoryById.mockRejectedValue(new Error('404'))
    const onJumpToMessage = vi.fn()

    render(
      <MessageReplyBubbleQuote
        conversationId="c1"
        replyToId="m1"
        onJumpToMessage={onJumpToMessage}
      />,
      { wrapper },
    )

    expect(await screen.findByText('chat.replyUnavailableStory')).toBeTruthy()
    expect(screen.queryByText('At the beach')).toBeNull()
    expect(screen.queryByText('Bạn nam kdc à')).toBeNull()
    fireEvent.click(screen.getByRole('button'))
    expect(onJumpToMessage).not.toHaveBeenCalled()
  })

  it('quotes the story caption and navigates when the story is alive', async () => {
    mockedUseReplyTarget.mockReturnValue({
      target: storyTarget,
      isLoading: false,
      isUnavailable: false,
    })
    mockedGetStoryById.mockResolvedValue(aliveStory)
    const onJumpToMessage = vi.fn()

    render(
      <MessageReplyBubbleQuote
        conversationId="c1"
        replyToId="m1"
        onJumpToMessage={onJumpToMessage}
      />,
      { wrapper },
    )

    expect(await screen.findByText('At the beach')).toBeTruthy()
    fireEvent.click(screen.getByRole('button'))
    expect(onJumpToMessage).toHaveBeenCalledWith('m1')
  })
})
