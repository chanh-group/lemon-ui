// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VideoTrimmer } from './VideoTrimmer'
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
afterEach(() => cleanup())

const trimmer = (props: {
  duration: number
  start: number
  end: number
  currentTime?: number
  onChange?: ReturnType<typeof vi.fn>
  onSeek?: ReturnType<typeof vi.fn>
}) => (
  <VideoTrimmer
    url="blob:test"
    duration={props.duration}
    start={props.start}
    end={props.end}
    currentTime={props.currentTime ?? props.start}
    disabled={false}
    onChange={props.onChange ?? vi.fn()}
    onSeek={props.onSeek ?? vi.fn()}
  />
)

describe('video trim selection', () => {
  it('ignores the start key at the minimum span', () => {
    const onChange = vi.fn()
    render(trimmer({ duration: 20, start: 3, end: 4, onChange }))
    fireEvent.keyDown(screen.getByRole('slider', { name: 'chat.storyTrimStart' }), {
      key: 'ArrowRight',
    })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('ignores the end key at the maximum span', () => {
    const onChange = vi.fn()
    render(trimmer({ duration: 64, start: 2, end: 61.9, onChange }))
    fireEvent.keyDown(screen.getByRole('slider', { name: 'chat.storyTrimEnd' }), {
      key: 'ArrowRight',
    })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('slides a fixed window for long videos', () => {
    const onChange = vi.fn()
    render(trimmer({ duration: 100, start: 20, end: 79.9, onChange }))
    fireEvent.keyDown(screen.getByRole('slider', { name: 'chat.storyTrimStart' }), {
      key: 'ArrowRight',
    })
    expect(onChange).toHaveBeenCalledTimes(1)
    const [start, end] = onChange.mock.calls[0]
    expect(start).toBeCloseTo(20.1)
    expect(end).toBeCloseTo(80)
  })

  it('keeps a full selection when the start handle returns to zero', () => {
    const onChange = vi.fn()
    render(trimmer({ duration: 60, start: 0.1, end: 60, onChange }))
    fireEvent.keyDown(screen.getByRole('slider', { name: 'chat.storyTrimStart' }), {
      key: 'ArrowLeft',
    })
    expect(onChange).toHaveBeenCalledWith(0, 60)
  })

  it('ignores the end key at the full length', () => {
    const onChange = vi.fn()
    render(trimmer({ duration: 60, start: 0, end: 60, onChange }))
    fireEvent.keyDown(screen.getByRole('slider', { name: 'chat.storyTrimEnd' }), {
      key: 'ArrowRight',
    })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('snaps keyboard steps to the tenth-second grid', () => {
    const onChange = vi.fn()
    const view = render(trimmer({ duration: 20, start: 0, end: 20, onChange }))
    fireEvent.keyDown(screen.getByRole('slider', { name: 'chat.storyTrimStart' }), {
      key: 'ArrowRight',
    })
    view.rerender(trimmer({ duration: 20, start: 0.1, end: 20, onChange }))
    fireEvent.keyDown(screen.getByRole('slider', { name: 'chat.storyTrimStart' }), {
      key: 'ArrowRight',
    })
    view.rerender(trimmer({ duration: 20, start: 0.2, end: 20, onChange }))
    fireEvent.keyDown(screen.getByRole('slider', { name: 'chat.storyTrimStart' }), {
      key: 'ArrowRight',
    })
    expect(onChange).toHaveBeenLastCalledWith(0.3, 20)
  })

  it('seeks the playhead with the keyboard', () => {
    const onSeek = vi.fn()
    render(trimmer({ duration: 20, start: 2, end: 10, currentTime: 5, onSeek }))
    fireEvent.keyDown(screen.getByRole('slider', { name: 'chat.storyTrimPlayhead' }), {
      key: 'ArrowRight',
    })
    expect(onSeek).toHaveBeenCalledWith(5.1)
  })

  it('ignores the playhead key at the trim end', () => {
    const onSeek = vi.fn()
    render(trimmer({ duration: 20, start: 2, end: 10, currentTime: 9.9, onSeek }))
    fireEvent.keyDown(screen.getByRole('slider', { name: 'chat.storyTrimPlayhead' }), {
      key: 'ArrowRight',
    })
    expect(onSeek).not.toHaveBeenCalled()
  })
})
