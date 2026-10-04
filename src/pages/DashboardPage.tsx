import { useLogout } from '@/features/auth/hooks/useAuth'
import { useAuth } from '@/app/providers/AuthProvider'
import { LogOutIcon, MessageCircleIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'

export function DashboardPage() {
  const { user } = useAuth()
  const logout = useLogout()

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-between gap-3 border border-border border-x-0 border-t-0 bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-md bg-secondary text-secondary-foreground"
          >
            <MessageCircleIcon className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight text-foreground">
              {user?.fullName ?? 'Khách'}
            </p>
            <p className="text-xs text-muted-foreground">{user?.email ?? ''}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          <LogOutIcon className="size-4" aria-hidden="true" />
          Đăng xuất
        </Button>
      </header>

      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-md">
          <EmptyState
            title="Hộp thư đang trống"
            message="Bắt đầu cuộc trò chuyện đầu tiên của bạn trên LemonChat."
          />
        </div>
      </div>
    </main>
  )
}
