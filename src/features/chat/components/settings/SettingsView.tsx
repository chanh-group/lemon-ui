import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft01Icon as ArrowLeftData, BellIcon as BellData, PaletteIcon as PaletteData, User02Icon as UserIconData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const ArrowLeft = createIcon(ArrowLeftData)
const Bell = createIcon(BellData)
const Palette = createIcon(PaletteData)
const UserIcon = createIcon(UserIconData)
import { useAuth } from '@/app/providers/AuthProvider'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ROUTES } from '@/config/constants'
import { cn } from '@/lib/utils'
import { avatarColor, initials, MOCK_CONVERSATIONS } from '../../data/mockData'
import type { SettingsSection } from '../../types/settings.types'
import { SideNav } from '../SideNav'
import { ProfileSettings } from './ProfileSettings'
import { AppearanceSettings } from './AppearanceSettings'
import { NotificationsSettings } from './NotificationsSettings'

const SECTIONS: Array<{ id: SettingsSection; labelKey: string; icon: typeof UserIcon }> = [
  { id: 'profile', labelKey: 'chat.profileAccount', icon: UserIcon },
  { id: 'appearance', labelKey: 'chat.profileAppearance', icon: Palette },
  { id: 'notifications', labelKey: 'chat.profileNotifications', icon: Bell },
]

export function SettingsView() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [displayName, setDisplayName] = useState(user?.fullName ?? '')
  const [aboutText, setAboutText] = useState('')

  const userName = displayName || (user?.fullName ?? 'Minh Anh')
  const userEmail = user?.email ?? 'nguyen10t2lhp@gmail.com'

  const totalUnread = useMemo(
    () => MOCK_CONVERSATIONS.reduce((n, c) => n + c.unread, 0),
    [],
  )

  const handleSelectSection = (section: SettingsSection) => {
    setActiveSection(section)
    setMobileDetailOpen(true)
  }

  return (
    <main className="flex h-dvh w-full overflow-hidden bg-green-50/20 pb-16 text-foreground md:pb-0">
      {/* Cột 1: SideNav cố định */}
      <SideNav
        active={null}
        settingsActive={true}
        totalUnread={totalUnread}
        onChange={(tab) => {
          navigate(ROUTES.messages, { state: { tab } })
        }}
        onOpenSettings={() => {}}
      />

      {/* Cột 2: Danh mục cài đặt */}
      <aside
        className={cn(
          'flex h-full min-h-0 flex-col border-r border-border bg-green-50/50 transition-all duration-200',
          mobileDetailOpen
            ? 'hidden md:flex md:w-80 md:min-w-[320px]'
            : 'w-full min-w-0 flex-1 md:w-80 md:min-w-[320px] md:flex-none',
        )}
        aria-label={t('chat.settingsTitle')}
      >
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-green-100 px-4 sm:px-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(ROUTES.messages)}
              aria-label={t('chat.backToMessages')}
              className="grid size-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
            </button>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {t('chat.settings')}
            </h1>
          </div>
        </header>

        <div className="p-3">
          <button
            type="button"
            onClick={() => handleSelectSection('profile')}
            className={cn(
              'flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all',
              activeSection === 'profile'
                ? 'bg-green-100 text-green-900 shadow-sm ring-1 ring-border'
                : 'text-foreground hover:bg-muted/70',
            )}
          >
            <Avatar className="size-12 shrink-0 ring-2 ring-border">
              <AvatarFallback
                className="text-base font-bold text-foreground"
                style={{ backgroundColor: avatarColor(userName) }}
              >
                {initials(userName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{userName}</p>
              <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
            </div>
          </button>
        </div>

        <div className="mx-3 border-t border-border" aria-hidden="true" />

        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label={t('chat.settingsCategories')}>
          {SECTIONS.map(({ id, labelKey, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleSelectSection(id)}
              className={cn(
                'flex w-full items-center gap-3.5 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-colors',
                activeSection === id
                  ? 'bg-green-100 text-green-900 shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="size-5 shrink-0 text-brand-ink" aria-hidden="true" />
              <span className="flex-1 truncate">{t(labelKey)}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Cột 3: Chi tiết cài đặt */}
      <section
        className={cn(
          'flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-green-50/30 transition-all duration-200',
          !mobileDetailOpen ? 'hidden md:flex' : 'flex w-full',
        )}
        aria-label={t('chat.settingsDetail')}
      >
        <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center border-b border-border bg-green-50/95 px-4 backdrop-blur-sm md:hidden">
          <button
            type="button"
            onClick={() => setMobileDetailOpen(false)}
            aria-label={t('chat.backToSettings')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span>{t('chat.settings')}</span>
          </button>
        </div>

        <div className="mx-auto w-full max-w-xl flex-1 px-4 py-6 sm:px-6 md:py-12">
          {activeSection === 'profile' && (
            <ProfileSettings
              userName={userName}
              userEmail={userEmail}
              displayName={displayName}
              aboutText={aboutText}
              onNameChange={setDisplayName}
              onAboutChange={setAboutText}
            />
          )}
          {activeSection === 'appearance' && <AppearanceSettings />}
          {activeSection === 'notifications' && <NotificationsSettings />}
        </div>
      </section>
    </main>
  )
}
