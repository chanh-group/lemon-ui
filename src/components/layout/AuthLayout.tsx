import type { ReactNode } from 'react'
import { BrandMark } from '@/components/common/BrandMark'
import { APP_NAME } from '@/config/constants'

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
}

/**
 * Layout centered kiểu Apple: logo bong bóng chat trên cùng,
 * tiêu đề lớn, form gọn ở giữa — nền trắng thoáng, animation nhẹ.
 */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* Nền chuyển sắc rất nhẹ — không chiếm sự chú ý */}
      <div
        aria-hidden="true"
        className="absolute -top-24 left-1/2 size-112 -translate-x-1/2 rounded-full bg-lemon-100/60 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-32 -right-24 size-96 rounded-full bg-lemon-50 blur-3xl animate-float-slow"
      />

      <div className="relative flex w-full max-w-md flex-col items-center">
        {/* Logo bong bóng chat */}
        <div className="relative mb-6 flex items-center justify-center">
          <span
            aria-hidden="true"
            className="absolute size-24 rounded-full bg-lemon-200/50 animate-pulse-ring"
          />
          <span
            aria-hidden="true"
            className="absolute size-24 rounded-full bg-lemon-200/40 animate-pulse-ring"
            style={{ animationDelay: '1.4s' }}
          />
          <div className="animate-pop-in">
            <div className="animate-float-y">
              <BrandMark className="size-20 sm:size-24" />
            </div>
          </div>
        </div>

        {/* Tiêu đề lớn + phụ đề */}
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

        {/* Form */}
        <div className="mt-8 w-full animate-fade-in-up" style={{ animationDelay: '360ms' }}>
          {children}
        </div>

        <p
          className="mt-8 text-center text-xs text-balance text-muted-foreground animate-fade-in"
          style={{ animationDelay: '520ms' }}
        >
          {APP_NAME} — Nhắn tin dễ dàng, trò chuyện vui vẻ mỗi ngày.
        </p>
      </div>
    </main>
  )
}
