import { useTranslation } from 'react-i18next'
import { ChevronLeftIcon as ChevronLeftData, MoreVerticalIcon as MoreVerticalData, CallIcon as PhoneData, Video01Icon as VideoData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const ChevronLeft = createIcon(ChevronLeftData)
const MoreVertical = createIcon(MoreVerticalData)
const Phone = createIcon(PhoneData)
const Video = createIcon(VideoData)
import { cn } from '@/lib/utils'
import { avatarColor, initials } from '../../data/mockData'
import type { Conversation } from '../../types/chat.types'

interface ConversationHeaderProps {
  conversation: Conversation
  showBack: boolean
  onBack?: () => void
  isTyping?: boolean
}

export function ConversationHeader({ conversation, showBack, onBack, isTyping }: ConversationHeaderProps) {
  const { t } = useTranslation()
  const headerActions = [
    { label: t('chat.voiceCall'), icon: Phone },
    { label: t('chat.videoCall'), icon: Video },
    { label: t('chat.moreOptions'), icon: MoreVertical },
  ]

  return (
    <header className={cn('flex shrink-0 items-center gap-3 border-b border-border bg-card/95 px-3 py-2.5 backdrop-blur sm:px-5')}>
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
        <span
          aria-hidden="true"
          className="grid size-10 place-items-center rounded-full text-[13px] font-bold text-foreground ring-1 ring-border"
          style={{ backgroundColor: avatarColor(conversation.name) }}
        >
          {initials(conversation.name)}
        </span>
        {conversation.online && (
          <span className="absolute right-0 bottom-0 size-2.5 rounded-full bg-success ring-2 ring-card" title={t('chat.online')} aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[15px] font-bold text-foreground">{conversation.name}</h2>
        <p className={cn('truncate text-xs', isTyping ? 'font-medium text-primary animate-pulse' : 'text-muted-foreground')}>
          {isTyping
            ? t('chat.typing')
            : conversation.isGroup
              ? conversation.members
              : conversation.online
                ? t('chat.online')
                : (conversation.lastActive ?? t('chat.offline'))}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {headerActions.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            title={label}
            className="chat-icon-btn grid size-11 min-h-11 min-w-11 place-items-center rounded-xl text-brand-ink transition-all duration-150 hover:bg-muted active:scale-95"
          >
            <Icon className="size-5" aria-hidden="true" />
          </button>
        ))}
      </div>
    </header>
  )
}
