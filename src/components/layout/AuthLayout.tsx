import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { BrandMark } from '@/components/common/BrandMark'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { APP_NAME, ROUTES } from '@/config/constants'

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  const { t } = useTranslation()

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="absolute top-4 right-4 z-50 flex items-center gap-1">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div
        aria-hidden="true"
        className="absolute -top-24 left-1/2 size-112 -translate-x-1/2 rounded-full bg-green-100/60 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-32 -right-24 size-96 rounded-full bg-green-50 blur-3xl animate-float-slow"
      />

      <div className="relative flex w-full max-w-md flex-col items-center">
        {/* Logo — click về trang đăng nhập */}
        <Link
          to={ROUTES.login}
          className="relative mb-6 flex items-center justify-center"
          aria-label={t('layout.backToLogin')}
        >
          <span
            aria-hidden="true"
            className="absolute size-24 rounded-full bg-green-200/50 animate-pulse-ring"
          />
          <span
            aria-hidden="true"
            className="absolute size-24 rounded-full bg-green-200/40 animate-pulse-ring"
            style={{ animationDelay: '1.4s' }}
          />
          <div className="animate-pop-in">
            <div className="animate-float-y">
              <BrandMark className="size-20 sm:size-24" />
            </div>
          </div>
        </Link>

        <h1
          className="text-center text-title font-heading text-foreground animate-fade-in-up"
          style={{ animationDelay: '150ms' }}
        >
          {title}
        </h1>
        <p
          className="mt-3 text-center text-sm text-muted-foreground animate-fade-in-up"
          style={{ animationDelay: '260ms' }}
        >
          {subtitle}
        </p>

        <div className="mt-8 w-full animate-fade-in-up" style={{ animationDelay: '360ms' }}>
          {children}
        </div>

        <p
          className="mt-8 text-center text-xs text-balance text-muted-foreground animate-fade-in"
          style={{ animationDelay: '520ms' }}
        >
          {t('layout.footer', { appName: APP_NAME, tagline: t('layout.brandTagline') })}
        </p>
      </div>
    </main>
  )
}
