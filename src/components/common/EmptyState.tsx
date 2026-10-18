import { InboxIcon as InboxIconData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const InboxIcon = createIcon(InboxIconData)
import { useTranslation } from 'react-i18next'

interface EmptyStateProps {
  title?: string
  message?: string
}

export function EmptyState({ title, message }: EmptyStateProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <InboxIcon className="mb-4 size-12 text-muted-foreground" aria-hidden="true" />
      <h3 className="text-lg font-semibold text-foreground">{title ?? t('common.emptyTitle')}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{message ?? t('common.emptyMessage')}</p>
    </div>
  )
}
