import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BellIcon as BellData, Message02Icon as MessageCircleData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const Bell = createIcon(BellData)
const MessageCircle = createIcon(MessageCircleData)
import { Switch } from '@/components/ui/switch'

export function NotificationsSettings() {
  const { t } = useTranslation()
  const [soundAlerts, setSoundAlerts] = useState(true)
  const [previewMessages, setPreviewMessages] = useState(true)

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <h2 className="text-center text-base font-bold text-foreground">
        {t('chat.profileNotifications')}
      </h2>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3.5">
            <Bell className="size-5 shrink-0 text-brand-ink" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-foreground">{t('chat.soundAlerts')}</p>
              <p className="text-xs text-muted-foreground">{t('chat.soundAlertsDesc')}</p>
            </div>
          </div>
          <Switch
            checked={soundAlerts}
            onCheckedChange={setSoundAlerts}
            aria-label={t('chat.soundAlerts')}
          />
        </div>

        <div className="mx-4 border-t border-border" aria-hidden="true" />

        <div className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3.5">
            <MessageCircle className="size-5 shrink-0 text-brand-ink" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-foreground">{t('chat.previewAlerts')}</p>
              <p className="text-xs text-muted-foreground">{t('chat.previewAlertsDesc')}</p>
            </div>
          </div>
          <Switch
            checked={previewMessages}
            onCheckedChange={setPreviewMessages}
            aria-label={t('chat.previewAlerts')}
          />
        </div>
      </div>
    </div>
  )
}
