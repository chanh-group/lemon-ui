import type { MessageResponse, MessageTimelineResponse } from '../types/chat.types'

export async function fetchMissedMessages(
  after: string,
  fetchPage: (after: string) => Promise<MessageTimelineResponse>,
): Promise<MessageResponse[]> {
  const messages: MessageResponse[] = []
  let cursor = after

  while (true) {
    const page = await fetchPage(cursor)
    messages.push(...page.items)
    if (!page.hasMore || !page.nextCursor || page.nextCursor === cursor) return messages
    cursor = page.nextCursor
  }
}
