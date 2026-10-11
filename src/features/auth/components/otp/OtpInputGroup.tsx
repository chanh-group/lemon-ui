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
      className="flex gap-3"
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
            className={`h-12 w-full rounded-md border bg-card text-center font-mono text-xl text-card-foreground outline-none transition-colors duration-150 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 sm:h-14 ${
              invalid ? 'border-destructive' : 'border-border'
            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
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
