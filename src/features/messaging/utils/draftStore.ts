const drafts = new Map<string, string>()

export function getConversationDraft(conversationId: string): string {
  return drafts.get(conversationId) ?? ''
}

export function setConversationDraft(conversationId: string, draft: string): void {
  const trimmed = draft.trim()
  if (!trimmed) {
    drafts.delete(conversationId)
  } else {
    drafts.set(conversationId, draft)
  }
}

export function clearConversationDraft(conversationId: string): void {
  drafts.delete(conversationId)
}

export function clearAllDrafts(): void {
  drafts.clear()
}
