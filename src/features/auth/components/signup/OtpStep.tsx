import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircleIcon as Loader2IconData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const Loader2Icon = createIcon(Loader2IconData)
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { OtpInputGroup } from '@/features/auth/components/otp'
import { verifyOtpSchema, type VerifyOtpInput } from '@/features/auth/schemas/auth.schema'
import { formatCountdown } from '@/features/auth/hooks/useOtpCountdown'

type OtpStepProps = {
  email: string
  attemptsLeft: number
  validitySecondsLeft: number
  resendSecondsLeft: number
  canResend: boolean
  isVerifying: boolean
  isResending: boolean
  onVerify: (otp: string) => void
  onResend: () => void
  onChangeEmail: () => void
}

export function OtpStep({
  email,
  attemptsLeft,
  validitySecondsLeft,
  resendSecondsLeft,
  canResend,
  isVerifying,
  isResending,
  onVerify,
  onResend,
  onChangeEmail,
}: OtpStepProps) {
  const { t } = useTranslation()
  const [otpDigits, setOtpDigits] = useState<string[]>(() => Array.from({ length: 6 }, () => ''))

  const form = useForm<VerifyOtpInput>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { email, otp: '', purpose: 'signup' },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  const otpError = form.formState.errors.otp

  const handleOtpChange = (digits: string[]) => {
    setOtpDigits(digits)
    form.setValue('otp', digits.join(''), { shouldValidate: true })
    if (form.formState.errors.otp) {
      form.clearErrors('otp')
    }
  }

  const handleSubmit = () => {
    const otp = otpDigits.join('')
    if (otp.length !== 6) {
      form.setError('otp', { message: t('auth.errorOtpLength') })
      return
    }
    onVerify(otp)
  }

  return (
    <Form {...form}>
      <form noValidate onSubmit={(e) => { e.preventDefault(); handleSubmit() }} className="flex w-full flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          {t('auth.otpSentTo', { email })}{' '}
          <button
            type="button"
            onClick={onChangeEmail}
            className="cursor-pointer text-primary underline-offset-4 hover:underline"
          >
            {t('auth.changeEmail')}
          </button>
        </p>

        <FormField
          control={form.control}
          name="otp"
          render={() => (
            <FormItem>
              <FormLabel>{t('auth.enterOtp')}</FormLabel>
              <FormControl>
                <Controller
                  control={form.control}
                  name="otp"
                  render={({ field }) => (
                    <OtpInputGroup
                      value={otpDigits}
                      onChange={(digits) => {
                        field.onChange(digits.join(''))
                        handleOtpChange(digits)
                      }}
                      invalid={!!otpError}
                      disabled={isVerifying}
                    />
                  )}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {validitySecondsLeft > 0 && (
          <p className="text-sm tabular-nums text-muted-foreground">
            {t('auth.otpValidFor', { time: formatCountdown(validitySecondsLeft) })}
          </p>
        )}

        {attemptsLeft <= 3 && attemptsLeft > 0 && (
          <p role="status" className="text-sm font-medium text-destructive">
            {t('auth.attemptsLeft', { count: attemptsLeft })}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={isVerifying}>
          {isVerifying ? (
            <>
              <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
              {t('auth.verifying')}
            </>
          ) : (
            t('auth.verifyOtp')
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={!canResend || isResending}
          onClick={onResend}
        >
          {canResend ? t('auth.resendOtp') : t('auth.resendIn', { time: formatCountdown(resendSecondsLeft) })}
        </Button>
      </form>
    </Form>
  )
}
