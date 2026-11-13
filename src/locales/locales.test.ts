import { describe, expect, it } from 'bun:test'
import en from './en.json'
import vi from './vi.json'

describe('Localization Integrity & Avatar Text Tests', () => {
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
    const enChat = en.chat as Record<string, string>
    const viChat = vi.chat as Record<string, string>

    expect(enChat.directImageUrl).toBeUndefined()
    expect(viChat.directImageUrl).toBeUndefined()
    expect(enChat.enterImageUrlPlaceholder).toBeUndefined()
    expect(viChat.enterImageUrlPlaceholder).toBeUndefined()
  })

  it('provides required localization keys for message reactions, forwarding, and voice recording', () => {
    const enChat = en.chat as Record<string, string>
    const viChat = vi.chat as Record<string, string>

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
    const enChat = en.chat as Record<string, string>
    const viChat = vi.chat as Record<string, string>

    const requiredKeys = [
      'conversationInfo',
      'closeInfo',
      'profile',
      'personalInfo',
      'copyUsername',
      'usernameCopied',
      'friendBadge',
      'closeAction',
      'searchInConversationComingSoon',
      'mute',
      'unmute',
      'mutedConversation',
      'unmutedConversation',
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
      'muteConversationOption',
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
