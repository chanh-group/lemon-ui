import { AuthLayout } from '@/components/layout/AuthLayout'
import { SignupWizard } from '@/features/auth/components/signup'

export function RegisterPage() {
  return (
    <AuthLayout
      title="Bắt đầu trò chuyện cùng LemonChat."
      subtitle="Tạo tài khoản miễn phí chỉ trong vài giây."
    >
      <SignupWizard />
    </AuthLayout>
  )
}
