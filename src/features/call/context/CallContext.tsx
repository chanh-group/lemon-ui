import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { getChatSocket } from '@/lib/socket'
import { useAuth } from '@/features/auth/api'
import { callApi } from '../api/call.api'
import { playIncomingRingtone } from '../utils/callSounds'
import { openCallWindow } from '../utils/callWindow'
import {
  toUiMedia,
  type CallCancelledPayload,
  type CallEndedPayload,
  type CallIncomingPayload,
  type CallMedia,
  type CallMissedPayload,
} from '../types/call.types'

interface CallContextValue {
  incomingCall: CallIncomingPayload | null
  startCall: (params: {
    conversationId: string
    media: 'voice' | 'video' | CallMedia
    peerName?: string
    peerAvatar?: string | null
  }) => void
  acceptIncomingCall: (overrideMedia?: CallMedia) => void
  rejectIncomingCall: (reason?: string) => Promise<void>
  dismissIncomingCall: () => void
}

const CallContext = createContext<CallContextValue | null>(null)

export function CallProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const { status } = useAuth()

  const [incomingCall, setIncomingCall] = useState<CallIncomingPayload | null>(null)
  const stopIncomingRingtoneRef = useRef<(() => void) | null>(null)
  const incomingCallRef = useRef<CallIncomingPayload | null>(null)

  // Đồng bộ ref với state để các socket listener đọc được incomingCall hiện tại
  // mà không cần đăng ký lại listener mỗi khi incomingCall thay đổi
  useEffect(() => {
    incomingCallRef.current = incomingCall
  }, [incomingCall])

  const stopRingtone = useCallback(() => {
    if (stopIncomingRingtoneRef.current) {
      stopIncomingRingtoneRef.current()
      stopIncomingRingtoneRef.current = null
    }
  }, [])

  const dismissIncomingCall = useCallback(() => {
    stopRingtone()
    incomingCallRef.current = null
    setIncomingCall(null)
  }, [stopRingtone])

  // Lắng nghe các tín hiệu cuộc gọi đến trên Socket.IO
  useEffect(() => {
    if (status !== 'authenticated') return
    const socket = getChatSocket()

    const onIncoming = (payload: CallIncomingPayload) => {
      setIncomingCall(payload)
      stopRingtone()
      stopIncomingRingtoneRef.current = playIncomingRingtone()
    }

    const onCancelled = (payload: CallCancelledPayload) => {
      // Chỉ tắt modal cuộc gọi đến nếu event này thuộc về đúng cuộc gọi đang rung
      if (incomingCallRef.current && payload.callId !== incomingCallRef.current.callId) {
        return
      }
      dismissIncomingCall()
      toast.info(t('chat.callEndedCancelled'))
    }

    const onMissed = (payload: CallMissedPayload) => {
      if (incomingCallRef.current && payload.callId !== incomingCallRef.current.callId) {
        return
      }
      dismissIncomingCall()
      toast.info(t('chat.missedCallNotice', { reason: payload.reason }))
    }

    const onEnded = (payload: CallEndedPayload) => {
      if (incomingCallRef.current && payload.callId !== incomingCallRef.current.callId) {
        return
      }
      dismissIncomingCall()
    }

    socket.on('call:incoming', onIncoming)
    socket.on('call:cancelled', onCancelled)
    socket.on('call:missed', onMissed)
    socket.on('call:ended', onEnded)

    return () => {
      socket.off('call:incoming', onIncoming)
      socket.off('call:cancelled', onCancelled)
      socket.off('call:missed', onMissed)
      socket.off('call:ended', onEnded)
      stopRingtone()
    }
  }, [dismissIncomingCall, status, stopRingtone, t])

  // Lắng nghe tín hiệu giải phóng cuộc gọi từ popup window qua postMessage
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'LEMON_CALL_TERMINATE' && event.data.callId) {
        const { callId, action, reason } = event.data
        if (action === 'cancel') {
          void callApi.cancelCall(callId)
        } else if (action === 'end') {
          void callApi.endCall(callId, reason || 'WINDOW_CLOSED')
        }
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  const startCall = useCallback(
    ({
      conversationId,
      media,
      peerName,
      peerAvatar,
    }: {
      conversationId: string
      media: 'voice' | 'video' | CallMedia
      peerName?: string
      peerAvatar?: string | null
    }) => {
      const uiMedia = toUiMedia(media)
      const win = openCallWindow(
        conversationId,
        {
          media: uiMedia,
          state: 'ringing',
          peerName,
          peerAvatar,
        },
        () => {
          toast.warning(
            t(
              'chat.popupBlockedNotice',
              'Trình duyệt đã chặn cửa sổ cuộc gọi. Vui lòng cho phép popup để đàm thoại.',
            ),
          )
        },
      )

      if (win) {
        // Fallback guard trên tab chính: nếu popup bị đóng đột ngột (nút X / crash),
        // kiểm tra và dọn dẹp cuộc gọi còn kẹt ở trạng thái đổ chuông
        const checkInterval = window.setInterval(() => {
          if (win.closed) {
            window.clearInterval(checkInterval)
            void (async () => {
              try {
                const active = await callApi.getActiveCall()
                if (
                  active &&
                  (active.status === 'RINGING' || active.status === 'INITIATED') &&
                  active.conversationId === conversationId
                ) {
                  await callApi.cancelCall(active.id)
                }
              } catch {
                // ignore
              }
            })()
          }
        }, 1000)

        window.setTimeout(() => window.clearInterval(checkInterval), 60000)
      }
    },
    [t],
  )

  const acceptIncomingCall = useCallback(
    (overrideMedia?: CallMedia) => {
      if (!incomingCall) return

      const targetMedia = overrideMedia || incomingCall.media
      const uiMedia = toUiMedia(targetMedia)
      const convId = incomingCall.conversationId
      const cId = incomingCall.callId
      const pName = incomingCall.caller.fullName || incomingCall.caller.username
      const pAvatar = incomingCall.caller.avatarUrl

      // Mở cửa sổ mới cho cuộc gọi TRƯỚC khi tắt chuông và xóa incoming modal
      const win = openCallWindow(
        convId,
        {
          media: uiMedia,
          state: 'active',
          callId: cId,
          peerName: pName,
          peerAvatar: pAvatar,
        },
        () => {
          toast.warning(
            t(
              'chat.popupBlockedNotice',
              'Trình duyệt đã chặn cửa sổ cuộc gọi. Vui lòng cho phép popup để đàm thoại.',
            ),
          )
        },
      )

      // Nếu popup bị chặn (win === null), KHÔNG xóa modal và KHÔNG tắt chuông
      // để người dùng cho phép popup và bấm lại Chấp nhận
      if (!win) {
        return
      }

      stopRingtone()
      setIncomingCall(null)
    },
    [incomingCall, stopRingtone, t],
  )

  const rejectIncomingCall = useCallback(
    async (reason = 'USER_DECLINED') => {
      if (!incomingCall) return
      const callId = incomingCall.callId
      dismissIncomingCall()

      try {
        await callApi.rejectCall(callId, reason)
      } catch (err) {
        console.warn('Reject call error:', err)
      }
    },
    [dismissIncomingCall, incomingCall],
  )

  return (
    <CallContext.Provider
      value={{
        incomingCall,
        startCall,
        acceptIncomingCall,
        rejectIncomingCall,
        dismissIncomingCall,
      }}
    >
      {children}
    </CallContext.Provider>
  )
}

export function useCall(): CallContextValue {
  const context = useContext(CallContext)
  if (!context) {
    throw new Error('useCall must be used within a CallProvider')
  }
  return context
}
