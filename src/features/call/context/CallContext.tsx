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
import {
  playConnectedTone,
  playHangupTone,
  playIncomingRingtone,
  playOutgoingDialingSound,
} from '../utils/callSounds'
import { useLiveKitCall, type UseLiveKitCallReturn } from '../hooks/useLiveKitCall'
import {
  toApiMedia,
  type CallAcceptedPayload,
  type CallClientPhase,
  type CallEndedPayload,
  type CallIncomingPayload,
  type CallMedia,
  type CallMissedPayload,
  type CallRejectedPayload,
  type CallResponse,
  type LiveKitConnectionDetails,
} from '../types/call.types'

export interface ActivePeerInfo {
  id?: string
  name: string
  avatarUrl?: string | null
  isGroup?: boolean
}

interface CallContextValue {
  activeCall: CallResponse | null
  incomingCall: CallIncomingPayload | null
  callPhase: CallClientPhase
  activePeer: ActivePeerInfo | null
  livekitDetails: LiveKitConnectionDetails | null
  endReason: string | null
  livekit: UseLiveKitCallReturn
  startCall: (params: {
    conversationId: string
    media: 'voice' | 'video' | CallMedia
    peerName: string
    peerAvatar?: string | null
    isGroup?: boolean
  }) => Promise<void>
  acceptIncomingCall: (overrideMedia?: CallMedia) => Promise<void>
  rejectIncomingCall: (reason?: string) => Promise<void>
  cancelOutgoingCall: () => Promise<void>
  endActiveCall: (reason?: string) => Promise<void>
  resetCallState: () => void
}

const CallContext = createContext<CallContextValue | null>(null)

export function CallProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const { status, user } = useAuth()
  const livekit = useLiveKitCall()

  const [activeCall, setActiveCall] = useState<CallResponse | null>(null)
  const [incomingCall, setIncomingCall] = useState<CallIncomingPayload | null>(null)
  const [callPhase, setCallPhase] = useState<CallClientPhase>('idle')
  const [activePeer, setActivePeer] = useState<ActivePeerInfo | null>(null)
  const [livekitDetails, setLivekitDetails] = useState<LiveKitConnectionDetails | null>(null)
  const [endReason, setEndReason] = useState<string | null>(null)

  const stopDialingSoundRef = useRef<(() => void) | null>(null)
  const stopIncomingRingtoneRef = useRef<(() => void) | null>(null)
  const activeCallRef = useRef<CallResponse | null>(null)

  useEffect(() => {
    activeCallRef.current = activeCall
  }, [activeCall])

  const stopAllSounds = useCallback(() => {
    if (stopDialingSoundRef.current) {
      stopDialingSoundRef.current()
      stopDialingSoundRef.current = null
    }
    if (stopIncomingRingtoneRef.current) {
      stopIncomingRingtoneRef.current()
      stopIncomingRingtoneRef.current = null
    }
  }, [])

  const resetCallState = useCallback(() => {
    stopAllSounds()
    livekit.disconnect()
    setActiveCall(null)
    setIncomingCall(null)
    setCallPhase('idle')
    setActivePeer(null)
    setLivekitDetails(null)
    setEndReason(null)
  }, [livekit, stopAllSounds])

  // Khôi phục cuộc gọi nếu người dùng F5 tải lại trang
  useEffect(() => {
    if (status !== 'authenticated') return

    void callApi
      .getActiveCall()
      .then(async (call) => {
        if (!call) return
        setActiveCall(call)
        setCallPhase('active')
        setActivePeer({
          id: call.callerId === user?.id ? (call.calleeId ?? undefined) : call.callerId,
          name: t('chat.activeCallSession'),
        })

        // Lấy token để kết nối LiveKit
        try {
          const lkDetails = await callApi.getCallToken(call.id)
          setLivekitDetails(lkDetails)
          await livekit.connect(lkDetails.serverUrl, lkDetails.token, call.media)
        } catch (err) {
          console.warn('Failed to reconnect to active call LiveKit room:', err)
        }
      })
      .catch(() => {
        // Ignored
      })
  }, [status, t, user?.id, livekit])

  // Đăng ký các sự kiện Socket.IO
  useEffect(() => {
    if (status !== 'authenticated') return
    const socket = getChatSocket()

    const onIncoming = (payload: CallIncomingPayload) => {
      // Nếu đang bận cuộc gọi khác -> tự động từ chối
      if (activeCallRef.current) {
        void callApi.rejectCall(payload.callId, 'BUSY')
        return
      }

      setIncomingCall(payload)
      setCallPhase('incoming')
      setActivePeer({
        id: payload.caller.id,
        name: payload.caller.fullName || payload.caller.username,
        avatarUrl: payload.caller.avatarUrl,
      })

      stopAllSounds()
      stopIncomingRingtoneRef.current = playIncomingRingtone()
    }

    const onAccepted = (payload: CallAcceptedPayload) => {
      stopAllSounds()
      playConnectedTone()
      setCallPhase('active')
      setActiveCall((prev) => (prev ? { ...prev, status: 'ACCEPTED', answeredAt: payload.answeredAt } : null))

      // Kết nối LiveKit SFU cho Caller
      if (livekitDetails) {
        const media = activeCallRef.current?.media || 'VOICE'
        void livekit.connect(livekitDetails.serverUrl, livekitDetails.token, media)
      }
    }

    const onRejected = (payload: CallRejectedPayload) => {
      stopAllSounds()
      playHangupTone()
      setCallPhase('ended')
      setEndReason(payload.reason || 'REJECTED')
      toast.info(t('chat.callEndedDeclined'))
      livekit.disconnect()

      window.setTimeout(() => {
        setCallPhase((current) => (current === 'ended' ? 'idle' : current))
        setActiveCall(null)
      }, 2500)
    }

    const onCancelled = () => {
      stopAllSounds()
      playHangupTone()
      setIncomingCall(null)
      setCallPhase('idle')
      toast.info(t('chat.callEndedCancelled'))
    }

    const onMissed = (payload: CallMissedPayload) => {
      stopAllSounds()
      setIncomingCall(null)
      setCallPhase('idle')
      toast.info(t('chat.missedCallNotice', { reason: payload.reason }))
    }

    const onEnded = (payload: CallEndedPayload) => {
      stopAllSounds()
      playHangupTone()
      livekit.disconnect()
      setCallPhase('ended')
      setEndReason(payload.reason)

      window.setTimeout(() => {
        setCallPhase((current) => (current === 'ended' ? 'idle' : current))
        setActiveCall(null)
        setIncomingCall(null)
      }, 2000)
    }

    const onUserDisconnected = () => {
      toast.warning(t('chat.callPeerDisconnected'))
    }

    const onUserReconnected = () => {
      toast.success(t('chat.callPeerReconnected'))
    }

    socket.on('call:incoming', onIncoming)
    socket.on('call:accepted', onAccepted)
    socket.on('call:rejected', onRejected)
    socket.on('call:cancelled', onCancelled)
    socket.on('call:missed', onMissed)
    socket.on('call:ended', onEnded)
    socket.on('call:user-disconnected', onUserDisconnected)
    socket.on('call:user-reconnected', onUserReconnected)

    return () => {
      socket.off('call:incoming', onIncoming)
      socket.off('call:accepted', onAccepted)
      socket.off('call:rejected', onRejected)
      socket.off('call:cancelled', onCancelled)
      socket.off('call:missed', onMissed)
      socket.off('call:ended', onEnded)
      socket.off('call:user-disconnected', onUserDisconnected)
      socket.off('call:user-reconnected', onUserReconnected)
    }
  }, [livekit, livekitDetails, status, stopAllSounds, t])

  const startCall = useCallback(
    async ({
      conversationId,
      media,
      peerName,
      peerAvatar,
      isGroup,
    }: {
      conversationId: string
      media: 'voice' | 'video' | CallMedia
      peerName: string
      peerAvatar?: string | null
      isGroup?: boolean
    }) => {
      stopAllSounds()
      const apiMedia = toApiMedia(media)

      try {
        const res = await callApi.initiateCall({ conversationId, media: apiMedia })
        setActiveCall(res)
        setLivekitDetails(res.livekit)
        setActivePeer({ name: peerName, avatarUrl: peerAvatar, isGroup })
        setCallPhase('outgoing')

        // Bắt đầu chuông tút tút
        stopDialingSoundRef.current = playOutgoingDialingSound()
      } catch (err: unknown) {
        console.error('Failed to initiate call:', err)
        toast.error(t('chat.callInitiateError'))
        resetCallState()
      }
    },
    [resetCallState, stopAllSounds, t],
  )

  const acceptIncomingCall = useCallback(
    async (overrideMedia?: CallMedia) => {
      if (!incomingCall) return
      stopAllSounds()

      const targetMedia = overrideMedia || incomingCall.media
      try {
        const res = await callApi.acceptCall(incomingCall.callId)
        setActiveCall({
          id: res.id,
          conversationId: incomingCall.conversationId,
          callerId: incomingCall.caller.id,
          media: targetMedia,
          status: 'ACCEPTED',
          startedAt: new Date().toISOString(),
          answeredAt: res.answeredAt,
          endedAt: null,
          durationSecs: 0,
          livekit: res.livekit,
        })
        setLivekitDetails(res.livekit)
        setCallPhase('active')
        setIncomingCall(null)

        playConnectedTone()
        await livekit.connect(res.livekit.serverUrl, res.livekit.token, targetMedia)
      } catch (err) {
        console.error('Failed to accept call:', err)
        toast.error(t('chat.callAcceptError'))
        resetCallState()
      }
    },
    [incomingCall, livekit, resetCallState, stopAllSounds, t],
  )

  const rejectIncomingCall = useCallback(
    async (reason = 'USER_DECLINED') => {
      if (!incomingCall) return
      stopAllSounds()

      try {
        await callApi.rejectCall(incomingCall.callId, reason)
      } catch (err) {
        console.warn('Reject call error:', err)
      } finally {
        setIncomingCall(null)
        setCallPhase('idle')
      }
    },
    [incomingCall, stopAllSounds],
  )

  const cancelOutgoingCall = useCallback(async () => {
    stopAllSounds()
    const callId = activeCall?.id
    if (callId) {
      try {
        await callApi.cancelCall(callId)
      } catch (err) {
        console.warn('Cancel call error:', err)
      }
    }
    resetCallState()
  }, [activeCall?.id, resetCallState, stopAllSounds])

  const endActiveCall = useCallback(
    async (reason = 'NORMAL') => {
      stopAllSounds()
      const callId = activeCall?.id
      if (callId) {
        try {
          await callApi.endCall(callId, reason)
        } catch (err) {
          console.warn('End call error:', err)
        }
      }
      playHangupTone()
      livekit.disconnect()
      setCallPhase('ended')

      window.setTimeout(() => {
        resetCallState()
      }, 1500)
    },
    [activeCall?.id, livekit, resetCallState, stopAllSounds],
  )

  return (
    <CallContext.Provider
      value={{
        activeCall,
        incomingCall,
        callPhase,
        activePeer,
        livekitDetails,
        endReason,
        livekit,
        startCall,
        acceptIncomingCall,
        rejectIncomingCall,
        cancelOutgoingCall,
        endActiveCall,
        resetCallState,
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
