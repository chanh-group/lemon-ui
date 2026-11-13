import {
  AudioWave01Icon as AudioWaveData,
  UserMultiple02Icon as UsersData,
} from '@hugeicons/core-free-icons'
import { useTranslation } from 'react-i18next'
import { createIcon } from '@/components/icons/hugeIcon'
import { UserAvatar } from '@/components/common/UserAvatar'
import { cn } from '@/lib/utils'
import type { CallEndReason, CallMedia, CallPhase } from './types'
import { formatCallDuration } from './utils'

const AudioWave = createIcon(AudioWaveData)
const Users = createIcon(UsersData)

const EQ_BARS = [
  { height: '1.25rem', delay: '0s' },
  { height: '2rem', delay: '0.12s' },
  { height: '1.5rem', delay: '0.24s' },
  { height: '2.5rem', delay: '0.36s' },
  { height: '1.75rem', delay: '0.48s' },
  { height: '2.25rem', delay: '0.6s' },
  { height: '1.25rem', delay: '0.72s' },
]

interface VoiceCallStageProps {
  phase: CallPhase
  media: CallMedia
  name: string
  avatarUrl?: string | null
  isGroup: boolean
  seconds: number
  endReason: CallEndReason
}

export function VoiceCallStage({
  phase,
  media,
  name,
  avatarUrl,
  isGroup,
  seconds,
  endReason,
}: VoiceCallStageProps) {
  const { t } = useTranslation()
  const isEnded = phase === 'ended'
  const isIncoming = phase === 'incoming'
  const isActive = phase === 'active'
  const showPulse = !isEnded

  const status = (() => {
    if (isEnded) {
      if (endReason === 'declined') return t('chat.callEndedDeclined')
      if (endReason === 'cancelled') return t('chat.callEndedCancelled')
      return t('chat.callEndedByYou')
    }
    if (isIncoming) {
      return media === 'video' ? t('chat.callIncomingVideo') : t('chat.callIncomingVoice')
    }
    if (phase === 'ringing') return t('chat.callConnecting')
    return formatCallDuration(seconds)
  })()

  return (
    <section className="absolute inset-0 flex flex-col items-center justify-center px-6 pt-20 pb-46 text-center sm:pb-52">
      <div className="relative mb-8 sm:mb-10">
        {showPulse && (
          <>
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-primary/15 animate-pulse-ring"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-primary/10 animate-pulse-ring"
              style={{ animationDelay: '0.9s' }}
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-primary/5 animate-pulse-ring"
              style={{ animationDelay: '1.8s' }}
            />
          </>
        )}
        <UserAvatar
          name={name}
          src={avatarUrl}
          className={cn(
            'relative size-32 ring-4 ring-white/10 shadow-[0_28px_80px_-24px_rgba(0,0,0,0.9)] sm:size-40',
            isEnded && 'opacity-80 saturate-75',
          )}
          fallbackClassName="text-4xl font-bold sm:text-5xl"
        />
        {isActive && (
          <span className="absolute -right-2 -bottom-2 grid size-11 place-items-center rounded-full bg-emerald-500 text-white ring-4 ring-[#07120c]">
            <AudioWave className="size-5" aria-hidden="true" />
          </span>
        )}
      </div>

      <div className="flex w-full max-w-lg flex-col items-center gap-2">
        {isGroup && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold tracking-wide text-white/65 uppercase">
            <Users className="size-3.5" aria-hidden="true" />
            {t('chat.callGroupLabel')}
          </span>
        )}

        <h1 className="text-[clamp(1.8rem,5vw,2.75rem)] leading-tight font-semibold tracking-tight text-white">
          {name}
        </h1>

        <div className="mt-1 flex min-h-11 flex-col items-center justify-center gap-2">
          {isActive ? (
            <>
              <span className="font-mono text-lg font-semibold tabular-nums text-white/90">
                {status}
              </span>
            </>
          ) : (
            <span
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium',
                isEnded
                  ? 'text-white/60'
                  : 'border border-white/10 bg-white/5 text-white/75 backdrop-blur',
              )}
            >
              {!isEnded && (
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full rounded-full bg-primary/60 animate-ping" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
              )}
              {status}
            </span>
          )}
        </div>

        {isActive && (
          <div className="mt-4 flex h-10 items-center justify-center gap-1.5" aria-hidden="true">
            {EQ_BARS.map((bar, index) => (
              <span
                key={index}
                className="w-1.5 rounded-full bg-primary/80 animate-call-eq"
                style={{ height: bar.height, animationDelay: bar.delay }}
              />
            ))}
          </div>
        )}

        {isEnded && seconds > 0 && (
          <span className="mt-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs tabular-nums text-white/60">
            {t('chat.callDuration')} · {formatCallDuration(seconds)}
          </span>
        )}
      </div>
    </section>
  )
}
