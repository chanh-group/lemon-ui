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

  // Lưu peer info vào localStorage/sessionStorage để cửa sổ mới có thể đọc ngay
  // mà TUYỆT ĐỐI không đưa peerAvatar vào URL query string (tránh lỗi HTTP 431 Request Header Fields Too Large)
  if (options.peerName || options.peerAvatar) {
    try {
      const payload = JSON.stringify({
        peerName: options.peerName ? options.peerName.slice(0, 80) : undefined,
        peerAvatar: options.peerAvatar,
      })
      sessionStorage.setItem(`lemon_call_peer_${conversationId}`, payload)
      localStorage.setItem(`lemon_call_peer_${conversationId}`, payload)
    } catch {
      // Bỏ qua nếu storage đầy hoặc bị chặn
    }
  }

  const path = callPath(conversationId, {
    media: options.media,
    state: options.state,
  })

  const url = new URL(path, window.location.origin)
  if (options.callId) url.searchParams.set('callId', options.callId)
  if (options.peerName) {
    url.searchParams.set('peerName', options.peerName.slice(0, 60))
  }

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
