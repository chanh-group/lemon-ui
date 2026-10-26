import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { EyeIcon as EyeData, EyeOffIcon as EyeOffData, LoaderCircleIcon as LoaderData, LockPasswordIcon as LockData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const Eye = createIcon(EyeData)
const EyeOff = createIcon(EyeOffData)
const Loader = createIcon(LoaderData)
const Lock = createIcon(LockData)
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
import { changePasswordSchema, type ChangePasswordInput } from '@/domain/auth'
import { useChangePassword } from '@/features/auth/hooks/useAuth'

function PasswordVisibilityButton({
  visible,
  onClick,
}: {
  visible: boolean
  onClick: () => void
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')}
      aria-pressed={visible}
      className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
    >
      {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
    </button>
  )
}

export function ChangePasswordSettings() {
  const { t } = useTranslation()
  const changePassword = useChangePassword()
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  const submit = (values: ChangePasswordInput) => {
    changePassword.mutate(
      { oldPassword: values.oldPassword, newPassword: values.newPassword },
      {
        onSuccess: () => form.reset(),
      },
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <h2 className="text-center text-base font-bold text-foreground">
        {t('chat.changePasswordTitle')}
      </h2>

      <div className="overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-brand-ink">
            <Lock className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">{t('chat.changePasswordTitle')}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t('chat.changePasswordSubtitle')}</p>
          </div>
        </div>

        <Form {...form}>
          <form noValidate onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-3">
            <FormField
              control={form.control}
              name="oldPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('chat.currentPassword')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showOld ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder={t('chat.currentPassword')}
                        className="pr-12"
                        aria-invalid={!!form.formState.errors.oldPassword}
                        {...field}
                      />
                      <PasswordVisibilityButton visible={showOld} onClick={() => setShowOld((v) => !v)} />
                    </div>
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
                  <FormLabel>{t('chat.newPassword')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showNew ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder={t('auth.passwordHint')}
                        className="pr-12"
                        aria-invalid={!!form.formState.errors.newPassword}
                        {...field}
                      />
                      <PasswordVisibilityButton visible={showNew} onClick={() => setShowNew((v) => !v)} />
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
                  <FormLabel>{t('chat.confirmNewPassword')}</FormLabel>
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
                      <PasswordVisibilityButton visible={showConfirm} onClick={() => setShowConfirm((v) => !v)} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" size="lg" className="mt-1 w-full" disabled={changePassword.isPending}>
              {changePassword.isPending ? (
                <>
                  <Loader className="size-4 animate-spin" aria-hidden="true" />
                  {t('chat.changePasswordPending')}
                </>
              ) : (
                t('chat.changePasswordAction')
              )}
            </Button>
          </form>
        </Form>

        <p className="mt-3 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          {t('chat.changePasswordNotice')}
        </p>
      </div>
    </div>
  )
}
