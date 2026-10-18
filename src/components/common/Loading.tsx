import { LoaderCircleIcon as Loader2IconData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const Loader2Icon = createIcon(Loader2IconData)
import { cn } from '@/lib/utils'

interface LoadingProps {
  /** Nhãn hiển thị — caller tự truyền qua t() (i18n). */
  label?: string
  className?: string
}

export function Loading({ label, className }: LoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex items-center justify-center gap-2 py-10 text-muted-foreground', className)}
    >
      <Loader2Icon className="size-5 animate-spin" aria-hidden="true" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  )
}
