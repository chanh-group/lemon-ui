import { useState, useEffect, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, CheckCircleIcon, ShieldCheckIcon } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { useForgotPassword, useResendOtp, useVerifyOtp } from '@/features/auth/hooks/useAuth'
import { otpLocationStateSchema } from '@/features/auth/schemas/auth.schema'
import type { OtpFlow, VerificationErrorCode, VerificationState } from '@/features/auth/types/auth.types'
import { OtpInputGroup, ResendOtp, VerificationMessage } from '@/features/auth/components/otp'
import { Button } from '@/components/ui/button'
import { BrandMark } from '@/components/common/BrandMark'
import { ROUTES } from '@/config/constants'

const OTP_LENGTH = 6

const flowContent: Record<OtpFlow, { eyebrow: string; title: string; description: string }> = {
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
}

const verificationErrors: Record<VerificationErrorCode, string> = {
  incorrect: 'Mã xác minh không đúng. Vui lòng kiểm tra và thử lại.',
  expired: 'Mã này đã hết hạn. Vui lòng yêu cầu mã mới.',
  'too-many-attempts': 'Bạn đã thử quá nhiều lần. Vui lòng yêu cầu mã mới.',
  network: 'Đã xảy ra lỗi kết nối. Vui lòng thử lại.',
}

function classifyError(err: unknown): VerificationErrorCode {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    if (msg.includes('expired') || msg.includes('hết hạn')) return 'expired'
    if (msg.includes('too-many') || msg.includes('quá nhiều')) return 'too-many-attempts'
  }
  return 'incorrect'
}

export function OtpPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { status, user } = useAuth()
  const verifyOtp = useVerifyOtp()
  const forgotPassword = useForgotPassword()
  const resendOtp = useResendOtp()

  const parsed = otpLocationStateSchema.safeParse(location.state ?? {})
  const flow: OtpFlow = parsed.data?.flow ?? 'registration'
  const email = parsed.data?.email ?? user?.email ?? ''

  const [code, setCode] = useState<string[]>(() => Array.from({ length: OTP_LENGTH }, () => ''))
  const [state, setState] = useState<VerificationState>('idle')
  const [errorCode, setErrorCode] = useState<VerificationErrorCode | undefined>()

  const content = flowContent[flow]
  const isComplete = code.every((d) => d !== '')

  useEffect(() => {
    if (state === 'success') {
      const timer = setTimeout(() => navigate(ROUTES.messages, { replace: true }), 2000)
      return () => clearTimeout(timer)
    }
  }, [state, navigate])

  useEffect(() => {
    if (status === 'restoring') return
    if (!email) navigate(ROUTES.login, { replace: true })
  }, [email, navigate, status])

  const updateCode = (next: string[]) => {
    setCode(next)
    if (state === 'error') {
      setState('idle')
      setErrorCode(undefined)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!isComplete || state === 'loading') return
    setState('loading')
    try {
      await verifyOtp.mutateAsync({ email, code: code.join('') })
      setState('success')
    } catch (err) {
      setErrorCode(classifyError(err))
      setState('error')
    }
  }

  const handleResend = async () => {
    if (flow === 'forgot-password') {
      await forgotPassword.mutateAsync({ email })
    } else {
      await resendOtp.mutateAsync({ email })
    }
  }

  if (status === 'restoring' || !email) {
    return <div className="min-h-dvh bg-background" aria-busy="true" />
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div aria-hidden="true" className="absolute -top-24 left-1/2 size-112 -translate-x-1/2 rounded-full bg-lemon-100/60 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-32 -right-24 size-96 rounded-full bg-lemon-50 blur-3xl animate-float-slow" />

      <div className="relative flex w-full max-w-md flex-col items-center">
        {/* Brand */}
        <div className="mb-6 flex items-center gap-3">
          <BrandMark className="size-10" animated={false} />
          <span className="text-2xl font-extrabold tracking-tight">
            Lemon<span className="text-lemon-400">.</span>
          </span>
        </div>

        {state === 'success' ? (
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircleIcon className="size-8 text-emerald-600" aria-hidden="true" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Xác minh hoàn tất</p>
            <h1 className="mt-2 text-title font-heading text-foreground">Xác minh thành công!</h1>
            <p className="mt-2 text-sm text-muted-foreground">Tài khoản của bạn đã được xác minh và sẵn sàng sử dụng.</p>
            <Button className="mt-6 w-full" onClick={() => navigate(ROUTES.messages, { replace: true })}>
              Tiếp tục
            </Button>
          </div>
        ) : (
          <>
            <Button variant="ghost" size="sm" className="mb-4 gap-1.5 text-muted-foreground" onClick={() => navigate(ROUTES.login, { replace: true })}>
              <ArrowLeftIcon className="size-4" aria-hidden="true" />
              Quay lại
            </Button>

            <div className="w-full text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{content.eyebrow}</p>
              <h1 className="mt-1 text-title font-heading text-foreground">{content.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{content.description}</p>
              <p className="mt-3 text-sm">
                <span className="text-muted-foreground">Chúng tôi đã gửi mã xác nhận đến email</span>
                <span className="ml-1 font-medium text-foreground">{email}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="mt-6 w-full">
              <label className="mb-2 block text-sm font-medium text-foreground">Nhập mã xác minh</label>
              <OtpInputGroup value={code} onChange={updateCode} invalid={state === 'error'} disabled={state === 'loading'} />

              {errorCode && (
                <div className="mt-3">
                  <VerificationMessage tone="error">{verificationErrors[errorCode]}</VerificationMessage>
                </div>
              )}

              <Button type="submit" className="mt-4 w-full" disabled={!isComplete || state === 'loading'}>
                {state === 'loading' ? 'Đang xác minh...' : 'Xác minh'}
              </Button>
            </form>

            <div className="mt-4 w-full">
              <ResendOtp onResend={handleResend} />
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <span>Sai email?</span>
              <Button variant="link" size="sm" className="h-auto p-0 text-primary underline" onClick={() => navigate(ROUTES.login, { replace: true })}>
                Thay đổi
              </Button>
            </div>

            <div className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheckIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>Mã có hiệu lực trong 5 phút. Không chia sẻ mã này với bất kỳ ai.</span>
            </div>
          </>
        )}
      </div>

      <p className="mt-8 text-xs text-muted-foreground">© 2025 Lemon · Giao tiếp an toàn và riêng tư</p>
    </main>
  )
}
