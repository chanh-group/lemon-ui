import { HugeiconsIcon } from '@hugeicons/react'
import type { IconSvgElement } from '@hugeicons/react'
import { cn } from '@/lib/utils'
import type { ComponentProps } from 'react'

/**
 * Factory bọc icon HugeIcons để giữ nguyên cách dùng cũ của codebase:
 * các component icon tiếp nhận `className`, `strokeWidth`, các thuộc tính svg.
 * (HugeIcons export icon ở dạng data object, cần render qua `HugeiconsIcon`.)
 */
export type IconProps = ComponentProps<'svg'> & {
  size?: number | string
  strokeWidth?: number
}

export function createIcon(data: IconSvgElement) {
  function HugeIcon({ className, strokeWidth = 1.5, ...rest }: IconProps) {
    return <HugeiconsIcon icon={data} strokeWidth={strokeWidth} className={cn('block', className)} {...rest} />
  }
  return HugeIcon
}
