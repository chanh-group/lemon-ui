import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CancelCircleIcon as XData,
  EyeIcon as EyeData,
  HeartIcon as HeartData,
  SentIcon as SendData,
} from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
import { BrandMark } from '@/components/common/BrandMark'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { avatarColor, initials } from '../data/mockData'
import { storyDisplayName } from '../data/storiesData'
import { useReactStory, useReplyStory, useUnreactStory, useViewStory } from '../hooks/useStories'
import type { StoryEntry, StoryReactionType } from '../types/chat.types'

const X = createIcon(XData)
const Send = createIcon(SendData)
const Heart = createIcon(HeartData)
const Eye = createIcon(EyeData)

const QUICK_REACTIONS: StoryReactionType[] = ['❤️', '🔥', '😂', '😮', '😢', '👏', '👍']

interface StoryViewerProps {
  story: StoryEntry
  onClose: () => void
  onReplySent?: (story: StoryEntry, text: string) => void
}

/** Story viewer — xem story, tự động đánh dấu đã xem, thả icon cảm xúc và phản hồi tin nhắn 1:1 */
export function StoryViewer({ story, onClose, onReplySent }: StoryViewerProps) {
  const { t } = useTranslation()
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)

  // Optimistic local state for immediate interaction feedback
  const [viewerReaction, setViewerReaction] = useState<string | null>(story.viewerReaction ?? null)
  const [reactionsCount, setReactionsCount] = useState<number>(story.reactionsCount ?? 0)

  const viewMutation = useViewStory()
  const reactMutation = useReactStory()
  const unreactMutation = useUnreactStory()
  const replyMutation = useReplyStory()

  // Tự động đánh dấu đã xem khi mở story của người khác
  useEffect(() => {
    if (!story.mine && !story.viewed) {
      viewMutation.mutate(story.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story.id])

  // Timer 5s tiến trình tự động đóng (dừng lại khi đang gõ phản hồi hoặc hover)
  useEffect(() => {
    closeBtnRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (isPaused) return
    const interval = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          window.clearInterval(interval)
          onClose()
          return 100
        }
        return prev + 2 // 50 bước * 100ms = 5000ms
      })
    }, 100)
    return () => window.clearInterval(interval)
  }, [isPaused, onClose])

  const handleToggleReaction = async (emoji: StoryReactionType) => {
    setIsPaused(true)
    if (viewerReaction === emoji) {
      // Gỡ biểu cảm nếu bấm lại đúng biểu cảm đó
      setViewerReaction(null)
      setReactionsCount((prev) => Math.max(0, prev - 1))
      try {
        await unreactMutation.mutateAsync(story.id)
        toast.success(t('chat.unreactStorySuccess'))
      } catch {
        setViewerReaction(emoji)
        setReactionsCount((prev) => prev + 1)
      }
    } else {
      // Thả biểu cảm mới
      const prevReaction = viewerReaction
      setViewerReaction(emoji)
      setReactionsCount((prev) => prev + (prevReaction ? 0 : 1))
      try {
        await reactMutation.mutateAsync({ storyId: story.id, reaction: emoji })
        toast.success(t('chat.reactStorySuccess'))
      } catch {
        setViewerReaction(prevReaction)
        setReactionsCount((prev) => prev - (prevReaction ? 0 : 1))
      }
    }
  }

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || isSending) return

    setIsSending(true)
    setIsPaused(true)
    try {
      await replyMutation.mutateAsync({
        storyId: story.id,
        payload: { content: text },
      })
      toast.success(t('chat.replyStorySuccess'))
      onReplySent?.(story, text)
      setDraft('')
    } catch {
      toast.error(t('chat.replyStoryError'))
    } finally {
      setIsSending(false)
    }
  }

  const authorTitle = storyDisplayName(story, t)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('chat.storyOf', { name: story.name })}
      className="story-overlay fixed inset-0 z-50 grid place-items-center bg-foreground/75 p-3 backdrop-blur-xs sm:p-4"
      onClick={onClose}
    >
      <div
        className="story-card flex w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-border/80 bg-card shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => {
          if (!draft.trim()) setIsPaused(false)
        }}
      >
        {/* Thanh tiến trình thời gian 5s */}
        <div className="px-4 pt-3.5">
          <div className="h-1 overflow-hidden rounded-full bg-border" aria-hidden="true">
            <div
              key={story.id}
              className="h-full rounded-full bg-brand-ink transition-[width] duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Header thông tin tác giả & nút đóng */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <span
            aria-hidden="true"
            className="grid size-10 place-items-center rounded-full text-[13px] font-bold ring-1 ring-border"
            style={{ backgroundColor: avatarColor(story.name) }}
          >
            {initials(story.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">{authorTitle}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{story.time || t('chat.now')}</span>
              {reactionsCount > 0 && (
                <span className="flex items-center gap-0.5 font-medium text-brand-ink">
                  <Heart className="size-3 fill-current text-rose-500" aria-hidden="true" />
                  {reactionsCount}
                </span>
              )}
              {story.mine && story.viewsCount !== undefined && (
                <span className="flex items-center gap-0.5 font-medium">
                  <Eye className="size-3" aria-hidden="true" />
                  {story.viewsCount}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('chat.closeStory')}
            ref={closeBtnRef}
            className="grid size-10 min-h-10 min-w-10 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Nội dung Story */}
        <div className="relative flex min-h-64 flex-1 flex-col items-center justify-center overflow-hidden bg-linear-to-br from-primary via-secondary to-ring px-6 py-10">
          {story.mediaUrl ? (
            <img
              src={story.mediaUrl}
              alt={story.caption || story.name}
              className="max-h-72 w-full rounded-2xl object-cover shadow-md"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-center">
              <BrandMark animated={false} className="size-14 drop-shadow-sm" />
              <p className="text-lg font-bold text-foreground">
                {story.caption || t('chat.storyGreeting', { name: story.name })}
              </p>
              {!story.caption && (
                <p className="max-w-64 text-sm text-foreground/80">
                  {t('chat.storyBody')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Thanh tương tác: Thả icon nhanh + Reply tin nhắn 1:1 (chỉ hiện khi xem tin của bạn bè) */}
        {!story.mine && (
          <div className="flex flex-col gap-2.5 border-t border-border bg-card/95 p-3.5">
            {/* Dải icon phản ứng nhanh */}
            <div
              className="flex items-center justify-between gap-1 rounded-2xl border border-border/80 bg-muted/60 px-2 py-1.5"
              role="toolbar"
              aria-label={t('chat.reactions')}
            >
              {QUICK_REACTIONS.map((emoji) => {
                const isActive = viewerReaction === emoji
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleToggleReaction(emoji)}
                    className={cn(
                      'grid size-8 place-items-center rounded-full text-base transition-transform duration-150 hover:scale-130 active:scale-95',
                      isActive && 'bg-primary/25 ring-2 ring-primary scale-110 shadow-xs',
                    )}
                    aria-label={`${isActive ? t('chat.unreactStory') : t('chat.reactStorySuccess')} ${emoji}`}
                    title={emoji}
                  >
                    <span>{emoji}</span>
                  </button>
                )
              })}
            </div>

            {/* Thanh gõ tin nhắn phản hồi story gửi vào chat 1:1 */}
            <form onSubmit={handleSendReply} className="flex items-center gap-2">
              <label className="chat-composer flex min-h-10 min-w-0 flex-1 items-center rounded-full border border-border bg-muted/70 px-3.5 transition-all focus-within:border-ring focus-within:bg-card">
                <input
                  type="text"
                  value={draft}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => {
                    if (!draft.trim()) setIsPaused(false)
                  }}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t('chat.replyStoryPlaceholder', { name: authorTitle })}
                  aria-label={t('chat.replyStoryPlaceholder', { name: authorTitle })}
                  className="h-10 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </label>
              <button
                type="submit"
                disabled={!draft.trim() || isSending}
                aria-label={t('chat.sendMessage')}
                className="grid size-10 min-h-10 min-w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-xs transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="size-4.5" aria-hidden="true" />
              </button>
            </form>
          </div>
        )}

        {/* Chân card cho Story của chính mình */}
        {story.mine && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium">
              <Eye className="size-4" aria-hidden="true" />
              {t('chat.storyViewsCount', { count: story.viewsCount ?? 0 })}
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Heart className="size-4 text-rose-500" aria-hidden="true" />
              {t('chat.storyReactionsCount', { count: reactionsCount })}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
