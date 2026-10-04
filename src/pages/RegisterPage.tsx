import { AuthLayout } from '@/components/layout/AuthLayout'
import { RegisterForm } from '@/features/auth/components/RegisterForm'

export function RegisterPage() {
  return (
    <AuthLayout
      title="Bắt đầu trò chuyện cùng LemonChat."
      subtitle="Tạo tài khoản miễn phí chỉ trong vài giây."
    >
      <RegisterForm />
    </AuthLayout>
  )
}
