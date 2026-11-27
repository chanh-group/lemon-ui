// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FindUserPane } from './FindUserPane'

const mocks = vi.hoisted(() => ({ open: vi.fn(), navigate: vi.fn(), error: vi.fn() }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }))
vi.mock('sonner', () => ({ toast: { error: mocks.error } }))
vi.mock('@/features/conversation/hooks/useConversations', () => ({
  useCreateDirectChatMutation: () => ({ mutateAsync: mocks.open }),
}))
vi.mock('@/features/friend/hooks/useFriends', () => ({
  useFindUserByUsername: () => ({ data: [{ id: 'alice', name: 'Alice' }], isPending: false }),
  useFindUserByEmail: () => ({ data: [], isPending: false }),
}))
vi.mock('./kit', () => ({ PaneHeader: () => null }))
vi.mock('./SearchResultCard', () => ({
  SearchResultCard: ({
    onMessage,
    isOpeningChat,
    isChatDisabled,
  }: {
    onMessage: () => void
    isOpeningChat: boolean
    isChatDisabled: boolean
  }) => (
    <button type="button" disabled={isChatDisabled} onClick={onMessage}>
      {isOpeningChat ? 'loading' : 'message'}
    </button>
  ),
}))

describe('opening a direct chat from search', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => cleanup())

  it('shows pending, prevents duplicate requests, and navigates after success', async () => {
    let resolve!: (value: { id: string }) => void
    mocks.open.mockReturnValue(
      new Promise((done) => {
        resolve = done
      }),
    )
    render(<FindUserPane mode="username" hint="search" onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'message' }))
    const pending = screen.getByRole('button', { name: 'loading' }) as HTMLButtonElement
    expect(pending.disabled).toBe(true)
    fireEvent.click(pending)
    expect(mocks.open).toHaveBeenCalledTimes(1)
    await act(async () => resolve({ id: 'conversation-1' }))
    expect(mocks.navigate).toHaveBeenCalledTimes(1)
  })

  it('does not navigate from a result after the search changes', async () => {
    let resolve!: (value: { id: string }) => void
    mocks.open.mockReturnValue(
      new Promise((done) => {
        resolve = done
      }),
    )
    render(<FindUserPane mode="username" hint="search" onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'message' }))
    fireEvent.change(screen.getByLabelText('search'), { target: { value: 'new search' } })
    await act(async () => resolve({ id: 'conversation-1' }))
    expect(mocks.navigate).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByRole('button', { name: 'message' })).toBeTruthy())
  })

  it('reports failure and allows retry', async () => {
    mocks.open.mockRejectedValueOnce(new Error('offline'))
    render(<FindUserPane mode="username" hint="search" onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'message' }))
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('offline'))
    expect((screen.getByRole('button', { name: 'message' }) as HTMLButtonElement).disabled).toBe(
      false,
    )
  })
})
