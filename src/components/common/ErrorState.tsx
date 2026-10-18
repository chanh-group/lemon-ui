import { TriangleAlertIcon as AlertTriangleIconData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const AlertTriangleIcon = createIcon(AlertTriangleIconData)
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
}

export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertTriangleIcon className="mb-4 size-12 text-destructive" aria-hidden="true" />
      <h3 className="text-lg font-semibold text-foreground">{title ?? t('common.errorTitle')}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{message ?? t('common.errorMessage')}</p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  )
}
