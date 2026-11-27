import type { MessageAttachmentInput } from '@/features/messaging/types/message.types'
import { isUncertainApiError } from '@/infrastructure/api/errors'

type MessageKind = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'SYSTEM'

export function resolveSendMessageKind(
  body?: string,
  requestedKind?: MessageKind,
  attachments?: { kind?: MessageAttachmentInput['kind'] }[],
): MessageKind {
  const attachmentKinds = new Set(attachments?.flatMap(({ kind }) => (kind ? [kind] : [])))
  if (body?.trim() || attachmentKinds.size > 1) return 'TEXT'
  return requestedKind ?? attachmentKinds.values().next().value ?? 'TEXT'
}

export async function retryUncertainSend<T>(send: () => Promise<T>): Promise<T> {
  try {
    return await send()
  } catch (error) {
    if (!isUncertainApiError(error)) throw error
    return send()
  }
}

const pendingMessagePreviews = new Map<string, { conversationId: string; urls: Set<string> }>()

function revokePreview(url: string): void {
  if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url)
}

function previewKey(conversationId: string, clientMsgId: string): string {
  return `${conversationId}:${clientMsgId}`
}

export function registerPendingMessagePreviews(
  conversationId: string,
  clientMsgId: string,
  files: Array<{ previewUrl?: string }>,
): void {
  const urls = files.flatMap((file) => (file.previewUrl ? [file.previewUrl] : []))
  if (urls.length === 0) return
  const key = previewKey(conversationId, clientMsgId)
  const existing = pendingMessagePreviews.get(key)
  if (existing) {
    urls.forEach((url) => existing.urls.add(url))
    return
  }
  pendingMessagePreviews.set(key, { conversationId, urls: new Set(urls) })
}

export function releasePendingMessagePreviews(conversationId: string, clientMsgId: string): void {
  const key = previewKey(conversationId, clientMsgId)
  const entry = pendingMessagePreviews.get(key)
  if (!entry) return
  pendingMessagePreviews.delete(key)
  for (const url of entry.urls) revokePreview(url)
}

export function releaseConversationMessagePreviews(conversationId: string): void {
  for (const [key, entry] of pendingMessagePreviews) {
    if (entry.conversationId !== conversationId) continue
    pendingMessagePreviews.delete(key)
    for (const url of entry.urls) revokePreview(url)
  }
}

export function clearAllPendingMessagePreviews(): void {
  for (const entry of pendingMessagePreviews.values()) {
    for (const url of entry.urls) revokePreview(url)
  }
  pendingMessagePreviews.clear()
}
