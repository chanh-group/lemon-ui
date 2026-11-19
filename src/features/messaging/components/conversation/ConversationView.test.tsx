// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { ConversationView } from './ConversationView'
import type { Conversation } from '@/features/conversation/types/conversation.types'

const mocks = vi.hoisted(() => ({
  messageListProps: vi.fn(),
}))

vi.mock('./ConversationHeader', () => ({
  ConversationHeader: () => <div data-testid="conversation-header" />,
}))
vi.mock('./ConversationInfoPanel', () => ({
  ConversationInfoPanel: () => <div data-testid="conversation-info" />,
}))
vi.mock('./MessageComposer', () => ({
  MessageComposer: () => <div data-testid="message-composer" />,
}))
vi.mock('./MessageList', () => ({
  MessageList: (props: { typingUserCount?: number; typingNames?: string[] }) => {
    mocks.messageListProps(props)
    return props.typingUserCount ? <div role="status">{props.typingNames?.join(', ')}</div> : null
  },
}))

const conversation: Conversation = {
  id: 'group-1',
  name: 'Study group',
  preview: '',
  previewKind: 'text',
  time: '',
  unread: 0,
  online: true,
  isGroup: true,
}

const baseProps = {
  conversation,
  isVisible: true,
  groups: [],
  messagesLoading: false,
  onRetryMessages: vi.fn(),
  hasOlderMessages: false,
  isLoadingOlderMessages: false,
  isFetchingMessages: false,
  onLoadOlderMessages: vi.fn(async () => undefined),
  hasNewerMessages: false,
  isLoadingNewerMessages: false,
  onLoadNewerMessages: vi.fn(async () => undefined),
  hasLatest: true,
  onLoadLatest: vi.fn(async () => undefined),
  onVisibleMessage: vi.fn(),
  onRetryMessage: vi.fn(),
  onPositionChange: vi.fn(),
  onSend: vi.fn(async () => true),
  isSending: false,
  showBack: false,
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ConversationView typing integration', () => {
  it('renders one typing status through MessageList at the latest position', () => {
    render(<ConversationView {...baseProps} typingUserCount={2} typingNames={['Alice', 'Bob']} />)

    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.getByRole('status').textContent).toBe('Alice, Bob')
    expect(mocks.messageListProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        typingUserCount: 2,
        typingNames: ['Alice', 'Bob'],
      }),
    )
  })

  it('does not show typing while the timeline is away from the latest page', () => {
    render(
      <ConversationView
        {...baseProps}
        hasLatest={false}
        typingUserCount={1}
        typingNames={['Alice']}
      />,
    )

    expect(screen.queryByRole('status')).toBeNull()
    expect(mocks.messageListProps).not.toHaveBeenCalled()
  })
})
