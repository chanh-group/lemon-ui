import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { SignupWizard } from '@/features/auth/components/signup'
import { ROUTES } from '@/config/constants'

export function RegisterPage() {
  const { t } = useTranslation()
  return (
    <AuthLayout
      title={t('pages.registerTitle')}
      subtitle={t('pages.registerSubtitle')}
    >
      <SignupWizard />
      <p className="mt-4 text-center text-sm text-muted-foreground">
        {t('auth.alreadyHaveAccount')}{' '}
        <Link
          to={ROUTES.login}
          className="font-semibold text-brand-ink underline-offset-4 hover:underline"
        >
          {t('auth.login')}
        </Link>
      </p>
    </AuthLayout>
  )
}
