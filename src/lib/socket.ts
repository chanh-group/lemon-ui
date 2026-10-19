import { io, type Socket } from 'socket.io-client'
import { env } from '@/config/env'
import { useAuthStore } from '@/infrastructure/auth/auth-store'

let socket: Socket | null = null
let pingTimer: ReturnType<typeof setInterval> | null = null

export type SocketConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

function getSocketUrl(): string | undefined {
  return env.WS_URL.trim() || undefined
}

/**
 * Khởi tạo hoặc lấy Socket singleton instance với handshake auth token.
 */
export function getChatSocket(): Socket {
  if (!socket) {
    socket = io(getSocketUrl(), {
      auth: (callback) => callback({ token: useAuthStore.getState().accessToken }),
      transports: ['websocket', 'polling'],
      autoConnect: false,
      withCredentials: true,
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
  }

  return socket
}

/**
 * Kết nối socket nếu chưa kết nối.
 */
export function connectChatSocket(): Socket {
  const s = getChatSocket()
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
