import type { MessageAttachmentInput } from '../types/chat.types'

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
