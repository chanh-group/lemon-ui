// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VideoTrimmer } from './VideoTrimmer'
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
afterEach(() => cleanup())
describe('video trim selection', () => {
  it('moves the start with the keyboard and preserves a minimum span', () => {
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
