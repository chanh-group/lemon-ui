import { InboxIcon } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  message?: string
}

export function EmptyState({
  title = 'Chưa có dữ liệu',
  message = 'Nội dung sẽ hiển thị tại đây khi có dữ liệu.',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center">
      <InboxIcon className="size-8 text-muted-foreground" aria-hidden="true" />
      <div>
        <p className="text-subheading font-heading text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}
