import { describe, expect, it } from 'vitest'
import { createInstance } from 'i18next'
import en from './en.json'
import vi from './vi.json'

describe('Localization Integrity & Avatar Text Tests', () => {
  it('translates delete choices, feedback, and revoked placeholders in both languages', async () => {
    const i18n = createInstance()
    await i18n.init({
      lng: 'vi',
      resources: { vi: { translation: vi }, en: { translation: en } },
      interpolation: { escapeValue: false },
    })

    expect(i18n.t('chat.deleteMessage')).toBe('Xóa tin nhắn')
    expect(i18n.t('chat.deleteForMe')).toBe('Xóa ở phía tôi')
    expect(i18n.t('chat.revokeForEveryone')).toBe('Thu hồi với mọi người')
    expect(i18n.t('chat.messageDeletedForMe')).toBe('Đã xóa tin nhắn ở phía bạn')
    expect(i18n.t('chat.messageDeleteFailed')).toBe('Không thể xóa tin nhắn')
    expect(i18n.t('chat.messageRevoked')).toBe('Đã thu hồi tin nhắn với mọi người')
    expect(i18n.t('chat.messageRevokeFailed')).toBe('Không thể thu hồi tin nhắn')
    expect(i18n.t('chat.messageRevokedText')).toBe('Tin nhắn đã bị thu hồi')
    expect(i18n.t('chat.editMessage')).toBe('Chỉnh sửa tin nhắn')
    expect(i18n.t('chat.cancelEdit')).toBe('Hủy')
    expect(i18n.t('chat.saveEdit')).toBe('Lưu')
    expect(i18n.t('chat.messageEdited')).toBe('Đã chỉnh sửa tin nhắn')
    expect(i18n.t('chat.messageEditFailed')).toBe('Không thể chỉnh sửa tin nhắn')
    expect(i18n.t('chat.messageEditedLabel')).toBe('Đã chỉnh sửa')

    await i18n.changeLanguage('en')
    expect(i18n.t('chat.deleteMessage')).toBe('Delete message')
    expect(i18n.t('chat.deleteForMe')).toBe('Delete for me')
    expect(i18n.t('chat.revokeForEveryone')).toBe('Delete for everyone')
    expect(i18n.t('chat.messageDeletedForMe')).toBe('Message deleted for you')
    expect(i18n.t('chat.messageDeleteFailed')).toBe('Could not delete message')
    expect(i18n.t('chat.messageRevoked')).toBe('Message deleted for everyone')
    expect(i18n.t('chat.messageRevokeFailed')).toBe('Could not delete message for everyone')
    expect(i18n.t('chat.messageRevokedText')).toBe('This message was deleted')
    expect(i18n.t('chat.editMessage')).toBe('Edit message')
    expect(i18n.t('chat.cancelEdit')).toBe('Cancel')
    expect(i18n.t('chat.saveEdit')).toBe('Save')
    expect(i18n.t('chat.messageEdited')).toBe('Message updated')
    expect(i18n.t('chat.messageEditFailed')).toBe('Could not update message')
    expect(i18n.t('chat.messageEditedLabel')).toBe('Edited')
  })

  it('interpolates the story author in the avatar label in both languages', async () => {
    const i18n = createInstance()
    await i18n.init({
      lng: 'vi',
      resources: { vi: { translation: vi }, en: { translation: en } },
      // Khớp với cấu hình runtime trong src/i18n.ts
      interpolation: { escapeValue: false },
    })
    expect(i18n.t('chat.viewStoryOf', { name: 'Linh' })).toBe('Xem tin của Linh')
    await i18n.changeLanguage('en')
    expect(i18n.t('chat.viewStoryOf', { name: 'Linh' })).toBe("View Linh's story")
    expect(i18n.t('chat.viewStoryOf', { name: "O'Brien" })).toBe("View O'Brien's story")
  })
  it('has valid translation objects for both EN and VI', () => {
    expect(en).toBeDefined()
    expect(vi).toBeDefined()
    expect(en.chat).toBeDefined()
    expect(vi.chat).toBeDefined()
  })

  it('matches required avatar button labels exactly for EN and VI', () => {
    // Requirements: "Nut chuc nang nen de la Edit Avatar (EN) va Doi Avatar (VI)"
    expect(en.chat.editPhoto).toBe('Edit Avatar')
    expect(vi.chat.editPhoto).toBe('Đổi Avatar')

    expect(en.chat.editPhotoDialogTitle).toBe('Edit Avatar')
    expect(vi.chat.editPhotoDialogTitle).toBe('Đổi Avatar')

    expect(en.chat.changeAvatar).toBe('Edit Avatar')
    expect(vi.chat.changeAvatar).toBe('Đổi Avatar')
  })

  it('provides proper avatar removal text', () => {
    expect(en.chat.removePhoto).toBe('Remove avatar')
    expect(vi.chat.removePhoto).toBe('Gỡ avatar')
  })

  it('provides proper avatar updated and removed notifications', () => {
    expect(en.chat.avatarUpdated).toBe('Avatar updated successfully!')
    expect(vi.chat.avatarUpdated).toBe('Cập nhật avatar thành công!')

    expect(en.chat.avatarRemoved).toBe('Avatar removed!')
    expect(vi.chat.avatarRemoved).toBe('Đã gỡ avatar!')
  })

  it('does not contain obsolete URL image input keys', () => {
    const enChat = en.chat as Record<string, unknown>
    const viChat = vi.chat as Record<string, unknown>

    expect(enChat.directImageUrl).toBeUndefined()
    expect(viChat.directImageUrl).toBeUndefined()
    expect(enChat.enterImageUrlPlaceholder).toBeUndefined()
    expect(viChat.enterImageUrlPlaceholder).toBeUndefined()
  })

  it('provides required localization keys for message reactions, forwarding, and voice recording', () => {
    const enChat = en.chat as Record<string, unknown>
    const viChat = vi.chat as Record<string, unknown>

    const requiredKeys = [
      'forwardMessage',
      'forwardSuccess',
      'forwardFailed',
      'forwarded',
      'messagePreview',
      'searchConversations',
      'noConversationsFound',
      'recordVoiceNote',
      'cancelRecording',
      'sendVoiceNote',
      'recordingTooShort',
      'voiceNoteSent',
      'voiceNoteFailed',
      'micPermissionDenied',
    ]

    for (const key of requiredKeys) {
      expect(enChat[key]).toBeDefined()
      expect(typeof enChat[key]).toBe('string')
      expect(viChat[key]).toBeDefined()
      expect(typeof viChat[key]).toBe('string')
    }
  })

  it('provides required localization keys for chat info panel and privacy actions', () => {
    const enChat = en.chat as Record<string, unknown>
    const viChat = vi.chat as Record<string, unknown>

    const requiredKeys = [
      'conversationInfo',
      'featureComingSoon',
      'loadOlderMedia',
      'resizeInfoPanel',
      'resizeInfoPanelHint',
      'closeInfo',
      'profile',
      'personalInfo',
      'copyUsername',
      'usernameCopied',
      'friendBadge',
      'searchInConversationComingSoon',
      'mute',
      'searchInConversation',
      'noBio',
      'mediaAndFiles',
      'photosAndVideos',
      'documentsAndFiles',
      'noMediaYet',
      'noFilesYet',
      'downloadFile',
      'viewAll',
      'collapse',
      'fullscreenVideo',
      'playVideo',
      'privacyAndSupport',
      'removeFriend',
      'unfriendConfirmTitle',
      'unfriendConfirmDesc',
      'unfriendAction',
      'blockUser',
      'blockConfirmTitle',
      'blockConfirmDesc',
      'blockAction',
    ]

    for (const key of requiredKeys) {
      expect(enChat[key]).toBeDefined()
      expect(typeof enChat[key]).toBe('string')
      expect(viChat[key]).toBeDefined()
      expect(typeof viChat[key]).toBe('string')
    }
  })
})
