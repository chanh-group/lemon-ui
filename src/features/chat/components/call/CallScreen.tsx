import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft01Icon as ArrowLeftData } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { createIcon } from '@/components/icons/hugeIcon'
import {
  ROUTES,
  conversationPath,
  type CallEndReason,
  type CallMedia,
  type CallPhase,
} from '@/config/constants'
import { useAuth } from '@/features/auth/api'
import { useConversationQuery } from '../../hooks/useChatQueries'
import { cn } from '@/lib/utils'
import { CallControls } from './CallControls'
import { VoiceCallStage } from './VoiceCallStage'
import { VideoCallStage } from './VideoCallStage'
import type { CallRouteState } from './types'
import { formatCallDuration } from './utils'

const ArrowLeft = createIcon(ArrowLeftData)

const VALID_PHASES: CallPhase[] = ['ringing', 'incoming', 'active', 'ended']
const VALID_REASONS: CallEndReason[] = ['ended', 'declined', 'cancelled']

function parseMedia(value: string | null): CallMedia {
  return value === 'video' ? 'video' : 'voice'
}

function parsePhase(value: string | null): CallPhase {
  return VALID_PHASES.includes(value as CallPhase) ? (value as CallPhase) : 'ringing'
}

function parseReason(value: string | null): CallEndReason {
  return VALID_REASONS.includes(value as CallEndReason) ? (value as CallEndReason) : 'ended'
}

interface CallPatch {
  media?: CallMedia
  state?: CallPhase
  reason?: CallEndReason | null
}

export function CallScreen() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { conversationId } = useParams<{ conversationId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  const routeState = (location.state as CallRouteState | null) ?? null
  const returnTo = routeState?.from
  const conversationQuery = useConversationQuery(conversationId ?? null, Boolean(conversationId))
  const media = parseMedia(searchParams.get('media'))
  const phase = parsePhase(searchParams.get('state'))
  const endReason = parseReason(searchParams.get('reason'))

  const isGroup = conversationQuery.data?.isGroup ?? false
  const name =
    (isGroup && routeState?.peerName) ||
    conversationQuery.data?.name ||
    routeState?.peerName ||
    t('chat.callUnknownPeer')
  const avatarUrl = conversationQuery.data?.partnerAvatar ?? routeState?.peerAvatar ?? null
  const localName = user?.fullName?.trim() || user?.username || t('chat.callYou')

  const [muted, setMuted] = useState(false)
  const [speakerOn, setSpeakerOn] = useState(true)
  const [cameraOff, setCameraOff] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [finalSeconds, setFinalSeconds] = useState(0)
  const cameraOn = media === 'video' && !cameraOff

  const updateCall = useCallback(
    (patch: CallPatch) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (patch.media) next.set('media', patch.media)
          if (patch.state) next.set('state', patch.state)
          if (patch.reason) next.set('reason', patch.reason)
          else if (patch.reason === null) next.delete('reason')
          return next
        },
        { replace: true, state: location.state },
      )
    },
    [location.state, setSearchParams],
  )

  const handleClose = useCallback(() => {
    if (returnTo) {
      navigate(returnTo)
      return
    }
    if (conversationId) {
      navigate(conversationPath(conversationId))
      return
    }
    navigate(ROUTES.calls)
  }, [conversationId, navigate, returnTo])

  // Đồng hồ cuộc gọi chỉ chạy khi đã kết nối.
  useEffect(() => {
    if (phase !== 'active') return
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt) / 1000))
    }, 500)
    return () => window.clearInterval(timer)
  }, [phase])

  /**
   * Chưa có backend signaling/WebRTC nên cuộc gọi đi tự chuyển sang trạng thái
   * đã kết nối sau ~3 giây để xem trước đầy đủ các màn hình.
   * Khi tích hợp call gateway, thay timeout này bằng sự kiện ANSWER.
   */
  useEffect(() => {
    if (phase !== 'ringing') return
    const timer = window.setTimeout(() => updateCall({ state: 'active' }), 3_200)
    return () => window.clearTimeout(timer)
  }, [phase, updateCall])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleClose])

  const endCall = () => {
    setFinalSeconds(phase === 'active' ? seconds : finalSeconds)
    updateCall({ state: 'ended', reason: phase === 'active' ? 'ended' : 'cancelled' })
  }

  const declineCall = () => {
    setFinalSeconds(0)
    updateCall({ state: 'ended', reason: 'declined' })
  }

  const acceptCall = (acceptedMedia: CallMedia) => {
    setCameraOff(false)
    updateCall({ media: acceptedMedia, state: 'active', reason: null })
  }

  const changeMedia = (nextMedia: CallMedia) => {
    setCameraOff(false)
    updateCall({ media: nextMedia, state: phase === 'ended' ? 'ended' : phase, reason: null })
  }

  const redial = () => {
    setFinalSeconds(0)
    setSeconds(0)
    setMuted(false)
    setSpeakerOn(true)
    setCameraOff(false)
    updateCall({ media, state: 'ringing', reason: null })
  }

  const flipCamera = () => {
    // Chưa có camera thật; hiện phản hồi để luồng UI hoàn chỉnh.
    toast.info(t('chat.callFlipCameraToast'))
  }

  if (!conversationId) {
    return <CallErrorScreen title={t('chat.callNotFound')} onClose={() => navigate(ROUTES.calls)} />
  }

  if (conversationQuery.isPending && !routeState?.peerName) {
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

  if (conversationQuery.isError && !routeState?.peerName) {
    return (
      <CallErrorScreen
        title={t('chat.callNotFound')}
        onClose={handleClose}
        onRetry={() => void conversationQuery.refetch()}
      />
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
          cameraOn={cameraOn}
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
          />
        </CallBackdrop>
      )}

      {/* Lớp tối để chữ và nút luôn đọc được trên video/voice stage. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-40 bg-gradient-to-b from-black/65 via-black/25 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-72 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
        aria-hidden="true"
      />

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

      <p className="relative z-30 mx-auto mt-3 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-center text-xs font-medium text-white/80">
        {i18n.resolvedLanguage?.startsWith('vi')
          ? 'Bản xem trước giao diện — không có cuộc gọi thật'
          : 'UI preview — no real call'}
      </p>

      <footer className="relative z-30 mt-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
        <div
          className={cn(
            'mx-auto w-full max-w-xl rounded-[2rem] px-3 py-4 sm:px-6',
            phase === 'ended'
              ? 'bg-transparent'
              : 'border border-white/10 bg-black/25 shadow-[0_20px_60px_-25px_rgba(0,0,0,0.9)] backdrop-blur-xl',
          )}
        >
          <CallControls
            phase={phase}
            media={media}
            muted={muted}
            speakerOn={speakerOn}
            cameraOn={cameraOn}
            onToggleMute={() => setMuted((value) => !value)}
            onToggleSpeaker={() => setSpeakerOn((value) => !value)}
            onToggleCamera={() => setCameraOff((value) => !value)}
            onFlipCamera={flipCamera}
            onChangeMedia={changeMedia}
            onEnd={endCall}
            onAccept={acceptCall}
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

function CallErrorScreen({
  title,
  onClose,
  onRetry,
}: {
  title: string
  onClose: () => void
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  return (
    <main className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#07120c] text-white">
      <CallBackdrop />
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="max-w-sm text-base font-semibold text-white/85">{title}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:brightness-105"
          >
            {t('chat.callBackToCalls')}
          </button>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10"
            >
              {t('common.retry')}
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
