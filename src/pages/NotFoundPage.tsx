import { Link } from 'react-router-dom'
import { CitrusIcon, SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/config/constants'

export function NotFoundPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <span
        aria-hidden="true"
        className="flex size-12 items-center justify-center rounded-md bg-secondary text-secondary-foreground"
      >
        <SearchIcon className="size-6" />
      </span>
      <div>
        <p className="text-display font-heading text-foreground">404</p>
        <h1 className="mt-2 text-title font-heading text-foreground">
          Không tìm thấy trang
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.
        </p>
      </div>
      <Button asChild size="lg" className="cursor-pointer">
        <Link to={ROUTES.login}>
          <CitrusIcon className="size-4" aria-hidden="true" />
          Về trang đăng nhập
        </Link>
      </Button>
    </main>
  )
}
