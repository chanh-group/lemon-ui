import { AuthLayout } from '@/components/layout/AuthLayout'
import { ForgotPasswordWizard } from '@/features/auth/components/forgot'

export function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Quên mật khẩu?"
      subtitle="Đừng lo, chúng tôi sẽ giúp bạn đặt lại mật khẩu."
    >
      <ForgotPasswordWizard />
    </AuthLayout>
  )
}
