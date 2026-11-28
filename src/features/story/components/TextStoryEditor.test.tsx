// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TextStoryEditor } from './TextStoryEditor'
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
afterEach(cleanup)
describe('text story draft editor', () => {
  it('renders the current draft and reports edits without submitting', () => {
    const onTextChange = vi.fn()
    const onShare = vi.fn()
    render(
      <TextStoryEditor
        text="draft"
        onTextChange={onTextChange}
        onShare={onShare}
        onDiscard={vi.fn()}
        isSharing={false}
      />,
    )
    const input = screen.getByRole('textbox')
    expect((input as HTMLTextAreaElement).value).toBe('draft')
    fireEvent.change(input, { target: { value: 'updated draft' } })
    expect(onTextChange).toHaveBeenCalledWith('updated draft')
    expect(onShare).not.toHaveBeenCalled()
  })
})
