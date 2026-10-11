import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { EyeIcon, EyeOffIcon, Loader2Icon } from 'lucide-react'
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
import { signupInfoSchema, type SignupInfoInput } from '@/features/auth/schemas/auth.schema'

type InfoStepProps = {
  isPending: boolean
  attemptsLeft: number
  onSubmit: (values: SignupInfoInput) => void
}

export function InfoStep({ isPending, attemptsLeft, onSubmit }: InfoStepProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const form = useForm<SignupInfoInput>({
    resolver: zodResolver(signupInfoSchema),
    defaultValues: { fullName: '', password: '', confirmPassword: '' },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full flex-col gap-3"
      >
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Họ và tên</FormLabel>
              <FormControl>
                <Input
                  autoComplete="name"
                  placeholder="Nhập họ và tên"
                  aria-invalid={!!form.formState.errors.fullName}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mật khẩu</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Tối thiểu 8 ký tự"
                    className="pr-12"
                    aria-invalid={!!form.formState.errors.password}
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOffIcon className="size-4" aria-hidden="true" />
                    ) : (
                      <EyeIcon className="size-4" aria-hidden="true" />
                    )}
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
              <FormLabel>Xác nhận mật khẩu</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Nhập lại mật khẩu"
                    className="pr-12"
                    aria-invalid={!!form.formState.errors.confirmPassword}
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((prev) => !prev)}
                    aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    aria-pressed={showConfirm}
                    className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showConfirm ? (
                      <EyeOffIcon className="size-4" aria-hidden="true" />
                    ) : (
                      <EyeIcon className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {attemptsLeft <= 3 && attemptsLeft > 0 && (
          <p role="status" className="text-sm font-medium text-destructive">
            Còn {attemptsLeft} lượt thử OTP
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
              Đang tạo tài khoản...
            </>
          ) : (
            'Tạo tài khoản'
          )}
        </Button>
      </form>
    </Form>
  )
}
