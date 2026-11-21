import {
  CallEnd01Icon as CallEndData,
  CallIcon as PhoneData,
  Video01Icon as VideoData,
} from '@hugeicons/core-free-icons'
import { useTranslation } from 'react-i18next'
import { createIcon } from '@/components/icons/hugeIcon'
import { UserAvatar } from '@/components/common/UserAvatar'
import { useCall } from '../context/CallContext'

const CallEnd = createIcon(CallEndData)
const Phone = createIcon(PhoneData)
const Video = createIcon(VideoData)

export function IncomingCallModal() {
  const { t } = useTranslation()
  const { incomingCall, acceptIncomingCall, rejectIncomingCall } = useCall()

  if (!incomingCall) return null

  const isVideo = incomingCall.media === 'VIDEO'
  const callerName =
    incomingCall.caller.fullName || incomingCall.caller.username || t('chat.callUnknownPeer')

  return (
    <aside
      role="dialog"
      aria-modal="true"
      aria-label={isVideo ? t('chat.incomingVideoCall') : t('chat.incomingVoiceCall')}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in"
        aria-hidden="true"
      />

      {/* Card */}
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center rounded-3xl border border-white/15 bg-[#0b1610]/90 p-6 text-center text-white shadow-[0_24px_70px_-15px_rgba(0,0,0,0.9)] backdrop-blur-xl animate-scale-in">
        <div className="relative mb-5">
          {/* Pulse ring animation */}
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-ring"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-primary/10 animate-pulse-ring"
            style={{ animationDelay: '0.8s' }}
          />

          <UserAvatar
            name={callerName}
            src={incomingCall.caller.avatarUrl}
            className="relative size-24 ring-4 ring-white/15 shadow-2xl"
            fallbackClassName="text-2xl font-bold"
          />
        </div>

        <h3 className="truncate text-xl font-bold tracking-tight text-white">{callerName}</h3>

        <p className="mt-1 text-sm font-medium text-white/70">
          {isVideo ? t('chat.incomingVideoCall') : t('chat.incomingVoiceCall')}
        </p>

        {/* Action Controls */}
        <div className="mt-8 flex w-full items-center justify-center gap-6">
          {/* Nút Từ chối */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={() => void rejectIncomingCall()}
              aria-label={t('chat.callDecline')}
              className="grid size-14 cursor-pointer place-items-center rounded-full bg-red-500 text-white shadow-[0_10px_35px_-8px_rgba(239,68,68,0.85)] ring-1 ring-red-300/40 transition-all hover:bg-red-400 active:scale-95"
            >
              <CallEnd className="size-6" aria-hidden="true" />
            </button>
            <span className="text-[11px] font-medium text-white/60">
              {t('chat.callDecline')}
            </span>
          </div>

          {/* Nếu là Video Call, cho phép nhận bằng Voice hoặc Video */}
          {isVideo ? (
            <>
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void acceptIncomingCall('VOICE')}
                  aria-label={t('chat.callAcceptVoice')}
                  className="grid size-12 cursor-pointer place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition-all hover:bg-white/20 active:scale-95"
                >
                  <Phone className="size-5" aria-hidden="true" />
                </button>
                <span className="text-[11px] font-medium text-white/60">
                  {t('chat.callVoiceLabel')}
                </span>
              </div>

              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void acceptIncomingCall('VIDEO')}
                  aria-label={t('chat.callAcceptVideo')}
                  className="grid size-14 cursor-pointer place-items-center rounded-full bg-emerald-500 text-white shadow-[0_10px_35px_-8px_rgba(16,185,129,0.9)] ring-1 ring-emerald-300/40 transition-all hover:bg-emerald-400 active:scale-95"
                >
                  <Video className="size-6" aria-hidden="true" />
                </button>
                <span className="text-[11px] font-medium text-white/60">
                  {t('chat.callAcceptVideo')}
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => void acceptIncomingCall('VOICE')}
                aria-label={t('chat.callAccept')}
                className="grid size-14 cursor-pointer place-items-center rounded-full bg-emerald-500 text-white shadow-[0_10px_35px_-8px_rgba(16,185,129,0.9)] ring-1 ring-emerald-300/40 transition-all hover:bg-emerald-400 active:scale-95"
              >
                <Phone className="size-6" aria-hidden="true" />
              </button>
              <span className="text-[11px] font-medium text-white/60">
                {t('chat.callAccept')}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
