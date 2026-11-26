// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STORY_SETTINGS_KEY, useUpdateStorySettings } from './useStories'
import type { UserStorySettings } from '../api/stories.api'
import { useAuthStore } from '@/infrastructure/auth/auth-store'

const mocks = vi.hoisted(() => ({ update: vi.fn() }))
vi.mock('../api/stories.api', () => ({ updateStorySettings: mocks.update }))

const original: UserStorySettings = {
  viewedReceiptsEnabled: true,
  archiveEnabled: true,
  archiveDurationSecs: null,
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((ok, fail) => {
    resolve = ok
    reject = fail
  })
  return { promise, resolve, reject }
}

function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  client.setQueryData(STORY_SETTINGS_KEY, original)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const hook = renderHook(() => useUpdateStorySettings(), { wrapper })
  const settings = () => client.getQueryData<UserStorySettings>(STORY_SETTINGS_KEY)!
  return { client, hook, settings }
}

beforeEach(() => vi.clearAllMocks())

describe('story settings', () => {
  it('updates the selected switch immediately and preserves other fields on success', async () => {
    const request = deferred<UserStorySettings>()
    mocks.update.mockReturnValueOnce(request.promise)
    const { client, hook, settings } = setup()
    act(() => hook.result.current.mutate({ viewedReceiptsEnabled: false }))
    await waitFor(() => expect(settings().viewedReceiptsEnabled).toBe(false))
    act(() => client.setQueryData(STORY_SETTINGS_KEY, { ...settings(), archiveEnabled: false }))
    await act(async () => request.resolve({ ...original, viewedReceiptsEnabled: false }))
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true))
    expect(settings()).toMatchObject({ viewedReceiptsEnabled: false, archiveEnabled: false })
  })

  it('rolls back only the changed field and keeps concurrent changes when the request fails', async () => {
    const request = deferred<UserStorySettings>()
    mocks.update.mockReturnValueOnce(request.promise)
    const { client, hook, settings } = setup()
    act(() => hook.result.current.mutate({ viewedReceiptsEnabled: false }))
    await waitFor(() => expect(settings().viewedReceiptsEnabled).toBe(false))
    act(() => client.setQueryData(STORY_SETTINGS_KEY, { ...settings(), archiveEnabled: false }))
    await act(async () => request.reject(new Error('offline')))
    await waitFor(() => expect(hook.result.current.isError).toBe(true))
    expect(settings()).toMatchObject({ viewedReceiptsEnabled: true, archiveEnabled: false })
  })

  it('serializes multiple instances and preserves repeated latest intent until all settle', async () => {
    const first = deferred<UserStorySettings>()
    const second = deferred<UserStorySettings>()
    const third = deferred<UserStorySettings>()
    mocks.update
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
      .mockReturnValueOnce(third.promise)
    const { client, hook, settings } = setup()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const other = renderHook(() => useUpdateStorySettings(), { wrapper })
    const invalidation = vi.spyOn(client, 'invalidateQueries')
    act(() => {
      hook.result.current.mutate({ viewedReceiptsEnabled: false })
      other.result.current.mutate({ viewedReceiptsEnabled: true })
      hook.result.current.mutate({ viewedReceiptsEnabled: false })
    })
    await waitFor(() => expect(settings().viewedReceiptsEnabled).toBe(false))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    await act(async () => first.reject(new Error('offline')))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(2))
    expect(settings().viewedReceiptsEnabled).toBe(false)
    expect(invalidation).not.toHaveBeenCalled()
    await act(async () => second.resolve(original))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(3))
    expect(settings().viewedReceiptsEnabled).toBe(false)
    expect(invalidation).not.toHaveBeenCalled()
    await act(async () => third.reject(new Error('offline')))
    await waitFor(() => expect(settings().viewedReceiptsEnabled).toBe(true))
    expect(invalidation).toHaveBeenCalledTimes(1)
  })

  it('discards old queued requests and callbacks after a session change', async () => {
    const request = deferred<UserStorySettings>()
    mocks.update.mockReturnValueOnce(request.promise)
    const { client, hook, settings } = setup()
    act(() => {
      hook.result.current.mutate({ viewedReceiptsEnabled: false })
      hook.result.current.mutate({ archiveEnabled: false })
    })
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    act(() => {
      useAuthStore.getState().setAccessToken('new-session')
      client.setQueryData(STORY_SETTINGS_KEY, original)
    })
    await act(async () => request.resolve({ ...original, viewedReceiptsEnabled: false }))
    await waitFor(() => expect(hook.result.current.isError).toBe(true))
    expect(mocks.update).toHaveBeenCalledTimes(1)
    expect(settings()).toEqual(original)
  })

  it('does not roll back a newer value for the same setting', async () => {
    const request = deferred<UserStorySettings>()
    mocks.update.mockReturnValueOnce(request.promise)
    const { client, hook, settings } = setup()
    act(() => hook.result.current.mutate({ viewedReceiptsEnabled: false }))
    await waitFor(() => expect(settings().viewedReceiptsEnabled).toBe(false))
    act(() =>
      client.setQueryData(STORY_SETTINGS_KEY, { ...settings(), viewedReceiptsEnabled: true }),
    )
    await act(async () => request.reject(new Error('offline')))
    await waitFor(() => expect(hook.result.current.isError).toBe(true))
    expect(settings().viewedReceiptsEnabled).toBe(true)
  })
})
