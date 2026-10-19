import { useEffect, useRef, useState } from 'react'
import type { ChatMessage, DayGroup } from '../types/chat.types'
import { MOCK_THREADS } from '../data/mockData'

function nowTime(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

interface UseChatThreadsOptions {
  /** Nhãn ngày hiện tại (i18n) — dùng làm date-group cho tin nhắn mới. */
  todayLabel: string
}

/**
 * State luồng tin nhắn (mock): lưu theo hội thoại, gửi tin + phản hồi mẫu nhẹ
 * để người dùng thấy composer hoạt động ngay.
 */
export function useChatThreads({ todayLabel }: UseChatThreadsOptions) {
  const [threads, setThreads] = useState<Record<string, DayGroup[]>>(MOCK_THREADS)
  const replyTimer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (replyTimer.current !== null) window.clearTimeout(replyTimer.current)
    },
    [],
  )

  const appendMessage = (conversationId: string, msg: ChatMessage) => {
    setThreads((prev) => {
      const current = prev[conversationId] ?? []
      const last = current[current.length - 1]
      if (last && last.date === todayLabel) {
        return { ...prev, [conversationId]: [...current.slice(0, -1), { ...last, messages: [...last.messages, msg] }] }
      }
      return { ...prev, [conversationId]: [...current, { date: todayLabel, messages: [msg] }] }
    })
  }

  const send = (conversationId: string, text: string, mockReply: string, conversationName: string, isGroup: boolean) => {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      fromMe: true,
      text,
      kind: 'text',
      time: nowTime(),
      status: 'sent',
    }
    appendMessage(conversationId, msg)

    // Phản hồi mẫu nhẹ (mock data only)
    if (replyTimer.current !== null) window.clearTimeout(replyTimer.current)
    replyTimer.current = window.setTimeout(() => {
      appendMessage(conversationId, {
        id: crypto.randomUUID(),
        fromMe: false,
        sender: isGroup ? conversationName : undefined,
        text: mockReply,
        kind: 'text',
        time: nowTime(),
      })
    }, 1200)
  }

  const sendStoryReply = (
    conversationId: string,
    text: string,
    story: { id: string; name: string; kind?: string; caption?: string | null; mediaUrl?: string | null; background?: string | null },
    mockReply: string,
  ) => {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      fromMe: true,
      text,
      kind: 'text',
      time: nowTime(),
      status: 'sent',
      storyId: story.id,
      storyPreview: {
        id: story.id,
        kind: story.kind === 'MEDIA' ? 'MEDIA' : 'TEXT',
        caption: story.caption || story.name,
        mediaUrl: story.mediaUrl,
        background: story.background,
        authorName: story.name,
      },
    }
    appendMessage(conversationId, msg)

    if (replyTimer.current !== null) window.clearTimeout(replyTimer.current)
    replyTimer.current = window.setTimeout(() => {
      appendMessage(conversationId, {
        id: crypto.randomUUID(),
        fromMe: false,
        sender: story.name,
        text: mockReply,
        kind: 'text',
        time: nowTime(),
      })
    }, 1200)
  }

  return { threads, send, sendStoryReply }
}

