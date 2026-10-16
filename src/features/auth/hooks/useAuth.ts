import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ROUTES } from '@/config/constants'
import { useAuth } from '@/app/providers/AuthProvider'
import type {
  LoginPayload,
  RequestOtpPayload,
  ResendOtpPayload,
  ResetPasswordPayload,
  SignupPayload,
  VerifyOtpEarlyPayload,
} from '@/features/auth/types/auth.types'
import {
  forgotPassword as forgotPasswordApi,
  requestOtp as requestOtpApi,
  resendOtp as resendOtpApi,
  resetPassword as resetPasswordApi,
  signup as signupApi,
  verifyOtpEarly as verifyOtpEarlyApi,
} from '@/features/auth/api/auth.api'

export { useAuth } from '@/app/providers/AuthProvider'

export function useLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: (user) => {
      toast.success(t('auth.loginSuccess', { name: user.fullName }))
      navigate(ROUTES.messages, { replace: true })
    },
    onError: (error: Error) => {
      toast.error(error.message || t('auth.errorUnknown'))
    },
  })
}

export function useRequestOtp() {
  return useMutation({
    mutationFn: (payload: RequestOtpPayload) => requestOtpApi(payload),
  })
}

export function useVerifyOtpEarly() {
  return useMutation({
    mutationFn: (payload: VerifyOtpEarlyPayload) => verifyOtpEarlyApi(payload),
  })
}

export function useSignup() {
  return useMutation({
    mutationFn: (payload: SignupPayload) => signupApi(payload),
  })
}

export function useAutoSignin() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: () => {
      toast.success(t('auth.signupSuccess'))
      navigate(ROUTES.messages, { replace: true })
    },
    onError: (error: Error) => {
      toast.error(error.message || t('auth.autoSigninFailed'))
    },
  })
}

export function useForgotPassword() {
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (payload: { email: string }) => forgotPasswordApi(payload),
    onError: (error: Error) => {
      toast.error(error.message || t('auth.forgotOtpError'))
    },
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (payload: ResetPasswordPayload) => resetPasswordApi(payload),
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
