// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConversationInfoPanel } from './ConversationInfoPanel'
import type { Conversation } from '@/features/conversation/types/conversation.types'

const mocks = vi.hoisted(() => ({
  addMembers: vi.fn(),
  getMembers: vi.fn(),
}))

vi.mock('@/features/auth/api', () => ({ useMe: () => ({ data: { id: 'me-admin' } }) }))
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => true }))
vi.mock('@/features/friend/hooks/useFriends', () => ({
  useFriends: () => ({
    data: [{ id: 'friend-1', name: 'Bạn mới', username: 'banmoi', avatarUrl: null }],
    isPending: false,
    isError: false,
    isSuccess: true,
  }),
  useBlockUser: () => ({ mutate: vi.fn() }),
  useRemoveFriend: () => ({ mutate: vi.fn() }),
}))
vi.mock('@/features/messaging/hooks/useMessages', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/messaging/hooks/useMessages')>()),
  useConversationMediaArchiveQuery: () => ({ data: undefined, isPending: false, isError: false }),
}))
vi.mock('@/features/conversation/api/conversation.api', () => ({
  addGroupMembers: mocks.addMembers,
  disbandGroup: vi.fn(),
  getConversationById: vi.fn().mockResolvedValue({ id: 'group-1', title: 'Nhóm QA' }),
  getGroupMembers: mocks.getMembers,
  leaveGroup: vi.fn(),
  removeGroupMember: vi.fn(),
  updateGroup: vi.fn(),
  updateGroupMemberRole: vi.fn(),
  uploadGroupAvatar: vi.fn(),
}))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}))

const group: Conversation = {
  id: 'group-1',
  name: 'Nhóm QA',
  preview: '',
  previewKind: 'text',
  time: '',
  unread: 0,
  online: false,
  isGroup: true,
  myRole: 'ADMIN',
  memberCount: 1,
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ConversationInfoPanel add-member pending state', () => {
  it('locks and spins the add-member row until the request settles', async () => {
    // Trước khi thêm: chỉ có mình; sau khi thêm: verify/refetch thấy friend-1.
    mocks.getMembers.mockResolvedValueOnce([{ id: 'me-admin', role: 'ADMIN' }])
    mocks.getMembers.mockResolvedValue([
      { id: 'me-admin', role: 'ADMIN' },
      { id: 'friend-1', role: 'MEMBER' },
    ])
    let resolveAdd!: (value: unknown) => void
    mocks.addMembers.mockImplementation(() => new Promise((resolve) => (resolveAdd = resolve)))

    render(
      <MemoryRouter>
        <QueryClientProvider
          client={
            new QueryClient({
              defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
            })
          }
        >
          <ConversationInfoPanel conversation={group} groups={[]} onClose={() => {}} />
        </QueryClientProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Thêm thành viên/ }))
    fireEvent.click(await screen.findByRole('button', { name: /Bạn mới/ }))

    await waitFor(() => expect(mocks.addMembers).toHaveBeenCalledTimes(1))

    // Đang chờ: hàng bị disable, hiện spinner, không bấm thêm được.
    await waitFor(() => {
      const row = screen.getByRole('button', { name: /Bạn mới/ }) as HTMLButtonElement
      expect(row.disabled).toBe(true)
      expect(document.querySelector('.animate-spin')).toBeTruthy()
    })

    resolveAdd({})
    // Thành công: dialog đóng, hết spinner — pending state được dọn.
    await waitFor(() => expect(screen.queryByRole('button', { name: /Bạn mới/ })).toBeNull())
    expect(document.querySelector('.animate-spin')).toBeNull()
  })
})
