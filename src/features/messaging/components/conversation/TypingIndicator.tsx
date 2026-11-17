import { useTranslation } from 'react-i18next'
import { UserAvatar } from '@/components/common/UserAvatar'

interface TypingIndicatorProps {
  isGroup?: boolean
  senderLabel: string
  senderAvatarUrl?: string | null
  userCount: number
  names?: string[]
}

export function TypingIndicator({
  isGroup = false,
  senderLabel,
  senderAvatarUrl,
  userCount,
  names = [],
}: TypingIndicatorProps) {
  const { t } = useTranslation()
  if (userCount <= 0) return null

  const visibleNames = names.slice(0, Math.min(2, userCount))
  const hiddenCount = Math.max(0, userCount - visibleNames.length)
  const label = !isGroup
    ? t('chat.someoneTyping')
    : visibleNames.length === 0
      ? userCount === 1
        ? t('chat.unknownPersonTyping')
        : t('chat.peopleTyping', { count: userCount })
      : visibleNames.length === 1 && hiddenCount === 0
        ? t('chat.groupTypingOne', { name: visibleNames[0] })
        : visibleNames.length === 2 && hiddenCount === 0
          ? t('chat.groupTypingTwo', { first: visibleNames[0], second: visibleNames[1] })
          : t('chat.groupTypingMany', {
              names: visibleNames.join(', '),
              count: hiddenCount,
            })

  return (
    <div className="flex items-end gap-2.5 pb-2">
      {!isGroup && (
        <UserAvatar
          name={senderLabel}
          src={senderAvatarUrl}
          className="size-7"
          fallbackClassName="text-[10px]"
        />
      )}
      <span
        role="status"
        aria-live="polite"
        aria-label={label}
        className="inline-flex min-h-10 items-center gap-1 rounded-2xl rounded-bl-md border border-border bg-card px-3.5 py-2 shadow-sm"
      >
        {[0, 0.15, 0.3].map((delay) => (
          <span
            key={delay}
            aria-hidden="true"
            className="size-1.5 rounded-full bg-muted-foreground animate-typing-dot motion-reduce:animate-none"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
        <span className="ml-1 text-xs text-muted-foreground">{label}</span>
      </span>
    </div>
  )
}
