import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/infrastructure/api/errors'
import { resolveGroupAction } from './groupAction'

describe('group action reconciliation', () => {
  it('treats a timed-out write as applied when a fresh read confirms it', async () => {
    const action = vi.fn().mockRejectedValue(new ApiError('UNKNOWN', 0, 'timeout'))
    const verify = vi.fn().mockResolvedValue(true)
    await expect(resolveGroupAction(action, verify)).resolves.toBe('applied')
    expect(verify).toHaveBeenCalledOnce()
  })

  it('keeps an unverified write uncertain without claiming it failed', async () => {
    const action = vi.fn().mockRejectedValue(new ApiError('UNKNOWN', 503, 'unavailable'))
    const verify = vi.fn().mockRejectedValue(new Error('read unavailable'))
    await expect(resolveGroupAction(action, verify)).resolves.toBe('uncertain')
  })

  it('does not retry verification for a definite permission failure', async () => {
    const error = new ApiError('FORBIDDEN', 403, 'forbidden')
    const verify = vi.fn()
    await expect(resolveGroupAction(() => Promise.reject(error), verify)).rejects.toBe(error)
    expect(verify).not.toHaveBeenCalled()
  })
})
