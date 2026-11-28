import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/infrastructure/api/client'
import { useAuthStore } from './auth-store'
import { bootstrapSession, signOutEverywhere } from './session'

vi.mock('@/config/env', () => ({ isAuthBypass: () => false, env: { API_URL: 'http://localhost' } }))

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

afterEach(() => {
  vi.restoreAllMocks()
  useAuthStore.getState().reset()
})

describe('session transitions', () => {
  it.each(['success', 'failure'])(
    'does not let an old bootstrap %s replace a newer login',
    async (outcome) => {
      useAuthStore.getState().reset()
      const pending = deferred<{ data: { accessToken: string } }>()
      vi.spyOn(api, 'post').mockReturnValue(pending.promise)
      const boot = bootstrapSession()
      useAuthStore.getState().setAccessToken('new-account')
      if (outcome === 'success') pending.resolve({ data: { accessToken: 'old-account' } })
      else pending.reject(new Error('offline'))
      await boot
      expect(useAuthStore.getState().accessToken).toBe('new-account')
    },
  )

  it('does not let an old logout clear a newer session or its cache', async () => {
    useAuthStore.getState().setAccessToken('old-account')
    const pending = deferred<{ data: unknown }>()
    vi.spyOn(api, 'post').mockReturnValue(pending.promise)
    const clearCache = vi.fn()
    const logout = signOutEverywhere(clearCache)
    useAuthStore.getState().setAccessToken('new-account')
    pending.resolve({ data: null })
    await logout
    expect(useAuthStore.getState().accessToken).toBe('new-account')
    expect(clearCache).not.toHaveBeenCalled()
  })
})
