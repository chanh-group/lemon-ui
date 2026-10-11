import { useEffect, useRef, type ClipboardEvent } from 'react'

const OTP_LENGTH = 6

type OtpInputGroupProps = {
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  disabled?: boolean
}

export default function OtpInputGroup({
  value,
  onChange,
  invalid = false,
  disabled = false,
}: OtpInputGroupProps) {
  const inputs = useRef<HTMLInputElement[]>([])

  useEffect(() => {
    if (!disabled && inputs.current[Math.min(value.length, OTP_LENGTH - 1)]) {
      inputs.current[Math.min(value.length, OTP_LENGTH - 1)].focus()
    }
  }, [disabled, value.length])

  const updateDigit = (index: number, rawValue: string) => {
    const digit = rawValue.replace(/\D/g, '').slice(-1)
    const next = value.padEnd(OTP_LENGTH, ' ').split('')
    next[index] = digit || ' '
    const normalized = next.join('').trimEnd()
    onChange(normalized)
    if (digit && index < OTP_LENGTH - 1 && inputs.current[index + 1]) {
      inputs.current[index + 1].focus()
    }
  }

  const handleKeyDown = (
    event: KeyboardEvent,
    index: number,
  ) => {
    if (event.key === 'Backspace' && !value[index] && index > 0) {
      if (inputs.current[index - 1]) inputs.current[index - 1].focus()
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      if (inputs.current[index - 1]) inputs.current[index - 1].focus()
    }
    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      if (inputs.current[index + 1]) inputs.current[index + 1].focus()
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const clipboardData = event.clipboardData
    if (!clipboardData) return
    const code = clipboardData.getData('text')
      .replace(/\D/g, '')
      .slice(0, OTP_LENGTH)
    if (!code) return
    event.preventDefault()
    onChange(code)
    if (inputs.current[Math.min(code.length, OTP_LENGTH - 1)]) {
      inputs.current[Math.min(code.length, OTP_LENGTH - 1)].focus()
    }
  }

  return (
    <div
      className={`otp-input-group ${invalid ? 'is-invalid' : ''}`}
      onPaste={(event) => {
        // Type assertion to satisfy ClipboardEventHandler<HTMLDivElement>
        handlePaste(event)
      }}
      role="group"
      aria-label="Mã xác minh gồm 6 chữ số"
    >
      {Array.from({ length: OTP_LENGTH }, (_, index) => {
        const digit = value[index] ?? ''
        return (
          <input
            key={index}
            ref={(element) => {
              inputs.current[index] = element!
            }}
            className={`otp-input ${digit ? 'is-filled' : ''}`}
            value={digit}
            onChange={(event) => updateDigit(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(event as unknown as KeyboardEvent, index)}
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