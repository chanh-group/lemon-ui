import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { EyeIcon, EyeOffIcon, Loader2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ROUTES } from '@/config/constants'
import { loginSchema, type LoginInput } from '@/features/auth/schemas/auth.schema'
import { useLogin } from '@/features/auth/hooks/useAuth'
import { GoogleButton } from './GoogleButton'

export function LoginForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const login = useLogin()

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => login.mutate(values))}
        className="flex w-full flex-col gap-3"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">{t('auth.email')}</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" inputMode="email" placeholder={t('auth.email')} aria-invalid={!!form.formState.errors.email} {...field} />
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
              <FormLabel className="sr-only">{t('auth.password')}</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder={t('auth.password')} className="pr-12" aria-invalid={!!form.formState.errors.password} {...field} />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
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

        <Button type="submit" size="lg" className="w-full cursor-pointer" disabled={login.isPending}>
          {login.isPending ? (
            <>
              <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
              {t('auth.loggingIn')}
            </>
          ) : (
            t('auth.continue')
          )}
        </Button>

        <GoogleButton />

        <div className="mt-2 flex items-center justify-between gap-2 text-sm">
          <button
            type="button"
            onClick={() => navigate(ROUTES.forgotPassword)}
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {t('auth.forgotPassword')}
          </button>
          <p className="text-muted-foreground">
            {t('auth.noAccount')}{' '}
            <Link to={ROUTES.register} className="font-semibold text-brand-ink underline-offset-4 hover:underline">
              {t('auth.register')}
            </Link>
          </p>
        </div>
      </form>
    </Form>
  )
}
