import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircleIcon as Loader2IconData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const Loader2Icon = createIcon(Loader2IconData)
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
import { requestOtpSchema, type RequestOtpInput } from '@/domain/auth'

type EmailStepProps = {
  defaultEmail?: string
  isPending: boolean
  onSubmit: (email: string) => void
}

export function EmailStep({ defaultEmail = '', isPending, onSubmit }: EmailStepProps) {
  const { t } = useTranslation()
  const form = useForm<RequestOtpInput>({
    resolver: zodResolver(requestOtpSchema),
    defaultValues: { email: defaultEmail },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => onSubmit(values.email))}
        className="flex w-full flex-col gap-3"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('auth.email')}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder={t('auth.emailPlaceholder')}
                  aria-invalid={!!form.formState.errors.email}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
              {t('auth.sendingOtp')}
            </>
          ) : (
            t('auth.sendOtp')
          )}
        </Button>
      </form>
    </Form>
  )
}
