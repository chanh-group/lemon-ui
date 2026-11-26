// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ApiError } from '@/infrastructure/api/errors'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConversationInfoPanel } from './ConversationInfoPanel'
import type { Conversation } from '@/features/conversation/types/conversation.types'

const mocks = vi.hoisted(() => ({
  updateGroup: vi.fn(),
  addGroupMembers: vi.fn(),
  leaveGroup: vi.fn(),
  updateGroupMemberRole: vi.fn(),
  getGroupMembers: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
}))
vi.mock('react-i18next', async (original) => ({
  ...(await original<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}))
vi.mock('sonner', () => ({
  toast: { error: mocks.error, success: mocks.success, warning: mocks.warning },
}))
vi.mock('@/features/auth/api', () => ({ useMe: () => ({ data: { id: 'me' } }) }))
vi.mock('@/features/friend/hooks/useFriends', () => ({
  useFriends: () => ({
    data: [
      { id: 'friend-1', name: 'Alice', username: 'alice' },
      { id: 'friend-2', name: 'Bob', username: 'bob' },
    ],
    isPending: false,
    isError: false,
  }),
  useRemoveFriend: () => ({ isPending: false }),
  useBlockUser: () => ({ isPending: false }),
}))
vi.mock('@/features/conversation/api/conversation.api', async (original) => ({
  ...(await original<typeof import('@/features/conversation/api/conversation.api')>()),
  updateGroup: mocks.updateGroup,
  addGroupMembers: mocks.addGroupMembers,
  leaveGroup: mocks.leaveGroup,
  updateGroupMemberRole: mocks.updateGroupMemberRole,
  getGroupMembers: mocks.getGroupMembers,
}))
vi.mock('@/features/messaging/hooks/useMessages', async (original) => ({
  ...(await original<typeof import('@/features/messaging/hooks/useMessages')>()),
  useConversationMediaArchiveQuery: () => ({ data: undefined, isPending: false }),
}))
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => false }))

const group: Conversation = {
  id: 'group-1',
  name: 'Team',
  preview: '',
  previewKind: 'text',
  time: '',
  unread: 0,
  online: false,
  isGroup: true,
  myRole: 'ADMIN',
  memberCount: 2,
}

describe('group action pending', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.getGroupMembers.mockResolvedValue([
      { id: 'me', username: 'me', fullName: 'Me', role: 'ADMIN', joinedAt: '2026-01-01' },
      { id: 'member', username: 'carol', fullName: 'Carol', role: 'ADMIN', joinedAt: '2026-01-02' },
    ])
  })
  afterEach(() => cleanup())

  it('shows the rename pending state and prevents duplicate submissions', async () => {
    let resolve!: () => void
    mocks.updateGroup.mockReturnValue(
      new Promise<void>((done) => {
        resolve = done
      }),
    )
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <ConversationInfoPanel conversation={group} groups={[]} onClose={vi.fn()} />
        </QueryClientProvider>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'chat.editGroupName' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'chat.groupName' }), {
      target: { value: 'Updated' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'chat.save' }))
    const pending = screen.getByRole('button', { name: 'common.loading' }) as HTMLButtonElement
    expect(pending.disabled).toBe(true)
    expect(pending.getAttribute('aria-busy')).toBe('true')
    fireEvent.submit(pending.closest('form')!)
    expect(mocks.updateGroup).toHaveBeenCalledTimes(1)
    await act(async () => resolve())
    await waitFor(() => expect(screen.queryByRole('button', { name: 'common.loading' })).toBeNull())
  })

  it('locks add actions while pending and restores them after an error', async () => {
    let reject!: (error: Error) => void
    mocks.addGroupMembers.mockReturnValue(
      new Promise((_resolve, fail) => {
        reject = fail
      }),
    )
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <ConversationInfoPanel conversation={group} groups={[]} onClose={vi.fn()} />
        </QueryClientProvider>
      </MemoryRouter>,
    )
    await screen.findByText('Carol')
    fireEvent.click(screen.getByRole('button', { name: 'chat.groupAddMembers' }))
    fireEvent.click(screen.getByRole('button', { name: /Alice/ }))
    expect((screen.getByRole('button', { name: /Alice/ }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: /Bob/ }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: /Bob/ }))
    expect(mocks.addGroupMembers).toHaveBeenCalledTimes(1)
    await act(async () => reject(new Error('add failed')))
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('add failed'))
    expect((screen.getByRole('button', { name: /Bob/ }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('locks leave confirmation while pending and keeps the panel open after an error', async () => {
    let reject!: (error: Error) => void
    mocks.leaveGroup.mockReturnValue(
      new Promise((_resolve, fail) => {
        reject = fail
      }),
    )
    const onClose = vi.fn()
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <ConversationInfoPanel
            conversation={group}
            groups={[]}
            onClose={onClose}
            defaultPrivacyOpen
          />
        </QueryClientProvider>
      </MemoryRouter>,
    )
    await screen.findByText('Carol')
    fireEvent.click(screen.getByRole('button', { name: 'chat.leaveGroup' }))
    fireEvent.click(screen.getByRole('button', { name: 'chat.leaveGroupAction' }))
    const pending = screen.getByRole('button', { name: 'common.loading' }) as HTMLButtonElement
    expect(pending.disabled).toBe(true)
    expect(
      (screen.getByRole('button', { name: 'chat.cancel' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    fireEvent.click(pending)
    expect(mocks.leaveGroup).toHaveBeenCalledTimes(1)
    await act(async () => reject(new Error('leave failed')))
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('leave failed'))
    expect(onClose).not.toHaveBeenCalled()
    expect(
      (screen.getByRole('button', { name: 'chat.leaveGroupAction' }) as HTMLButtonElement).disabled,
    ).toBe(false)
  })

  it('locks role and conflicting group actions while pending and recovers after an error', async () => {
    let reject!: (error: Error) => void
    mocks.updateGroupMemberRole.mockReturnValue(
      new Promise((_resolve, fail) => {
        reject = fail
      }),
    )
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <ConversationInfoPanel
            conversation={group}
            groups={[]}
            onClose={vi.fn()}
            defaultPrivacyOpen
          />
        </QueryClientProvider>
      </MemoryRouter>,
    )
    const menu = await screen.findByRole('button', { name: 'chat.moreOptions Carol' })
    fireEvent.pointerDown(menu, { button: 0, ctrlKey: false })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'chat.groupDemote' }))
    expect((menu as HTMLButtonElement).disabled).toBe(true)
    expect(menu.getAttribute('aria-busy')).toBe('true')
    expect(
      (screen.getByRole('button', { name: 'chat.editGroupName' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(
      (screen.getByRole('button', { name: 'chat.leaveGroup' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(mocks.updateGroupMemberRole).toHaveBeenCalledTimes(1)
    await act(async () => reject(new Error('role failed')))
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('role failed'))
    await waitFor(() => expect((menu as HTMLButtonElement).disabled).toBe(false))
  })

  it('reports uncertain add results without claiming success when verification fails', async () => {
    mocks.addGroupMembers.mockRejectedValue(new ApiError('NETWORK', 0, 'offline'))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <ConversationInfoPanel conversation={group} groups={[]} onClose={vi.fn()} />
        </QueryClientProvider>
      </MemoryRouter>,
    )
    await screen.findByText('Carol')
    fireEvent.click(screen.getByRole('button', { name: 'chat.groupAddMembers' }))
    fireEvent.click(screen.getByRole('button', { name: /Alice/ }))
    await waitFor(() => expect(mocks.warning).toHaveBeenCalledWith('chat.groupActionUncertain'))
    expect(mocks.success).not.toHaveBeenCalled()
    expect(mocks.getGroupMembers.mock.calls.length).toBeGreaterThan(1)
    expect(screen.getByRole('button', { name: /Alice/ })).toBeTruthy()
  })
})
