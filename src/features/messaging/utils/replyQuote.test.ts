import { describe, expect, it } from 'vitest'
import { createInstance } from 'i18next'
import en from '@/locales/en.json'
import vi from '@/locales/vi.json'
import { resolveReplyQuote, inferReplyCategory, isReplyTargetComplete } from './replyQuote'
import type { MessageReplyTarget } from '../types/message.types'

describe('replyQuote pure helper', () => {
  const createT = async (lng: 'vi' | 'en') => {
    const i18n = createInstance()
    await i18n.init({
      lng,
      resources: { vi: { translation: vi }, en: { translation: en } },
      interpolation: { escapeValue: false },
    })
    return i18n.t.bind(i18n)
  }

  it('infers content category accurately from target properties', () => {
    expect(
      inferReplyCategory({
        id: '1',
        senderId: 'u1',
        kind: 'TEXT',
        body: 'Hello',
        deletedAt: null,
      }),
    ).toBe('MESSAGE')

    expect(
      inferReplyCategory({
        id: '2',
        senderId: 'u1',
        kind: 'TEXT',
        body: null,
        deletedAt: null,
        attachments: [
          {
            id: 'a1',
            kind: 'IMAGE',
            fileName: 'photo.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 100,
            previewUrl: 'https://r2/p.jpg',
            downloadUrl: 'https://r2/p.jpg',
          },
        ],
      }),
    ).toBe('ATTACHMENT')

    expect(
      inferReplyCategory({
        id: '3',
        senderId: 'u1',
        kind: 'TEXT',
        body: null,
        deletedAt: null,
        attachments: [
          {
            id: 'a2',
            kind: 'AUDIO',
            fileName: 'voice.webm',
            mimeType: 'audio/webm',
            sizeBytes: 100,
            previewUrl: '',
            downloadUrl: '',
          },
        ],
      }),
    ).toBe('VOICE')

    expect(
      inferReplyCategory({
        id: '4',
        senderId: 'u1',
        kind: 'STORY_REPLY',
        body: 'Cool',
        deletedAt: null,
      }),
    ).toBe('STORY')
  })

  it('resolves active message quote without any sender name in quote bubble', async () => {
    const t = await createT('vi')
    const target: MessageReplyTarget = {
      id: 'm1',
      senderId: 'u2',
      kind: 'TEXT',
      body: 'Nội dung tin nhắn',
      deletedAt: null,
    }

    const resolved = resolveReplyQuote(target, t)
    expect(resolved.availability).toBe('available')
    expect(resolved.category).toBe('MESSAGE')
    expect(resolved.label).toBe('Nội dung tin nhắn')
    expect(resolved.label).not.toContain('Replying to')
    expect(resolved.label).not.toContain('Trả lời')
    expect(resolved.canNavigate).toBe(true)
  })

  it('resolves typed tombstones for all 5 categories in both VI and EN', async () => {
    const tVi = await createT('vi')
    const tEn = await createT('en')

    const baseTombstone = (
      contentCategory: MessageReplyTarget['contentCategory'],
    ): MessageReplyTarget => ({
      id: 'm-revoked',
      senderId: 'u1',
      kind: 'TEXT',
      body: null,
      deletedAt: new Date().toISOString(),
      contentCategory,
    })

    // 1. MESSAGE
    expect(resolveReplyQuote(baseTombstone('MESSAGE'), tVi).label).toBe('Đã gỡ tin nhắn')
    expect(resolveReplyQuote(baseTombstone('MESSAGE'), tEn).label).toBe('Message removed')

    // 2. ATTACHMENT
    expect(resolveReplyQuote(baseTombstone('ATTACHMENT'), tVi).label).toBe('Tệp đính kèm đã gỡ')
    expect(resolveReplyQuote(baseTombstone('ATTACHMENT'), tEn).label).toBe('Attachment removed')

    // 3. VOICE
    expect(resolveReplyQuote(baseTombstone('VOICE'), tVi).label).toBe('Tệp thoại đã gỡ')
    expect(resolveReplyQuote(baseTombstone('VOICE'), tEn).label).toBe('Voice note removed')

    // 4. STORY
    expect(resolveReplyQuote(baseTombstone('STORY'), tVi).label).toBe('Tin không còn nữa')
    expect(resolveReplyQuote(baseTombstone('STORY'), tEn).label).toBe('Story no longer available')

    // 5. UNKNOWN
    expect(resolveReplyQuote(baseTombstone('UNKNOWN'), tVi).label).toBe('Nội dung không khả dụng')
    expect(resolveReplyQuote(baseTombstone('UNKNOWN'), tEn).label).toBe('Content unavailable')

    // Missing target
    expect(resolveReplyQuote(null, tVi)).toMatchObject({
      availability: 'unavailable',
      category: 'UNKNOWN',
      label: 'Nội dung không khả dụng',
      canNavigate: false,
    })
    expect(resolveReplyQuote(null, tEn)).toMatchObject({
      availability: 'unavailable',
      category: 'UNKNOWN',
      label: 'Content unavailable',
      canNavigate: false,
    })
  })

  it('sanitizes empty string thumbnail URLs so empty <img> tags are not rendered', async () => {
    const t = await createT('vi')
    const targetWithEmptyUrl: MessageReplyTarget = {
      id: 'm-img',
      senderId: 'u1',
      kind: 'IMAGE',
      body: null,
      deletedAt: null,
      attachments: [
        {
          id: 'att-1',
          kind: 'IMAGE',
          fileName: 'pic.png',
          mimeType: 'image/png',
          sizeBytes: 200,
          previewUrl: '   ',
          downloadUrl: '',
        },
      ],
    }

    const resolved = resolveReplyQuote(targetWithEmptyUrl, t)
    expect(resolved.thumbnailUrl).toBeUndefined()
  })

  it('labels active voice notes, unknown content and story captions in both languages', async () => {
    const tVi = await createT('vi')
    const tEn = await createT('en')

    const voice: MessageReplyTarget = {
      id: 'm-voice',
      senderId: 'u1',
      kind: 'AUDIO',
      body: null,
      deletedAt: null,
    }
    expect(resolveReplyQuote(voice, tVi).label).toBe('Tệp thoại')
    expect(resolveReplyQuote(voice, tEn).label).toBe('Voice note')

    const system: MessageReplyTarget = {
      id: 'm-sys',
      senderId: 'u1',
      kind: 'SYSTEM',
      body: null,
      deletedAt: null,
    }
    expect(resolveReplyQuote(system, tVi).label).toBe('Nội dung không khả dụng')
    expect(resolveReplyQuote(system, tEn).label).toBe('Content unavailable')

    const storyPreview = {
      id: 's1',
      kind: 'IMAGE' as const,
      caption: 'At the beach',
      mediaUrl: 'https://r2/s.jpg',
      background: null,
    }
    const story: MessageReplyTarget = {
      id: 'm-story',
      senderId: 'u1',
      kind: 'STORY_REPLY',
      body: 'Bạn nam kdc à',
      deletedAt: null,
      storyPreview,
    }
    // Story quotes show the story caption (issue #36), not the reply body.
    expect(resolveReplyQuote(story, tVi).label).toBe('At the beach')
    expect(resolveReplyQuote(story, tVi).thumbnailUrl).toBe('https://r2/s.jpg')
    // Caption-less story falls back to the body, then to the unnamed-story label.
    expect(
      resolveReplyQuote({ ...story, storyPreview: { ...storyPreview, caption: null } }, tVi).label,
    ).toBe('Bạn nam kdc à')
    const captionless = { ...storyPreview, caption: null }
    expect(resolveReplyQuote({ ...story, body: null, storyPreview: captionless }, tVi).label).toBe(
      'Trả lời tin',
    )
    expect(resolveReplyQuote({ ...story, body: null, storyPreview: captionless }, tEn).label).toBe(
      'Replied to story',
    )
  })

  it('uses the presigned preview attachment for thumbnails and file names', async () => {
    const t = await createT('vi')
    const target: MessageReplyTarget = {
      id: 'm-att',
      senderId: 'u1',
      kind: 'TEXT',
      body: null,
      deletedAt: null,
      contentCategory: 'ATTACHMENT',
      previewAttachment: {
        id: 'a1',
        kind: 'IMAGE',
        fileName: 'pic.jpg',
        mimeType: 'image/jpeg',
        previewUrl: 'https://r2/pic.jpg',
      },
    }
    const resolved = resolveReplyQuote(target, t)
    expect(resolved.thumbnailUrl).toBe('https://r2/pic.jpg')
    expect(resolved.label).toBe('pic.jpg')
  })

  it('renders a redacted story target as gone without navigation', async () => {
    const tVi = await createT('vi')
    const tEn = await createT('en')
    const goneStory: MessageReplyTarget = {
      id: 'm-gone',
      senderId: 'u1',
      kind: 'STORY_REPLY',
      body: 'Bạn nam kdc à',
      deletedAt: null,
      storyPreview: null,
    }
    expect(resolveReplyQuote(goneStory, tVi)).toMatchObject({
      availability: 'unavailable',
      category: 'STORY',
      label: 'Tin không còn nữa',
      canNavigate: false,
    })
    expect(resolveReplyQuote(goneStory, tEn).label).toBe('Story no longer available')
    expect(resolveReplyQuote(goneStory, tVi).thumbnailUrl).toBeUndefined()
  })
})

describe('isReplyTargetComplete', () => {
  const base = {
    id: 'm1',
    senderId: 'u1',
    kind: 'TEXT',
    body: 'caption',
    deletedAt: null,
  } as const

  it('needs a refetch for active attachment targets without a preview', () => {
    expect(isReplyTargetComplete({ ...base, contentCategory: 'ATTACHMENT' })).toBe(false)
    expect(
      isReplyTargetComplete({
        ...base,
        contentCategory: 'ATTACHMENT',
        previewAttachment: { id: 'a1', kind: 'IMAGE', fileName: 'p.jpg', mimeType: 'image/jpeg' },
      }),
    ).toBe(true)
  })

  it('needs no refetch for text, story and voice targets carrying their quote data', () => {
    expect(isReplyTargetComplete({ ...base, contentCategory: 'MESSAGE' })).toBe(true)
    expect(
      isReplyTargetComplete({
        ...base,
        kind: 'STORY_REPLY',
        contentCategory: 'STORY',
        storyPreview: { id: 's1', kind: 'IMAGE', caption: null, background: null },
      }),
    ).toBe(true)
    expect(isReplyTargetComplete({ ...base, kind: 'AUDIO', contentCategory: 'VOICE' })).toBe(true)
  })

  it('requires a category for tombstones and falls back to the legacy heuristic', () => {
    expect(isReplyTargetComplete({ ...base, deletedAt: '2026-01-01' })).toBe(false)
    expect(
      isReplyTargetComplete({ ...base, deletedAt: '2026-01-01', contentCategory: 'MESSAGE' }),
    ).toBe(true)
    expect(isReplyTargetComplete(base)).toBe(true)
    expect(isReplyTargetComplete({ ...base, kind: 'IMAGE', body: null })).toBe(false)
    expect(isReplyTargetComplete(null)).toBe(false)
  })
})
