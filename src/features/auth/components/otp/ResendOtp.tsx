import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { VerificationMessage } from './VerificationMessage'

type ResendOtpProps = {
  initialSeconds?: number
  onResend: () => Promise<void> | void
}

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function ResendOtp({ initialSeconds = 45, onResend }: ResendOtpProps) {
  const [seconds, setSeconds] = useState(initialSeconds)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [sent, setSent] = useState(false)
  const deadline = useRef(0)

  useEffect(() => {
    deadline.current = Date.now() + initialSeconds * 1000
    const interval = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000))
      setSeconds(remaining)
      if (remaining <= 0) window.clearInterval(interval)
    }, 1000)
    return () => window.clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resend = async () => {
    setLoading(true)
    setError(false)
    setSent(false)
    try {
      await onResend()
      deadline.current = Date.now() + initialSeconds * 1000
      setSeconds(initialSeconds)
      setSent(true)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? (
        <div className="flex items-center gap-2 text-sm text-destructive" role="alert">
          <span>Không thể gửi mã.</span>
          <Button variant="link" size="sm" className="h-auto p-0 text-destructive underline" onClick={resend}>
            Thử lại
          </Button>
        </div>
      ) : seconds > 0 ? (
        <div className="text-sm text-muted-foreground">
          Gửi lại mã sau{' '}
          <span className="font-medium tabular-nums text-foreground" aria-live="off">
            {formatCountdown(seconds)}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Chưa nhận được mã?</span>
          <Button variant="link" size="sm" className="h-auto p-0 text-primary underline" onClick={resend} disabled={loading}>
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
