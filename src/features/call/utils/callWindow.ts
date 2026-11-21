import { callPath } from '@/config/constants'

export interface OpenCallWindowOptions {
  media: 'voice' | 'video'
  state: 'ringing' | 'active'
  callId?: string
  peerName?: string
  peerAvatar?: string | null
}

/**
 * Mở cửa sổ riêng biệt dành cho đàm thoại cuộc gọi (Voice Call / Video Call).
 * Đảm bảo không chiếm tab hay trang hiện tại của người dùng.
 */
export function openCallWindow(
  conversationId: string,
  options: OpenCallWindowOptions,
  onPopupBlocked?: () => void,
): Window | null {
  if (typeof window === 'undefined') return null

  const path = callPath(conversationId, {
    media: options.media,
    state: options.state,
  })

  const url = new URL(path, window.location.origin)
  if (options.callId) url.searchParams.set('callId', options.callId)
  if (options.peerName) url.searchParams.set('peerName', options.peerName)
  if (options.peerAvatar) url.searchParams.set('peerAvatar', options.peerAvatar)

  // Cửa sổ nổi chuyên dụng cho cuộc gọi: kích thước tối ưu 1080x720, resizable
  const windowFeatures =
    'width=1080,height=720,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no'
  const windowName = `LemonCall_${conversationId}`

  const win = window.open(url.toString(), windowName, windowFeatures)
  if (!win) {
    onPopupBlocked?.()
    return null
  }
  win.focus()
  return win
}
