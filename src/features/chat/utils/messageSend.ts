import type { MessageAttachmentInput } from '../types/chat.types'
import { ApiError } from '@/infrastructure/api/errors'

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
export function isUncertainSendError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 0 || error.status >= 500)
}

export async function retryUncertainSend<T>(send: () => Promise<T>): Promise<T> {
  try {
    return await send()
  } catch (error) {
    if (!isUncertainSendError(error)) throw error
    return send()
  }
}
