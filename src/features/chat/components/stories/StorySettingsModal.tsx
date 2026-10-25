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
  const { data: settings, isLoading } = useStorySettings()
  const updateSettings = useUpdateStorySettings()
  const { data: mutedAuthors = [] } = useMutedAuthors()
  const unmuteMutation = useUnmuteAuthor()

  const viewedReceipts = settings?.viewedReceiptsEnabled ?? true
  const archiveEnabled = settings?.archiveEnabled ?? true

  const handleToggleReceipts = async (checked: boolean) => {
    try {
      await updateSettings.mutateAsync({ viewedReceiptsEnabled: checked })
      toast.success(
        checked
          ? 'Đã bật biên nhận đã xem tin'
          : 'Đã tắt biên nhận đã xem tin (chế độ ẩn danh)',
      )
    } catch {
      toast.error('Không thể cập nhật cài đặt')
    }
  }

  const handleToggleArchive = async (checked: boolean) => {
    try {
      await updateSettings.mutateAsync({ archiveEnabled: checked })
      toast.success(
        checked ? 'Đã bật tự động lưu trữ tin' : 'Đã tắt tự động lưu trữ tin',
      )
    } catch {
      toast.error('Không thể cập nhật cài đặt')
    }
  }

  const handleUnmute = async (authorId: string) => {
    try {
      await unmuteMutation.mutateAsync(authorId)
      toast.success('Đã bỏ ẩn tin của tác giả')
    } catch {
      toast.error('Không thể bỏ ẩn tin')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-[#1c1e21] text-white border-[#3a3b3c]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white">
            Cài đặt tin (Stories)
          </DialogTitle>
          <DialogDescription className="text-xs text-[#b0b3b8]">
            Tuỳ chỉnh quyền riêng tư, biên nhận đã xem và lưu trữ tin
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Section: Quyền riêng tư */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#b0b3b8]">
              Quyền riêng tư & Xem tin
            </h3>

            {/* Toggle 1: View receipts */}
            <div className="flex items-start justify-between gap-3 p-3 rounded-xl bg-[#252728]">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">
                  Biên nhận đã xem (View Receipts)
                </p>
                <p className="text-xs text-[#b0b3b8] leading-relaxed">
                  Khi bật, tác giả sẽ thấy bạn trong danh sách người đã xem. Khi tắt,
                  bạn xem tin ẩn danh (không hiện tên trong danh sách của họ), đồng thời
                  bạn cũng sẽ không thấy ai đã xem tin của mình.
                </p>
              </div>
              <Switch
                checked={viewedReceipts}
                disabled={isLoading || updateSettings.isPending}
                onCheckedChange={handleToggleReceipts}
              />
            </div>

            {/* Toggle 2: Archiving */}
            <div className="flex items-start justify-between gap-3 p-3 rounded-xl bg-[#252728]">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">
                  Kho lưu trữ tin (Story Archive)
                </p>
                <p className="text-xs text-[#b0b3b8] leading-relaxed">
                  Tự động lưu tin vào kho lưu trữ sau khi hết hạn 24 giờ. Cảm xúc và tổng số
                  lượt xem của tin sẽ được giữ lại vĩnh viễn.
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
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#b0b3b8]">
              Tin đã ẩn ({mutedAuthors.length})
            </h3>
            {mutedAuthors.length === 0 ? (
              <p className="text-xs text-[#8a8d91] italic px-1">
                Bạn chưa ẩn tin của ai.
              </p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                {mutedAuthors.map((authorId) => (
                  <div
                    key={authorId}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#252728]"
                  >
                    <span className="text-xs font-medium text-[#e4e6eb] truncate">
                      ID: {authorId.slice(0, 8)}...
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={unmuteMutation.isPending}
                      onClick={() => handleUnmute(authorId)}
                      className="h-7 text-xs border-[#4e4f50] text-white hover:bg-[#3a3b3c]"
                    >
                      Bỏ ẩn
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
