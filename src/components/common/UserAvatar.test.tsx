import { describe, expect, it } from 'bun:test'
import { renderToString } from 'react-dom/server'
import { avatarColor, fileToAvatarDataUrl, initials } from '@/lib/avatar'
import { UserAvatar } from './UserAvatar'

describe('Avatar Helpers & UserAvatar Component', () => {
  describe('initials()', () => {
    it('returns first two characters in uppercase for single-word names', () => {
      expect(initials('lemon')).toBe('LE')
      expect(initials('Coder')).toBe('CO')
    })

    it('returns first letter of first and last words for multi-word names', () => {
      expect(initials('Nguyen Lemon')).toBe('NL')
      expect(initials('Nguyen Van Lemon')).toBe('NL')
    })

    it('falls back to "U" for empty or null strings', () => {
      expect(initials('')).toBe('U')
      expect(initials(null)).toBe('U')
      expect(initials(undefined)).toBe('U')
      expect(initials('   ')).toBe('U')
    })
  })

  describe('avatarColor()', () => {
    it('returns a deterministic color for the same input', () => {
      const color1 = avatarColor('Nguyen Lemon')
      const color2 = avatarColor('Nguyen Lemon')
      expect(color1).toBe(color2)
      expect(color1).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })

    it('handles empty or null name gracefully', () => {
      expect(avatarColor(null)).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(avatarColor('')).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })
  })

  describe('fileToAvatarDataUrl()', () => {
    it('converts an image File into a data URL', async () => {
      const blob = new Blob(['fake-image-bytes'], { type: 'image/png' })
      const file = new File([blob], 'test-avatar.png', { type: 'image/png' })
      const dataUrl = await fileToAvatarDataUrl(file)
      expect(dataUrl).toMatch(/^data:image\/[a-z]+;base64,/)
    })
  })

  describe('UserAvatar renderToString', () => {
    it('renders fallback with initials when src is null', () => {
      const html = renderToString(<UserAvatar name="Nguyen Lemon" src={null} />)
      expect(html).toContain('NL')
    })

    it('renders fallback with initials when src is undefined', () => {
      const html = renderToString(<UserAvatar name="Chanh Vang" />)
      expect(html).toContain('CV')
    })

    it('includes square radius class when square is true', () => {
      const html = renderToString(<UserAvatar name="Group Chat" square={true} />)
      expect(html).toContain('rounded-2xl')
    })

    it('renders avatar root element with custom className', () => {
      const html = renderToString(<UserAvatar name="Test User" className="custom-avatar-size" />)
      expect(html).toContain('custom-avatar-size')
    })

    it('renders avatar component with data URL src without throwing', () => {
      const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
      const html = renderToString(<UserAvatar name="Data User" src={dataUrl} />)
      expect(html).toBeTruthy()
      expect(html).toContain('relative flex shrink-0 overflow-hidden rounded-full')
    })

    it('renders avatar component with https URL src without throwing', () => {
      const httpsUrl = 'https://cdn.example.com/avatars/user.jpg'
      const html = renderToString(<UserAvatar name="Remote User" src={httpsUrl} />)
      expect(html).toBeTruthy()
      expect(html).toContain('relative flex shrink-0 overflow-hidden rounded-full')
    })
  })
})
