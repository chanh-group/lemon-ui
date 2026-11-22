// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MediaBubble, MessageReplyBubbleQuote, StoryReplyQuote } from './MessageList'
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

  it('labels a captionless story reply without the untitled fallback', () => {
    render(
      <StoryReplyQuote
        preview={{ ...alivePreview, caption: null }}
        isMe
        authorName="Trọng"
        interaction="reply"
      />,
    )

    expect(screen.getByText('chat.repliedToStoryOf')).toBeTruthy()
    expect(screen.queryByText('chat.unnamedStory')).toBeNull()
    expect(document.querySelector('img')?.getAttribute('src')).toBe('https://r2/s1.jpg')
  })

  it('labels an incoming story reply and a story reaction differently', () => {
    render(
      <StoryReplyQuote
        preview={{ ...alivePreview, caption: null }}
        authorName="Trọng"
        interaction="reply"
      />,
    )
    expect(screen.getByText('chat.partnerRepliedToYourStory')).toBeTruthy()

    cleanup()

    render(
      <StoryReplyQuote
        preview={{ ...alivePreview, caption: null }}
        authorName="Trọng"
        interaction="reaction"
      />,
    )
    expect(screen.getByText('chat.partnerReactedStory')).toBeTruthy()
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

  it('uses the compact photo label instead of an image filename and retains that filename as alt text', () => {
    const fileName = `${'Teemo-joins-2XKO-trailer-gameplay-and-release-date-'.repeat(2)}image.png`
    mockedUseReplyTarget.mockReturnValue({
      target: {
        id: 'image-target',
        senderId: 'u1',
        kind: 'IMAGE',
        body: null,
        deletedAt: null,
        attachments: [
          {
            id: 'image-1',
            kind: 'IMAGE',
            fileName,
            mimeType: 'image/png',
            sizeBytes: 100,
            previewUrl: 'https://r2/image.png',
            downloadUrl: 'https://r2/image.png',
          },
        ],
      },
      isLoading: false,
      isUnavailable: false,
    })

    render(<MessageReplyBubbleQuote conversationId="c1" replyToId="image-target" />)

    expect(screen.getByText('chat.photo')).toBeTruthy()
    expect(screen.queryByText(fileName)).toBeNull()
    expect(screen.getByRole('img', { name: fileName })).toBeTruthy()
    expect(screen.getByRole('button').className).toContain('overflow-hidden')
  })

  it('keeps a document filename but constrains it to a truncating quote container', () => {
    const fileName = `${'very-long-document-name-without-spaces-'.repeat(5)}report.pdf`
    mockedUseReplyTarget.mockReturnValue({
      target: {
        id: 'file-target',
        senderId: 'u1',
        kind: 'FILE',
        body: null,
        deletedAt: null,
        attachments: [
          {
            id: 'file-1',
            kind: 'FILE',
            fileName,
            mimeType: 'application/pdf',
            sizeBytes: 100,
            previewUrl: '',
            downloadUrl: 'https://r2/report.pdf',
          },
        ],
      },
      isLoading: false,
      isUnavailable: false,
    })

    render(<MessageReplyBubbleQuote conversationId="c1" replyToId="file-target" />)

    expect(screen.getByText(fileName).className).toContain('truncate')
    expect(screen.getByRole('button').className).toContain('min-w-0')
  })
})

describe('MediaBubble fallback', () => {
  it('uses the compact photo label and protects the fallback layout from a long filename', () => {
    render(
      <MediaBubble
        kind="photo"
        label={`${'very-long-image-name-without-spaces-'.repeat(5)}image.png`}
      />,
    )

    const label = screen.getByText('chat.photo')
    expect(label.className).toContain('truncate')
    expect(label.parentElement?.className).toContain('overflow-hidden')
  })
})
