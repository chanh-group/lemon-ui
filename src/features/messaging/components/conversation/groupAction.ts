import { AxiosError } from 'axios'
import { ApiError } from '@/infrastructure/api/errors'

export function isAccessError(error: unknown): boolean {
  return (
    (error instanceof ApiError && (error.status === 403 || error.status === 404)) ||
    (error instanceof AxiosError &&
      (error.response?.status === 403 || error.response?.status === 404))
  )
}

function isUncertainActionError(error: unknown): boolean {
  const status =
    error instanceof ApiError
      ? error.status
      : error instanceof AxiosError
        ? error.response?.status
        : undefined
  if (error instanceof ApiError || error instanceof AxiosError) {
    return status === undefined || status === 0 || status >= 500
  }
  return false
}

export async function resolveGroupAction(
  action: () => Promise<unknown>,
  verifyApplied?: () => Promise<boolean>,
): Promise<'applied' | 'uncertain'> {
  try {
    await action()
    return 'applied'
  } catch (error) {
    if (!isUncertainActionError(error)) throw error
    try {
      if (verifyApplied && (await verifyApplied())) return 'applied'
    } catch {
      // The server is still unreachable; keep the result uncertain.
    }
    return 'uncertain'
  }
}
