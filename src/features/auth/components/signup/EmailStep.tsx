import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2Icon } from 'lucide-react'
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
import { requestOtpSchema, type RequestOtpInput } from '@/features/auth/schemas/auth.schema'

type EmailStepProps = {
  defaultEmail?: string
  isPending: boolean
  onSubmit: (email: string) => void
}

export function EmailStep({ defaultEmail = '', isPending, onSubmit }: EmailStepProps) {
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
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="Nhập email của bạn"
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
              Đang gửi mã...
            </>
          ) : (
            'Gửi mã xác minh'
          )}
        </Button>
      </form>
    </Form>
  )
}
