// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { STORY_SETTINGS_KEY, useStorySettings, useUpdateStorySettings } from './useStories'
import type { UserStorySettings } from '../api/stories.api'

const mocks = vi.hoisted(() => ({ get: vi.fn(), update: vi.fn() }))
vi.mock('@/features/story/api/stories.api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/stories.api')>()),
  getStorySettings: mocks.get,
  updateStorySettings: mocks.update,
}))

const settings: UserStorySettings = {
  viewedReceiptsEnabled: true,
  archiveEnabled: true,
  archiveDurationSecs: null,
}

function setup() {
  vi.resetAllMocks()
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  client.setQueryData(STORY_SETTINGS_KEY, settings)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const hook = renderHook(() => useUpdateStorySettings(), { wrapper })
  const current = () => client.getQueryData<UserStorySettings>(STORY_SETTINGS_KEY)!
  return { client, wrapper, hook, current }
}

describe('useUpdateStorySettings', () => {
  it('flips the toggle on cache immediately before the server responds', async () => {
    const { hook, current } = setup()
    let resolve!: (value: UserStorySettings) => void
    mocks.update.mockImplementation(() => new Promise((r) => (resolve = r)))

    await act(async () => {
      hook.result.current.mutate({ viewedReceiptsEnabled: false })
    })
    // Request còn đang bay nhưng switch đã lật.
    expect(current().viewedReceiptsEnabled).toBe(false)

    await act(async () => resolve({ ...settings, viewedReceiptsEnabled: false }))
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true))
    expect(current()).toEqual({ ...settings, viewedReceiptsEnabled: false })
  })

  it('rolls back only the toggled field on error without clobbering other changes', async () => {
    const { client, hook, current } = setup()
    let reject!: (error: Error) => void
    mocks.update.mockImplementation(
      () => new Promise((_resolve, rejectPromise) => (reject = rejectPromise)),
    )

    await act(async () => {
      hook.result.current.mutate({ viewedReceiptsEnabled: false })
    })
    expect(current().viewedReceiptsEnabled).toBe(false)

    // Toggle còn lại hoàn tất trong lúc request trên đang bay — không được ghi đè.
    act(() => {
      client.setQueryData<UserStorySettings>(STORY_SETTINGS_KEY, (old) =>
        old ? { ...old, archiveEnabled: false } : old,
      )
    })

    await act(async () => reject(new Error('offline')))
    await waitFor(() => expect(hook.result.current.isError).toBe(true))
    expect(current().viewedReceiptsEnabled).toBe(true)
    expect(current().archiveEnabled).toBe(false)
  })

  it('does not roll back over a newer toggle of the same field', async () => {
    const { hook, current } = setup()
    let rejectFirst!: (error: Error) => void
    mocks.update
      .mockImplementationOnce(() => new Promise((_resolve, rej) => (rejectFirst = rej)))
      .mockResolvedValue({ ...settings, viewedReceiptsEnabled: true })

    await act(async () => {
      hook.result.current.mutate({ viewedReceiptsEnabled: false })
    })
    await act(async () => {
      hook.result.current.mutate({ viewedReceiptsEnabled: true })
    })
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(2))

    // Request đầu lỗi SAU khi toggle cùng field đã thành công — không được đảo lại.
    await act(async () => rejectFirst(new Error('offline')))
    expect(current().viewedReceiptsEnabled).toBe(true)
  })

  it('defers active-query refetch until all story setting toggles settle', async () => {
    const { wrapper, hook, current } = setup()
    let resolveFirst!: (value: UserStorySettings) => void
    let resolveSecond!: (value: UserStorySettings) => void
    mocks.update
      .mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
      .mockImplementationOnce(() => new Promise((r) => (resolveSecond = r)))
    mocks.get.mockResolvedValue(settings)
    renderHook(() => useStorySettings(), { wrapper })
    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(1))
    mocks.get.mockClear()
    mocks.get.mockResolvedValue({
      ...settings,
      viewedReceiptsEnabled: false,
      archiveEnabled: false,
    })

    await act(async () => hook.result.current.mutate({ viewedReceiptsEnabled: false }))
    await act(async () => hook.result.current.mutate({ archiveEnabled: false }))

    await act(async () =>
      resolveFirst({ ...settings, viewedReceiptsEnabled: false, archiveEnabled: true }),
    )
    expect(current()).toMatchObject({ viewedReceiptsEnabled: false, archiveEnabled: false })
    expect(mocks.get).not.toHaveBeenCalled()

    await act(async () =>
      resolveSecond({ ...settings, viewedReceiptsEnabled: false, archiveEnabled: false }),
    )
    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(current()).toMatchObject({ viewedReceiptsEnabled: false, archiveEnabled: false }),
    )
  })

  it('applies success per field without clobbering another pending toggle', async () => {
    const { hook, current } = setup()
    let resolveFirst!: (value: UserStorySettings) => void
    let resolveSecond!: (value: UserStorySettings) => void
    mocks.update
      .mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
      .mockImplementationOnce(() => new Promise((r) => (resolveSecond = r)))

    await act(async () => {
      hook.result.current.mutate({ viewedReceiptsEnabled: false })
    })
    await act(async () => {
      hook.result.current.mutate({ archiveEnabled: false })
    })
    expect(current()).toMatchObject({ viewedReceiptsEnabled: false, archiveEnabled: false })

    // Response của request đầu về SAU, mang giá trị cũ của field thứ hai — không được đè.
    await act(async () =>
      resolveFirst({ ...settings, viewedReceiptsEnabled: false, archiveEnabled: true }),
    )
    expect(current().archiveEnabled).toBe(false)

    await act(async () =>
      resolveSecond({ ...settings, viewedReceiptsEnabled: false, archiveEnabled: false }),
    )
    expect(current()).toMatchObject({ viewedReceiptsEnabled: false, archiveEnabled: false })
  })
})
