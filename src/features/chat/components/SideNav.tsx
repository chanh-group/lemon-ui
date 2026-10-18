import { ApertureIcon as ApertureData, Menu02Icon as ListData, Logout02Icon as LogOutData, Message02Icon as MessageCircleData, CallIcon as PhoneData, Settings04Icon as SettingsData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const Aperture = createIcon(ApertureData)
const List = createIcon(ListData)
const LogOut = createIcon(LogOutData)
const MessageCircle = createIcon(MessageCircleData)
const Phone = createIcon(PhoneData)
const Settings = createIcon(SettingsData)
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ROUTES } from '@/config/constants'
import { useLogout } from '@/features/auth/hooks/useAuth'
import type { ChatTab } from '../types/chat.types'

interface SideNavProps {
  active?: ChatTab | null
  onChange?: (tab: ChatTab) => void
  totalUnread?: number
  onOpenSettings?: () => void
  settingsActive?: boolean
  sidebarOpen?: boolean
  onToggleSidebar?: () => void
  /** Mobile: chỉ hiện thanh tab ngang ở màn danh sách, ẩn khi đang xem hội thoại */
  mobileBarVisible?: boolean
}

const TABS: Array<{ id: ChatTab; labelKey: string; icon: typeof MessageCircle; badge?: boolean }> = [
  { id: 'messages', labelKey: 'chat.messages', icon: MessageCircle, badge: true },
  { id: 'calls', labelKey: 'chat.calls', icon: Phone },
  { id: 'stories', labelKey: 'chat.stories', icon: Aperture },
]

export function SideNav({ active, onChange, totalUnread = 0, onOpenSettings, settingsActive, sidebarOpen = true, onToggleSidebar, mobileBarVisible = true }: SideNavProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const logout = useLogout()

  const handleTabClick = (tabId: ChatTab) => {
    if (onChange) {
      onChange(tabId)
    } else {
      navigate(ROUTES.messages, { state: { tab: tabId } })
    }
  }

  const handleSettingsClick = () => {
    if (onOpenSettings) {
      onOpenSettings()
    } else {
      navigate(ROUTES.settings)
    }
  }

  const inactiveTabCls = 'text-muted-foreground hover:bg-muted hover:text-foreground'
  const activeTabCls = 'bg-secondary text-secondary-foreground ring-1 ring-ring'

  const renderTabs = (options: { withTooltip: boolean }) =>
    TABS.map((tab) => {
      const Icon = tab.icon
      const isActive = !settingsActive && active === tab.id
      const label = t(tab.labelKey)
      const badge = tab.badge && totalUnread > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] leading-4.5 font-bold text-primary-foreground ring-2 ring-card"
        >
          {totalUnread > 9 ? '9+' : totalUnread}
        </span>
      )
      const button = (
        <button
          type="button"
          aria-current={isActive ? 'page' : undefined}
          aria-label={tab.badge && totalUnread > 0 ? `${label}, ${t('chat.unreadCount', { count: totalUnread })}` : label}
          onClick={() => handleTabClick(tab.id)}
          className={cn(
            'chat-nav-btn relative grid size-11 min-h-11 min-w-11 place-items-center rounded-2xl transition-all duration-150',
            isActive ? activeTabCls : inactiveTabCls,
          )}
        >
          <Icon className="size-6" strokeWidth={isActive ? 2.4 : 2} aria-hidden="true" />
          {badge}
        </button>
      )
      if (!options.withTooltip) {
        return (
          <span key={tab.id}>{button}</span>
        )
      }
      return (
        <Tooltip key={tab.id}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            {label}
          </TooltipContent>
        </Tooltip>
      )
    })

  const renderSettings = (options: { withTooltip: boolean }) => {
    const label = t('chat.settings')
    const button = (
      <button
        type="button"
        onClick={handleSettingsClick}
        aria-label={label}
        aria-current={settingsActive ? 'page' : undefined}
        className={cn(
          'grid size-11 min-h-11 min-w-11 place-items-center rounded-2xl transition-all duration-150',
          settingsActive ? 'bg-secondary text-secondary-foreground ring-1.5 ring-ring' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        <Settings className="size-6" aria-hidden="true" />
      </button>
    )
    if (!options.withTooltip) {
      return button
    }
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          {label}
        </TooltipContent>
      </Tooltip>
    )
  }

  const renderLogout = (options: { withTooltip: boolean }) => {
    const label = t('chat.signOut')
    const button = (
      <button
        type="button"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        aria-label={label}
        className="grid size-11 min-h-11 min-w-11 place-items-center rounded-2xl text-muted-foreground transition-all duration-150 hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
      >
        <LogOut className="size-6" aria-hidden="true" />
      </button>
    )
    if (!options.withTooltip) {
      return button
    }
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          {label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <TooltipProvider delayDuration={80}>
      {/* Mobile: thanh tab ngang cố định dưới đáy — không có nút ẩn/hiện panel */}
      <nav
        aria-label={t('chat.mainNav')}
        className={cn(
          'chat-sidenav-mob fixed bottom-0 left-0 right-0 z-40 grid h-16 grid-cols-4 place-items-center border-t border-border bg-card px-3 pb-[env(safe-area-inset-bottom)] md:hidden',
          !mobileBarVisible && 'hidden',
        )}
      >
        {renderTabs({ withTooltip: false })}
        {renderSettings({ withTooltip: false })}
      </nav>

      {/* Desktop: rail dọc như cũ, có nút ẩn/hiện panel danh sách */}
      <nav
        aria-label={t('chat.mainNav')}
        className="chat-sidenav hidden w-16 shrink-0 flex-col items-center gap-1 border-r border-border bg-card py-3 sm:w-18 md:flex"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-expanded={sidebarOpen}
              aria-label={t('chat.toggleSidebar')}
              className="grid size-10 min-h-10 min-w-10 place-items-center rounded-2xl text-brand-ink transition-all duration-150 hover:bg-muted hover:scale-105 active:scale-95"
            >
              <List className="size-6" aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            {t('chat.toggleSidebar')}
          </TooltipContent>
        </Tooltip>

        <div className="flex flex-col items-center gap-1.5" aria-label={t('chat.tabsLabel')}>
          {renderTabs({ withTooltip: true })}
        </div>

        <div className="mt-auto flex flex-col items-center gap-2">
          {renderLogout({ withTooltip: true })}
          {renderSettings({ withTooltip: true })}
        </div>
      </nav>
    </TooltipProvider>
  )
}
