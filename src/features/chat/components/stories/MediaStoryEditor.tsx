import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePlusIcon as MediaData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const Media = createIcon(MediaData)

interface MediaStoryActorProps {
  onDiscard: () => void
  /** Nhận kèm captionText để gửi API. */
  onShare: (mediaKind: 'photo' | 'gif' | 'sticker' | 'video', label: string, captionText: string) => void
  isSharing: boolean
}

/** Editor tin ảnh/video: chọn file (object URL), caption, xem trước 9:16. */
export function MediaStoryEditor({ onDiscard, onShare, isSharing }: MediaStoryActorProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState('')

  const handleFile = (selected: File | undefined | null) => {
    if (selected) {
      setFile(selected)
      setObjectUrl(URL.createObjectURL(selected))
    }
  }

  const isVideo = file?.type.startsWith('video') ?? false
  const canShare = Boolean(file)

  const share = () => {
    if (!file) return
    onShare(isVideo ? 'video' : 'photo', file.name, caption.trim())
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[19rem_1fr]">
      {/* Cột điều khiển */}
      <div className="min-h-0 space-y-4 overflow-y-auto border-b border-border p-4 lg:border-b-0 lg:border-r">
        {/* Chọn file ảnh/video */}
        <label
          htmlFor="stories-media-file"
          className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border p-3 text-left transition-colors hover:bg-muted"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-brand-ink">
            <Media className="size-4.5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">
              {file ? file.name : t('chat.chooseMedia')}
            </span>
            <span className="block truncate text-xs text-muted-foreground">{t('chat.chooseMediaHint')}</span>
          </span>
          <input
            ref={fileInputRef}
            id="stories-media-file"
            type="file"
            accept="image/*,video/*"
            className="sr-only"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>

        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder={t('chat.storyCaptionPlaceholder')}
          aria-label={t('chat.storyCaptionPlaceholder')}
          className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring"
        />
      </div>

      {/* Xem trước */}
      <div className="flex min-h-0 flex-col items-center justify-center gap-3 bg-background p-4">
        {objectUrl && !isVideo && (
          <img src={objectUrl} alt={caption || t('chat.storyPreview')} className="aspect-[9/16] w-full max-w-60 rounded-2xl object-cover shadow-xl" />
        )}
        {objectUrl && isVideo && (
          <video src={objectUrl} className="aspect-[9/16] w-full max-w-60 rounded-2xl object-cover shadow-xl" playsInline controls />
        )}
        {!objectUrl ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex aspect-[9/16] w-full max-w-60 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
          >
            <span className="grid size-14 place-items-center rounded-full bg-card ring-1 ring-border">
              <Media className="size-7 text-brand-ink" aria-hidden="true" />
            </span>
            {t('chat.chooseMedia')}
          </button>
        ) : null}

        <div className="flex w-full max-w-60 items-center justify-between gap-2 pb-2">
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-xl bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-border hover:text-foreground"
          >
            {t('chat.discard')}
          </button>
          <button
            type="button"
            onClick={share}
            disabled={!canShare || isSharing}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isSharing ? t('chat.pending') : t('chat.shareStory')}
          </button>
        </div>
      </div>
    </div>
  )
}
