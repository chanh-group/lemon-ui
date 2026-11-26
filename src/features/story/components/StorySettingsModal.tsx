import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { useStorySettings, useUpdateStorySettings } from '@/features/story/hooks/useStories'

interface StorySettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StorySettingsModal({ open, onOpenChange }: StorySettingsModalProps) {
  const { t } = useTranslation()
  const { data: settings, isLoading } = useStorySettings()
  const updateSettings = useUpdateStorySettings()
  const viewedReceipts = settings?.viewedReceiptsEnabled ?? true
  const archiveEnabled = settings?.archiveEnabled ?? true

  const handleToggleReceipts = async (checked: boolean) => {
    try {
      await updateSettings.mutateAsync({ viewedReceiptsEnabled: checked })
      toast.success(checked ? t('chat.receiptsEnabled') : t('chat.receiptsDisabled'))
    } catch {
      toast.error(t('chat.storySettingsError'))
    }
  }

  const handleToggleArchive = async (checked: boolean) => {
    try {
      await updateSettings.mutateAsync({ archiveEnabled: checked })
      toast.success(checked ? t('chat.storyArchiveEnabled') : t('chat.storyArchiveDisabled'))
    } catch {
      toast.error(t('chat.storySettingsError'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{t('chat.storySettingsTitle')}</DialogTitle>
          <DialogDescription>{t('chat.storySettingsDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Section: Quyền riêng tư */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t('chat.storyPrivacyTitle')}
            </h3>

            {/* Toggle 1: View receipts */}
            <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-card-foreground">
                  {t('chat.storyReceiptsTitle')}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t('chat.storyReceiptsDescription')}
                </p>
              </div>
              <Switch
                checked={viewedReceipts}
                disabled={isLoading}
                onCheckedChange={handleToggleReceipts}
              />
            </div>

            {/* Toggle 2: Archiving */}
            <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-card-foreground">
                  {t('chat.storyArchiveSettingTitle')}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t('chat.storyArchiveSettingDescription')}
                </p>
              </div>
              <Switch
                checked={archiveEnabled}
                disabled={isLoading}
                onCheckedChange={handleToggleArchive}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
