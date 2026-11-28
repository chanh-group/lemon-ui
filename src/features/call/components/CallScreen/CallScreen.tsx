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
import { callApi, sendBeaconCallTermination } from '../../api/call.api'
import { useLiveKitCall } from '../../hooks/useLiveKitCall'
import { playConnectedTone, playHangupTone, playOutgoingDialingSound } from '../../utils/callSounds'
import type {
  CallAcceptedPayload,
  CallCancelledPayload,
  CallEndedPayload,
  CallMissedPayload,
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
  const hasSetupRef = useRef(false)
  const answeredAtRef = useRef<number | null>(null)
  const activeCallRef = useRef<CallResponse | null>(null)
  const phaseRef = useRef<CallPhase>(phase)
  const isTerminatedRef = useRef(false)
  const isReloadingRef = useRef(false)
  const livekitDetailsRef = useRef<LiveKitConnectionDetails | null>(null)
  const livekitRef = useRef(livekit)

  useEffect(() => {
    const onReloadKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R'))) {
        isReloadingRef.current = true
      }
    }
    window.addEventListener('keydown', onReloadKeyDown)
    return () => window.removeEventListener('keydown', onReloadKeyDown)
  }, [])

  useEffect(() => {
    livekitRef.current = livekit
  }, [livekit])

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    activeCallRef.current = activeCall
  }, [activeCall])

  useEffect(() => {
    livekitDetailsRef.current = livekitDetails
  }, [livekitDetails])

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
    isTerminatedRef.current = true
    stopDialing()
    livekitRef.current.disconnect()

    const callId = activeCallRef.current?.id || searchParams.get('callId')
    const currentPhase = phaseRef.current

    if (callId && currentPhase !== 'ended') {
      if (currentPhase === 'ringing') {
        void callApi.cancelCall(callId)
        sendBeaconCallTermination({ callId, action: 'cancel' })
      } else if (currentPhase === 'active') {
        void callApi.endCall(callId, 'NORMAL')
        sendBeaconCallTermination({ callId, action: 'end', reason: 'NORMAL' })
      }

      try {
        window.opener?.postMessage(
          {
            type: 'LEMON_CALL_TERMINATE',
            callId,
            action: currentPhase === 'ringing' ? 'cancel' : 'end',
            reason: 'NORMAL',
          },
          '*',
        )
      } catch {
        // ignore
      }
    }

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
    if (typeof window !== 'undefined' && (window.opener || window.history.length <= 1)) {
      window.close()
      return
    }

    navigate(ROUTES.messages)
  }, [conversationId, onPreviewClose, previewCall, stopDialing, navigate, searchParams])

  useEffect(() => {
    if (previewCall || typeof window === 'undefined' || !window.opener) return

    const opener = window.opener
    const interval = window.setInterval(() => {
      if (opener.closed) {
        window.clearInterval(interval)
        handleClose()
      }
    }, 2000)

    return () => window.clearInterval(interval)
  }, [handleClose, previewCall])

  // Khởi tạo cuộc gọi mới hoặc phục hồi cuộc gọi đang diễn ra khi F5 reload
  useEffect(() => {
    if (hasSetupRef.current || previewCall || !conversationId) return
    hasSetupRef.current = true

    const stateParam = searchParams.get('state')
    const paramCallId = searchParams.get('callId')

    const setupCall = async () => {
      // 1. Kích hoạt xin cấp quyền camera / microphone ngay lập tức
      await livekitRef.current.requestMediaPermissions(media === 'video' ? 'VIDEO' : 'VOICE')

      if (isTerminatedRef.current) return

      // Trường hợp 1: Phục hồi hoặc chấp nhận cuộc gọi khi đã có callId trên URL
      if (paramCallId) {
        let currentActiveCall: CallResponse | null = null
        try {
          currentActiveCall = await callApi.getActiveCall()
        } catch (err) {
          console.warn('Could not query active call for recovery:', err)
        }

        if (isTerminatedRef.current) return

        // 1A: Cuộc gọi đã ở trạng thái ACCEPTED (F5 reload khi đang trong cuộc gọi)
        if (
          currentActiveCall &&
          currentActiveCall.id === paramCallId &&
          currentActiveCall.status === 'ACCEPTED'
        ) {
          hasInitiatedRef.current = true
          hasAcceptedRef.current = true
          setActiveCall(currentActiveCall)
          setPhase('active')
          const nowIso = new Date().toISOString()
          answeredAtRef.current = Date.parse(
            currentActiveCall.answeredAt || currentActiveCall.startedAt || nowIso,
          )
          stopDialing()
          playConnectedTone()

          try {
            const tokenData = await callApi.getCallToken(paramCallId)
            if (isTerminatedRef.current) return
            setLivekitDetails(tokenData)
            livekitDetailsRef.current = tokenData
            await livekitRef.current.connect(
              tokenData.serverUrl,
              tokenData.token,
              media === 'video' ? 'VIDEO' : 'VOICE',
            )
          } catch (tokenErr) {
            console.error('Failed to restore LiveKit connection on recovery:', tokenErr)
          }
          return
        }

        // 1B: Callee mở màn hình để chấp nhận cuộc gọi (state = active & callId)
        if (stateParam === 'active') {
          hasAcceptedRef.current = true

          try {
            const res = await callApi.acceptCall(paramCallId)
            if (isTerminatedRef.current) {
              sendBeaconCallTermination({
                callId: paramCallId,
                action: 'end',
                reason: 'WINDOW_CLOSED',
              })
              try {
                window.opener?.postMessage(
                  {
                    type: 'LEMON_CALL_TERMINATE',
                    callId: paramCallId,
                    action: 'end',
                    reason: 'WINDOW_CLOSED',
                  },
                  '*',
                )
              } catch {
                // ignore
              }
              return
            }

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
            livekitDetailsRef.current = res.livekit
            playConnectedTone()
            await livekitRef.current.connect(
              res.livekit.serverUrl,
              res.livekit.token,
              media === 'video' ? 'VIDEO' : 'VOICE',
            )
          } catch (err: unknown) {
            if (isTerminatedRef.current) return
            console.error('Failed to accept call:', err)
            toast.error(t('chat.callAcceptError'))
            setPhase('ended')
            setEndReason('declined')
          }
          return
        }

        // 1C: Caller F5 reload trong khi cuộc gọi vẫn đang RINGING
        if (
          currentActiveCall &&
          currentActiveCall.id === paramCallId &&
          (currentActiveCall.status === 'RINGING' || currentActiveCall.status === 'INITIATED') &&
          stateParam === 'ringing'
        ) {
          hasInitiatedRef.current = true
          setActiveCall(currentActiveCall)
          setPhase('ringing')
          stopDialingSoundRef.current = playOutgoingDialingSound()
          return
        }
      }

      // Trường hợp 2: Caller khởi tạo cuộc gọi mới từ đầu (state = ringing, chưa có callId trên URL)
      if (stateParam === 'ringing') {
        hasInitiatedRef.current = true

        try {
          const res = await callApi.initiateCall({
            conversationId,
            media: media === 'video' ? 'VIDEO' : 'VOICE',
          })

          if (isTerminatedRef.current) {
            sendBeaconCallTermination({ callId: res.id, action: 'cancel' })
            try {
              window.opener?.postMessage(
                { type: 'LEMON_CALL_TERMINATE', callId: res.id, action: 'cancel' },
                '*',
              )
            } catch {
              // ignore
            }
            return
          }

          // Cập nhật callId lên URL để nếu người dùng F5 reload thì nhận diện được cuộc gọi hiện tại
          if (typeof window !== 'undefined') {
            try {
              const newUrl = new URL(window.location.href)
              newUrl.searchParams.set('callId', res.id)
              window.history.replaceState(null, '', newUrl.toString())
            } catch {
              // ignore
            }
          }

          setActiveCall(res)
          stopDialingSoundRef.current = playOutgoingDialingSound()
        } catch (err: unknown) {
          if (isTerminatedRef.current) return
          console.error('Failed to initiate call:', err)
          toast.error(t('chat.callInitiateError'))
          setPhase('ended')
          setEndReason('cancelled')
        }
      }
    }

    void setupCall()
  }, [conversationId, media, previewCall, searchParams, stopDialing, t])

  // Lắng nghe các sự kiện Socket.IO trong cửa sổ đàm thoại
  useEffect(() => {
    const socket = getChatSocket()

    // Chỉ xử lý event thuộc về cuộc gọi của màn hình hiện tại,
    // tránh event trễ từ cuộc gọi cũ / tab khác làm tắt nhầm cuộc gọi đang diễn ra
    const belongsToCurrentCall = (payload: { callId?: string }) => {
      const currentCallId = activeCallRef.current?.id || searchParams.get('callId')
      if (payload.callId && currentCallId && payload.callId !== currentCallId) {
        return false
      }
      return true
    }

    const onAccepted = async (payload: CallAcceptedPayload) => {
      if (!belongsToCurrentCall(payload)) return
      if (phaseRef.current === 'active') return
      stopDialing()
      playConnectedTone()
      setPhase('active')
      answeredAtRef.current = Date.parse(payload.answeredAt || new Date().toISOString())

      // Caller kết nối vào phòng LiveKit SFU khi Callee nhấc máy
      let targetDetails = payload.livekit || livekitDetailsRef.current
      if (!targetDetails && payload.callId) {
        try {
          targetDetails = await callApi.getCallToken(payload.callId)
          setLivekitDetails(targetDetails)
          livekitDetailsRef.current = targetDetails
        } catch (tokenErr) {
          console.error('Failed to get call token in onAccepted:', tokenErr)
        }
      }

      if (targetDetails) {
        try {
          await livekitRef.current.connect(
            targetDetails.serverUrl,
            targetDetails.token,
            media === 'video' ? 'VIDEO' : 'VOICE',
          )
        } catch (connectErr) {
          console.error('LiveKit initial connect error, attempting token refresh:', connectErr)
          if (payload.callId) {
            try {
              const refreshed = await callApi.getCallToken(payload.callId)
              setLivekitDetails(refreshed)
              livekitDetailsRef.current = refreshed
              await livekitRef.current.connect(
                refreshed.serverUrl,
                refreshed.token,
                media === 'video' ? 'VIDEO' : 'VOICE',
              )
            } catch (refreshErr) {
              console.error('LiveKit refreshed connect error:', refreshErr)
              toast.error(t('chat.callConnectError', 'Lỗi kết nối phòng đàm thoại'))
            }
          }
        }
      }
    }

    const onRejected = (payload: CallRejectedPayload) => {
      if (!belongsToCurrentCall(payload)) return
      stopDialing()
      playHangupTone()
      setPhase('ended')
      setEndReason('declined')
      toast.info(
        payload.reason === 'CALLEE_OFFLINE' || payload.reason === 'DISCONNECTED_TIMEOUT'
          ? t('chat.callDisconnectedTimeout')
          : payload.reason
            ? `${t('chat.callEndedDeclined')} (${payload.reason})`
            : t('chat.callEndedDeclined'),
      )
      livekitRef.current.disconnect()

      window.setTimeout(() => {
        handleClose()
      }, 2000)
    }

    const onCancelled = (payload: CallCancelledPayload) => {
      if (!belongsToCurrentCall(payload)) return
      stopDialing()
      playHangupTone()
      setPhase('ended')
      setEndReason('cancelled')
      toast.info(t('chat.callEndedCancelled'))
      livekitRef.current.disconnect()

      window.setTimeout(() => {
        handleClose()
      }, 2000)
    }

    const onEnded = (payload: CallEndedPayload) => {
      if (!belongsToCurrentCall(payload)) return
      stopDialing()
      playHangupTone()
      livekitRef.current.disconnect()
      setPhase('ended')
      setEndReason('ended')
      setFinalSeconds(payload.durationSecs || 0)

      if (payload.reason === 'DISCONNECTED_TIMEOUT' || payload.reason === 'CALLEE_OFFLINE') {
        toast.info(t('chat.callDisconnectedTimeout'))
      }

      window.setTimeout(() => {
        handleClose()
      }, 2000)
    }

    const onMissed = (payload: CallMissedPayload) => {
      if (!belongsToCurrentCall(payload)) return
      stopDialing()
      playHangupTone()
      setPhase('ended')
      setEndReason('cancelled')
      livekitRef.current.disconnect()

      if (payload.reason === 'DISCONNECTED_TIMEOUT' || payload.reason === 'CALLEE_OFFLINE') {
        toast.info(t('chat.callDisconnectedTimeout'))
      }

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
  }, [handleClose, media, searchParams, stopDialing, t])

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

  // Giải phóng tài nguyên trên backend nếu người dùng tắt trình duyệt / tab đột ngột (nút X / Alt+F4)
  useEffect(() => {
    const handleWindowUnload = () => {
      // Nếu người dùng đang reload (F5 / Ctrl+R): KHÔNG giải phóng cuộc gọi
      // để bên Callee vẫn duy trì modal nhận cuộc gọi bình thường
      if (isReloadingRef.current) return

      isTerminatedRef.current = true
      const call = activeCallRef.current
      const callId = call?.id || searchParams.get('callId')
      const currentPhase = phaseRef.current

      if (callId && currentPhase === 'active') {
        sendBeaconCallTermination({ callId, action: 'end', reason: 'WINDOW_CLOSED' })

        try {
          window.opener?.postMessage(
            {
              type: 'LEMON_CALL_TERMINATE',
              callId,
              action: 'end',
              reason: 'WINDOW_CLOSED',
            },
            '*',
          )
        } catch {
          // ignore
        }
      }
      // Lưu ý: Đối với pha ringing, không gửi cancel beacon trong unload để tránh hủy nhầm
      // khi người dùng reload bằng nút trên trình duyệt. Nếu người dùng thực sự đóng cửa sổ nổi ("X"),
      // tab chính (window.opener) sẽ phát hiện win.closed === true và tự động hủy sau 1 giây.
    }

    window.addEventListener('pagehide', handleWindowUnload)
    window.addEventListener('beforeunload', handleWindowUnload)
    return () => {
      window.removeEventListener('pagehide', handleWindowUnload)
      window.removeEventListener('beforeunload', handleWindowUnload)
    }
  }, [searchParams])

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
        void callApi.cancelCall(callId).catch(() => toast.error(t('common.error')))
      } else {
        void callApi.endCall(callId, 'NORMAL').catch(() => toast.error(t('common.error')))
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
          speakerOn={speakerOn}
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
            speakerOn={speakerOn}
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
            onEnd={endCall}
            onAccept={() => {
              setPhase('active')
            }}
            onDecline={declineCall}
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
