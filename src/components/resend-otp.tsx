import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import VerificationMessage from '@/components/verification-message'

type ResendOTPProps = {
  initialSeconds?: number
  onResend?: () => Promise<void> | void
}

export default function ResendOTP({
  initialSeconds = 45,
  onResend,
}: ResendOTPProps) {
  const [seconds, setSeconds] = useState(initialSeconds)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (seconds <= 0) return
    const timer = window.setInterval(
      () => setSeconds((current) => Math.max(0, current - 1)),
      1000,
    )
    return () => window.clearInterval(timer)
  }, [seconds])

  const resend = async () => {
    setLoading(true)
    setError(false)
    setSent(false)
    try {
      if (!onResend) throw new Error('Missing resend handler')
      await onResend()
      setSeconds(initialSeconds)
      setSent(true)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="resend-block">
      {error ? (
        <div className="resend-row" role="alert">
          <span>Không thể gửi mã.</span>
          <Button
            className="text-action"
            variant="ghost"
            size="sm"
            onClick={resend}
          >
            Thử lại
          </Button>
        </div>
      ) : seconds > 0 ? (
        <div className="resend-row" aria-live="polite">
          Gửi lại mã sau{' '}
          <span className="countdown">
            00:{seconds.toString().padStart(2, '0')}
          </span>
        </div>
      ) : (
        <div className="resend-row">
          <span>Chưa nhận được mã?</span>
          <Button
            className="text-action"
            variant="ghost"
            size="sm"
            onClick={resend}
            disabled={loading}
          >
            {loading ? 'Đang gửi...' : 'Gửi lại mã'}
          </Button>
        </div>
      )}

      {sent && (
        <VerificationMessage tone="success">
          Mã xác nhận mới đã được gửi.
        </VerificationMessage>
      )}
    </div>
  )
}
