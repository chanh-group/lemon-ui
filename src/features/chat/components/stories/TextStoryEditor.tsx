import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { TEXT_STORY_BG } from '../../data/storiesData'

interface TextStoryEditorProps {
  onDiscard: () => void
  /** Chỉ nhận text — không còn tùy chọn chủ đề/kiểu chữ. */
  onShare: (payload: { text: string }) => void
  isSharing: boolean
}

/** Editor tin văn bản gọn: gõ trực tiếp trên canvas nền cố định, không chủ đề. */
export function TextStoryEditor({ onDiscard, onShare, isSharing }: TextStoryEditorProps) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const canShare = text.trim().length > 0

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 p-4">
      {/* Canvas tin — gõ thẳng lên như Facebook */}
      <div className={cn('flex aspect-[9/16] w-full max-w-60 flex-col rounded-2xl bg-linear-to-br p-4 shadow-xl', TEXT_STORY_BG)}>
        <p className="text-[11px] font-medium text-white/80">{t('chat.storyPreview')}</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('chat.addTextHint')}
          aria-label={t('chat.addTextHint')}
          rows={8}
          maxLength={140}
          className="my-2 w-full flex-1 resize-none bg-transparent text-center text-2xl font-bold text-foreground outline-none placeholder:font-semibold placeholder:text-white/60"
        />
      </div>

      {/* Footer: Bỏ / Chia sẻ */}
      <div className="flex w-full max-w-60 items-center justify-between pb-2">
        <button
          type="button"
          onClick={onDiscard}
          aria-label={t('chat.discard')}
          className="rounded-xl bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-border hover:text-foreground"
        >
          {t('chat.discard')}
        </button>
        <button
          type="button"
          onClick={() => canShare && onShare({ text: text.trim() })}
          disabled={!canShare || isSharing}
          aria-label={t('chat.shareStory')}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isSharing ? t('chat.pending') : t('chat.shareStory')}
        </button>
      </div>
    </div>
  )
}
