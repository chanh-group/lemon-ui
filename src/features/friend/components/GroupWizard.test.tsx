// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GroupWizard } from './GroupWizard'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@/features/auth/api', () => ({ useAuth: () => ({ user: { id: 'viewer-1' } }) }))
vi.mock('@/features/friend/hooks/useFriends', () => ({
  useFriends: () => ({
    data: [
      { id: 'alice', name: 'Alice', username: 'alice', avatarUrl: null },
      { id: 'bob', name: 'Bob', username: 'bob', avatarUrl: null },
    ],
    isPending: false,
    isError: false,
  }),
}))
vi.mock('@/features/conversation/hooks/useConversations', () => ({
  useCreateGroupMutation: () => ({ mutateAsync: vi.fn() }),
  useUploadGroupAvatarMutation: () => ({ mutateAsync: vi.fn() }),
}))
vi.mock('@/features/conversation/api/conversation.api', () => ({ getConversationById: vi.fn() }))
vi.mock('@/components/common/UserAvatar', () => ({
  UserAvatar: ({ name }: { name: string }) => <span>{name}</span>,
}))

describe('group wizard session draft', () => {
  beforeEach(() => sessionStorage.clear())
  afterEach(() => cleanup())

  it('restores selections and title after leaving immediately without creating a group', () => {
    const view = render(<GroupWizard onBack={vi.fn()} onDone={vi.fn()} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /Alice/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Bob/ }))
    fireEvent.click(screen.getByRole('button', { name: 'chat.next' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'chat.groupNamePlaceholder' }), {
      target: { value: 'Roadmap' },
    })

    const stored = sessionStorage.getItem('lemonchat.group-wizard.draft.viewer-1')
    expect(stored).toContain('Roadmap')
    view.unmount()

    render(<GroupWizard onBack={vi.fn()} onDone={vi.fn()} />)
    expect(
      (screen.getByRole('textbox', { name: 'chat.groupNamePlaceholder' }) as HTMLInputElement)
        .value,
    ).toBe('Roadmap')
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('checkbox', { name: /Alice/ }).getAttribute('aria-checked')).toBe(
      'true',
    )
    expect(screen.getByRole('checkbox', { name: /Bob/ }).getAttribute('aria-checked')).toBe('true')
  })
})
