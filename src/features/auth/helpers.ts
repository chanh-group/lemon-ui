import { useEffect, useState } from 'react'
import { RESEND_COOLDOWN_MS } from '@/config/constants'

/** Countdown dùng chung (gửi lại OTP, hiệu lực mã). Mặc định = cooldown gửi lại. */
export function useOtpCountdown(durationMs: number = RESEND_COOLDOWN_MS) {
  const [deadline, setDeadline] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    if (!deadline) return
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)))
    tick()
    const timer = setInterval(tick, 500)
    return () => clearInterval(timer)
  }, [deadline])

  return {
    secondsLeft,
    canResend: deadline === null || secondsLeft <= 0,
    start: () => setDeadline(Date.now() + durationMs),
  }
}

/** Format giây còn lại thành `M:SS` cho countdown hiệu lực OTP. */
export function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
