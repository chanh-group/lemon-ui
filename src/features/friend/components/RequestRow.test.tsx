// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/infrastructure/query/keys'
import type { FriendRequest } from '../types/friend.types'
import { RequestRow } from './RequestRow'

const mocks = vi.hoisted(() => ({
  accept: vi.fn(),
  decline: vi.fn(),
  cancel: vi.fn(),
  block: vi.fn(),
}))
vi.mock('@/features/friend/api/friend.api', () => ({
  acceptFriendRequest: mocks.accept,
  declineFriendRequest: mocks.decline,
  cancelFriendRequest: mocks.cancel,
  blockUser: mocks.block,
}))
vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), info: vi.fn(), warning: vi.fn(), error: vi.fn() },
}))

const request: FriendRequest = {
  id: 'request',
  direction: 'incoming',
  createdAt: '2025-01-01T00:00:00Z',
  user: { id: 'user', name: 'Alice', username: 'alice' },
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

function setup(row = request) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  client.setQueryData(queryKeys.chat.friendRequests, {
    incoming: row.direction === 'incoming' ? [row] : [],
    outgoing: row.direction === 'outgoing' ? [row] : [],
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ul>
          <RequestRow request={row} />
        </ul>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => vi.resetAllMocks())

describe('RequestRow pending', () => {
  it('blocks other actions immediately, exposes pending and unlocks after error', async () => {
    const pending = deferred<void>()
    mocks.decline.mockReturnValueOnce(pending.promise)
    setup()
    const accept = screen.getByRole('button', { name: 'chat.accept Alice' }) as HTMLButtonElement
    const decline = screen.getByRole('button', { name: 'chat.decline Alice' }) as HTMLButtonElement
    const block = screen.getByRole('button', { name: 'chat.blockUser' }) as HTMLButtonElement
    fireEvent.click(decline)
    fireEvent.click(accept)
    await waitFor(() => expect(mocks.decline).toHaveBeenCalledTimes(1))
    expect(mocks.accept).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('chat.pending'))
    expect(accept.disabled && decline.disabled && block.disabled).toBe(true)
    expect(screen.getByRole('listitem').getAttribute('aria-busy')).toBe('true')
    await act(async () => {
      pending.reject(new Error('offline'))
      await pending.promise.catch(() => undefined)
    })
    await waitFor(() => expect(decline.disabled).toBe(false))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('shows pending while cancelling an outgoing request', async () => {
    const pending = deferred<void>()
    mocks.cancel.mockReturnValueOnce(pending.promise)
    setup({ ...request, direction: 'outgoing' })
    fireEvent.click(screen.getByRole('button', { name: 'chat.cancelRequest' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('chat.pending'))
    expect(
      (screen.getByRole('button', { name: 'chat.pending' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    await act(async () => {
      pending.reject(new Error('offline'))
      await pending.promise.catch(() => undefined)
    })
  })
})
