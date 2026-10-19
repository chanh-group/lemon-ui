import { io, type Socket } from 'socket.io-client'
import { getAccessToken } from './token-manager'

let socket: Socket | null = null
let pingTimer: ReturnType<typeof setInterval> | null = null

function getSocketUrl(): string {
  // Trỏ trực tiếp backend port 3000 hoặc dùng origin nếu proxy
  return import.meta.env.VITE_WS_URL || 'http://localhost:3000'
}

/**
 * Khởi tạo hoặc lấy Socket singleton instance với handshake auth token.
 */
export function getChatSocket(): Socket {
  const token = getAccessToken()

  if (!socket) {
    socket = io(getSocketUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: false,
    })

    socket.on('connect', () => {
      // Start presence heartbeat 30s
      if (pingTimer) clearInterval(pingTimer)
      pingTimer = setInterval(() => {
        if (socket?.connected) {
          socket.emit('presence:ping', {})
        }
      }, 30000)
    })

    socket.on('disconnect', () => {
      if (pingTimer) {
        clearInterval(pingTimer)
        pingTimer = null
      }
    })

    socket.on('connect_error', (err) => {
      // Token expired or invalid
      console.warn('[Socket] Connect error:', err.message)
    })
  } else {
    // Cập nhật auth token mới nếu token thay đổi
    socket.auth = { token }
  }

  return socket
}

/**
 * Kết nối socket nếu chưa kết nối.
 */
export function connectChatSocket(): Socket {
  const s = getChatSocket()
  const token = getAccessToken()
  s.auth = { token }

  if (!s.connected) {
    s.connect()
  }
  return s
}

/**
 * Ngắt kết nối socket (khi logout).
 */
export function disconnectChatSocket(): void {
  if (pingTimer) {
    clearInterval(pingTimer)
    pingTimer = null
  }
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

/**
 * Tham gia room cuộc hội thoại
 */
export function joinConversation(conversationId: string): void {
  const s = getChatSocket()
  if (s.connected) {
    s.emit('conv:join', { conversationId })
  }
}

/**
 * Rời room cuộc hội thoại
 */
export function leaveConversation(conversationId: string): void {
  const s = getChatSocket()
  if (s.connected) {
    s.emit('conv:leave', { conversationId })
  }
}

/**
 * Báo trạng thái bắt đầu gõ phím
 */
export function emitTypingStart(conversationId: string): void {
  const s = getChatSocket()
  if (s.connected) {
    s.emit('typing:start', { conversationId })
  }
}

/**
 * Báo trạng thái dừng gõ phím
 */
export function emitTypingStop(conversationId: string): void {
  const s = getChatSocket()
  if (s.connected) {
    s.emit('typing:stop', { conversationId })
  }
}

