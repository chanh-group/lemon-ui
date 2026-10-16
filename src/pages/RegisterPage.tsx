import { Link } from 'react-router-dom'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { SignupWizard } from '@/features/auth/components/signup'
import { ROUTES } from '@/config/constants'

export function RegisterPage() {
  return (
    <AuthLayout
      title="Bắt đầu trò chuyện cùng LemonChat."
      subtitle="Tạo tài khoản miễn phí chỉ trong vài giây."
    >
      <SignupWizard />
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Đã có tài khoản?{' '}
        <Link
          to={ROUTES.login}
          className="font-semibold text-brand-ink underline-offset-4 hover:underline"
        >
          Đăng nhập
        </Link>
      </p>
    </AuthLayout>
  )
}
