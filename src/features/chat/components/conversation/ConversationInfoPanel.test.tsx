import { describe, expect, it } from 'bun:test'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CHAT_QUERY_KEYS } from '../../hooks/useChatQueries'
import { ConversationInfoPanel, UserProfileCardContent } from './ConversationInfoPanel'
import { ConversationHeader } from './ConversationHeader'
import { ImageLightboxModal } from './ImageLightboxModal'
import { AttachmentBubble } from './AttachmentBubble'
import type { Conversation, DayGroup, MessageAttachmentItem } from '../../types/chat.types'

describe('ConversationInfoPanel & Header Integration Tests', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  const dummyConversation: Conversation = {
    id: 'conv-01',
    name: 'Đồ đệ giuột của Mr.An',
    preview: 'Xin chào!',
    previewKind: 'text',
    time: '12:00',
    unread: 0,
    online: true,
    isGroup: false,
    partnerId: 'user-friend-01',
    partnerAvatar: null,
  }

  const dummyGroups: DayGroup[] = [
    {
      date: 'Hôm nay',
      messages: [
        {
          id: 'msg-01',
          fromMe: false,
          text: 'Ảnh minh họa dự án',
          kind: 'photo',
          time: '11:00',
          attachments: [
            {
              id: 'att-01',
              kind: 'IMAGE',
              fileName: 'photo.jpg',
              mimeType: 'image/jpeg',
              sizeBytes: 1024 * 500,
              previewUrl: 'https://example.com/photo.jpg',
              downloadUrl: 'https://example.com/photo.jpg',
            },
          ],
        },
        {
          id: 'msg-02',
          fromMe: true,
          text: 'Tài liệu hướng dẫn',
          kind: 'file',
          time: '11:05',
          attachments: [
            {
              id: 'att-02',
              kind: 'FILE',
              fileName: 'HuongDan.pdf',
              mimeType: 'application/pdf',
              sizeBytes: 1024 * 1024 * 2.5,
              previewUrl: 'https://example.com/HuongDan.pdf',
              downloadUrl: 'https://example.com/HuongDan.pdf',
            },
          ],
        },
      ],
    },
  ]

  const renderWithProviders = (ui: React.ReactElement) => {
    return renderToString(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
      </MemoryRouter>,
    )
  }

  it('renders conversation identity, avatar, online indicator and name', () => {
    const html = renderWithProviders(
      <ConversationInfoPanel
        conversation={dummyConversation}
        groups={dummyGroups}
        onClose={() => {}}
      />,
    )

    expect(html).toContain('Đồ đệ giuột của Mr.An')
    expect(html).toContain('Thông tin đoạn chat')
    expect(html).toContain('bg-success')
  })

  it('renders 3 quick action buttons: profile, mute and search', () => {
    const html = renderWithProviders(
      <ConversationInfoPanel
        conversation={dummyConversation}
        groups={dummyGroups}
        onClose={() => {}}
      />,
    )

    expect(html).toContain('Hồ sơ')
    expect(html).toContain('Tắt thông báo')
    expect(html).toContain('Tìm kiếm')
  })

  it('renders accordions collapsed by default with aria-expanded="false"', () => {
    const html = renderWithProviders(
      <ConversationInfoPanel
        conversation={dummyConversation}
        groups={dummyGroups}
        onClose={() => {}}
      />,
    )

    expect(html).toContain('File phương tiện &amp; File')
    expect(html).toContain('Quyền riêng tư &amp; Quản lý')
    // Both sections default to collapsed
    expect(html).toContain('aria-expanded="false"')
  })

  it('renders horizontal resizable drag handle for desktop', () => {
    const html = renderWithProviders(
      <ConversationInfoPanel
        conversation={dummyConversation}
        groups={dummyGroups}
        onClose={() => {}}
      />,
    )

    expect(html).toContain('role="separator"')
    expect(html).toContain('cursor-col-resize')
    expect(html).toContain('tabindex="0"')
  })

  it('ConversationHeader renders more options button and highlights when isInfoOpen is true', () => {
    const closedHtml = renderWithProviders(
      <ConversationHeader
        conversation={dummyConversation}
        showBack={false}
        isInfoOpen={false}
        onToggleInfo={() => {}}
      />,
    )

    expect(closedHtml).toContain('title="Thông tin đoạn chat"')
    expect(closedHtml).toContain('aria-expanded="false"')

    const openHtml = renderWithProviders(
      <ConversationHeader
        conversation={dummyConversation}
        showBack={false}
        isInfoOpen={true}
        onToggleInfo={() => {}}
      />,
    )

    expect(openHtml).toContain('aria-expanded="true"')
    expect(openHtml).toContain('ring-1')
  })

  it('applies semantic color classes for Light and Dark theme compatibility', () => {
    const html = renderWithProviders(
      <ConversationInfoPanel
        conversation={dummyConversation}
        groups={dummyGroups}
        onClose={() => {}}
      />,
    )

    expect(html).toContain('bg-card')
    expect(html).toContain('border-border')
    expect(html).toContain('text-foreground')
    expect(html).toContain('text-muted-foreground')
    expect(html).toContain('text-brand-ink')
  })

  it('renders User Profile Card with username, friend badge, unfriend and block buttons, and no raw UUID', () => {
    const convWithUsername: Conversation = {
      ...dummyConversation,
      partnerUsername: 'antran_hust',
      partnerBio: 'Yêu công nghệ',
    }
    const html = renderWithProviders(
      <UserProfileCardContent
        conversation={convWithUsername}
        username="antran_hust"
        bio="Yêu công nghệ"
        onClose={() => {}}
      />,
    )

    // Card structure in DOM
    expect(html).toContain('Đồ đệ giuột của Mr.An')
    expect(html).toContain('@antran_hust')
    expect(html).toContain('Bạn bè')
    expect(html).toContain('Yêu công nghệ')
    expect(html).toContain('Hủy kết bạn')
    expect(html).toContain('Chặn người dùng')
    expect(html).toContain('Đóng')
    // Must NOT contain technical ID field
    expect(html).not.toContain('ID user-friend-01')
  })

  it('does not include redundant mute toggle inside Privacy & Management accordion', () => {
    const html = renderWithProviders(
      <ConversationInfoPanel
        conversation={dummyConversation}
        groups={dummyGroups}
        onClose={() => {}}
      />,
    )

    // The single mute button is only in top quick actions, not duplicated in the accordion
    expect(html).not.toContain('Tắt thông báo cuộc trò chuyện')
  })

  it('renders video thumbnail with <video> element and play overlay in media list', () => {
    const videoGroups: DayGroup[] = [
      {
        date: 'Hôm nay',
        messages: [
          {
            id: 'msg-v1',
            fromMe: false,
            text: 'Video demo',
            kind: 'video',
            time: '12:00',
            attachments: [
              {
                id: 'att-v1',
                kind: 'VIDEO',
                fileName: 'demo.mp4',
                mimeType: 'video/mp4',
                sizeBytes: 1024 * 1024 * 5,
                durationMs: 15000,
                previewUrl: 'https://example.com/demo.mp4',
                downloadUrl: 'https://example.com/demo.mp4',
              },
            ],
          },
        ],
      },
    ]

    const html = renderWithProviders(
      <ConversationInfoPanel
        conversation={dummyConversation}
        groups={videoGroups}
        onClose={() => {}}
        defaultMediaOpen={true}
      />,
    )

    // Must render HTML5 video tag with preload metadata
    expect(html).toContain('<video')
    expect(html).toContain('demo.mp4')
    expect(html).toContain('preload="metadata"')
    // Duration badge
    expect(html).toContain('0:15')
  })

  it('orders media and files from newest to oldest', () => {
    const orderedGroups: DayGroup[] = [
      {
        date: 'Hôm qua',
        messages: [
          {
            id: 'msg-old',
            fromMe: false,
            text: 'Ảnh cũ',
            kind: 'photo',
            time: '10:00',
            attachments: [
              {
                id: 'att-old',
                kind: 'IMAGE',
                fileName: 'older-image.jpg',
                mimeType: 'image/jpeg',
                sizeBytes: 1024 * 100,
                previewUrl: 'https://example.com/older-image.jpg',
                downloadUrl: 'https://example.com/older-image.jpg',
              },
            ],
          },
        ],
      },
      {
        date: 'Hôm nay',
        messages: [
          {
            id: 'msg-new',
            fromMe: false,
            text: 'Video mới',
            kind: 'video',
            time: '12:00',
            attachments: [
              {
                id: 'att-new',
                kind: 'VIDEO',
                fileName: 'newer-video.mp4',
                mimeType: 'video/mp4',
                sizeBytes: 1024 * 1024,
                previewUrl: 'https://example.com/newer-video.mp4',
                downloadUrl: 'https://example.com/newer-video.mp4',
              },
            ],
          },
        ],
      },
    ]

    const html = renderWithProviders(
      <ConversationInfoPanel
        conversation={dummyConversation}
        groups={orderedGroups}
        onClose={() => {}}
        defaultMediaOpen={true}
      />,
    )

    const indexNew = html.indexOf('newer-video.mp4')
    const indexOld = html.indexOf('older-image.jpg')

    // Newest must appear before oldest
    expect(indexNew).toBeGreaterThan(-1)
    expect(indexOld).toBeGreaterThan(-1)
    expect(indexNew).toBeLessThan(indexOld)
  })

  it('limits display of media items to 6 and shows view all toggle when exceeding limit', () => {
    const manyMediaGroups: DayGroup[] = [
      {
        date: 'Hôm nay',
        messages: Array.from({ length: 8 }, (_, i) => ({
          id: `msg-${i}`,
          fromMe: false,
          text: `Media ${i}`,
          kind: 'photo' as const,
          time: `10:0${i}`,
          attachments: [
            {
              id: `att-${i}`,
              kind: 'IMAGE' as const,
              fileName: `photo-${i}.jpg`,
              mimeType: 'image/jpeg',
              sizeBytes: 1024 * 100,
              previewUrl: `https://example.com/photo-${i}.jpg`,
              downloadUrl: `https://example.com/photo-${i}.jpg`,
            },
          ],
        })),
      },
    ]

    const html = renderWithProviders(
      <ConversationInfoPanel
        conversation={dummyConversation}
        groups={manyMediaGroups}
        onClose={() => {}}
        defaultMediaOpen={true}
      />,
    )

    // Must show toggle button with total count
    expect(html).toContain('Xem tất cả (8)')
    // Since only 6 are shown initially: photo-7, 6, 5, 4, 3, 2 are in displayedMedia (reversed)
    // while photo-0 and photo-1 are cut off in the initial collapsed state
    expect(html).toContain('photo-7.jpg')
    expect(html).not.toContain('photo-0.jpg')
  })

  it('loads older archive items independently from the visible message groups', () => {
    const conversation = { ...dummyConversation, id: 'archive-conversation' }
    queryClient.setQueryData(CHAT_QUERY_KEYS.mediaArchive(conversation.id), {
      pages: [
        {
          items: [
            {
              id: 'old-message',
              createdAt: '2026-01-01T10:00:00Z',
              attachments: [
                {
                  id: 'old-attachment',
                  kind: 'IMAGE' as const,
                  fileName: 'older-archive-photo.jpg',
                  mimeType: 'image/jpeg',
                  sizeBytes: 1024,
                  previewUrl: 'https://example.com/older-archive-photo.jpg',
                  downloadUrl: 'https://example.com/older-archive-photo.jpg',
                },
              ],
            },
          ],
          hasMore: true,
          nextCursor: 'older-cursor',
        },
      ],
      pageParams: [{}],
    })

    const html = renderWithProviders(
      <ConversationInfoPanel
        conversation={conversation}
        groups={[]}
        onClose={() => {}}
        defaultMediaOpen={true}
      />,
    )

    expect(html).toContain('older-archive-photo.jpg')
    expect(html).toContain('Tải thêm mục cũ hơn')
  })

  it('ImageLightboxModal renders video player with controls for video attachments', () => {
    const videoAttachment: MessageAttachmentItem = {
      id: 'att-video-player',
      kind: 'VIDEO',
      fileName: 'clip.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 1024 * 1024 * 10,
      previewUrl: 'https://example.com/clip.mp4',
      downloadUrl: 'https://example.com/clip.mp4',
    }

    const html = renderWithProviders(
      <ImageLightboxModal attachment={videoAttachment} onClose={() => {}} />,
    )

    expect(html).toContain('<video')
    expect(html).toContain('controls=""')
    expect(html).toContain('clip.mp4')
    // Must NOT show zoom or rotate buttons for videos
    expect(html).not.toContain('Phóng to')
    expect(html).not.toContain('Xoay ảnh')
    // Must show download and close
    expect(html).toContain('Tải về máy')
    expect(html).toContain('Đóng (Esc)')
  })

  it('AttachmentBubble renders fullscreen button for videos in chat messages', () => {
    const videoAttachment: MessageAttachmentItem = {
      id: 'att-video-bubble',
      kind: 'VIDEO',
      fileName: 'nature.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 1024 * 1024 * 20,
      previewUrl: 'https://example.com/nature.mp4',
      downloadUrl: 'https://example.com/nature.mp4',
    }

    const html = renderWithProviders(
      <AttachmentBubble attachment={videoAttachment} onOpenLightbox={() => {}} />,
    )

    expect(html).toContain('<video')
    expect(html).toContain('Xem toàn màn hình')
  })
})
