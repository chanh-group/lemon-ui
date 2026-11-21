import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft01Icon as ArrowLeftData } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { createIcon } from '@/components/icons/hugeIcon'
import { ROUTES, type CallEndReason, type CallMedia, type CallPhase } from '@/config/constants'
import { useAuth } from '@/features/auth/api'
import { useConversationQuery } from '@/features/conversation/hooks/useConversations'
import { getChatSocket } from '@/lib/socket'
import { cn } from '@/lib/utils'
import { callApi } from '../../api/call.api'
import { useLiveKitCall } from '../../hooks/useLiveKitCall'
import { playConnectedTone, playHangupTone, playOutgoingDialingSound } from '../../utils/callSounds'
import type {
  CallAcceptedPayload,
  CallEndedPayload,
  CallRejectedPayload,
  CallResponse,
  LiveKitConnectionDetails,
} from '../../types/call.types'
import { CallControls } from './CallControls'
import { VoiceCallStage } from './VoiceCallStage'
import { VideoCallStage } from './VideoCallStage'
import type { CallPreview } from './types'
import { formatCallDuration } from './utils'

const ArrowLeft = createIcon(ArrowLeftData)

function parseMedia(value: string | null): CallMedia {
  return value === 'video' ? 'video' : 'voice'
}

export function CallScreen({
  previewCall,
  previewWindow,
  onPreviewClose,
}: {
  previewCall?: CallPreview
  previewWindow?: Window
  onPreviewClose?: () => void
} = {}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { conversationId: routeConversationId } = useParams<{ conversationId: string }>()
  const conversationId = previewCall?.conversationId ?? routeConversationId
  const [searchParams] = useSearchParams()

  const livekit = useLiveKitCall()

  const conversationQuery = useConversationQuery(
    conversationId ?? null,
    Boolean(conversationId) && !previewCall,
  )

  const media: CallMedia = previewCall ? previewCall.media : parseMedia(searchParams.get('media'))

  const initialPhase: CallPhase = previewCall
    ? 'ringing'
    : searchParams.get('state') === 'active'
      ? 'active'
      : 'ringing'

  const [phase, setPhase] = useState<CallPhase>(initialPhase)
  const [endReason, setEndReason] = useState<CallEndReason>('ended')
  const [activeCall, setActiveCall] = useState<CallResponse | null>(null)
  const [livekitDetails, setLivekitDetails] = useState<LiveKitConnectionDetails | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [finalSeconds, setFinalSeconds] = useState(0)
  const [speakerOn, setSpeakerOn] = useState(true)

  const stopDialingSoundRef = useRef<(() => void) | null>(null)
  const hasInitiatedRef = useRef(false)
  const hasAcceptedRef = useRef(false)
  const answeredAtRef = useRef<number | null>(null)
  const activeCallRef = useRef<CallResponse | null>(null)

  useEffect(() => {
    activeCallRef.current = activeCall
  }, [activeCall])

  const cachedPeer = (() => {
    if (typeof window === 'undefined' || !conversationId) return null
    try {
      const raw =
        sessionStorage.getItem(`lemon_call_peer_${conversationId}`) ||
        localStorage.getItem(`lemon_call_peer_${conversationId}`)
      return raw ? (JSON.parse(raw) as { peerName?: string; peerAvatar?: string | null }) : null
    } catch {
      return null
    }
  })()

  const isGroup = previewCall?.isGroup ?? conversationQuery.data?.isGroup ?? false
  const name =
    previewCall?.peerName ||
    cachedPeer?.peerName ||
    searchParams.get('peerName') ||
    conversationQuery.data?.name ||
    t('chat.callUnknownPeer')

  const avatarUrl =
    previewCall?.peerAvatar ??
    cachedPeer?.peerAvatar ??
    conversationQuery.data?.partnerAvatar ??
    null

  const localName = user?.fullName?.trim() || user?.username || t('chat.callYou')

  const stopDialing = useCallback(() => {
    if (stopDialingSoundRef.current) {
      stopDialingSoundRef.current()
      stopDialingSoundRef.current = null
    }
  }, [])

  const handleClose = useCallback(() => {
    stopDialing()
    livekit.disconnect()

    if (conversationId && typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(`lemon_call_peer_${conversationId}`)
        localStorage.removeItem(`lemon_call_peer_${conversationId}`)
      } catch {
        // ignore
      }
    }

    if (previewCall) {
      onPreviewClose?.()
      return
    }

    // Nếu đang chạy trong cửa sổ riêng biệt được mở bởi window.open -> Đóng cửa sổ
    if (typeof window !== 'undefined' && window.opener) {
      window.close()
      return
    }

    navigate(ROUTES.messages)
  }, [conversationId, livekit, onPreviewClose, previewCall, stopDialing, navigate])

  // Caller: Khởi tạo cuộc gọi duy nhất 1 lần khi màn hình mở ở trạng thái ringing
  useEffect(() => {
    if (hasInitiatedRef.current || previewCall) return
    const stateParam = searchParams.get('state')
    if (stateParam === 'ringing' && conversationId) {
      hasInitiatedRef.current = true

      const run = async () => {
        // 1. Kích hoạt xin cấp quyền camera / microphone ngay lập tức
        await livekit.requestMediaPermissions(media === 'video' ? 'VIDEO' : 'VOICE')

        // 2. Gọi API khởi tạo cuộc gọi đến backend
        try {
          const res = await callApi.initiateCall({
            conversationId,
            media: media === 'video' ? 'VIDEO' : 'VOICE',
          })
          setActiveCall(res)
          setLivekitDetails(res.livekit)
          // 3. Phát âm thanh chuông tút tút cuộc gọi đi
          stopDialingSoundRef.current = playOutgoingDialingSound()
        } catch (err: unknown) {
          console.error('Failed to initiate call:', err)
          toast.error(t('chat.callInitiateError'))
          setPhase('ended')
          setEndReason('cancelled')
        }
      }

      void run()
    }
  }, [conversationId, livekit, media, previewCall, searchParams, t])

  // Callee: Chấp nhận cuộc gọi duy nhất 1 lần khi màn hình mở ở trạng thái active có callId
  useEffect(() => {
    if (hasAcceptedRef.current || previewCall) return
    const stateParam = searchParams.get('state')
    const callId = searchParams.get('callId')

    if (stateParam === 'active' && callId && conversationId) {
      hasAcceptedRef.current = true

      const run = async () => {
        // 1. Kích hoạt xin cấp quyền camera / microphone ngay lập tức
        await livekit.requestMediaPermissions(media === 'video' ? 'VIDEO' : 'VOICE')

        // 2. Gọi API accept call
        try {
          const res = await callApi.acceptCall(callId)
          const nowIso = new Date().toISOString()
          answeredAtRef.current = Date.parse(res.answeredAt || nowIso)
          setActiveCall({
            id: res.id,
            conversationId,
            callerId: '',
            media: media === 'video' ? 'VIDEO' : 'VOICE',
            status: 'ACCEPTED',
            startedAt: nowIso,
            answeredAt: res.answeredAt,
            endedAt: null,
            durationSecs: 0,
            livekit: res.livekit,
          })
          setLivekitDetails(res.livekit)
          playConnectedTone()
          // 3. Kết nối vào LiveKit SFU Room
          await livekit.connect(
            res.livekit.serverUrl,
            res.livekit.token,
            media === 'video' ? 'VIDEO' : 'VOICE',
          )
        } catch (err: unknown) {
          console.error('Failed to accept call:', err)
          toast.error(t('chat.callAcceptError'))
          setPhase('ended')
          setEndReason('declined')
        }
      }

      void run()
    }
  }, [conversationId, livekit, media, previewCall, searchParams, t])

  // Lắng nghe các sự kiện Socket.IO trong cửa sổ đàm thoại
  useEffect(() => {
    const socket = getChatSocket()

    const onAccepted = async (payload: CallAcceptedPayload) => {
      stopDialing()
      playConnectedTone()
      setPhase('active')
      answeredAtRef.current = Date.parse(payload.answeredAt || new Date().toISOString())

      // Caller kết nối vào phòng LiveKit SFU khi Callee nhấc máy
      if (livekitDetails) {
        await livekit.connect(
          livekitDetails.serverUrl,
          livekitDetails.token,
          media === 'video' ? 'VIDEO' : 'VOICE',
        )
      }
    }

    const onRejected = (payload: CallRejectedPayload) => {
      stopDialing()
      playHangupTone()
      setPhase('ended')
      setEndReason('declined')
      toast.info(
        payload.reason
          ? `${t('chat.callEndedDeclined')} (${payload.reason})`
          : t('chat.callEndedDeclined'),
      )
      livekit.disconnect()

      window.setTimeout(() => {
        handleClose()
      }, 2000)
    }

    const onCancelled = () => {
      stopDialing()
      playHangupTone()
      setPhase('ended')
      setEndReason('cancelled')
      toast.info(t('chat.callEndedCancelled'))
      livekit.disconnect()

      window.setTimeout(() => {
        handleClose()
      }, 2000)
    }

    const onEnded = (payload: CallEndedPayload) => {
      stopDialing()
      playHangupTone()
      livekit.disconnect()
      setPhase('ended')
      setEndReason('ended')
      setFinalSeconds(payload.durationSecs || seconds)

      window.setTimeout(() => {
        handleClose()
      }, 2000)
    }

    const onMissed = () => {
      stopDialing()
      playHangupTone()
      setPhase('ended')
      setEndReason('cancelled')
      livekit.disconnect()

      window.setTimeout(() => {
        handleClose()
      }, 2000)
    }

    socket.on('call:accepted', onAccepted)
    socket.on('call:rejected', onRejected)
    socket.on('call:cancelled', onCancelled)
    socket.on('call:ended', onEnded)
    socket.on('call:missed', onMissed)

    return () => {
      socket.off('call:accepted', onAccepted)
      socket.off('call:rejected', onRejected)
      socket.off('call:cancelled', onCancelled)
      socket.off('call:ended', onEnded)
      socket.off('call:missed', onMissed)
    }
  }, [handleClose, livekit, livekitDetails, media, seconds, stopDialing, t])

  // Đếm thời lượng cuộc gọi
  useEffect(() => {
    if (phase !== 'active') return
    const timer = window.setInterval(() => {
      if (answeredAtRef.current) {
        setSeconds(Math.max(0, Math.floor((Date.now() - answeredAtRef.current) / 1000)))
      } else {
        setSeconds((prev) => prev + 1)
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [phase])

  // Giải phóng tài nguyên trên backend nếu người dùng tắt trình duyệt / tab đột ngột
  useEffect(() => {
    const handleBeforeUnload = () => {
      const call = activeCallRef.current
      if (call) {
        if (phase === 'active') {
          void callApi.endCall(call.id, 'WINDOW_CLOSED')
        } else if (phase === 'ringing') {
          void callApi.cancelCall(call.id)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [phase])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose()
    }
    const callWindow = previewWindow ?? window
    callWindow.addEventListener('keydown', onKeyDown)
    return () => callWindow.removeEventListener('keydown', onKeyDown)
  }, [handleClose, previewWindow])

  const endCall = () => {
    setFinalSeconds(seconds)
    setPhase('ended')
    stopDialing()
    playHangupTone()

    const callId = activeCall?.id
    if (callId) {
      if (phase === 'ringing') {
        void callApi.cancelCall(callId)
      } else {
        void callApi.endCall(callId, 'NORMAL')
      }
    }

    livekit.disconnect()
    window.setTimeout(() => {
      handleClose()
    }, 1200)
  }

  const declineCall = () => {
    setPhase('ended')
    setEndReason('declined')
    stopDialing()
    playHangupTone()

    const callId = activeCall?.id || searchParams.get('callId')
    if (callId) {
      void callApi.rejectCall(callId)
    }

    livekit.disconnect()
    window.setTimeout(() => {
      handleClose()
    }, 1000)
  }

  const redial = () => {
    setFinalSeconds(0)
    setSeconds(0)
    hasInitiatedRef.current = false
    setPhase('ringing')
  }

  const flipCamera = () => {
    void livekit.flipCamera()
  }

  if (!conversationId && !previewCall) {
    return (
      <CallErrorScreen title={t('chat.callNotFound')} onClose={() => navigate(ROUTES.messages)} />
    )
  }

  if (
    conversationQuery.isPending &&
    !searchParams.get('peerName') &&
    !cachedPeer?.peerName &&
    !previewCall
  ) {
    return (
      <main className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#07120c] text-white">
        <CallBackdrop />
        <div className="relative z-10 flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
          <span
            className="size-9 animate-spin rounded-full border-2 border-white/20 border-t-primary"
            aria-hidden="true"
          />
          <p className="text-sm text-white/60">{t('chat.callStarting')}</p>
        </div>
      </main>
    )
  }

  const isActiveVideo = phase === 'active' && media === 'video'

  return (
    <main className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#07120c] text-white">
      {isActiveVideo ? (
        <VideoCallStage
          name={name}
          avatarUrl={avatarUrl}
          localName={localName}
          localAvatarUrl={user?.avatarUrl}
          seconds={seconds}
          cameraOn={!livekit.isCameraOff}
          hasCameraError={livekit.hasCameraError}
          remoteVideoTrack={livekit.remoteVideoTrack}
          remoteAudioTrack={livekit.remoteAudioTrack}
          localVideoTrack={livekit.localVideoTrack}
        />
      ) : (
        <CallBackdrop>
          <VoiceCallStage
            phase={phase}
            media={media}
            name={name}
            avatarUrl={avatarUrl}
            isGroup={isGroup}
            seconds={phase === 'ended' ? finalSeconds : seconds}
            endReason={endReason}
            remoteAudioTrack={livekit.remoteAudioTrack}
            isPeerSpeaking={livekit.isPeerSpeaking}
          />
        </CallBackdrop>
      )}

      {/* Lớp phủ chuyển màu gradient cho header và footer */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-40 bg-gradient-to-b from-black/65 via-black/25 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-72 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
        aria-hidden="true"
      />

      {/* Header thanh điều hướng */}
      <header className="relative z-30 flex items-start justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <button
          type="button"
          onClick={handleClose}
          aria-label={t('chat.callBackToChat')}
          title={t('chat.callBackToChat')}
          className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-white/10 bg-black/20 text-white/80 backdrop-blur transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>

        <div className="min-w-0 flex-1 pt-1 text-center">
          <p className="text-[10px] font-semibold tracking-[0.22em] text-white/45 uppercase">
            {isGroup
              ? t('chat.callGroupLabel')
              : media === 'video'
                ? t('chat.callVideoLabel')
                : t('chat.callVoiceLabel')}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-white/85">
            {phase === 'active'
              ? formatCallDuration(seconds)
              : phase === 'incoming'
                ? t('chat.incomingCall')
                : phase === 'ended'
                  ? t('chat.callEnded')
                  : t('chat.outgoingCall')}
          </p>
        </div>

        <div className="size-11 shrink-0" aria-hidden="true" />
      </header>

      {/* Thông báo mạng yếu nếu LiveKit đang reconnect */}
      {livekit.isReconnecting && (
        <div className="relative z-30 mx-auto mt-2 flex items-center gap-2 rounded-full bg-amber-500/20 px-4 py-1.5 text-xs font-semibold text-amber-300 ring-1 ring-amber-400/40 backdrop-blur animate-pulse">
          <span className="size-2 rounded-full bg-amber-400" />
          {t('chat.callReconnecting')}
        </div>
      )}

      {/* Bảng điều khiển cuộc gọi */}
      <footer className="relative z-30 mt-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
        <div
          className={cn(
            'mx-auto w-full max-w-xl rounded-4xl px-3 py-4 sm:px-6',
            phase === 'ended'
              ? 'bg-transparent'
              : 'border border-white/10 bg-black/25 shadow-[0_20px_60px_-25px_rgba(0,0,0,0.9)] backdrop-blur-xl',
          )}
        >
          <CallControls
            phase={phase}
            media={media}
            muted={livekit.isMuted}
            speakerOn={speakerOn}
            cameraOn={!livekit.isCameraOff}
            hasMicError={livekit.hasMicError}
            hasCameraError={livekit.hasCameraError}
            onToggleMute={livekit.toggleMicrophone}
            onToggleSpeaker={() => setSpeakerOn((v) => !v)}
            onToggleCamera={livekit.toggleCamera}
            onFlipCamera={flipCamera}
            onChangeMedia={() => {
              void livekit.toggleCamera()
            }}
            onEnd={endCall}
            onAccept={() => {
              setPhase('active')
            }}
            onDecline={declineCall}
            onRedial={redial}
            onClose={handleClose}
          />
        </div>
      </footer>
    </main>
  )
}

function CallBackdrop({ children }: { children?: ReactNode }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#07120c]" aria-hidden={!children}>
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 12%, rgba(0,230,118,0.18), transparent 45%), radial-gradient(circle at 14% 82%, rgba(250,204,21,0.08), transparent 32%), linear-gradient(160deg, #07120c 0%, #0a1710 55%, #050a07 100%)',
        }}
        aria-hidden="true"
      />
      <div
        aria-hidden="true"
        className="absolute -left-28 top-24 size-96 rounded-full bg-emerald-500/12 blur-3xl animate-float-slow"
      />
      <div
        aria-hidden="true"
        className="absolute -right-24 bottom-20 size-80 rounded-full bg-lime-300/8 blur-3xl animate-float-y"
      />
      {children}
    </div>
  )
}

function CallErrorScreen({ title, onClose }: { title: string; onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <main className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#07120c] text-white">
      <CallBackdrop />
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="max-w-sm text-base font-semibold text-white/85">{title}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:brightness-105"
        >
          {t('chat.callBackToCalls')}
        </button>
      </div>
    </main>
  )
}
