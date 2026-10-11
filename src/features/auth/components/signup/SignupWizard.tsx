import { useState } from 'react'
import { toast } from 'sonner'
import {
  MAX_OTP_ATTEMPTS,
  OTP_TTL_MS,
} from '@/config/constants'
import type { SignupStep, SignupPayload } from '@/features/auth/types/auth.types'
import type { SignupInfoInput } from '@/features/auth/schemas/auth.schema'
import {
  useAutoSignin,
  useRequestOtp,
  useSignup,
  useVerifyOtpEarly,
} from '@/features/auth/hooks/useAuth'
import { useOtpCountdown } from '@/features/auth/helpers'
import { EmailStep } from './EmailStep'
import { OtpStep } from './OtpStep'
import { InfoStep } from './InfoStep'

const stepLabels: Record<SignupStep, string> = {
  email: 'Bước 1/3 — Email',
  otp: 'Bước 2/3 — Xác minh OTP',
  info: 'Bước 3/3 — Thông tin tài khoản',
}

export function SignupWizard() {
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

  const resetOtpState = () => {
    setAttempts(0)
    setOtp('')
  }

  const handleDestroyed = () => {
    toast.error('Mã OTP đã bị hủy do nhập sai quá nhiều lần.')
    resetOtpState()
    setStep('email')
  }

  const handleExpired = () => {
    toast.error('Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.')
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
          toast.success('Mã xác minh đã được gửi đến email của bạn.')
        },
        onError: (error: Error) => {
          toast.error(error.message || 'Không thể gửi mã xác minh')
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
          const msg = error.message.toLowerCase()
          if (msg.includes('invalid') || msg.includes('sai')) {
            if (!handleInvalidOtp()) {
              toast.error('Mã xác minh không đúng.')
            }
          } else if (msg.includes('expired') || msg.includes('hết hạn')) {
            handleExpired()
          } else if (msg.includes('already') || msg.includes('tồn tại')) {
            toast.error('Email đã có tài khoản. Vui lòng đăng nhập.')
            setStep('email')
          } else {
            toast.error(error.message || 'Không thể xác minh mã OTP')
          }
        },
      },
    )
  }

  const handleSignup = (values: SignupInfoInput) => {
    const payload: SignupPayload = {
      email,
      fullName: values.fullName,
      password: values.password,
      otp,
    }

    signup.mutate(payload, {
      onSuccess: () => {
        autoSignin.mutate({ email, password: values.password })
      },
      onError: (error: Error) => {
        const msg = error.message.toLowerCase()
        if (msg.includes('already') || msg.includes('tồn tại')) {
          toast.error('Email đã có tài khoản. Vui lòng đăng nhập.')
          setStep('email')
          resetOtpState()
        } else if (msg.includes('invalid') || msg.includes('sai')) {
          if (!handleInvalidOtp()) {
            toast.error('Mã OTP không hợp lệ.')
          }
        } else {
          toast.error(error.message || 'Không thể tạo tài khoản')
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
        <EmailStep
          defaultEmail={email}
          isPending={requestOtp.isPending}
          onSubmit={sendOtp}
        />
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
          isPending={signup.isPending || autoSignin.isPending}
          attemptsLeft={attemptsLeft}
          onSubmit={handleSignup}
        />
      )}
    </div>
  )
}
