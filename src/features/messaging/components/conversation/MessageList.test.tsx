// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MessageReplyBubbleQuote, StoryReplyQuote } from './MessageList'
import { useReplyTarget } from '@/features/messaging/hooks/useReplyTarget'
import type { MessageReplyTarget } from '@/features/messaging/types/message.types'

vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal()),
  useTranslation: () => ({ t: (key: string) => key }),
}))
vi.mock('@/features/messaging/hooks/useReplyTarget', () => ({
  useReplyTarget: vi.fn(),
}))

const mockedUseReplyTarget = useReplyTarget as unknown as ReturnType<typeof vi.fn>

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const alivePreview = {
  id: 's1',
  kind: 'IMAGE' as const,
  bucket: 'stories',
  objectKey: 's1.jpg',
  caption: 'At the beach',
  background: null,
  mediaUrl: 'https://r2/s1.jpg',
}

describe('StoryReplyQuote', () => {
  it('shows the gone label and stays inert when the story preview is redacted', () => {
    const onOpen = vi.fn()

    render(<StoryReplyQuote preview={null} onOpen={onOpen} />)

    expect(screen.getByText('chat.replyUnavailableStory')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
    fireEvent.click(screen.getByText('chat.replyUnavailableStory'))
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('renders caption and media from the payload and opens the story when alive', () => {
    const onOpen = vi.fn()

    render(<StoryReplyQuote preview={alivePreview} onOpen={onOpen} />)

    expect(screen.getByText('At the beach')).toBeTruthy()
    expect(document.querySelector('img')?.getAttribute('src')).toBe('https://r2/s1.jpg')
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
    storyPreview: alivePreview,
  }

  it('renders the gone label for a redacted story target and cannot navigate', () => {
    mockedUseReplyTarget.mockReturnValue({
      target: { ...storyTarget, storyPreview: null },
      isLoading: false,
      isUnavailable: false,
    })
    const onJumpToMessage = vi.fn()

    render(
      <MessageReplyBubbleQuote
        conversationId="c1"
        replyToId="m1"
        onJumpToMessage={onJumpToMessage}
      />,
    )

    expect(screen.getByText('chat.replyUnavailableStory')).toBeTruthy()
    expect(screen.queryByText('At the beach')).toBeNull()
    expect(screen.queryByText('Bạn nam kdc à')).toBeNull()
    fireEvent.click(screen.getByRole('button'))
    expect(onJumpToMessage).not.toHaveBeenCalled()
  })

  it('quotes the story caption with its media from the payload and navigates when alive', () => {
    mockedUseReplyTarget.mockReturnValue({
      target: storyTarget,
      isLoading: false,
      isUnavailable: false,
    })
    const onJumpToMessage = vi.fn()

    render(
      <MessageReplyBubbleQuote
        conversationId="c1"
        replyToId="m1"
        onJumpToMessage={onJumpToMessage}
      />,
    )

    expect(screen.getByText('At the beach')).toBeTruthy()
    expect(document.querySelector('img')?.getAttribute('src')).toBe('https://r2/s1.jpg')
    fireEvent.click(screen.getByRole('button'))
    expect(onJumpToMessage).toHaveBeenCalledWith('m1')
  })

  it('renders the unavailable label without navigation when the target is gone', () => {
    mockedUseReplyTarget.mockReturnValue({ target: null, isLoading: false, isUnavailable: true })
    const onJumpToMessage = vi.fn()

    render(
      <MessageReplyBubbleQuote
        conversationId="c1"
        replyToId="m1"
        onJumpToMessage={onJumpToMessage}
      />,
    )

    expect(screen.getByText('chat.replyUnavailableContent')).toBeTruthy()
    fireEvent.click(screen.getByRole('button'))
    expect(onJumpToMessage).not.toHaveBeenCalled()
  })
})
