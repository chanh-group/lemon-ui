import { useTranslation } from 'react-i18next'
import { UserAvatar } from '@/components/common/UserAvatar'
import type { Conversation } from '@/features/conversation/types/conversation.types'

interface TypingIndicatorProps {
  conversation: Conversation
  userCount: number
}

export function TypingIndicator({ conversation, userCount }: TypingIndicatorProps) {
  const { t } = useTranslation()
  if (userCount <= 0) return null

  const label = conversation.isGroup
    ? t('chat.peopleTyping', { count: userCount })
    : t('chat.someoneTyping')

  return (
    <div className="flex min-h-8 shrink-0 items-center gap-2 px-4 pb-1 sm:px-6" aria-live="polite">
      <UserAvatar
        name={conversation.name}
        src={conversation.partnerAvatar}
        square={conversation.isGroup}
        className="size-5 text-[9px]"
      />
      <span
        role="status"
        aria-label={label}
        className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-muted px-3 py-2"
      >
        {[0, 0.15, 0.3].map((delay) => (
          <span
            key={delay}
            aria-hidden="true"
            className="size-1.5 rounded-full bg-muted-foreground animate-typing-dot motion-reduce:animate-none"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
        <span className="sr-only">{label}</span>
      </span>
    </div>
  )
}
