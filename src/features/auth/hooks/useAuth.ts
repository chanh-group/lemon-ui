import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ROUTES } from '@/config/constants'
import { useAuth } from '@/app/providers/AuthProvider'
import type {
  LoginPayload,
  RequestOtpPayload,
  ResendOtpPayload,
  SignupPayload,
  VerifyOtpEarlyPayload,
  VerifyOtpPayload,
} from '@/features/auth/types/auth.types'
import {
  forgotPassword as forgotPasswordApi,
  requestOtp as requestOtpApi,
  resendOtp as resendOtpApi,
  signup as signupApi,
  verifyOtpEarly as verifyOtpEarlyApi,
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

/** Gửi OTP đăng ký. */
export function useRequestOtp() {
  return useMutation({
    mutationFn: (payload: RequestOtpPayload) => requestOtpApi(payload),
  })
}

/** Verify OTP sớm (không tiêu thụ mã). */
export function useVerifyOtpEarly() {
  return useMutation({
    mutationFn: (payload: VerifyOtpEarlyPayload) => verifyOtpEarlyApi(payload),
  })
}

/** Tạo user sau verify OTP. */
export function useSignup() {
  return useMutation({
    mutationFn: (payload: SignupPayload) => signupApi(payload),
  })
}

/**
 * Auto-signin sau signup — backend chỉ set refresh cookie ở login.
 */
export function useAutoSignin() {
  const navigate = useNavigate()
  const { login } = useAuth()

  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: () => {
      toast.success('Tạo tài khoản thành công!')
      navigate(ROUTES.messages, { replace: true })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Đăng nhập tự động thất bại')
    },
  })
}

/** Verify OTP (cho forgot-password) — tiêu thụ mã. */
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
