import { useTranslation } from 'react-i18next'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { ForgotPasswordWizard } from '@/features/auth/components/forgot'

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  return (
    <AuthLayout
      title={t('pages.forgotTitle')}
      subtitle={t('pages.forgotSubtitle')}
    >
      <ForgotPasswordWizard />
    </AuthLayout>
  )
}
