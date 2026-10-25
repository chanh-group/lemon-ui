import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { CancelCircleIcon as XData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const X = createIcon(XData)
import { BrandMark } from '@/components/common/BrandMark'
import { UserAvatar } from '@/components/common/UserAvatar'
import { storyDisplayName } from '../data/storiesData'
import type { StoryEntry } from '../types/chat.types'

interface StoryViewerProps {
  story: StoryEntry
  onClose: () => void
}

/** Story viewer — hiệu ứng chuyển cảnh nhẹ + tiến trình 5s + Esc để đóng. */
export function StoryViewer({ story, onClose }: StoryViewerProps) {
  const { t } = useTranslation()
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeBtnRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const auto = window.setTimeout(() => onClose(), 5000)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(auto)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story.id])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('chat.storyOf', { name: story.name })}
      className="story-overlay fixed inset-0 z-50 grid place-items-center bg-foreground/70 p-4"
      onClick={onClose}
    >
      <div
        className="story-card w-full max-w-sm overflow-hidden rounded-3xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 pt-4">
          <div className="h-1 overflow-hidden rounded-full bg-border" aria-hidden="true">
            <div key={story.id} className="story-progress h-full rounded-full bg-brand-ink" />
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 pt-3">
          <UserAvatar name={story.name} src={story.avatarUrl} className="size-10" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{storyDisplayName(story, t)}</p>
            <p className="text-xs text-muted-foreground">{story.time || t('chat.now')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('chat.closeStory')}
            ref={closeBtnRef}
            className="grid size-11 min-h-11 min-w-11 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="grid place-items-center bg-linear-to-br from-primary via-secondary to-ring px-6 py-14">
          <div className="flex flex-col items-center gap-3 text-center">
            <BrandMark animated={false} className="size-16 drop-shadow-sm" />
            <p className="text-lg font-bold text-foreground">{t('chat.storyGreeting', { name: story.name })}</p>
            <p className="max-w-60 text-sm text-foreground/75">
              {t('chat.storyBody')}
            </p>
          </div>
        </div>
        <p className="px-4 py-3 text-center text-xs text-muted-foreground">{t('chat.storySample')}</p>
      </div>
    </div>
  )
}
