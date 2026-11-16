import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import '@/i18n'
import { TypingIndicator } from './TypingIndicator'
import type { Conversation } from '@/features/conversation/types/conversation.types'

describe('TypingIndicator', () => {
  const conversation: Conversation = {
    id: 'conv-01',
    name: 'Tran An',
    preview: '',
    previewKind: 'text',
    time: '',
    unread: 0,
    online: true,
    isGroup: false,
    partnerId: 'user-01',
    partnerAvatar: null,
  }

  it('renders an accessible bottom-of-conversation typing bubble', () => {
    const html = renderToString(<TypingIndicator conversation={conversation} userCount={1} />)

    expect(html).toContain('role="status"')
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('animate-typing-dot')
    expect(html).toContain('Đang soạn tin nhắn')
  })

  it('renders nothing when nobody is typing', () => {
    expect(renderToString(<TypingIndicator conversation={conversation} userCount={0} />)).toBe('')
  })
})
