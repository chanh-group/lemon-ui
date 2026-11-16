export type MessageScrollPosition =
  | { kind: 'bottom' }
  | { kind: 'message'; messageId: string; offset: number }

const positions = new Map<string, MessageScrollPosition>()

export function getMessageScrollPosition(
  conversationId: string,
): MessageScrollPosition | undefined {
  return positions.get(conversationId)
}

export function saveMessageScrollPosition(
  conversationId: string,
  position: MessageScrollPosition,
): void {
  positions.set(conversationId, position)
}
