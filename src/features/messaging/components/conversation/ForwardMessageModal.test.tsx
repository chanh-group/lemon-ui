// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ForwardMessageModal } from './ForwardMessageModal'
import type { ChatMessage } from '@/features/messaging/types/message.types'

vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}))
vi.mock('@/features/conversation/hooks/useConversations', () => ({
  useConversationsQuery: () => ({ data: [] }),
}))
vi.mock('@/features/messaging/hooks/useMessages', () => ({
  useSendMessageMutation: () => ({ mutateAsync: vi.fn() }),
}))

afterEach(() => cleanup())

const longImageName =
  'Teemo-joins-2XKO-trailer-gameplay-and-release-date-revealed-article-by-esports.gg-image-via-riot-games.png'

function createMessage(attachment: ChatMessage['attachments'][number], text?: string): ChatMessage {
  return {
    id: 'message-1',
    fromMe: true,
    kind: 'photo',
    text,
    attachments: [attachment],
    time: '10:00',
  }
}

describe('ForwardMessageModal media previews', () => {
  it('uses the photo label instead of a long image filename while retaining the image accessible name', () => {
    render(
      <ForwardMessageModal
        open
        onOpenChange={vi.fn()}
        message={createMessage({
          id: 'image-1',
          kind: 'IMAGE',
          fileName: longImageName,
          mimeType: 'image/png',
          sizeBytes: 2_400_000,
          previewUrl: 'https://cdn.example.test/teemo.png',
          downloadUrl: 'https://cdn.example.test/teemo.png',
        })}
      />,
    )

    expect(screen.getByText('chat.photo')).toBeTruthy()
    expect(screen.queryByText(longImageName)).toBeNull()
    expect(screen.getByRole('img', { name: longImageName }).getAttribute('src')).toBe(
      'https://cdn.example.test/teemo.png',
    )
  })

  it('shows an image caption without rendering its filename', () => {
    render(
      <ForwardMessageModal
        open
        onOpenChange={vi.fn()}
        message={createMessage(
          {
            id: 'image-1',
            kind: 'IMAGE',
            fileName: longImageName,
            mimeType: 'image/png',
            sizeBytes: 2_400_000,
            previewUrl: 'https://cdn.example.test/teemo.png',
            downloadUrl: 'https://cdn.example.test/teemo.png',
          },
          'Teemo đi mid',
        )}
      />,
    )

    expect(screen.getByText('Teemo đi mid')).toBeTruthy()
    expect(screen.queryByText(longImageName)).toBeNull()
  })

  it('truncates a long document filename while keeping the size visible', () => {
    const longDocumentName = `${'very-long-document-name-without-spaces-'.repeat(5)}report.pdf`
    render(
      <ForwardMessageModal
        open
        onOpenChange={vi.fn()}
        message={createMessage({
          id: 'file-1',
          kind: 'FILE',
          fileName: longDocumentName,
          mimeType: 'application/pdf',
          sizeBytes: 1_200_000,
          previewUrl: '',
          downloadUrl: 'https://cdn.example.test/report.pdf',
        })}
      />,
    )

    const fileName = screen.getByText(longDocumentName)
    expect(fileName.className).toContain('min-w-0')
    expect(fileName.className).toContain('truncate')
    expect(screen.getByText(/1\.1 MB/)).toBeTruthy()
  })
})
