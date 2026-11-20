// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MediaStoryEditor } from './MediaStoryEditor'

const { processStoryVideoMock, readVideoDurationMock } = vi.hoisted(() => ({
  processStoryVideoMock: vi.fn(),
  readVideoDurationMock: vi.fn(),
}))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('../utils/storyVideoProcessor', () => ({ processStoryVideo: processStoryVideoMock }))
vi.mock('../utils/readVideoDuration', () => ({ readVideoDuration: readVideoDurationMock }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

function renderWithVideo(durationSeconds: number, onShare = vi.fn()) {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  const file = new File(['video'], 'clip.mp4', { type: 'video/mp4' })
  const view = render(<MediaStoryEditor onDiscard={vi.fn()} onShare={onShare} isSharing={false} />)
  const input = view.container.querySelector('input[type=file]')!
  fireEvent.change(input, { target: { files: [file] } })
  const video = view.container.querySelector('video')!
  Object.defineProperty(video, 'duration', { configurable: true, value: durationSeconds })
  fireEvent.loadedMetadata(video)
  return { file, onShare, video }
}

describe('media story editor share flow', () => {
  it('shares the original file when the video needs no trim', async () => {
    const { file, onShare } = renderWithVideo(30)
    fireEvent.click(screen.getByRole('button', { name: 'chat.shareStory' }))
    await waitFor(() => expect(onShare).toHaveBeenCalled())
    expect(processStoryVideoMock).not.toHaveBeenCalled()
    expect(onShare).toHaveBeenCalledWith(file, '', 30000)
  })

  it('re-encodes long videos with the default trim window', async () => {
    const output = new File(['out'], 'story.mp4', { type: 'video/mp4' })
    processStoryVideoMock.mockResolvedValueOnce(output)
    readVideoDurationMock.mockResolvedValueOnce(30)
    const { onShare } = renderWithVideo(90)
    fireEvent.click(screen.getByRole('button', { name: 'chat.shareStory' }))
    await waitFor(() => expect(onShare).toHaveBeenCalled())
    expect(processStoryVideoMock).toHaveBeenCalledWith(
      expect.objectContaining({ startSeconds: 0, endSeconds: 59.9 }),
    )
    expect(onShare).toHaveBeenCalledWith(output, '', 30000)
  })

  it('re-encodes a short video once the user trims it', async () => {
    const output = new File(['out'], 'story.mp4', { type: 'video/mp4' })
    processStoryVideoMock.mockResolvedValueOnce(output)
    readVideoDurationMock.mockResolvedValueOnce(30)
    const { onShare } = renderWithVideo(30)
    fireEvent.keyDown(screen.getByRole('slider', { name: 'chat.storyTrimStart' }), {
      key: 'ArrowRight',
    })
    fireEvent.click(screen.getByRole('button', { name: 'chat.shareStory' }))
    await waitFor(() => expect(onShare).toHaveBeenCalled())
    expect(processStoryVideoMock).toHaveBeenCalledWith(
      expect.objectContaining({ startSeconds: 0.1, endSeconds: 30 }),
    )
  })

  it('restores the bypass when the user reselects the full video', async () => {
    const { file, onShare } = renderWithVideo(60)
    fireEvent.keyDown(screen.getByRole('slider', { name: 'chat.storyTrimStart' }), {
      key: 'ArrowRight',
    })
    fireEvent.keyDown(screen.getByRole('slider', { name: 'chat.storyTrimStart' }), {
      key: 'ArrowLeft',
    })
    fireEvent.click(screen.getByRole('button', { name: 'chat.shareStory' }))
    await waitFor(() => expect(onShare).toHaveBeenCalled())
    expect(processStoryVideoMock).not.toHaveBeenCalled()
    expect(onShare).toHaveBeenCalledWith(file, '', 60000)
  })

  it('snaps playback back into the selection when seeking outside it', () => {
    const { video } = renderWithVideo(30)
    fireEvent.keyDown(screen.getByRole('slider', { name: 'chat.storyTrimStart' }), {
      key: 'ArrowRight',
    })
    Object.defineProperty(video, 'currentTime', {
      configurable: true,
      writable: true,
      value: 0.05,
    })
    fireEvent.timeUpdate(video)
    expect(video.currentTime).toBe(0.1)
  })
})

describe('media story editor layout', () => {
  it('places the trimmer below the preview instead of in the portal', () => {
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
    const trimmer = screen.getByRole('slider', { name: 'chat.storyTrimStart' })
    expect(sidebar.contains(trimmer)).toBe(false)
    expect(view.container.contains(trimmer)).toBe(true)
    expect(video.compareDocumentPosition(trimmer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    sidebar.remove()
  })
})
