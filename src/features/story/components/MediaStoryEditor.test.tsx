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
  return { file, onShare }
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
})
