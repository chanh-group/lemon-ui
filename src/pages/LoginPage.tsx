import { AuthLayout } from '@/components/layout/AuthLayout'
import { LoginForm } from '@/features/auth/components/LoginForm'

export function LoginPage() {
  return (
    <AuthLayout
      title="Kết nối với những người bạn"
      subtitle="Đăng nhập để tiếp tục trò chuyện"
    >
      <LoginForm />
    </AuthLayout>
  )
}
