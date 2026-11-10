import { VideoOffIcon as VideoOffData } from '@hugeicons/core-free-icons'
import { useTranslation } from 'react-i18next'
import { createIcon } from '@/components/icons/hugeIcon'
import { UserAvatar } from '@/components/common/UserAvatar'
import { cn } from '@/lib/utils'
import { formatCallDuration } from './utils'

const VideoOff = createIcon(VideoOffData)

interface VideoCallStageProps {
  name: string
  avatarUrl?: string | null
  localName: string
  localAvatarUrl?: string | null
  seconds: number
  cameraOn: boolean
}

export function VideoCallStage({
  name,
  avatarUrl,
  localName,
  localAvatarUrl,
  seconds,
  cameraOn,
}: VideoCallStageProps) {
  const { t } = useTranslation()

  return (
    <section className="absolute inset-0 overflow-hidden">
      {/* "Remote video" placeholder — WebRTC chưa có nên dùng lớp gradient + avatar. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 22% 18%, rgba(0,230,118,0.24), transparent 34%), radial-gradient(circle at 78% 30%, rgba(250,204,21,0.12), transparent 28%), linear-gradient(145deg, #07120c 0%, #0c1d14 52%, #050a07 100%)',
        }}
        aria-hidden="true"
      />
      <div aria-hidden="true" className="absolute -left-24 top-1/4 size-96 rounded-full bg-emerald-500/15 blur-3xl animate-float-slow" />
      <div aria-hidden="true" className="absolute -right-30 bottom-1/4 size-80 rounded-full bg-lime-300/10 blur-3xl animate-float-y" />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.8) 0px, rgba(255,255,255,0.8) 1px, transparent 1px, transparent 4px)',
        }}
      />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 pt-24 pb-46 text-center sm:pb-52">
        <div className="relative">
          <span aria-hidden="true" className="absolute inset-0 rounded-full bg-white/5 blur-2xl" />
          <UserAvatar
            name={name}
            src={avatarUrl}
            className="relative size-32 ring-4 ring-white/15 shadow-[0_35px_100px_-25px_rgba(0,0,0,0.95)] sm:size-44"
            fallbackClassName="text-4xl font-bold sm:text-5xl"
          />
        </div>
        <h1 className="mt-6 text-[clamp(1.7rem,4.5vw,2.5rem)] leading-tight font-semibold tracking-tight text-white">
          {name}
        </h1>
        <div className="mt-2 flex items-center gap-2 text-sm text-white/65">
          <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
          <span className="font-mono tabular-nums">{formatCallDuration(seconds)}</span>
        </div>
      </div>

      {/* Self-view PiP */}
      <div className="absolute right-4 bottom-38 z-20 sm:right-8 sm:bottom-40">
        <div
          className={cn(
            'relative aspect-[3/4] w-24 overflow-hidden rounded-2xl border border-white/20 bg-[#0b1510] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] sm:w-36',
            !cameraOn && 'ring-1 ring-white/10',
          )}
        >
          {cameraOn ? (
            <>
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(circle at 30% 20%, rgba(0,230,118,0.28), transparent 48%), linear-gradient(160deg, #10271a 0%, #07120c 100%)',
                }}
                aria-hidden="true"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <UserAvatar
                  name={localName}
                  src={localAvatarUrl}
                  className="size-12 ring-2 ring-white/20 sm:size-16"
                  fallbackClassName="text-sm font-bold"
                />
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-2 text-center">
              <VideoOff className="size-5 text-white/40 sm:size-6" aria-hidden="true" />
              <span className="text-[10px] leading-tight font-medium text-white/50">
                {t('chat.callCameraOffSelf')}
              </span>
            </div>
          )}
          <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/75 to-transparent px-2 pt-4 pb-1.5 text-[10px] font-semibold text-white/90 sm:px-2.5 sm:text-[11px]">
            {t('chat.callYou')}
          </span>
        </div>
      </div>
    </section>
  )
}
