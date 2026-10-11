import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'

const OTP_LENGTH = 6

type OtpInputGroupProps = {
  value: string[]
  onChange: (value: string[]) => void
  invalid?: boolean
  disabled?: boolean
}

export function OtpInputGroup({
  value,
  onChange,
  invalid = false,
  disabled = false,
}: OtpInputGroupProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  const focusAt = (index: number) => {
    const clamped = Math.max(0, Math.min(index, OTP_LENGTH - 1))
    inputs.current[clamped]?.focus()
  }

  const updateDigit = (index: number, rawValue: string) => {
    const digit = rawValue.replace(/\D/g, '').slice(-1)
    const next = [...value]
    next[index] = digit
    onChange(next)
    if (digit && index < OTP_LENGTH - 1) {
      focusAt(index + 1)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === 'Backspace' && !value[index] && index > 0) {
      event.preventDefault()
      const next = [...value]
      next[index - 1] = ''
      onChange(next)
      focusAt(index - 1)
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      focusAt(index - 1)
    }
    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      event.preventDefault()
      focusAt(index + 1)
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const text = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!text) return
    event.preventDefault()
    const next: string[] = Array.from({ length: OTP_LENGTH }, (_, i) => text[i] ?? '')
    onChange(next)
    focusAt(Math.min(text.length, OTP_LENGTH - 1))
  }

  return (
    <div
      className={`flex gap-2 ${invalid ? 'ring-2 ring-destructive rounded-lg' : ''}`}
      onPaste={handlePaste}
      role="group"
      aria-label="Mã xác minh gồm 6 chữ số"
    >
      {Array.from({ length: OTP_LENGTH }, (_, index) => {
        const digit = value[index] ?? ''
        return (
          <input
            key={index}
            ref={(el) => {
              inputs.current[index] = el
            }}
            className={`h-12 w-10 rounded-lg border text-center text-lg font-semibold transition-colors sm:h-14 sm:w-12 sm:text-xl ${
              digit
                ? 'border-input bg-card text-foreground'
                : 'border-input bg-background text-foreground'
            } ${invalid ? 'border-destructive' : 'focus:border-ring focus:ring-2 focus:ring-ring/30'} disabled:cursor-not-allowed disabled:opacity-50`}
            value={digit}
            onChange={(event) => updateDigit(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            aria-label={`Chữ số thứ ${index + 1}`}
            aria-invalid={invalid}
            disabled={disabled}
          />
        )
      })}
    </div>
  )
}
