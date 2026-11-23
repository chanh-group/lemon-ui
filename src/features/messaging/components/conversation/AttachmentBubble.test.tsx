// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AttachmentBubble } from './AttachmentBubble'
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
afterEach(cleanup)
const image = {
  id: 'one',
  kind: 'IMAGE' as const,
  fileName: 'photo.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 100,
  previewUrl: '/photo',
  downloadUrl: '/photo',
}
describe('media layout reservation', () => {
  it('reserves a bounded box using dimensions before the image loads', () => {
    render(<AttachmentBubble attachment={{ ...image, width: 500, height: 2000 }} />)
    const element = screen.getByRole('img')
    expect(parseFloat(element.parentElement?.style.aspectRatio ?? '')).toBe(0.25)
    expect(element.getAttribute('loading')).toBe('lazy')
  })
  it('uses a stable fallback when dimensions are invalid', () => {
    render(<AttachmentBubble attachment={{ ...image, width: 0, height: 100 }} />)
    expect(parseFloat(screen.getByRole('img').parentElement?.style.aspectRatio ?? '')).toBe(4 / 3)
  })
})
