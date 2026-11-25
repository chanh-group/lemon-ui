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

  // Cửa sổ nổi chuyên dụng cho cuộc gọi: mở cửa sổ mới độc lập thay vì tab mới.
  // popup=yes bắt buộc Chromium / Opera GX mở một standalone popup window (không có thanh tab).
  // TUYỆT ĐỐI không thêm menubar=yes hoặc toolbar=yes vì sẽ khiến Opera GX xếp vào tab mới.
  const width = 1080
  const height = 720
  const screenLeft = window.screenLeft ?? window.screenX ?? 0
  const screenTop = window.screenTop ?? window.screenY ?? 0
  const screenWidth = window.innerWidth || window.screen.width
  const screenHeight = window.innerHeight || window.screen.height
  const left = Math.max(0, Math.round(screenLeft + (screenWidth - width) / 2))
  const top = Math.max(0, Math.round(screenTop + (screenHeight - height) / 2))

  const windowFeatures = `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`

  let win: Window | null = null
  try {
    win = window.open(url.toString(), '_blank', windowFeatures)
  } catch {
    win = null
  }

  if (!win) {
    onPopupBlocked?.()
    return null
  }
  win.focus()
  return win
}
