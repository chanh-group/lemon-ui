import type { MessageResponse, MessageTimelineResponse } from '../types/chat.types'

export async function fetchMissedMessages(
  after: string,
  fetchPage: (after: string) => Promise<MessageTimelineResponse>,
): Promise<MessageResponse[]> {
  const messages: MessageResponse[] = []
  let cursor = after
  const seen = new Set([cursor])

  while (true) {
    const page = await fetchPage(cursor)
    messages.push(...page.items)
    if (!page.hasMore) return messages
    if (!page.nextCursor || seen.has(page.nextCursor)) throw new Error('Invalid message cursor')
    cursor = page.nextCursor
    seen.add(cursor)
  }
}
