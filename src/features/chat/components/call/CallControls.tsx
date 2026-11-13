import {
  ArrowLeft01Icon as ArrowLeftData,
  CallEnd01Icon as CallEndData,
  CallIcon as PhoneData,
  CameraRotated01Icon as FlipCameraData,
  Mic01Icon as MicData,
  MicOff01Icon as MicOffData,
  PhoneIcon as PhoneCallData,
  Video01Icon as VideoData,
  VideoOffIcon as VideoOffData,
  VolumeHighIcon as SpeakerData,
  VolumeOffIcon as SpeakerOffData,
} from '@hugeicons/core-free-icons'
import { useTranslation } from 'react-i18next'
import { createIcon } from '@/components/icons/hugeIcon'
import { cn } from '@/lib/utils'
import type { CallMedia, CallPhase } from './types'

const ArrowLeft = createIcon(ArrowLeftData)
const CallEnd = createIcon(CallEndData)
const FlipCamera = createIcon(FlipCameraData)
const Mic = createIcon(MicData)
const MicOff = createIcon(MicOffData)
const Phone = createIcon(PhoneData)
const PhoneCall = createIcon(PhoneCallData)
const Speaker = createIcon(SpeakerData)
const SpeakerOff = createIcon(SpeakerOffData)
const Video = createIcon(VideoData)
const VideoOff = createIcon(VideoOffData)

type ControlTone = 'glass' | 'pressed' | 'accept' | 'danger'
type ControlSize = 'md' | 'lg'

const TONE_CLASS: Record<ControlTone, string> = {
  glass: 'bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20',
  pressed: 'bg-white text-slate-950 ring-1 ring-white/40 hover:bg-white/90',
  accept:
    'bg-emerald-500 text-white ring-1 ring-emerald-300/40 shadow-[0_14px_45px_-12px_rgba(16,185,129,0.9)] hover:bg-emerald-400',
  danger:
    'bg-red-500 text-white ring-1 ring-red-300/30 shadow-[0_14px_45px_-12px_rgba(239,68,68,0.85)] hover:bg-red-400',
}

const SIZE_CLASS: Record<ControlSize, string> = {
  md: 'size-14',
  lg: 'size-16 sm:size-[4.5rem]',
}

interface ControlButtonProps {
  icon: typeof Mic
  label: string
  onClick: () => void
  tone?: ControlTone
  size?: ControlSize
  pulse?: boolean
}

function ControlButton({
  icon: Icon,
  label,
  onClick,
  tone = 'glass',
  size = 'md',
  pulse = false,
}: ControlButtonProps) {
  return (
    <div className="flex w-18 flex-col items-center gap-2">
      <span className="relative grid place-items-center">
        {pulse && (
          <>
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-emerald-400/40 animate-pulse-ring"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-emerald-400/30 animate-pulse-ring"
              style={{ animationDelay: '0.7s' }}
            />
          </>
        )}
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          title={label}
          className={cn(
            'relative grid cursor-pointer place-items-center rounded-full transition-all duration-150 outline-none active:scale-95 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
            SIZE_CLASS[size],
            TONE_CLASS[tone],
          )}
        >
          <Icon className={cn(size === 'lg' ? 'size-7' : 'size-6')} aria-hidden="true" />
        </button>
      </span>
      <span className="max-w-[4.75rem] text-center text-[11px] leading-tight font-medium text-white/65">
        {label}
      </span>
    </div>
  )
}

interface CallControlsProps {
  phase: CallPhase
  media: CallMedia
  muted: boolean
  speakerOn: boolean
  cameraOn: boolean
  onToggleMute: () => void
  onToggleSpeaker: () => void
  onToggleCamera: () => void
  onFlipCamera: () => void
  onChangeMedia: (media: CallMedia) => void
  onEnd: () => void
  onAccept: (media: CallMedia) => void
  onDecline: () => void
  onRedial: () => void
  onClose: () => void
}

export function CallControls({
  phase,
  media,
  muted,
  speakerOn,
  cameraOn,
  onToggleMute,
  onToggleSpeaker,
  onToggleCamera,
  onFlipCamera,
  onChangeMedia,
  onEnd,
  onAccept,
  onDecline,
  onRedial,
  onClose,
}: CallControlsProps) {
  const { t } = useTranslation()

  if (phase === 'ended') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onRedial}
          className="inline-flex h-12 w-full max-w-70 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_14px_40px_-16px_rgba(0,230,118,0.9)] transition-all hover:brightness-105 active:scale-[0.98] sm:w-auto"
        >
          <PhoneCall className="size-4.5" aria-hidden="true" />
          {t('chat.callAgain')}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-12 w-full max-w-70 cursor-pointer items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10 sm:w-auto"
        >
          <ArrowLeft className="size-4.5" aria-hidden="true" />
          {t('chat.callBackToChat')}
        </button>
      </div>
    )
  }

  if (phase === 'incoming') {
    return (
      <div className="flex flex-wrap items-start justify-center gap-4 sm:gap-14">
        <ControlButton
          icon={CallEnd}
          label={t('chat.callDecline')}
          onClick={onDecline}
          tone="danger"
          size="lg"
        />
        {media === 'video' ? (
          <>
            <ControlButton
              icon={Phone}
              label={t('chat.callAcceptVoice')}
              onClick={() => onAccept('voice')}
            />
            <ControlButton
              icon={Video}
              label={t('chat.callAcceptVideo')}
              onClick={() => onAccept('video')}
              tone="accept"
              size="lg"
              pulse
            />
          </>
        ) : (
          <ControlButton
            icon={Phone}
            label={t('chat.callAccept')}
            onClick={() => onAccept('voice')}
            tone="accept"
            size="lg"
            pulse
          />
        )}
      </div>
    )
  }

  const micButton = (
    <ControlButton
      icon={muted ? MicOff : Mic}
      label={muted ? t('chat.callUnmute') : t('chat.callMute')}
      onClick={onToggleMute}
      tone={muted ? 'pressed' : 'glass'}
    />
  )

  if (phase === 'active' && media === 'video') {
    return (
      <div className="flex flex-wrap items-start justify-center gap-2 sm:gap-5">
        {micButton}
        <ControlButton
          icon={cameraOn ? Video : VideoOff}
          label={cameraOn ? t('chat.callCameraOff') : t('chat.callCameraOn')}
          onClick={onToggleCamera}
          tone={cameraOn ? 'glass' : 'pressed'}
        />
        <ControlButton
          icon={FlipCamera}
          label={t('chat.callSwitchCamera')}
          onClick={onFlipCamera}
        />
        <ControlButton
          icon={Phone}
          label={t('chat.callSwitchToVoice')}
          onClick={() => onChangeMedia('voice')}
        />
        <ControlButton icon={CallEnd} label={t('chat.callEnd')} onClick={onEnd} tone="danger" />
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-start justify-center gap-3 sm:gap-6">
      {micButton}
      <ControlButton
        icon={speakerOn ? Speaker : SpeakerOff}
        label={speakerOn ? t('chat.callSpeakerOn') : t('chat.callSpeakerOff')}
        onClick={onToggleSpeaker}
        tone={speakerOn ? 'glass' : 'pressed'}
      />
      <ControlButton
        icon={media === 'video' ? Phone : Video}
        label={media === 'video' ? t('chat.callSwitchToVoice') : t('chat.callSwitchToVideo')}
        onClick={() => onChangeMedia(media === 'video' ? 'voice' : 'video')}
      />
      <ControlButton icon={CallEnd} label={t('chat.callEnd')} onClick={onEnd} tone="danger" />
    </div>
  )
}
