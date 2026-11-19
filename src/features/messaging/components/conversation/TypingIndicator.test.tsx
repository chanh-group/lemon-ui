import { afterEach, describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import i18n from '@/i18n'
import { TypingIndicator } from './TypingIndicator'

describe('TypingIndicator', () => {
  afterEach(async () => {
    await i18n.changeLanguage('vi')
  })

  it('renders an accessible bottom-of-conversation typing bubble', () => {
    const html = renderToString(
      <TypingIndicator senderLabel="Tran An" senderAvatarUrl={null} userCount={1} />,
    )

    expect(html).toContain('role="status"')
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('animate-typing-dot')
    expect(html).toContain('Đang soạn tin nhắn')
  })

  it('renders nothing when nobody is typing', () => {
    expect(renderToString(<TypingIndicator senderLabel="Tran An" userCount={0} />)).toBe('')
  })

  it('uses grammatically correct English labels for group typing', async () => {
    await i18n.changeLanguage('en')

    const one = renderToString(
      <TypingIndicator isGroup senderLabel="Study group" userCount={1} names={['Alice']} />,
    )
    const unknown = renderToString(
      <TypingIndicator isGroup senderLabel="Study group" userCount={1} />,
    )
    const two = renderToString(
      <TypingIndicator isGroup senderLabel="Study group" userCount={2} names={['Alice', 'Bob']} />,
    )
    const many = renderToString(
      <TypingIndicator isGroup senderLabel="Study group" userCount={3} names={['Alice', 'Bob']} />,
    )

    expect(one).toContain('Alice is typing')
    expect(unknown).toContain('Someone is typing')
    expect(two).toContain('Alice and Bob are typing')
    expect(many).toContain('Alice, Bob and 1 more are typing')
  })
})
