import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ROUTES } from '@/config/constants'
import { useAuth } from '@/app/providers/AuthProvider'
import type { LoginPayload, RegisterPayload } from '@/features/auth/types/auth.types'
import type { VerifyOtpPayload } from '@/features/auth/api/auth.api'

export { useAuth } from '@/app/providers/AuthProvider'

export function useLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()

  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: (user) => {
      toast.success(`Chào mừng ${user.fullName} trở lại!`)
      navigate(ROUTES.messages, { replace: true })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Đăng nhập không thành công')
    },
  })
}

export function useRegister() {
  const navigate = useNavigate()
  const { register } = useAuth()

  return useMutation({
    mutationFn: (payload: RegisterPayload) => register(payload),
    onSuccess: (user) => {
      toast.success(`Tạo tài khoản thành công! Chào mừng ${user.fullName}.`)
      navigate(ROUTES.messages, { replace: true })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Đăng ký không thành công')
    },
  })
}

export function useVerifyOtp() {
  const navigate = useNavigate()
  const { verifyOtp } = useAuth()

  return useMutation({
    mutationFn: (payload: VerifyOtpPayload) => verifyOtp(payload),
    onSuccess: () => {
      toast.success('Xác thực thành công!')
      navigate(ROUTES.messages, { replace: true })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Mã OTP không hợp lệ')
    },
  })
}

export function useLogout() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  return useMutation({
    mutationFn: () => logout(),
    onSettled: () => {
      navigate(ROUTES.login, { replace: true })
    },
  })
}
