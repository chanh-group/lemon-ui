import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/config/constants'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
      <h1 className="text-title font-heading text-foreground">{t('common.notFoundTitle')}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{t('common.notFoundMessage')}</p>
      <Button asChild className="mt-6">
        <Link to={ROUTES.login}>{t('common.backToLogin')}</Link>
      </Button>
    </main>
  )
}
