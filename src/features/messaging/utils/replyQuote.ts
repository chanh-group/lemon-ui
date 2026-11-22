import type { MessageReplyTarget, ReplyContentCategory } from '../types/message.types'
import { isImage, isVideo } from '@/features/file/utils/fileTypes'

export type ReplyAvailability = 'loading' | 'available' | 'removed' | 'unavailable'

export interface ResolvedReplyQuote {
  availability: ReplyAvailability
  category: ReplyContentCategory
  label: string
  text?: string
  thumbnailUrl?: string
  canNavigate: boolean
}

/**
 * Infer contentCategory when backend has not yet provided it (e.g. rolling deploy or optimistic state).
 */
export function inferReplyCategory(target: MessageReplyTarget): ReplyContentCategory {
  if (target.contentCategory) return target.contentCategory
  if (target.kind === 'STORY_REPLY' || target.kind === 'STORY_REACTION') return 'STORY'
  if (target.attachments && target.attachments.length > 0) {
    return target.attachments.every((a) => a.kind === 'AUDIO') ? 'VOICE' : 'ATTACHMENT'
  }
  if (target.previewAttachment) {
    return target.previewAttachment.kind === 'AUDIO' ? 'VOICE' : 'ATTACHMENT'
  }
  if (target.kind === 'AUDIO') return 'VOICE'
  if (target.kind === 'IMAGE' || target.kind === 'VIDEO' || target.kind === 'FILE') {
    return 'ATTACHMENT'
  }
  if (target.kind === 'TEXT') return 'MESSAGE'
  return 'UNKNOWN'
}

/**
 * Whether the initial target already carries everything the quote needs (skip refetch).
 */
export function isReplyTargetComplete(target: MessageReplyTarget | null | undefined): boolean {
  if (!target) return false
  if (target.deletedAt) return Boolean(target.contentCategory)
  if (target.contentCategory) {
    return target.contentCategory !== 'ATTACHMENT' || Boolean(target.previewAttachment)
  }
  // Legacy backend without contentCategory: refetch only when quote data is missing.
  return (
    target.kind === 'TEXT' ||
    Boolean(target.storyPreview) ||
    Boolean(target.previewAttachment?.previewUrl) ||
    Boolean(target.attachments?.[0]?.previewUrl)
  )
}

/**
 * Resolve UI quote presentation for a message reply target.
 * Note: bubble quote NEVER shows "Replying to [name]".
 */
export function resolveReplyQuote(
  target: MessageReplyTarget | null | undefined,
  t: (key: string, options?: Record<string, unknown>) => string,
): ResolvedReplyQuote {
  if (!target) {
    return {
      availability: 'unavailable',
      category: 'UNKNOWN',
      label: t('chat.replyUnavailableContent'),
      canNavigate: false,
    }
  }

  const category = inferReplyCategory(target)

  if (target.deletedAt) {
    let label = t('chat.replyUnavailableContent')
    switch (category) {
      case 'MESSAGE':
        label = t('chat.replyRemovedMessage')
        break
      case 'ATTACHMENT':
        label = t('chat.replyRemovedAttachment')
        break
      case 'VOICE':
        label = t('chat.replyRemovedVoice')
        break
      case 'STORY':
        label = t('chat.replyUnavailableStory')
        break
      case 'UNKNOWN':
      default:
        label = t('chat.replyUnavailableContent')
        break
    }
    return {
      availability: 'removed',
      category,
      label,
      canNavigate: true,
    }
  }

  // Story content is gone (redacted at serialization): tombstone without navigation.
  if (category === 'STORY' && !target.storyPreview) {
    return {
      availability: 'unavailable',
      category,
      label: t('chat.replyUnavailableStory'),
      canNavigate: false,
    }
  }

  // Active message
  let thumbnailUrl: string | undefined
  if (target.previewAttachment?.previewUrl) {
    thumbnailUrl = target.previewAttachment.previewUrl
  } else if (target.attachments?.[0]?.kind === 'IMAGE') {
    thumbnailUrl = target.attachments[0].previewUrl || target.attachments[0].downloadUrl
  } else if (target.storyPreview) {
    thumbnailUrl = target.storyPreview.mediaUrl || undefined
  }
  if (!thumbnailUrl || thumbnailUrl.trim() === '') {
    thumbnailUrl = undefined
  }

  // Story quotes show the story content (issue #36): caption first, reply body only as fallback.
  let text: string | undefined =
    category === 'STORY'
      ? target.storyPreview?.caption || target.body || undefined
      : (target.body ?? undefined)
  if (!text) {
    const attachment = target.previewAttachment ?? target.attachments?.[0]
    const isTargetVideo = Boolean(
      attachment &&
      (attachment.kind === 'VIDEO' || isVideo(attachment.mimeType, attachment.fileName)),
    )
    const isTargetImage = Boolean(
      attachment &&
      (attachment.kind === 'IMAGE' ||
        isImage(attachment.mimeType, attachment.fileName) ||
        (Boolean(thumbnailUrl) && !isTargetVideo)),
    )

    if (category === 'VOICE') {
      text = t('chat.voiceNoteLabel')
    } else if (category === 'STORY') {
      text = t('chat.replyToStory')
    } else if (category === 'ATTACHMENT') {
      if (isTargetImage) {
        text = t('chat.photo')
      } else if (isTargetVideo) {
        text = t('chat.video')
      } else {
        text = attachment?.fileName || t('chat.attachment')
      }
    }
  }

  return {
    availability: 'available',
    category,
    label: text || t('chat.replyUnavailableContent'),
    text,
    thumbnailUrl,
    canNavigate: true,
  }
}
