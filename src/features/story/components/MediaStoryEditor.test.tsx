// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MediaStoryEditor } from './MediaStoryEditor'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('media story editor layout', () => {
  it('places the trim control beside the preview instead of in the portal', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const sidebar = document.createElement('div')
    document.body.appendChild(sidebar)
    const view = render(
      <MediaStoryEditor
        onDiscard={vi.fn()}
        onShare={vi.fn()}
        isSharing={false}
        controlsTarget={sidebar}
      />,
    )
    const input = sidebar.querySelector('input[type=file]')!
    fireEvent.change(input, {
      target: { files: [new File(['video'], 'clip.mp4', { type: 'video/mp4' })] },
    })
    const video = view.container.querySelector('video')!
    Object.defineProperty(video, 'duration', { configurable: true, value: 90 })
    fireEvent.loadedMetadata(video)
    const slider = screen.getByRole('slider')
    expect(sidebar.contains(slider)).toBe(false)
    expect(view.container.contains(slider)).toBe(true)
    expect(video.compareDocumentPosition(slider) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    sidebar.remove()
  })
})
