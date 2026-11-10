import { useTranslation } from 'react-i18next'
import {
  ChevronLeftIcon as ChevronLeftData,
  MoreVerticalIcon as MoreVerticalData,
  CallIcon as PhoneData,
  Video01Icon as VideoData,
} from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const ChevronLeft = createIcon(ChevronLeftData)
const MoreVertical = createIcon(MoreVerticalData)
const Phone = createIcon(PhoneData)
const Video = createIcon(VideoData)
import { UserAvatar } from '@/components/common/UserAvatar'
import { cn } from '@/lib/utils'
import type { Conversation } from '../../types/chat.types'

interface ConversationHeaderProps {
  conversation: Conversation
  showBack: boolean
  onBack?: () => void
  isTyping?: boolean
  onToggleInfo?: () => void
  isInfoOpen?: boolean
  onVoiceCall?: () => void
  onVideoCall?: () => void
}

/** Pill "..." gọn thay cho chữ “Typing…” — vẫn có nhãn cho screen reader. */
function TypingIndicator() {
  const { t } = useTranslation()
  return (
    <span
      role="status"
      aria-label={t('chat.typing')}
      title={t('chat.typing')}
      className="inline-flex w-fit items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5"
    >
      {[0, 0.15, 0.3].map((delay) => (
        <span
          key={delay}
          aria-hidden="true"
          className="size-1.5 rounded-full bg-brand-ink animate-typing-dot"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
      <span className="sr-only">{t('chat.typing')}</span>
    </span>
  )
}

export function ConversationHeader({
  conversation,
  showBack,
  onBack,
  isTyping,
  onToggleInfo,
  isInfoOpen,
  onVoiceCall,
  onVideoCall,
}: ConversationHeaderProps) {
  const { t } = useTranslation()

  return (
    <header
      className={cn(
        'flex shrink-0 items-center gap-3 border-b border-border bg-card/95 px-3 py-2.5 backdrop-blur sm:px-5',
      )}
    >
      {showBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label={t('chat.backToList')}
          className="grid size-11 min-h-11 min-w-11 shrink-0 place-items-center rounded-xl text-foreground transition-colors hover:bg-muted md:hidden"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
      )}
      <span className="relative shrink-0">
        <UserAvatar
          name={conversation.name}
          src={conversation.partnerAvatar}
          square={conversation.isGroup}
          className="size-10"
        />
        {conversation.online && (
          <span
            className="absolute right-0 bottom-0 size-2.5 rounded-full bg-success ring-2 ring-card"
            title={t('chat.online')}
            aria-hidden="true"
          />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[15px] font-bold text-foreground">{conversation.name}</h2>
        {isTyping ? (
          <span className="mt-0.5 block">
            <TypingIndicator />
          </span>
        ) : (
          <p className={cn('truncate text-xs text-muted-foreground')}>
            {conversation.isGroup
              ? conversation.members
              : conversation.online
                ? t('chat.online')
                : (conversation.lastActive ?? t('chat.offline'))}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          aria-label={t('chat.voiceCall')}
          title={t('chat.voiceCall')}
          onClick={onVoiceCall}
          className="chat-icon-btn grid size-11 min-h-11 min-w-11 place-items-center rounded-xl text-brand-ink transition-all duration-150 hover:bg-muted active:scale-95"
        >
          <Phone className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={t('chat.videoCall')}
          title={t('chat.videoCall')}
          onClick={onVideoCall}
          className="chat-icon-btn grid size-11 min-h-11 min-w-11 place-items-center rounded-xl text-brand-ink transition-all duration-150 hover:bg-muted active:scale-95"
        >
          <Video className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onToggleInfo}
          aria-label={t('chat.conversationInfo')}
          title={t('chat.conversationInfo')}
          aria-expanded={isInfoOpen}
          className={cn(
            'chat-icon-btn grid size-11 min-h-11 min-w-11 place-items-center rounded-xl transition-all duration-150 active:scale-95',
            isInfoOpen
              ? 'bg-muted text-foreground ring-1 ring-border shadow-xs'
              : 'text-brand-ink hover:bg-muted',
          )}
        >
          <MoreVertical className="size-5" aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
