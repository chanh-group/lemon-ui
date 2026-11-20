// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VideoTrimmer } from './VideoTrimmer'
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
afterEach(() => cleanup())
describe('video trim selection', () => {
  it('clamps the start handle at the minimum span', () => {
    const onChange = vi.fn()
    render(
      <VideoTrimmer
        url="blob:test"
        duration={20}
        start={3}
        end={4}
        currentTime={3}
        disabled={false}
        onChange={onChange}
        onSeek={vi.fn()}
      />,
    )
    fireEvent.keyDown(screen.getByRole('slider', { name: 'chat.storyTrimStart' }), {
      key: 'ArrowRight',
    })
    expect(onChange).toHaveBeenCalledWith(3, 4)
  })
  it('slides a fixed window for long videos', () => {
    const onChange = vi.fn()
    render(
      <VideoTrimmer
        url="blob:test"
        duration={100}
        start={20}
        end={79.9}
        currentTime={20}
        disabled={false}
        onChange={onChange}
        onSeek={vi.fn()}
      />,
    )
    fireEvent.keyDown(screen.getByRole('slider', { name: 'chat.storyTrimStart' }), {
      key: 'ArrowRight',
    })
    expect(onChange).toHaveBeenCalledTimes(1)
    const [start, end] = onChange.mock.calls[0]
    expect(start).toBeCloseTo(20.1)
    expect(end).toBeCloseTo(80)
  })
  it('clamps the end handle at the maximum span', () => {
    const onChange = vi.fn()
    render(
      <VideoTrimmer
        url="blob:test"
        duration={64}
        start={2}
        end={61.9}
        currentTime={2}
        disabled={false}
        onChange={onChange}
        onSeek={vi.fn()}
      />,
    )
    fireEvent.keyDown(screen.getByRole('slider', { name: 'chat.storyTrimEnd' }), {
      key: 'ArrowRight',
    })
    expect(onChange).toHaveBeenCalledWith(2, 61.9)
  })
  it('seeks the playhead with the keyboard', () => {
    const onSeek = vi.fn()
    render(
      <VideoTrimmer
        url="blob:test"
        duration={20}
        start={2}
        end={10}
        currentTime={5}
        disabled={false}
        onChange={vi.fn()}
        onSeek={onSeek}
      />,
    )
    fireEvent.keyDown(screen.getByRole('slider', { name: 'chat.storyTrimPlayhead' }), {
      key: 'ArrowRight',
    })
    expect(onSeek).toHaveBeenCalledWith(5.1)
  })
})
