import { Aperture, LogOut, MessageCircle, Phone, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { BrandMark } from '@/components/common/BrandMark'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { ChatTab } from '../types'

interface SideNavProps {
  active: ChatTab
  onChange: (tab: ChatTab) => void
  totalUnread: number
  userName: string
  userInitials: string
  onLogout: () => void
}

const TABS: Array<{ id: ChatTab; labelKey: string; icon: typeof MessageCircle; badge?: boolean }> = [
  { id: 'messages', labelKey: 'chat.messages', icon: MessageCircle, badge: true },
  { id: 'calls', labelKey: 'chat.calls', icon: Phone },
  { id: 'stories', labelKey: 'chat.stories', icon: Aperture },
]

export function SideNav({ active, onChange, totalUnread, userName, userInitials, onLogout }: SideNavProps) {
  const { t } = useTranslation()

  return (
    <TooltipProvider delayDuration={80}>
      <nav
        aria-label={t('chat.mainNav')}
        className="chat-sidenav flex w-16 shrink-0 flex-col items-center gap-1 border-r border-border bg-card py-3 sm:w-[72px]"
      >
        {/* Logo LemonChat — tái sử dụng BrandMark hiện có */}
        <div className="mb-2 flex flex-col items-center gap-1">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary shadow-sm">
            <BrandMark animated={false} className="size-7" />
          </span>
          <span className="text-[10px] font-bold tracking-tight text-[var(--brand-ink)]">Lemon</span>
        </div>

        <div className="flex flex-col items-center gap-1.5" aria-label={t('chat.tabsLabel')}>
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = active === tab.id
            const label = t(tab.labelKey)
            return (
              <Tooltip key={tab.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={tab.badge && totalUnread > 0 ? `${label}, ${t('chat.unreadCount', { count: totalUnread })}` : label}
                    onClick={() => onChange(tab.id)}
                    className={cn(
                      'chat-nav-btn relative grid size-11 min-h-11 min-w-11 place-items-center rounded-2xl transition-all duration-150',
                      isActive
                        ? 'bg-secondary text-secondary-foreground shadow-[inset_0_0_0_1px_var(--ring)]'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon className="size-5" strokeWidth={isActive ? 2.4 : 2} aria-hidden="true" />
                    {tab.badge && totalUnread > 0 && (
                      <span
                        aria-hidden="true"
                        className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-[var(--brand-ink)] px-1 text-[10px] leading-5 font-bold text-primary-foreground"
                      >
                        {totalUnread > 9 ? '9+' : totalUnread}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  {label}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>

        <div className="mt-auto flex flex-col items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={t('chat.settings')}
                className="grid size-11 min-h-11 min-w-11 place-items-center rounded-xl text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
              >
                <Settings className="size-5" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              {t('chat.settings')}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={t('chat.logout')}
                onClick={onLogout}
                className="grid size-11 min-h-11 min-w-11 place-items-center rounded-xl text-muted-foreground transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="size-5" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              {t('chat.logout')}
            </TooltipContent>
          </Tooltip>

          <span className="relative mt-1" title={userName}>
            <span className="grid size-10 place-items-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground ring-1 ring-border">
              {userInitials}
            </span>
            <span className="absolute right-0 bottom-0 size-2.5 rounded-full bg-[var(--success)] ring-2 ring-card" aria-hidden="true" />
          </span>
        </div>
      </nav>
    </TooltipProvider>
  )
}

