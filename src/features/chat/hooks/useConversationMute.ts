import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'lemon_muted_conversations'
const MUTE_CHANGE_EVENT = 'lemon:conversation-mute-change'

function getMutedList(): string[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function setMutedList(list: string[]) {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    window.dispatchEvent(new CustomEvent(MUTE_CHANGE_EVENT))
  } catch {
    // ignore localStorage errors
  }
}

export function isConversationMuted(conversationId: string): boolean {
  if (!conversationId) return false
  return getMutedList().includes(conversationId)
}

/**
 * Hook quản lý trạng thái bật / tắt thông báo (Mute) theo từng cuộc hội thoại.
 * Lưu trữ trong localStorage để duy trì trạng thái sau khi tải lại trang.
 */
export function useConversationMute(conversationId?: string) {
  const [prevId, setPrevId] = useState(conversationId)
  const [muted, setMuted] = useState<boolean>(() =>
    conversationId ? isConversationMuted(conversationId) : false,
  )

  if (conversationId !== prevId) {
    setPrevId(conversationId)
    setMuted(conversationId ? isConversationMuted(conversationId) : false)
  }

  useEffect(() => {
    if (!conversationId) return

    const check = () => setMuted(isConversationMuted(conversationId))

    if (typeof window !== 'undefined') {
      window.addEventListener(MUTE_CHANGE_EVENT, check)
      window.addEventListener('storage', check)
      return () => {
        window.removeEventListener(MUTE_CHANGE_EVENT, check)
        window.removeEventListener('storage', check)
      }
    }
  }, [conversationId])

  const toggleMute = useCallback(() => {
    if (!conversationId) return false
    const list = getMutedList()
    const currentlyMuted = list.includes(conversationId)
    const nextList = currentlyMuted
      ? list.filter((id) => id !== conversationId)
      : [...list, conversationId]
    setMutedList(nextList)
    setMuted(!currentlyMuted)
    return !currentlyMuted
  }, [conversationId])

  return { isMuted: muted, toggleMute }
}
