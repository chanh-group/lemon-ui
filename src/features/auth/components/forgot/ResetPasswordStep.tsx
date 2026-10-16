import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { EyeIcon, EyeOffIcon, Loader2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { OtpInputGroup } from '@/features/auth/components/otp'
import { resetPasswordSchema, type ResetPasswordInput } from '@/features/auth/schemas/auth.schema'

type ResetPasswordStepProps = {
  email: string
  isPending: boolean
  onSubmit: (values: ResetPasswordInput) => void
  onBack: () => void
}

export function ResetPasswordStep({ email, isPending, onSubmit, onBack }: ResetPasswordStepProps) {
  const { t } = useTranslation()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [otpDigits, setOtpDigits] = useState<string[]>(() => Array.from({ length: 6 }, () => ''))

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { otp: '', newPassword: '', confirmPassword: '' },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  const otpError = form.formState.errors.otp

  const handleOtpChange = (digits: string[]) => {
    setOtpDigits(digits)
    form.setValue('otp', digits.join(''), { shouldValidate: true })
    if (form.formState.errors.otp) form.clearErrors('otp')
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full flex-col gap-3"
      >
        <p className="text-sm text-muted-foreground">
          {t('auth.otpSentTo', { email })}{' '}
          <button
            type="button"
            onClick={onBack}
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
                      disabled={isPending}
                    />
                  )}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('auth.newPassword')}</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder={t('auth.passwordHint')}
                    className="pr-12"
                    aria-invalid={!!form.formState.errors.newPassword}
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('auth.confirmPassword')}</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder={t('auth.confirmNewPasswordPlaceholder')}
                    className="pr-12"
                    aria-invalid={!!form.formState.errors.confirmPassword}
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((p) => !p)}
                    aria-label={showConfirm ? t('auth.hidePassword') : t('auth.showPassword')}
                    aria-pressed={showConfirm}
                    className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showConfirm ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
              {t('auth.resettingPassword')}
            </>
          ) : (
            t('auth.resetPassword')
          )}
        </Button>
      </form>
    </Form>
  )
}
