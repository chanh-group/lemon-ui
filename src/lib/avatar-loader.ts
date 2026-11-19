import { useEffect, useState } from 'react'
import { api } from '@/infrastructure/api/client'
import { useAuthStore } from '@/infrastructure/auth/auth-store'

interface CachedAvatar {
  objectUrl: string
  refCount: number
}

interface PendingAvatar {
  promise: Promise<string | null>
  refCount: number
  controller: AbortController
}

const avatarCache = new Map<string, CachedAvatar>()
const pendingPromises = new Map<string, PendingAvatar>()
let cacheGeneration = 0

export function isGroupAvatarUrl(url?: string | null): boolean {
  if (!url) return false
  return url.includes('/files/group-avatars/')
}

export async function fetchGroupAvatarBlobUrl(url: string): Promise<string | null> {
  const cached = avatarCache.get(url)
  if (cached) {
    cached.refCount++
    return cached.objectUrl
  }

  const existing = pendingPromises.get(url)
  if (existing) {
    existing.refCount++
    return existing.promise
  }

  const generation = cacheGeneration
  const pending: PendingAvatar = {
    promise: Promise.resolve(null),
    refCount: 1,
    controller: new AbortController(),
  }
  pendingPromises.set(url, pending)
  pending.promise = (async () => {
    try {
      const match = url.match(/\/files\/group-avatars\/[^?#]+/)
      const requestPath = match ? match[0] : url
      const response = await api.get<Blob>(requestPath, {
        responseType: 'blob',
        signal: pending.controller.signal,
      })
      const blob = response.data
      if (!(blob instanceof Blob) || blob.size === 0) return null
      const objectUrl = typeof URL.createObjectURL === 'function' ? URL.createObjectURL(blob) : ''
      if (
        generation !== cacheGeneration ||
        pendingPromises.get(url) !== pending ||
        pending.refCount <= 0
      ) {
        if (objectUrl && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(objectUrl)
        return null
      }
      avatarCache.set(url, { objectUrl, refCount: pending.refCount })
      return objectUrl
    } catch {
      return null
    } finally {
      if (pendingPromises.get(url) === pending) pendingPromises.delete(url)
    }
  })()
  return pending.promise
}

export function releaseGroupAvatarBlobUrl(url: string): void {
  const cached = avatarCache.get(url)
  if (!cached) {
    const pending = pendingPromises.get(url)
    if (!pending) return
    pending.refCount--
    if (pending.refCount <= 0) {
      pendingPromises.delete(url)
      pending.controller.abort()
    }
    return
  }
  cached.refCount--
  if (cached.refCount <= 0) {
    if (typeof URL.revokeObjectURL === 'function' && cached.objectUrl) {
      URL.revokeObjectURL(cached.objectUrl)
    }
    avatarCache.delete(url)
  }
}

export function clearAllGroupAvatarBlobs(): void {
  cacheGeneration++
  for (const pending of pendingPromises.values()) pending.controller.abort()
  for (const [, cached] of avatarCache) {
    try {
      if (typeof URL.revokeObjectURL === 'function' && cached.objectUrl) {
        URL.revokeObjectURL(cached.objectUrl)
      }
    } catch {
      // ignore
    }
  }
  avatarCache.clear()
  pendingPromises.clear()
}

export function useAvatarSrc(src?: string | null): string | null {
  const isGroup = isGroupAvatarUrl(src)
  const accessToken = useAuthStore((s) => s.accessToken)
  const [loaded, setLoaded] = useState<{ src: string; token: string; url: string | null } | null>(
    null,
  )

  useEffect(() => {
    if (!src || !isGroup || !accessToken) return

    let active = true
    void fetchGroupAvatarBlobUrl(src).then((url) => {
      if (active) {
        setLoaded({ src, token: accessToken, url })
      }
    })

    return () => {
      active = false
      releaseGroupAvatarBlobUrl(src)
    }
  }, [src, accessToken, isGroup])

  if (!src) return null
  if (!isGroup) return src
  return loaded?.src === src && loaded.token === accessToken ? loaded.url : null
}
