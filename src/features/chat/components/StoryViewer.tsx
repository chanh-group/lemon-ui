import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft01Icon as ArrowLeftData,
  ArrowRight01Icon as ArrowRightData,
  CancelCircleIcon as XData,
  EyeIcon as EyeData,
  HeartIcon as HeartData,
  PauseIcon as PauseData,
  PlayIcon as PlayData,
  SentIcon as SendData,
} from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
import { BrandMark } from '@/components/common/BrandMark'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { avatarColor, initials } from '../data/mockData'
import { storyDisplayName, TEXT_STORY_BG } from '../data/storiesData'
import { useReactStory, useReplyStory, useUnreactStory, useViewStory } from '../hooks/useStories'
import type { StoryEntry, StoryReactionType } from '../types/chat.types'

const ArrowLeft = createIcon(ArrowLeftData)
const ArrowRight = createIcon(ArrowRightData)
const X = createIcon(XData)
const Send = createIcon(SendData)
const Heart = createIcon(HeartData)
const Eye = createIcon(EyeData)
const Play = createIcon(PlayData)
const Pause = createIcon(PauseData)

const QUICK_REACTIONS: StoryReactionType[] = ['❤️', '🔥', '😂', '😮', '😢', '👏', '👍']

interface StoryViewerProps {
  story: StoryEntry
  stories?: StoryEntry[]
  onSelectStory?: (story: StoryEntry) => void
  onClose: () => void
  onReplySent?: (story: StoryEntry, text: string) => void
}

/**
 * StoryViewer — Trải nghiệm xem Story chuẩn Facebook / Messenger trên Desktop:
 * - Khung hình chữ nhật 9:16 kích thước lớn (90vh), nền tối sâu (bg-black/95)
 * - Nút mũi tên Previous / Next chuyển đổi giữa story của bạn bè
 * - Thanh tiến trình 5s, tự động tạm dừng khi hover, gõ tin nhắn hoặc bấm pause
 * - Dải icon cảm xúc nổi và thanh gõ phản hồi tin nhắn 1:1 trực tiếp
 */
export function StoryViewer({
  story,
  stories = [],
  onSelectStory,
  onClose,
  onReplySent,
}: StoryViewerProps) {
  const { t } = useTranslation()
  const replyInputRef = useRef<HTMLInputElement>(null)

  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)

  // Local optimistic interaction state
  const [viewerReaction, setViewerReaction] = useState<string | null>(story.viewerReaction ?? null)
  const [reactionsCount, setReactionsCount] = useState<number>(story.reactionsCount ?? 0)

  // Index navigation
  const currentIndex = stories.findIndex((s) => s.id === story.id)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < stories.length - 1

  const viewMutation = useViewStory()
  const reactMutation = useReactStory()
  const unreactMutation = useUnreactStory()
  const replyMutation = useReplyStory()

  // Reset local state when story changes
  useEffect(() => {
    setProgress(0)
    setDraft('')
    setViewerReaction(story.viewerReaction ?? null)
    setReactionsCount(story.reactionsCount ?? 0)

    if (!story.mine && !story.viewed) {
      viewMutation.mutate(story.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story.id])

  const handlePrevStory = () => {
    if (hasPrev && onSelectStory) {
      onSelectStory(stories[currentIndex - 1])
    }
  }

  const handleNextStory = () => {
    if (hasNext && onSelectStory) {
      onSelectStory(stories[currentIndex + 1])
    } else {
      onClose()
    }
  }

  // Keyboard navigation: Escape, ArrowLeft, ArrowRight, Space
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Khi đang gõ trong input thì không trigger Space / Arrow shortcuts
      const isInputActive = document.activeElement === replyInputRef.current

      if (e.key === 'Escape') {
        onClose()
      } else if (!isInputActive) {
        if (e.key === 'ArrowLeft') {
          handlePrevStory()
        } else if (e.key === 'ArrowRight') {
          handleNextStory()
        } else if (e.key === ' ') {
          e.preventDefault()
          setIsPaused((p) => !p)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, hasPrev, hasNext, isPaused])

  // Progress timer: 50 bước * 100ms = 5000ms
  useEffect(() => {
    if (isPaused) return
    const interval = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          window.clearInterval(interval)
          handleNextStory()
          return 100
        }
        return prev + 2
      })
    }, 100)
    return () => window.clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused, story.id, currentIndex, hasNext])

  const handleToggleReaction = async (emoji: StoryReactionType) => {
    setIsPaused(true)
    if (viewerReaction === emoji) {
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
  const isMedia = story.kind === 'MEDIA' || Boolean(story.mediaUrl)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('chat.storyOf', { name: story.name })}
      className="story-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md select-none"
      onClick={onClose}
    >
      {/* Top Bar ngoài màn hình (Facebook Web Style) */}
      <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-4 sm:px-8 py-4 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <BrandMark animated={false} className="size-9 drop-shadow-md" />
          <span className="text-white font-bold text-lg tracking-tight hidden sm:inline">
            LemonChat Story
          </span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={onClose}
            aria-label={t('chat.closeStory')}
            title={`${t('chat.closeStory')} (Esc)`}
            className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all hover:scale-105 active:scale-95 shadow-md"
          >
            <X className="size-6" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Nút mũi tên chuyển Story trước (Facebook carousel arrow) */}
      {hasPrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            handlePrevStory()
          }}
          aria-label="Story trước"
          title="Story trước (Phím ←)"
          className="hidden md:grid absolute left-6 lg:left-12 xl:left-24 top-1/2 -translate-y-1/2 z-40 size-13 place-items-center rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur-md transition-all hover:scale-110 active:scale-95 shadow-2xl ring-1 ring-white/10"
        >
          <ArrowLeft className="size-7" aria-hidden="true" />
        </button>
      )}

      {/* Nút mũi tên chuyển Story tiếp theo (Facebook carousel arrow) */}
      {hasNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            handleNextStory()
          }}
          aria-label="Story tiếp theo"
          title="Story tiếp theo (Phím →)"
          className="hidden md:grid absolute right-6 lg:right-12 xl:right-24 top-1/2 -translate-y-1/2 z-40 size-13 place-items-center rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur-md transition-all hover:scale-110 active:scale-95 shadow-2xl ring-1 ring-white/10"
        >
          <ArrowRight className="size-7" aria-hidden="true" />
        </button>
      )}

      {/* Card Story chuẩn 9:16 (Facebook Mobile-in-Desktop View) */}
      <div
        className="story-card relative flex h-[90vh] max-h-[920px] min-h-[580px] w-full max-w-[440px] sm:max-w-[480px] md:max-w-[500px] flex-col overflow-hidden rounded-3xl bg-neutral-950 shadow-2xl shadow-black ring-1 ring-white/15 transition-all"
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => {
          if (!draft.trim()) setIsPaused(false)
        }}
      >
        {/* Lớp nội dung Story (Canvas full card) */}
        <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
          {isMedia && story.mediaUrl ? (
            <img
              src={story.mediaUrl}
              alt={story.caption || story.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className={cn(
                'relative flex h-full w-full flex-col items-center justify-center px-8 py-28 text-center bg-linear-to-br',
                story.background || TEXT_STORY_BG,
              )}
            >
              <BrandMark animated={false} className="size-16 mb-6 drop-shadow-xl opacity-90" />
              <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-relaxed drop-shadow-lg max-w-sm wrap-break-word">
                {story.caption || t('chat.storyGreeting', { name: story.name })}
              </p>
              {!story.caption && (
                <p className="mt-4 text-sm sm:text-base text-white/85 max-w-xs drop-shadow-md">
                  {t('chat.storyBody')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Vùng chạm điều hướng (Touch / Click zones Facebook style) */}
        <div className="absolute inset-0 z-10 grid grid-cols-3 pointer-events-auto">
          <div
            role="button"
            tabIndex={-1}
            aria-label="Story trước"
            onClick={handlePrevStory}
            className="h-full cursor-pointer"
          />
          <div
            role="button"
            tabIndex={-1}
            aria-label="Tạm dừng / Tiếp tục"
            onClick={() => setIsPaused((p) => !p)}
            className="h-full cursor-pointer"
          />
          <div
            role="button"
            tabIndex={-1}
            aria-label="Story tiếp theo"
            onClick={handleNextStory}
            className="h-full cursor-pointer"
          />
        </div>

        {/* Lớp Gradient Header (Phía trên cùng của Story) */}
        <div className="absolute top-0 inset-x-0 z-20 flex flex-col gap-3.5 bg-linear-to-b from-black/85 via-black/40 to-transparent pt-4 pb-12 px-4 pointer-events-auto">
          {/* Thanh tiến trình thời gian 5s */}
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/30 backdrop-blur-xs" aria-hidden="true">
            <div
              key={story.id}
              className="h-full rounded-full bg-white transition-[width] duration-100 ease-linear shadow-xs"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Thông tin tác giả & điều khiển */}
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-10.5 shrink-0 place-items-center rounded-full text-[13px] font-bold text-foreground ring-2 ring-brand-ink shadow-md"
              style={{ backgroundColor: avatarColor(story.name) }}
            >
              {initials(story.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm sm:text-base font-bold text-white drop-shadow-sm">
                {authorTitle}
              </p>
              <div className="flex items-center gap-2 text-xs text-white/80">
                <span>{story.time || t('chat.now')}</span>
                {reactionsCount > 0 && (
                  <span className="flex items-center gap-1 font-semibold rounded-full bg-white/20 px-2 py-0.5 text-[11px] text-white backdrop-blur-xs">
                    <Heart className="size-3 fill-rose-500 text-rose-500" aria-hidden="true" />
                    {reactionsCount}
                  </span>
                )}
                {story.mine && story.viewsCount !== undefined && (
                  <span className="flex items-center gap-1 font-semibold rounded-full bg-white/20 px-2 py-0.5 text-[11px] text-white backdrop-blur-xs">
                    <Eye className="size-3" aria-hidden="true" />
                    {story.viewsCount}
                  </span>
                )}
              </div>
            </div>

            {/* Nút Pause / Play */}
            <button
              type="button"
              onClick={() => setIsPaused((p) => !p)}
              aria-label={isPaused ? 'Phát tiếp' : 'Tạm dừng'}
              title={isPaused ? 'Phát tiếp (Phím cách)' : 'Tạm dừng (Phím cách)'}
              className="grid size-9 place-items-center rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-colors"
            >
              {isPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
            </button>

            {/* Nút đóng trên mobile */}
            <button
              type="button"
              onClick={onClose}
              aria-label={t('chat.closeStory')}
              className="grid size-9 place-items-center rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-colors md:hidden"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Lớp Gradient Footer (Thanh tương tác Facebook ở chân Story) */}
        <div className="absolute bottom-0 inset-x-0 z-20 flex flex-col gap-3 bg-linear-to-t from-black/90 via-black/55 to-transparent pt-12 pb-5 px-4 pointer-events-auto">
          {!story.mine ? (
            <>
              {/* Dải icon phản ứng nhanh chuẩn Facebook */}
              <div
                className="flex items-center justify-between gap-1.5 rounded-full bg-black/45 backdrop-blur-md border border-white/20 px-3.5 py-1.5 shadow-lg"
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
                        'grid size-8.5 place-items-center rounded-full text-lg transition-transform duration-150 hover:scale-135 active:scale-95',
                        isActive && 'bg-white/25 ring-2 ring-white scale-115 shadow-sm',
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
                <label className="flex min-h-11 min-w-0 flex-1 items-center rounded-full bg-white/15 hover:bg-white/20 focus-within:bg-black/60 focus-within:ring-2 focus-within:ring-brand-ink border border-white/25 px-4 text-white backdrop-blur-md transition-all">
                  <input
                    ref={replyInputRef}
                    type="text"
                    value={draft}
                    onFocus={() => setIsPaused(true)}
                    onBlur={() => {
                      if (!draft.trim()) setIsPaused(false)
                    }}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={t('chat.replyStoryPlaceholder', { name: authorTitle })}
                    aria-label={t('chat.replyStoryPlaceholder', { name: authorTitle })}
                    className="h-11 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/70"
                  />
                </label>
                <button
                  type="submit"
                  disabled={!draft.trim() || isSending}
                  aria-label={t('chat.sendMessage')}
                  className="grid size-11 min-h-11 min-w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-md transition-all hover:scale-105 active:scale-95 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send className="size-5" aria-hidden="true" />
                </button>
              </form>
            </>
          ) : (
            /* Thông tin lượt xem dành cho Story của chính mình */
            <div className="flex items-center justify-between rounded-2xl bg-black/45 backdrop-blur-md border border-white/20 px-4 py-3 text-sm text-white">
              <span className="flex items-center gap-2 font-medium">
                <Eye className="size-4.5 text-white/90" aria-hidden="true" />
                {t('chat.storyViewsCount', { count: story.viewsCount ?? 0 })}
              </span>
              <span className="flex items-center gap-2 font-medium">
                <Heart className="size-4.5 text-rose-500 fill-rose-500" aria-hidden="true" />
                {t('chat.storyReactionsCount', { count: reactionsCount })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
