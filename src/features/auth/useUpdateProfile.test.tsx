// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthUser } from '@/domain/auth'
import { api } from '@/infrastructure/api/client'
import { queryKeys } from '@/infrastructure/query/keys'
import { useAuthStore } from '@/infrastructure/auth/auth-store'
import { useUpdateProfile } from './api'

const initial: AuthUser = {
  id: 'me',
  fullName: 'Original',
  username: 'user',
  email: 'user@example.com',
  bio: 'Old bio',
  avatarUrl: 'old-avatar',
  createdAt: '2026-01-01',
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  client.setQueryData(queryKeys.me, initial)
  const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue(undefined)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const hook = renderHook(() => useUpdateProfile(), { wrapper })
  const user = () => client.getQueryData<AuthUser>(queryKeys.me)!
  return { client, hook, invalidate, user }
}

afterEach(() => vi.restoreAllMocks())

describe('optimistic profile updates', () => {
  it('updates text immediately and preserves unrelated newer cache data on success', async () => {
    const { client, hook, user, invalidate } = setup()
    const request = deferred<{ data: AuthUser }>()
    vi.spyOn(api, 'patch').mockReturnValue(request.promise as ReturnType<typeof api.patch>)
    act(() => hook.result.current.mutate({ fullName: 'New name' }))
    await waitFor(() => expect(user().fullName).toBe('New name'))
    act(() =>
      client.setQueryData<AuthUser>(queryKeys.me, (current) => ({
        ...current!,
        bio: 'External bio',
      })),
    )
    await act(async () => request.resolve({ data: { ...initial, fullName: 'New name' } }))
    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(1))
    expect(user().bio).toBe('External bio')
  })

  it('rolls back only the failed field while preserving concurrent external writes', async () => {
    const { client, hook, user } = setup()
    const request = deferred<{ data: AuthUser }>()
    vi.spyOn(api, 'patch').mockReturnValue(request.promise as ReturnType<typeof api.patch>)
    act(() => hook.result.current.mutate({ bio: 'Draft bio' }))
    await waitFor(() => expect(user().bio).toBe('Draft bio'))
    act(() =>
      client.setQueryData<AuthUser>(queryKeys.me, (current) => ({
        ...current!,
        fullName: 'External name',
      })),
    )
    await act(async () => request.reject(new Error('offline')))
    await waitFor(() => expect(user().bio).toBe('Old bio'))
    expect(user().fullName).toBe('External name')
  })

  it('does not overwrite a newer external update to the same field on failure', async () => {
    const { client, hook, user } = setup()
    const request = deferred<{ data: AuthUser }>()
    vi.spyOn(api, 'patch').mockReturnValue(request.promise as ReturnType<typeof api.patch>)
    act(() => hook.result.current.mutate({ fullName: 'Draft' }))
    await waitFor(() => expect(user().fullName).toBe('Draft'))
    act(() =>
      client.setQueryData<AuthUser>(queryKeys.me, (current) => ({
        ...current!,
        fullName: 'External name',
      })),
    )
    await act(async () => request.reject(new Error('offline')))
    await waitFor(() => expect(hook.result.current.isError).toBe(true))
    expect(user().fullName).toBe('External name')
  })

  it('serializes same-field writes and restores the last confirmed value when the latest fails', async () => {
    const { hook, user, invalidate } = setup()
    const first = deferred<{ data: AuthUser }>()
    const second = deferred<{ data: AuthUser }>()
    const patch = vi
      .spyOn(api, 'patch')
      .mockReturnValueOnce(first.promise as ReturnType<typeof api.patch>)
      .mockReturnValueOnce(second.promise as ReturnType<typeof api.patch>)
    act(() => hook.result.current.mutate({ fullName: 'First' }))
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1))
    act(() => hook.result.current.mutate({ fullName: 'Second' }))
    await waitFor(() => expect(user().fullName).toBe('Second'))
    expect(patch).toHaveBeenCalledTimes(1)
    await act(async () => first.resolve({ data: { ...initial, fullName: 'First' } }))
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(2))
    expect(user().fullName).toBe('Second')
    expect(invalidate).not.toHaveBeenCalled()
    await act(async () => second.reject(new Error('offline')))
    await waitFor(() => expect(user().fullName).toBe('First'))
    expect(invalidate).toHaveBeenCalledTimes(1)
  })

  it('does not replace a refetched value with an older successful response', async () => {
    const { client, hook, user } = setup()
    const request = deferred<{ data: AuthUser }>()
    vi.spyOn(api, 'patch').mockReturnValue(request.promise as ReturnType<typeof api.patch>)
    act(() => hook.result.current.mutate({ bio: 'Draft' }))
    await waitFor(() => expect(user().bio).toBe('Draft'))
    act(() =>
      client.setQueryData<AuthUser>(queryKeys.me, (current) => ({
        ...current!,
        bio: 'Refetched bio',
      })),
    )
    await act(async () => request.resolve({ data: { ...initial, bio: 'Draft' } }))
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true))
    expect(user().bio).toBe('Refetched bio')
  })

  it('keeps account-specific rollback state after the authenticated user changes', async () => {
    const { client, hook, user } = setup()
    const first = deferred<{ data: AuthUser }>()
    const second = deferred<{ data: AuthUser }>()
    const patch = vi
      .spyOn(api, 'patch')
      .mockReturnValueOnce(first.promise as ReturnType<typeof api.patch>)
      .mockReturnValueOnce(second.promise as ReturnType<typeof api.patch>)
    act(() => hook.result.current.mutate({ fullName: 'First account draft' }))
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1))
    act(() =>
      client.setQueryData<AuthUser>(queryKeys.me, {
        ...initial,
        id: 'other',
        fullName: 'Other account',
      }),
    )
    act(() => hook.result.current.mutate({ fullName: 'Other account draft' }))
    await waitFor(() => expect(user().fullName).toBe('Other account draft'))
    await act(async () => first.reject(new Error('offline')))
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(2))
    expect(user().fullName).toBe('Other account draft')
    await act(async () => second.reject(new Error('offline')))
    await waitFor(() => expect(user().fullName).toBe('Other account'))
  })

  it('does not dispatch or apply queued writes after a new session for the same user', async () => {
    useAuthStore.getState().setAccessToken('old-session')
    const { client, hook, user, invalidate } = setup()
    const first = deferred<{ data: AuthUser }>()
    const patch = vi
      .spyOn(api, 'patch')
      .mockReturnValue(first.promise as ReturnType<typeof api.patch>)
    act(() => {
      hook.result.current.mutate({ fullName: 'Old first' })
      hook.result.current.mutate({ fullName: 'Old queued' })
    })
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(user().fullName).toBe('Old queued'))
    useAuthStore.getState().setAccessToken('new-session')
    client.setQueryData(queryKeys.me, { ...initial, fullName: 'New session' })
    await act(async () => first.resolve({ data: { ...initial, fullName: 'Old first' } }))
    await waitFor(() => expect(hook.result.current.isError).toBe(true))
    expect(patch).toHaveBeenCalledTimes(1)
    expect(user().fullName).toBe('New session')
    expect(invalidate).not.toHaveBeenCalled()
  })

  it('waits for avatar confirmation and preserves newer unrelated text', async () => {
    const { client, hook, user } = setup()
    const request = deferred<{ data: AuthUser }>()
    vi.spyOn(api, 'patch').mockReturnValue(request.promise as ReturnType<typeof api.patch>)
    act(() => hook.result.current.mutate({ avatarUrl: 'new-avatar' }))
    await waitFor(() => expect(api.patch).toHaveBeenCalled())
    expect(user().avatarUrl).toBe('old-avatar')
    act(() =>
      client.setQueryData<AuthUser>(queryKeys.me, (current) => ({
        ...current!,
        fullName: 'External name',
      })),
    )
    await act(async () => request.resolve({ data: { ...initial, avatarUrl: 'new-avatar' } }))
    await waitFor(() => expect(user().avatarUrl).toBe('new-avatar'))
    expect(user().fullName).toBe('External name')
  })
})
