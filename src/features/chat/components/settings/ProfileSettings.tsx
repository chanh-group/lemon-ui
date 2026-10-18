import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AtIcon as AtSignData, Camera01Icon as CameraData, CheckIcon as CheckData, CopyIcon as CopyData, User02Icon as UserIconData, Edit02Icon as PencilData, Logout02Icon as SignOutData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const AtSign = createIcon(AtSignData)
const Camera = createIcon(CameraData)
const Check = createIcon(CheckData)
const Copy = createIcon(CopyData)
const UserIcon = createIcon(UserIconData)
const Pencil = createIcon(PencilData)
const SignOut = createIcon(SignOutData)
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useLogout } from '@/features/auth/hooks/useAuth'
import { avatarColor, initials } from '../../data/mockData'

interface ProfileSettingsProps {
  userName: string
  userEmail: string
  displayName: string
  aboutText: string
  onNameChange: (v: string) => void
  onAboutChange: (v: string) => void
}

export function ProfileSettings({
  userName,
  userEmail,
  displayName,
  aboutText,
  onNameChange,
  onAboutChange,
}: ProfileSettingsProps) {
  const { t } = useTranslation()
  const logout = useLogout()
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingAbout, setIsEditingAbout] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(userEmail)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      <h2 className="text-center text-base font-bold text-foreground">
        {t('chat.profile')}
      </h2>

      <div className="flex flex-col items-center">
        <Avatar className="size-24 ring-4 ring-card shadow-lg sm:size-28">
          <AvatarFallback
            className="text-3xl font-bold text-foreground"
            style={{ backgroundColor: avatarColor(userName) }}
          >
            {initials(userName)}
          </AvatarFallback>
        </Avatar>
        <button
          type="button"
          className="mt-3.5 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
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
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => onNameChange(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1 text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-brand-ink"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    className="rounded-lg bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground"
                  >
                    {t('chat.save')}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{userName}</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    aria-label={t('chat.editFullName')}
                    className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mx-4 border-t border-border" aria-hidden="true" />

          <div className="flex items-center gap-3.5 px-4 py-3.5">
            <Pencil className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              {isEditingAbout ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={aboutText}
                    placeholder={t('chat.aboutPlaceholder')}
                    onChange={(e) => onAboutChange(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-ink"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setIsEditingAbout(false)}
                    className="rounded-lg bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground"
                  >
                    {t('chat.save')}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm text-muted-foreground">{aboutText || t('chat.aboutPlaceholder')}</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingAbout(true)}
                    aria-label={t('chat.editBio')}
                    className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="mt-2 px-3 text-xs text-muted-foreground">
          {t('chat.profileSubtitle')}
        </p>
      </div>

      <div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3.5">
              <AtSign className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0">
                <span className="block text-xs font-medium text-muted-foreground">{t('chat.emailLabel')}</span>
                <span className="block truncate text-sm font-semibold text-foreground">{userEmail}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-muted/60 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
            >
              {copied ? <Check className="size-3.5 text-emerald-500" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
              <span>{copied ? t('chat.copied') : t('chat.copyEmail')}</span>
            </button>
          </div>
        </div>

        <p className="mt-2 px-3 text-xs text-muted-foreground">
          {t('chat.usernameSubtitle')}
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
