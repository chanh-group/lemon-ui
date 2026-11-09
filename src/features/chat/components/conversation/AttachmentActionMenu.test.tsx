import { describe, expect, it } from 'bun:test'
import { renderToString } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MessageActionPill } from './AttachmentActionMenu'
import type { ChatMessage } from '../../types/chat.types'

describe('AttachmentActionMenu & MessageActionPill Component', () => {
  const dummyMessage: ChatMessage = {
    id: 'msg-01',
    fromMe: true,
    text: 'Hello Lemon!',
    kind: 'text',
    time: '12:00',
    createdAt: '2026-11-09T05:00:00Z',
  }

  it('renders 3 action buttons for message interaction', () => {
    const html = renderToString(
      <MessageActionPill
        message={dummyMessage}
        isMe={true}
      />
    )

    expect(html).toContain('title="Thả cảm xúc"')
    expect(html).toContain('title="Chuyển tiếp"')
    expect(html).toContain('title="Tùy chọn khác"')
  })

  it('applies crisp light mode background and high contrast text styling', () => {
    const html = renderToString(
      <MessageActionPill
        message={dummyMessage}
        isMe={true}
      />
    )

    // Verify the buttons use bg-white and text-foreground/80
    expect(html).toContain('bg-white')
    expect(html).toContain('dark:bg-zinc-800')
    expect(html).toContain('text-foreground/80')
    expect(html).toContain('border-border/80')
    expect(html).toContain('shadow-sm')
  })

  it('globals.css defines @custom-variant dark to isolate OS dark mode from light theme', () => {
    const cssPath = resolve(import.meta.dir, '../../../../app/styles/globals.css')
    const cssContent = readFileSync(cssPath, 'utf-8')

    expect(cssContent).toContain('@custom-variant dark (&:where(.dark, .dark *));')
  })
})
