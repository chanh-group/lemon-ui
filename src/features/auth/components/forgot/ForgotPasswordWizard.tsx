import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ROUTES } from '@/config/constants'
import type { ForgotStep } from '@/features/auth/types/auth.types'
import type { ResetPasswordInput } from '@/features/auth/schemas/auth.schema'
import { useForgotPassword, useResetPassword } from '@/features/auth/hooks/useAuth'
import { EmailStep } from '@/features/auth/components/signup/EmailStep'
import { ResetPasswordStep } from './ResetPasswordStep'

export function ForgotPasswordWizard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [step, setStep] = useState<ForgotStep>('email')
  const [email, setEmail] = useState('')

  const forgotPassword = useForgotPassword()
  const resetPassword = useResetPassword()

  const stepLabels: Record<ForgotStep, string> = {
    email: `${t('auth.forgotStep', { current: 1 })} — ${t('auth.email')}`,
    reset: `${t('auth.forgotStep', { current: 2 })} — ${t('auth.resetPassword')}`,
  }

  const handleSendOtp = (target: string) => {
    forgotPassword.mutate(
      { email: target },
      {
        onSuccess: () => {
          setEmail(target)
          setStep('reset')
          toast.success(t('auth.otpSent'))
        },
        onError: (error: Error) => {
          toast.error(error.message || t('auth.errorSendOtp'))
        },
      },
    )
  }

  const handleReset = (values: ResetPasswordInput) => {
    resetPassword.mutate(
      { email, otp: values.otp, newPassword: values.newPassword },
      {
        onSuccess: () => {
          toast.success(t('auth.resetSuccess'))
          navigate(ROUTES.login, { replace: true })
        },
        onError: (error: Error) => {
          const msg = error.message.toLowerCase()
          if (msg.includes('invalid') || msg.includes('sai') || msg.includes('hết hạn')) {
            toast.error(t('auth.errorOtpInvalidOrExpired'))
          } else {
            toast.error(error.message || t('auth.errorResetPassword'))
          }
        },
      },
    )
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <p className="text-sm text-muted-foreground">{stepLabels[step]}</p>

      {step === 'email' && (
        <EmailStep
          defaultEmail={email}
          isPending={forgotPassword.isPending}
          onSubmit={handleSendOtp}
        />
      )}

      {step === 'reset' && (
        <ResetPasswordStep
          email={email}
          isPending={resetPassword.isPending}
          onSubmit={handleReset}
          onBack={() => setStep('email')}
        />
      )}
    </div>
  )
}
