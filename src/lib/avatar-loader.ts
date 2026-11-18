import { useEffect, useState } from 'react'
import { api } from '@/infrastructure/api/client'
import { useAuthStore } from '@/infrastructure/auth/auth-store'

interface CachedAvatar {
  objectUrl: string
  refCount: number
}

const avatarCache = new Map<string, CachedAvatar>()
const pendingPromises = new Map<string, Promise<string | null>>()

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

  if (pendingPromises.has(url)) {
    return pendingPromises.get(url)!
  }

  const promise = (async () => {
    try {
      const match = url.match(/\/files\/group-avatars\/[^?#]+/)
      const requestPath = match ? match[0] : url
      const response = await api.get<Blob>(requestPath, { responseType: 'blob' })
      const blob = response.data
      if (!(blob instanceof Blob) || blob.size === 0) return null
      const objectUrl = typeof URL.createObjectURL === 'function' ? URL.createObjectURL(blob) : ''
      avatarCache.set(url, { objectUrl, refCount: 1 })
      return objectUrl
    } catch {
      return null
    } finally {
      pendingPromises.delete(url)
    }
  })()

  pendingPromises.set(url, promise)
  return promise
}

export function releaseGroupAvatarBlobUrl(url: string): void {
  const cached = avatarCache.get(url)
  if (!cached) return
  cached.refCount--
  if (cached.refCount <= 0) {
    if (typeof URL.revokeObjectURL === 'function' && cached.objectUrl) {
      URL.revokeObjectURL(cached.objectUrl)
    }
    avatarCache.delete(url)
  }
}

export function clearAllGroupAvatarBlobs(): void {
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
  const [blobUrl, setBlobUrl] = useState<string | null>(() => {
    if (!src || !isGroup) return null
    const cached = avatarCache.get(src)
    return cached ? cached.objectUrl : null
  })

  const accessToken = useAuthStore((s) => s.accessToken)

  useEffect(() => {
    if (!src || !isGroup) return

    let active = true
    void fetchGroupAvatarBlobUrl(src).then((url) => {
      if (active) {
        setBlobUrl(url)
      }
    })

    return () => {
      active = false
      releaseGroupAvatarBlobUrl(src)
    }
  }, [src, accessToken, isGroup])

  if (!src) return null
  if (!isGroup) return src
  return blobUrl
}
