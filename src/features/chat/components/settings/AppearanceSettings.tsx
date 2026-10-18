import { useTranslation } from 'react-i18next'
import { GlobeIcon as GlobeData, Moon02Icon as MoonData, Sun02Icon as SunData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const Globe = createIcon(GlobeData)
const Moon = createIcon(MoonData)
const Sun = createIcon(SunData)
import { useLanguage } from '@/app/providers/LanguageProvider'
import { Switch } from '@/components/ui/switch'
import { useTheme } from '@/hooks/useTheme'

export function AppearanceSettings() {
  const { t } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const { language, setLanguage } = useLanguage()

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <h2 className="text-center text-base font-bold text-foreground">
        {t('chat.profileAppearance')}
      </h2>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3.5">
            {theme === 'dark' ? (
              <Sun className="size-5 shrink-0 text-brand-ink" aria-hidden="true" />
            ) : (
              <Moon className="size-5 shrink-0 text-brand-ink" aria-hidden="true" />
            )}
            <div>
              <p className="text-sm font-semibold text-foreground">{t('chat.profileTheme')}</p>
              <p className="text-xs text-muted-foreground">
                {theme === 'dark' ? t('chat.themeDark') : t('chat.themeLight')}
              </p>
            </div>
          </div>
          <Switch
            checked={theme === 'dark'}
            onCheckedChange={toggleTheme}
            aria-label={t('chat.profileTheme')}
          />
        </div>

        <div className="mx-4 border-t border-border" aria-hidden="true" />

        <div className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3.5">
            <Globe className="size-5 shrink-0 text-brand-ink" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-foreground">{t('chat.profileLanguage')}</p>
              <p className="text-xs text-muted-foreground">
                {language === 'vi' ? t('chat.langVietnamese') : t('chat.langEnglish')}
              </p>
            </div>
          </div>
          <div
            className="flex shrink-0 overflow-hidden rounded-full border border-border"
            role="group"
            aria-label={t('chat.profileLanguage')}
          >
            {(['vi', 'en'] as const).map((lng) => (
              <button
                key={lng}
                type="button"
                onClick={() => setLanguage(lng)}
                aria-pressed={language === lng}
                className={
                  language === lng
                    ? 'bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground'
                    : 'px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground'
                }
              >
                {lng.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
