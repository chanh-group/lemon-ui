import { useState, useEffect, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/app/providers/AuthProvider'
import { useForgotPassword, useVerifyOtp } from '@/features/auth/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/common/BrandMark'
import OtpInputGroup from '@/components/otp-input-group'
import ResendOTP from '@/components/resend-otp'
import VerificationMessage from '@/components/verification-message'
import { ROUTES } from '@/config/constants'

type OtpFlow = 'registration' | 'forgot-password' | 'email' | 'phone' | 'change-destination'

type FlowContent = {
  eyebrow: string
  title: string
  description: string
}

const flowContent: Record<OtpFlow, FlowContent> = {
  registration: {
    eyebrow: 'Xác nhận OTP',
    title: 'Xác nhận OTP',
    description: 'Chúng tôi đã gửi mã xác minh gồm 6 chữ số đến email của bạn.',
  },
  'forgot-password': {
    eyebrow: 'Khôi phục tài khoản',
    title: 'Đặt lại mật khẩu',
    description: 'Nhập mã gồm 6 chữ số để tiếp tục đặt lại mật khẩu.',
  },
  email: {
    eyebrow: 'Bảo mật tài khoản',
    title: 'Xác minh email',
    description: 'Nhập mã gồm 6 chữ số để xác minh email.',
  },
  phone: {
    eyebrow: 'Bảo mật tài khoản',
    title: 'Xác minh số điện thoại',
    description: 'Nhập mã gồm 6 chữ số để xác minh số điện thoại.',
  },
  'change-destination': {
    eyebrow: 'Xác nhận thay đổi',
    title: 'Xác minh thông tin mới',
    description: 'Nhập mã gồm 6 chữ số để xác nhận thay đổi.',
  },
}

const verificationErrors: Record<string, string> = {
  incorrect: 'Mã xác minh không đúng. Vui lòng kiểm tra và thử lại.',
  expired: 'Mã này đã hết hạn. Vui lòng yêu cầu mã mới.',
  'too-many-attempts': 'Bạn đã thử quá nhiều lần. Vui lòng yêu cầu mã mới.',
  network: 'Đã xảy ra lỗi kết nối. Vui lòng thử lại.',
}

type VerificationState = 'idle' | 'loading' | 'error' | 'success'

type OtpLocationState = {
  email?: string
  flow?: OtpFlow
}

export function OtpPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = (location.state ?? {}) as OtpLocationState
  const { status, user } = useAuth()
  const { mutateAsync, isSuccess } = useVerifyOtp()
  const forgotPassword = useForgotPassword()

  const flow: OtpFlow = locationState.flow ?? 'registration'
  const email = locationState.email ?? user?.email ?? ''

  const [code, setCode] = useState('')
  const [state, setState] = useState<VerificationState>('idle')
  const [verificationError, setVerificationError] = useState<string | undefined>(undefined)

  const content = flowContent[flow]

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        navigate(ROUTES.messages, { replace: true })
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isSuccess, navigate])

  const updateCode = (value: string) => {
    setCode(value)
    if (state === 'error') {
      setState('idle')
      setVerificationError(undefined)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (code.length !== 6 || state === 'loading') return
    setState('loading')

    try {
      await mutateAsync({ email, code })
      setState('success')
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message.includes('hết hạn') || message.includes('expired')) {
        setVerificationError('expired')
      } else if (message.includes('quá nhiều') || message.includes('too-many')) {
        setVerificationError('too-many-attempts')
      } else {
        setVerificationError('incorrect')
      }
      setState('error')
    }
  }

  useEffect(() => {
    if (status === 'restoring') return
    if (!email) {
      navigate(ROUTES.login, { replace: true })
    }
  }, [email, navigate, status])

  if (status === 'restoring') {
    return <div className="min-h-dvh bg-background" aria-busy="true" />
  }

  if (!email) {
    return <div className="min-h-dvh bg-background" aria-busy="true" />
  }

  return (
    <main className="otp-page">
      <div className="citrus-decoration" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      <section className="otp-card" aria-labelledby="otp-title">
        <div className="otp-brand">
          <div className="flex items-center gap-3">
            <BrandMark className="w-10 h-10" animated={false} />
            <span className="font-extrabold text-2xl tracking-tight">
              Lemon<span className="text-lemon-400">.</span>
            </span>
          </div>
          <p className="otp-brand-tagline">
            Kết nối tươi mới, thật đơn giản.
          </p>
        </div>

        {state === 'success' ? (
          <div className="otp-success">
            <div className="success-mark" aria-hidden="true">
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14 9 11" />
              </svg>
            </div>
            <div className="success-kicker">Xác minh hoàn tất</div>
            <div
              className="otp-title"
              id="otp-title"
              role="heading"
              aria-level={1}
            >
              Xác minh thành công!
            </div>
            <p>Tài khoản của bạn đã được xác minh và sẵn sàng sử dụng.</p>
            <Button
              className="full-button otp-primary-action"
              onClick={() => navigate(ROUTES.messages, { replace: true })}
            >
              Tiếp tục
            </Button>
          </div>
        ) : (
          <>
            <Button
              className="otp-back"
              variant="ghost"
              onClick={() => navigate(ROUTES.login, { replace: true })}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
              Quay lại
            </Button>

            <div className="otp-heading">
              <div className="eyebrow">{content.eyebrow}</div>
              <div
                className="otp-title"
                id="otp-title"
                role="heading"
                aria-level={1}
              >
                {content.title}
              </div>
              <p>{content.description}</p>
              <div className="otp-delivery">
                <span>
                  Chúng tôi đã gửi mã xác nhận đến{' '}
                  {flow === 'phone' ? 'số điện thoại' : 'email'}
                </span>
                {email && (
                  <div className="otp-destination">{email}</div>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="otp-label">Nhập mã xác minh</div>
              <OtpInputGroup
                value={code}
                onChange={updateCode}
                invalid={state === 'error'}
                disabled={state === 'loading'}
              />

              {verificationError && (
                <VerificationMessage tone="error">
                  {verificationErrors[verificationError]}
                </VerificationMessage>
              )}

              <Button
                type="submit"
                className="full-button otp-primary-action"
                disabled={code.length !== 6 || state === 'loading'}
              >
                {state === 'loading' && <span className="button-spinner" />}
                {state === 'loading' ? 'Đang xác minh...' : 'Xác minh'}
              </Button>
            </form>

            {flow === 'forgot-password' ? (
              <ResendOTP
                onResend={() => forgotPassword.mutateAsync({ email })}
              />
            ) : (
              <ResendOTP
                onResend={() => {
                  toast.error('Chức năng gửi lại mã sẽ có sớm có sẵn', {
                    action: { label: 'Hủy', onClick: () => {} },
                  })
                }}
              />
            )}

            <div className="change-destination">
              <span>Sai email hoặc số điện thoại?</span>
              <Button
                className="text-action secondary"
                variant="ghost"
                size="sm"
                onClick={() => navigate(ROUTES.login, { replace: true })}
              >
                Thay đổi
              </Button>
            </div>

            <div className="otp-security">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>
                Mã có hiệu lực trong 5 phút. Không chia sẻ mã này với bất kỳ ai.
              </span>
            </div>
          </>
        )}
      </section>

      <div className="otp-footer">
        © 2025 Lemon · Giao tiếp an toàn và riêng tư
      </div>
    </main>
  )
}
