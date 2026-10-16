import { useTranslation } from 'react-i18next'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { LoginForm } from '@/features/auth/components/LoginForm'

export function LoginPage() {
  const { t } = useTranslation()
  return (
    <AuthLayout
      title={t('pages.loginTitle')}
      subtitle={t('pages.loginSubtitle')}
    >
      <LoginForm />
    </AuthLayout>
  )
}
