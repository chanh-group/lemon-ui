import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  MAX_OTP_ATTEMPTS,
  OTP_TTL_MS,
} from '@/config/constants'
import type { SignupStep, SignupInput, SignupInfoInput } from '@/domain/auth'
import {
  useAutoSignin,
  useRequestOtp,
  useSignup,
  useVerifyOtpEarly,
} from '@/features/auth/hooks/useAuth'
import { useOtpCountdown } from '@/features/auth/hooks/useOtpCountdown'
import { EmailStep } from './EmailStep'
import { GoogleButton } from '@/features/auth/components/GoogleButton'
import { OtpStep } from './OtpStep'
import { InfoStep } from './InfoStep'

export function SignupWizard() {
  const { t } = useTranslation()
  const [step, setStep] = useState<SignupStep>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [attempts, setAttempts] = useState(0)

  const requestOtp = useRequestOtp()
  const verifyOtp = useVerifyOtpEarly()
  const signup = useSignup()
  const autoSignin = useAutoSignin()

  const resend = useOtpCountdown()
  const validity = useOtpCountdown(OTP_TTL_MS)

  const attemptsLeft = MAX_OTP_ATTEMPTS - attempts

  const stepLabels: Record<SignupStep, string> = {
    email: `${t('auth.signupStep', { current: 1 })} — ${t('auth.email')}`,
    otp: `${t('auth.signupStep', { current: 2 })} — ${t('auth.otpStepName')}`,
    info: `${t('auth.signupStep', { current: 3 })} — ${t('auth.infoStepName')}`,
  }

  const resetOtpState = () => {
    setAttempts(0)
    setOtp('')
  }

  const handleDestroyed = () => {
    toast.error(t('auth.otpDestroyed'))
    resetOtpState()
    setStep('email')
  }

  const handleExpired = () => {
    toast.error(t('auth.otpExpired'))
    resetOtpState()
    setStep('email')
  }

  /** Xử lý INVALID_OTP: tăng attempts, kiểm tra hủy/hết hạn. Trả true nếu đã chuyển bước. */
  const handleInvalidOtp = (): boolean => {
    if (validity.secondsLeft <= 0) {
      handleExpired()
      return true
    }
    const next = attempts + 1
    setAttempts(next)
    if (next >= MAX_OTP_ATTEMPTS) {
      handleDestroyed()
      return true
    }
    return false
  }

  const sendOtp = (target: string) => {
    requestOtp.mutate(
      { email: target },
      {
        onSuccess: () => {
          setEmail(target)
          setOtp('')
          setAttempts(0)
          resend.start()
          validity.start()
          setStep('otp')
          toast.success(t('auth.otpSent'))
        },
        onError: (error: Error) => {
          toast.error(error.message || t('auth.errorSendOtp'))
        },
      },
    )
  }

  const handleVerify = (code: string) => {
    verifyOtp.mutate(
      { email, otp: code, purpose: 'signup' },
      {
        onSuccess: () => {
          setOtp(code)
          setStep('info')
        },
        onError: (error: Error) => {
          const code = (error as { code?: string }).code
          if (code === 'INVALID_OTP') {
            if (!handleInvalidOtp()) {
              toast.error(t('auth.errorIncorrectOtp'))
            }
          } else if (code === 'OTP_EXPIRED') {
            handleExpired()
          } else if (code === 'USER_ALREADY_EXISTS' || code === 'CONFLICT') {
            toast.error(t('auth.errorEmailExists'))
            setStep('email')
          } else {
            toast.error(error.message || t('auth.errorVerifyOtp'))
          }
        },
      },
    )
  }

  const handleSignup = (values: SignupInfoInput) => {
    const payload: SignupInput = {
      email,
      fullName: values.fullName,
      username: values.username,
      password: values.password,
      otp,
    }

    signup.mutate(payload, {
      onSuccess: () => {
        autoSignin.mutate({ identifier: email, password: values.password })
      },
      onError: (error: Error) => {
        const code = (error as { code?: string }).code
        if (code === 'USER_ALREADY_EXISTS' || code === 'CONFLICT') {
          toast.error(t('auth.errorEmailExists'))
          setStep('email')
          resetOtpState()
        } else if (code === 'INVALID_OTP') {
          if (!handleInvalidOtp()) {
            toast.error(t('auth.errorInvalidOtp'))
          }
        } else {
          toast.error(error.message || t('auth.errorSignup'))
        }
      },
    })
  }

  const handleChangeEmail = () => {
    setEmail('')
    setOtp('')
    setAttempts(0)
    setStep('email')
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <p className="text-sm text-muted-foreground">{stepLabels[step]}</p>

      {step === 'email' && (
        <>
          <EmailStep
            defaultEmail={email}
            isPending={requestOtp.isPending}
            onSubmit={sendOtp}
          />
          <GoogleButton />
        </>
      )}

      {step === 'otp' && (
        <OtpStep
          email={email}
          attemptsLeft={attemptsLeft}
          validitySecondsLeft={validity.secondsLeft}
          resendSecondsLeft={resend.secondsLeft}
          canResend={resend.canResend}
          isVerifying={verifyOtp.isPending}
          isResending={requestOtp.isPending}
          onVerify={handleVerify}
          onResend={() => sendOtp(email)}
          onChangeEmail={handleChangeEmail}
        />
      )}

      {step === 'info' && (
        <InfoStep
          email={email}
          isPending={signup.isPending || autoSignin.isPending}
          attemptsLeft={attemptsLeft}
          onSubmit={handleSignup}
        />
      )}
    </div>
  )
}
