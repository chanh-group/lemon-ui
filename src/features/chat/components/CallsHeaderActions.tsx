import { CallAddIcon as PhoneCallData, Delete02Icon as DeleteData, MoreHorizontalIcon as DotsThreeData } from '@hugeicons/core-free-icons'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { createIcon } from '@/components/icons/hugeIcon'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const PhoneCall = createIcon(PhoneCallData)
const Delete = createIcon(DeleteData)
const DotsThree = createIcon(DotsThreeData)

export function CallsHeaderActions({ onNewCall }: { onNewCall: () => void }) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        aria-label={t('chat.newCall')}
        title={t('chat.newCall')}
        onClick={onNewCall}
        className="grid size-10 place-items-center rounded-xl text-brand-ink transition-colors hover:bg-muted"
      >
        <PhoneCall className="size-5" aria-hidden="true" />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t('chat.moreOptions')}
            title={t('chat.moreOptions')}
            className="grid size-10 place-items-center rounded-xl text-brand-ink transition-colors hover:bg-muted"
          >
            <DotsThree className="size-5" strokeWidth={2.5} aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuItem variant="destructive" onClick={() => toast.info(t('chat.clearCallHistoryUnavailable'))}>
            <Delete />
            {t('chat.clearCallHistory')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
