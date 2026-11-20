// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MediaStoryEditor } from './MediaStoryEditor'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderWithVideo(durationSeconds: number) {
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
  Object.defineProperty(video, 'duration', { configurable: true, value: durationSeconds })
  fireEvent.loadedMetadata(video)
  return { view, sidebar, video }
}

describe('media story editor layout', () => {
  it('places the trim control below the preview instead of in the portal', () => {
    const { view, sidebar, video } = renderWithVideo(90)
    const slider = screen.getByRole('slider')
    expect(sidebar.contains(slider)).toBe(false)
    expect(view.container.contains(slider)).toBe(true)
    expect(video.compareDocumentPosition(slider) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    sidebar.remove()
  })

  it('configures the trim slider within the video bounds', () => {
    const { sidebar } = renderWithVideo(90)
    const slider = screen.getByRole('slider')
    expect(slider.getAttribute('min')).toBe('0')
    expect(slider.getAttribute('step')).toBe('0.1')
    expect(Number(slider.getAttribute('max'))).toBeCloseTo(30.1)
    sidebar.remove()
  })

  it('renders no trim slider for videos within the duration limit', () => {
    const { sidebar } = renderWithVideo(30)
    expect(screen.queryByRole('slider')).toBeNull()
    sidebar.remove()
  })
})
