import { CircleCheckIcon as CheckCircleIconData, LockIcon as LockIconData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const CheckCircleIcon = createIcon(CheckCircleIconData)
const LockIcon = createIcon(LockIconData)

type VerificationMessageProps = {
  tone: 'info' | 'error' | 'success'
  children: string
}

export function VerificationMessage({ tone, children }: VerificationMessageProps) {
  const Icon = tone === 'success' ? CheckCircleIcon : LockIcon
  return (
    <div
      className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
        tone === 'error'
          ? 'bg-destructive/10 text-destructive'
          : tone === 'success'
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-muted text-muted-foreground'
      }`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}
