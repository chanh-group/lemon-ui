// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  MediaBubble,
  MessageReplyBubbleQuote,
  MessageRowView,
  StoryReplyQuote,
  usePendingMessageActions,
} from './MessageList'
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

describe('message action pending', () => {
  it('guards duplicate actions synchronously and lets other messages proceed', async () => {
    const { result } = renderHook(() => usePendingMessageActions('c1'))
    let finish!: () => void
    const request = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)))
    let first!: Promise<boolean>
    let duplicate!: Promise<boolean>
    await act(async () => {
      first = result.current.run('m1', 'revoke', request)
      duplicate = result.current.run('m1', 'delete', request)
    })
    expect(request).toHaveBeenCalledTimes(1)
    expect(await duplicate).toBe(false)
    expect(result.current.pending[result.current.keyFor('m1')]).toBe('revoke')
    await act(async () => {
      expect(await result.current.run('m2', 'delete', async () => {})).toBe(true)
    })
    expect(result.current.pending[result.current.keyFor('m1')]).toBe('revoke')
    await act(async () => {
      finish()
      expect(await first).toBe(true)
    })
    expect(result.current.pending[result.current.keyFor('m1')]).toBeUndefined()
  })

  it('clears pending after failure and isolates conversation keys', async () => {
    const { result, rerender } = renderHook(({ id }) => usePendingMessageActions(id), {
      initialProps: { id: 'c1' },
    })
    await act(async () => {
      await expect(
        result.current.run('m1', 'delete', async () => {
          throw new Error('offline')
        }),
      ).rejects.toThrow('offline')
    })
    expect(result.current.pending[result.current.keyFor('m1')]).toBeUndefined()
    const firstKey = result.current.keyFor('m1')
    rerender({ id: 'c2' })
    expect(result.current.keyFor('m1')).not.toBe(firstKey)
  })

  it('keeps an already revoked message visible and disables deletion while pending', () => {
    render(
      <MessageRowView
        conversationId="c1"
        group={{
          fromMe: false,
          messages: [
            {
              id: 'm2',
              fromMe: false,
              text: '',
              kind: 'text',
              time: '10:00',
              createdAt: '2026-01-01',
              deletedAt: '2026-01-02',
            },
          ],
        }}
        messageIndex={0}
        senderLabel="User"
        onOpenLightbox={vi.fn()}
        onOpenDocument={vi.fn()}
        onDeleteForMe={vi.fn()}
        pendingAction="delete"
      />,
    )
    expect(screen.getByText('chat.messageRevokedText')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('chat.messageDeleting')
    expect(
      screen.getByRole('button', { name: 'chat.deleteMessage' }).hasAttribute('disabled'),
    ).toBe(true)
  })

  it('keeps the message visible and disables its actions while revoking', () => {
    render(
      <MessageRowView
        conversationId="c1"
        group={{
          fromMe: true,
          messages: [
            {
              id: 'm1',
              fromMe: true,
              text: 'Hello',
              kind: 'text',
              time: '10:00',
              createdAt: '2026-01-01',
            },
          ],
        }}
        messageIndex={0}
        senderLabel="User"
        onOpenLightbox={vi.fn()}
        onOpenDocument={vi.fn()}
        onRevoke={vi.fn()}
        onDeleteForMe={vi.fn()}
        onReply={vi.fn()}
        pendingAction="revoke"
      />,
    )
    expect(screen.getByText('Hello')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('chat.messageRevoking')
    expect(screen.getByRole('button', { name: 'Tùy chọn khác' }).hasAttribute('disabled')).toBe(
      true,
    )
    expect(screen.getByRole('button', { name: 'chat.replyMessage' }).hasAttribute('disabled')).toBe(
      true,
    )
  })
})

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

  it('paints a text story preview with the creation gradient instead of a black box (#51)', () => {
    const { container } = render(
      <StoryReplyQuote
        preview={{ ...alivePreview, kind: 'TEXT', mediaUrl: null, caption: 'chsdhisoeksc' }}
      />,
    )

    const box = container.querySelector('span[class*="aspect-9/16"]') as HTMLElement
    expect(box.className).toContain('bg-linear-to-br')
    expect(box.className).toContain('from-lime-300')
    expect(box.getAttribute('style')).toBeNull()
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

  it('uses the video label instead of a long video filename', () => {
    render(<MediaBubble kind="video" label={`${'long-video-name-'.repeat(10)}.mp4`} />)

    expect(screen.getByText('chat.video')).toBeTruthy()
    expect(screen.queryByText(/long-video-name/)).toBeNull()
  })
})
