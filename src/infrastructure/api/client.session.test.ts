import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './client'
import { useAuthStore } from '@/infrastructure/auth/auth-store'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

function response(config: InternalAxiosRequestConfig, status = 200): AxiosResponse {
  return {
    config,
    status,
    statusText: '',
    headers: new AxiosHeaders(),
    data: { success: true, data: 'ok' },
  }
}

function fail(config: InternalAxiosRequestConfig, status: number): AxiosError {
  return new AxiosError('request failed', undefined, config, undefined, response(config, status))
}

let adapter: AxiosAdapter | AxiosAdapter[] | undefined
beforeEach(() => {
  adapter = api.defaults.adapter
  useAuthStore.getState().setAccessToken('account-a')
})
afterEach(() => {
  api.defaults.adapter = adapter
  vi.restoreAllMocks()
  useAuthStore.getState().reset()
})

describe('session-bound requests', () => {
  it.each(['resolve', 'reject'])(
    'does not let an old refresh %s affect a new account',
    async (outcome) => {
      const refresh = deferred<AxiosResponse>()
      const post = vi.spyOn(axios, 'post').mockReturnValue(refresh.promise)
      const transport = vi.fn((config: InternalAxiosRequestConfig) =>
        Promise.reject(fail(config, 401)),
      )
      api.defaults.adapter = transport
      const request = api.get('/protected').catch((error: unknown) => error)
      await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(1))
      useAuthStore.getState().setAccessToken('account-b')
      if (outcome === 'resolve')
        refresh.resolve({
          data: { success: true, data: { accessToken: 'old-refreshed' } },
        } as AxiosResponse)
      else refresh.reject(new Error('offline'))
      await request
      expect(useAuthStore.getState().accessToken).toBe('account-b')
      expect(transport).toHaveBeenCalledTimes(1)
    },
  )

  it('shares a refresh within a session and retries with the refreshed token', async () => {
    const refresh = deferred<AxiosResponse>()
    const post = vi.spyOn(axios, 'post').mockReturnValue(refresh.promise)
    const transport = vi.fn((config: InternalAxiosRequestConfig) =>
      config.headers.get('Authorization') === 'Bearer refreshed'
        ? Promise.resolve(response(config))
        : Promise.reject(fail(config, 401)),
    )
    api.defaults.adapter = transport
    const requests = Promise.all([api.get('/one'), api.get('/two')])
    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    refresh.resolve({
      data: { success: true, data: { accessToken: 'refreshed' } },
    } as AxiosResponse)
    await requests
    expect(transport).toHaveBeenCalledTimes(4)
    expect(useAuthStore.getState().accessToken).toBe('refreshed')
  })

  it('does not share a pending refresh with a new session', async () => {
    const first = deferred<AxiosResponse>()
    const second = deferred<AxiosResponse>()
    const post = vi
      .spyOn(axios, 'post')
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    api.defaults.adapter = (config) =>
      config.headers.get('Authorization') === 'Bearer b-refreshed'
        ? Promise.resolve(response(config))
        : Promise.reject(fail(config, 401))
    const oldRequest = api.get('/old').catch((error: unknown) => error)
    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    useAuthStore.getState().setAccessToken('account-b')
    const newRequest = api.get('/new')
    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(2))
    first.resolve({
      data: { success: true, data: { accessToken: 'a-refreshed' } },
    } as AxiosResponse)
    second.resolve({
      data: { success: true, data: { accessToken: 'b-refreshed' } },
    } as AxiosResponse)
    await oldRequest
    await newRequest
    expect(useAuthStore.getState().accessToken).toBe('b-refreshed')
  })

  it('does not reset a session when the retried request fails', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: { success: true, data: { accessToken: 'refreshed' } },
    })
    api.defaults.adapter = (config) =>
      Promise.reject(
        fail(config, config.headers.get('Authorization') === 'Bearer refreshed' ? 500 : 401),
      )
    await expect(api.get('/protected')).rejects.toMatchObject({ status: 500 })
    expect(useAuthStore.getState().accessToken).toBe('refreshed')
  })

  it('rejects a successful response from an old session', async () => {
    const pending = deferred<AxiosResponse>()
    let requestConfig!: InternalAxiosRequestConfig
    api.defaults.adapter = (config) => {
      requestConfig = config
      return pending.promise
    }
    const request = api.get('/protected')
    const handled = request.catch((error: unknown) => error)
    useAuthStore.getState().setAccessToken('account-b')
    pending.resolve(response(requestConfig))
    expect(await handled).toBeInstanceOf(Error)
    expect(useAuthStore.getState().accessToken).toBe('account-b')
  })
})
