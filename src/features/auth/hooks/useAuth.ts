import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ROUTES } from '@/config/constants'
import { useAuth } from '@/app/providers/AuthProvider'
import type {
  LoginPayload,
  RegisterPayload,
  ResendOtpPayload,
  VerifyOtpPayload,
} from '@/features/auth/types/auth.types'
import {
  forgotPassword as forgotPasswordApi,
  resendOtp as resendOtpApi,
} from '@/features/auth/api/auth.api'

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
      navigate(ROUTES.otp, {
        replace: true,
        state: { email: user.email, flow: 'registration' },
      })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Đăng ký không thành công')
    },
  })
}

/**
 * Xác minh OTP — KHÔNG navigate. Caller tự quyết định điều hướng
 * (OtpPage cần hiển thị success state trước khi redirect).
 */
export function useVerifyOtp() {
  const { verifyOtp } = useAuth()

  return useMutation({
    mutationFn: (payload: VerifyOtpPayload) => verifyOtp(payload),
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (payload: { email: string }) => forgotPasswordApi(payload),
    onError: (error: Error) => {
      toast.error(error.message || 'Không thể gửi mã đặt lại mật khẩu')
    },
  })
}

export function useResendOtp() {
  return useMutation({
    mutationFn: (payload: ResendOtpPayload) => resendOtpApi(payload),
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
