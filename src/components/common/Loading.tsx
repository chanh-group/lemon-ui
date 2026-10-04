import { Loader2Icon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingProps {
  label?: string
  className?: string
}

export function Loading({ label = 'Đang tải...', className }: LoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex items-center justify-center gap-2 py-10 text-muted-foreground', className)}
    >
      <Loader2Icon className="size-5 animate-spin" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  )
}
