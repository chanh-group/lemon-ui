// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StoryAudienceSelector } from './StoryAudienceSelector'
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
afterEach(cleanup)
describe('story audience selector', () => {
  it('clears prior selections when audience mode changes', () => {
    const change = vi.fn()
    render(
      <StoryAudienceSelector
        mode="CUSTOM"
        selected={['u1']}
        friends={[{ id: 'u1', name: 'An', username: 'an' }]}
        loading={false}
        error={false}
        onChange={change}
      />,
    )
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'EXCLUDE' } })
    expect(change).toHaveBeenCalledWith('EXCLUDE', [])
  })
  it('sends selected friend ids', () => {
    const change = vi.fn()
    render(
      <StoryAudienceSelector
        mode="CUSTOM"
        selected={[]}
        friends={[{ id: 'u1', name: 'An', username: 'an' }]}
        loading={false}
        error={false}
        onChange={change}
      />,
    )
    fireEvent.click(screen.getByRole('checkbox', { name: 'An' }))
    expect(change).toHaveBeenCalledWith('CUSTOM', ['u1'])
  })
  it('disables all audience controls while a story is being shared', () => {
    render(
      <StoryAudienceSelector
        mode="CUSTOM"
        selected={['u1']}
        friends={[{ id: 'u1', name: 'An', username: 'an' }]}
        loading={false}
        error={false}
        disabled
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('combobox').closest('fieldset')?.disabled).toBe(true)
    expect(screen.getByRole('checkbox', { name: 'An' }).closest('fieldset')?.disabled).toBe(true)
  })
})
