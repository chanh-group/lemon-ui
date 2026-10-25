import type { CSSProperties } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { avatarColor, initials } from '@/lib/avatar'

interface UserAvatarProps {
  name?: string | null
  /** Ảnh thật từ backend; rỗng/không tải được sẽ tự rơi về chữ cái đầu. */
  src?: string | null
  alt?: string
  className?: string
  fallbackClassName?: string
  imageClassName?: string
  fallbackStyle?: CSSProperties
  fallbackDelayMs?: number
  /** Avatar nhóm dạng bo vuông. */
  square?: boolean
}

export function UserAvatar({
  name,
  src,
  alt,
  className,
  fallbackClassName,
  imageClassName,
  fallbackStyle,
  fallbackDelayMs,
  square = false,
}: UserAvatarProps) {
  const safeName = name?.trim() || 'User'
  const label = alt ?? safeName
  const radius = square ? 'rounded-2xl' : undefined

  return (
    <Avatar className={cn('size-11 ring-1 ring-border', radius, className)}>
      {src ? (
        <AvatarImage
          src={src}
          alt={label}
          className={cn('object-cover', imageClassName)}
        />
      ) : null}
      <AvatarFallback
        delayMs={fallbackDelayMs ?? (src ? 300 : 0)}
        className={cn('text-[13px] font-bold text-foreground', radius, fallbackClassName)}
        style={{ backgroundColor: avatarColor(safeName), ...fallbackStyle }}
      >
        {initials(safeName)}
      </AvatarFallback>
    </Avatar>
  )
}
