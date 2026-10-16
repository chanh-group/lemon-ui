import { Aperture, LogOut, MessageCircle, Phone, Settings } from 'lucide-react'
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

const TABS: Array<{ id: ChatTab; label: string; icon: typeof MessageCircle; badge?: boolean }> = [
  { id: 'messages', label: 'Tin nhắn', icon: MessageCircle, badge: true },
  { id: 'calls', label: 'Gọi điện', icon: Phone },
  { id: 'stories', label: 'Story', icon: Aperture },
]

export function SideNav({ active, onChange, totalUnread, userName, userInitials, onLogout }: SideNavProps) {
  return (
    <TooltipProvider delayDuration={80}>
      <nav
        aria-label="Điều hướng chính"
        className="chat-sidenav flex w-16 shrink-0 flex-col items-center gap-1 border-r border-[#E7EBDD] bg-white py-3 sm:w-[72px]"
      >
        {/* Logo LemonChat — tái sử dụng BrandMark hiện có */}
        <div className="mb-2 flex flex-col items-center gap-1">
          <span className="grid size-10 place-items-center rounded-2xl bg-[#F5E85B] shadow-[0_2px_8px_rgba(61,122,54,0.18)]">
            <BrandMark animated={false} className="size-7" />
          </span>
          <span className="text-[10px] font-bold tracking-tight text-[#3D7A36]">Lemon</span>
        </div>

        <div className="flex flex-col items-center gap-1.5" role="tablist" aria-label="Tin nhắn, gọi điện, story">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = active === tab.id
            return (
              <Tooltip key={tab.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={tab.label}
                    onClick={() => onChange(tab.id)}
                    className={cn(
                      'chat-nav-btn relative grid size-11 place-items-center rounded-2xl transition-all duration-150',
                      isActive
                        ? 'bg-[#DDF4A7] text-[#3D7A36] shadow-[inset_0_0_0_1px_rgba(61,122,54,0.18)]'
                        : 'text-[#788074] hover:bg-[#F2F5E6] hover:text-[#20271F]',
                    )}
                  >
                    <Icon className="size-5" strokeWidth={isActive ? 2.4 : 2} aria-hidden="true" />
                    {tab.badge && totalUnread > 0 && (
                      <span
                        className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-[#3D7A36] px-1 text-[10px] leading-5 font-bold text-white"
                        aria-label={`${totalUnread} tin chưa đọc`}
                      >
                        {totalUnread > 9 ? '9+' : totalUnread}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  {tab.label}
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
                aria-label="Cài đặt"
                className="grid size-10 place-items-center rounded-xl text-[#788074] transition-colors duration-150 hover:bg-[#F2F5E6] hover:text-[#20271F]"
              >
                <Settings className="size-5" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              Cài đặt
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Đăng xuất"
                onClick={onLogout}
                className="grid size-10 place-items-center rounded-xl text-[#788074] transition-colors duration-150 hover:bg-[#FDECEC] hover:text-[#B3261E]"
              >
                <LogOut className="size-5" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              Đăng xuất
            </TooltipContent>
          </Tooltip>

          <span className="relative mt-1" title={userName}>
            <span className="grid size-10 place-items-center rounded-full bg-[#DDF4A7] text-sm font-bold text-[#3D7A36] ring-1 ring-[#E7EBDD]">
              {userInitials}
            </span>
            <span className="absolute right-0 bottom-0 size-2.5 rounded-full bg-[#3D7A36] ring-2 ring-white" aria-hidden="true" />
          </span>
        </div>
      </nav>
    </TooltipProvider>
  )
}
