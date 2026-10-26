import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AtIcon as AtSignData, Camera01Icon as CameraData, CheckIcon as CheckData, CopyIcon as CopyData, Edit02Icon as PencilData, Logout02Icon as SignOutData, Mail01Icon as MailData, User02Icon as UserIconData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const AtSign = createIcon(AtSignData)
const Camera = createIcon(CameraData)
const Check = createIcon(CheckData)
const Copy = createIcon(CopyData)
const Pencil = createIcon(PencilData)
const SignOut = createIcon(SignOutData)
const Mail = createIcon(MailData)
const UserIcon = createIcon(UserIconData)
import { UserAvatar } from '@/components/common/UserAvatar'
import { useMe } from '@/features/auth/api'
import { useLogout } from '@/features/auth/hooks/useAuth'

type CopyField = 'username' | 'email'

export function ProfileSettings() {
  const { t } = useTranslation()
  const { data: user, isPending, refetch } = useMe()
  const logout = useLogout()
  const [copiedField, setCopiedField] = useState<CopyField | null>(null)

  const handleCopy = async (field: CopyField, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      window.setTimeout(() => setCopiedField((current) => (current === field ? null : current)), 1500)
    } catch {
      setCopiedField(null)
    }
  }

  if (isPending) {
    return (
      <div className="flex justify-center py-10 text-sm text-muted-foreground" aria-busy="true">
        {t('common.loading')}
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm font-semibold text-foreground">{t('common.errorTitle')}</p>
        <p className="text-sm text-muted-foreground">{t('common.errorMessage')}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
        >
          {t('common.retry')}
        </button>
      </div>
    )
  }

  const userName = user.fullName?.trim() || user.username
  const copied = (field: CopyField) => copiedField === field ? t('chat.copied') : null

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      <h2 className="text-center text-base font-bold text-foreground">
        {t('chat.profile')}
      </h2>

      <div className="flex flex-col items-center">
        <UserAvatar
          name={userName}
          src={user.avatarUrl}
          className="size-24 ring-4 ring-card shadow-lg sm:size-28"
          fallbackClassName="text-3xl font-bold text-foreground"
        />
        <button
          type="button"
          disabled
          title={t('chat.profileEditUnavailable')}
          className="mt-3.5 inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-foreground opacity-60 shadow-sm"
        >
          <Camera className="size-3.5 text-brand-ink" aria-hidden="true" />
          <span>{t('chat.editPhoto')}</span>
        </button>
      </div>

      <div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3.5 px-4 py-3.5">
            <UserIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <span className="block text-xs font-medium text-muted-foreground">{t('chat.nameLabel')}</span>
              <span className="block truncate text-sm font-semibold text-foreground">{userName}</span>
            </div>
          </div>

          <div className="mx-4 border-t border-border" aria-hidden="true" />

          <div className="flex items-center gap-3.5 px-4 py-3.5">
            <Pencil className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <span className="block text-xs font-medium text-muted-foreground">{t('chat.aboutLabel')}</span>
              <span className={user.bio ? 'block truncate text-sm text-foreground' : 'block truncate text-sm text-muted-foreground'}>
                {user.bio || t('chat.aboutDefault')}
              </span>
            </div>
          </div>
        </div>

        <p className="mt-2 px-3 text-xs text-muted-foreground">
          {t('chat.profileEditUnavailable')}
        </p>
      </div>

      <div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="flex min-w-0 items-center gap-3.5">
              <AtSign className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0">
                <span className="block text-xs font-medium text-muted-foreground">{t('chat.usernameLabel')}</span>
                <span className="block truncate text-sm font-semibold text-foreground">@{user.username}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleCopy('username', user.username)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-muted/60 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
            >
              {copiedField === 'username' ? <Check className="size-3.5 text-emerald-500" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
              <span>{copied('username') ?? t('chat.copyUsername')}</span>
            </button>
          </div>

          <div className="mx-4 border-t border-border" aria-hidden="true" />

          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="flex min-w-0 items-center gap-3.5">
              <Mail className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0">
                <span className="block text-xs font-medium text-muted-foreground">{t('chat.emailLabel')}</span>
                <span className="block truncate text-sm font-semibold text-foreground">{user.email}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleCopy('email', user.email)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-muted/60 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
            >
              {copiedField === 'email' ? <Check className="size-3.5 text-emerald-500" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
              <span>{copied('email') ?? t('chat.copyEmail')}</span>
            </button>
          </div>
        </div>

        <p className="mt-2 px-3 text-xs text-muted-foreground">
          {t('chat.usernameSubtitle')}
        </p>
        <p className="mt-1 px-3 text-xs text-muted-foreground">
          {t('chat.emailSubtitle')}
        </p>
      </div>

      {/* Đăng xuất — nút logout chính của mobile */}
      <button
        type="button"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        className="flex w-full items-center gap-3.5 rounded-2xl border border-border bg-card p-4 text-destructive shadow-sm transition-all duration-150 hover:bg-destructive/10 disabled:opacity-40"
      >
        <SignOut className="size-5 shrink-0" aria-hidden="true" />
        <span className="text-sm font-semibold">{t('chat.signOut')}</span>
      </button>
    </div>
  )
}
