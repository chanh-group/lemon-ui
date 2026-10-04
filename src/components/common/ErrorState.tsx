import { AlertTriangleIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Đã có lỗi xảy ra',
  message = 'Không thể tải dữ liệu. Vui lòng thử lại.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card px-6 py-10 text-center"
    >
      <AlertTriangleIcon className="size-8 text-destructive" aria-hidden="true" />
      <div>
        <p className="text-subheading font-heading text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry ? (
        <Button type="button" variant="outline" onClick={onRetry} className="cursor-pointer">
          Thử lại
        </Button>
      ) : null}
    </div>
  )
}
