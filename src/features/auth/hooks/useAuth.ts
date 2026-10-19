import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ROUTES } from '@/config/constants'
import {
  useForgotOtp,
  useLogin as useLoginBase,
  useLogout as useLogoutBase,
} from '@/features/auth/api'
import type { ApiError } from '@/infrastructure/api/errors'
import type { AuthUser, LoginInput } from '@/domain/auth'

export {
  useAuth,
  useMe,
  useRequestOtp,
  useVerifyOtp,
  useVerifyOtpEarly,
  useSignup,
  useForgotOtp,
  useResetPassword,
} from '@/features/auth/api'

export function useLogin() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const mutation = useLoginBase()

  return {
    ...mutation,
    mutate: (
      payload: LoginInput,
      options?: {
        onSuccess?: (user: AuthUser) => void
        onError?: (error: ApiError) => void
      },
    ) => {
      mutation.mutate(payload, {
        onSuccess: (user) => {
          toast.success(t('auth.loginSuccess', { name: user.fullName }))
          navigate(ROUTES.messages, { replace: true })
          options?.onSuccess?.(user)
        },
        onError: (error) => {
          toast.error(error.message || t('auth.errorUnknown'))
          options?.onError?.(error)
        },
      })
    },
  }
}

export function useAutoSignin() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const mutation = useLoginBase()

  return {
    ...mutation,
    mutate: (
      payload: LoginInput,
      options?: {
        onSuccess?: (user: AuthUser) => void
        onError?: (error: ApiError) => void
      },
    ) => {
      mutation.mutate(payload, {
        onSuccess: (user) => {
          toast.success(t('auth.signupSuccess'))
          navigate(ROUTES.messages, { replace: true })
          options?.onSuccess?.(user)
        },
        onError: (error) => {
          toast.error(error.message || t('auth.autoSigninFailed'))
          options?.onError?.(error)
        },
      })
    },
  }
}

export function useForgotPassword() {
  const { t } = useTranslation()
  const mutation = useForgotOtp()

  return {
    ...mutation,
    mutate: (
      payload: { email: string },
      options?: {
        onSuccess?: () => void
        onError?: (error: ApiError) => void
      },
    ) => {
      mutation.mutate(payload, {
        onSuccess: () => options?.onSuccess?.(),
        onError: (error) => {
          toast.error(error.message || t('auth.forgotOtpError'))
          options?.onError?.(error)
        },
      })
    },
  }
}

export function useLogout() {
  const navigate = useNavigate()
  const mutation = useLogoutBase()

  return {
    ...mutation,
    mutate: (vars?: void, options?: { onSettled?: () => void }) => {
      mutation.mutate(vars, {
        onSettled: () => {
          navigate(ROUTES.login, { replace: true })
          options?.onSettled?.()
        },
      })
    },
  }
}
