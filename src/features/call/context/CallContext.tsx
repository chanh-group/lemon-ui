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

  const stopRingtone = useCallback(() => {
    if (stopIncomingRingtoneRef.current) {
      stopIncomingRingtoneRef.current()
      stopIncomingRingtoneRef.current = null
    }
  }, [])

  const dismissIncomingCall = useCallback(() => {
    stopRingtone()
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

    const onCancelled = () => {
      dismissIncomingCall()
      toast.info(t('chat.callEndedCancelled'))
    }

    const onMissed = (payload: CallMissedPayload) => {
      dismissIncomingCall()
      toast.info(t('chat.missedCallNotice', { reason: payload.reason }))
    }

    const onEnded = () => {
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
      openCallWindow(
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
    },
    [t],
  )

  const acceptIncomingCall = useCallback(
    (overrideMedia?: CallMedia) => {
      if (!incomingCall) return
      stopRingtone()

      const targetMedia = overrideMedia || incomingCall.media
      const uiMedia = toUiMedia(targetMedia)
      const convId = incomingCall.conversationId
      const cId = incomingCall.callId
      const pName = incomingCall.caller.fullName || incomingCall.caller.username
      const pAvatar = incomingCall.caller.avatarUrl

      setIncomingCall(null)

      // Mở hẳn cửa sổ mới cho cuộc gọi
      openCallWindow(
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
