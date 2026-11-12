import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  useMutedAuthors,
  useStorySettings,
  useUnmuteAuthor,
  useUpdateStorySettings,
} from '../../hooks/useStories'

interface StorySettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StorySettingsModal({ open, onOpenChange }: StorySettingsModalProps) {
  const { t } = useTranslation()
  const { data: settings, isLoading } = useStorySettings()
  const updateSettings = useUpdateStorySettings()
  const { data: mutedAuthors = [] } = useMutedAuthors()
  const unmuteMutation = useUnmuteAuthor()

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

  const handleUnmute = async (authorId: string) => {
    try {
      await unmuteMutation.mutateAsync(authorId)
      toast.success(t('chat.storyUnmuted'))
    } catch {
      toast.error(t('chat.storyUnmuteError'))
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
                disabled={isLoading || updateSettings.isPending}
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
                disabled={isLoading || updateSettings.isPending}
                onCheckedChange={handleToggleArchive}
              />
            </div>
          </div>

          {/* Section: Danh sách tác giả đã ẩn */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t('chat.mutedStoriesTitle')} ({mutedAuthors.length})
            </h3>
            {mutedAuthors.length === 0 ? (
              <p className="px-1 text-xs italic text-muted-foreground">
                {t('chat.noMutedStories')}
              </p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                {mutedAuthors.map((authorId) => (
                  <div
                    key={authorId}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2.5"
                  >
                    <span className="truncate text-xs font-medium text-card-foreground">
                      {t('chat.storyAuthorId', { id: authorId.slice(0, 8) })}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={unmuteMutation.isPending}
                      onClick={() => handleUnmute(authorId)}
                      className="h-7 text-xs"
                    >
                      {t('chat.unmuteStory')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
