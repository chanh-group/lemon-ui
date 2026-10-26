import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  ArchiveIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  EyeIcon,
  HeartIcon,
  MoreHorizontalIcon,
  MusicNote01Icon,
  PauseIcon,
  PlayIcon,
  PlusSignIcon,
  SentIcon,
  Settings01Icon,
  UserGroupIcon,
  VolumeHighIcon,
  VolumeMute01Icon,
} from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
import { BrandMark } from '@/components/common/BrandMark'
import { UserAvatar } from '@/components/common/UserAvatar'
import { ROUTES } from '@/config/constants'
import { useAuth } from '@/features/auth/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { storyDisplayName, TEXT_STORY_BG } from '../data/storiesData'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StorySettingsModal } from './stories/StorySettingsModal'
import {
  useLikeStory,
  useMuteAuthor,
  useReactStory,
  useReplyStory,
  useUnlikeStory,
  useUnreactStory,
  useViewStory,
} from '../hooks/useStories'
import type { StoryEntry, StoryReactionType } from '../types/chat.types'

const X = createIcon(Cancel01Icon)
const ArrowLeft = createIcon(ArrowLeft01Icon)
const ArrowRight = createIcon(ArrowRight01Icon)
const Play = createIcon(PlayIcon)
const Pause = createIcon(PauseIcon)
const VolumeHigh = createIcon(VolumeHighIcon)
const VolumeMute = createIcon(VolumeMute01Icon)
const MoreHorizontal = createIcon(MoreHorizontalIcon)
const Plus = createIcon(PlusSignIcon)
const Send = createIcon(SentIcon)
const Eye = createIcon(EyeIcon)
const Heart = createIcon(HeartIcon)
const UserGroup = createIcon(UserGroupIcon)
const MusicNote = createIcon(MusicNote01Icon)
const Settings = createIcon(Settings01Icon)
const Archive = createIcon(ArchiveIcon)

/** Danh sách 7 biểu cảm chuẩn Facebook Stories */
interface ReactionItem {
  emoji: StoryReactionType
  label: string
}

const FACEBOOK_REACTIONS: ReactionItem[] = [
  { emoji: '👍', label: 'Thích' },
  { emoji: '❤️', label: 'Yêu thích' },
  { emoji: '🥰', label: 'Thương thương' },
  { emoji: '😆', label: 'Haha' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '😢', label: 'Buồn' },
  { emoji: '😡', label: 'Phẫn nộ' },
]

interface StoryViewerProps {
  story: StoryEntry
  stories?: StoryEntry[]
  embedded?: boolean
  onSelectStory?: (story: StoryEntry) => void
  onClose: () => void
  onReplySent?: (story: StoryEntry, text: string) => void
}

/**
 * StoryViewer — Trải nghiệm xem Story chuẩn Facebook Desktop Web:
 * - Cột Sidebar bên trái (360px): Nút đóng, logo, "Tin của bạn" (tạo tin), "Tất cả tin" (danh sách story bạn bè).
 * - Khu vực trung tâm (Right stage): Khung chữ nhật dọc chuẩn 9:16 trên nền đen tuyền (pitch black).
 * - Nút điều hướng Previous / Next cỡ lớn đặt nổi hai bên cạnh story card.
 * - Thanh tiến trình phân đoạn (segmented progress bars) trên đỉnh card.
 * - Dock tương tác ở chân card: Thanh gõ "Gửi tin nhắn..." + 7 biểu cảm Facebook nổi bật.
 */
export function StoryViewer({
  story,
  stories = [],
  embedded = false,
  onSelectStory,
  onClose,
  onReplySent,
}: StoryViewerProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const replyInputRef = useRef<HTMLInputElement>(null)

  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Local optimistic interaction state
  const [viewerReaction, setViewerReaction] = useState<string | null>(story.viewerReaction ?? null)
  const [reactionsCount, setReactionsCount] = useState<number>(story.reactionsCount ?? 0)

  // Lọc tin của mình và tin của bạn bè cho Sidebar
  const myStory = stories.find((s) => s.mine)
  const friendStories = stories.filter((s) => !s.mine)

  // Tập hợp các story của cùng tác giả hiện tại để vẽ Segmented Progress Bars
  const authorStories = stories.filter(
    (s) => (s.authorId && s.authorId === story.authorId) || s.name === story.name,
  )
  const authorStoryIndex = Math.max(
    0,
    authorStories.findIndex((s) => s.id === story.id),
  )

  // Index navigation trong toàn bộ stories
  const currentIndex = stories.findIndex((s) => s.id === story.id)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < stories.length - 1

  const viewMutation = useViewStory()
  const reactMutation = useReactStory()
  const unreactMutation = useUnreactStory()
  const likeMutation = useLikeStory()
  const unlikeMutation = useUnlikeStory()
  const muteMutation = useMuteAuthor()
  const replyMutation = useReplyStory()

  // Reset local state khi đổi story
  useEffect(() => {
    setProgress(0)
    setDraft('')
    setViewerReaction(story.viewerReaction ?? null)
    setReactionsCount(story.reactionsCount ?? 0)

    if (!story.mine && !story.viewed) {
      const timer = setTimeout(() => {
        viewMutation.mutate(story.id)
      }, 50)
      return () => clearTimeout(timer)
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
    if (story.allowReactions === false) {
      toast.error('Người đăng đã tắt tính năng bày tỏ cảm xúc trên tin này')
      return
    }

    // P0-2: Silent Like (chỉ hiện viewer list, không gửi tin nhắn DM)
    if (emoji === '❤️') {
      const isCurrentlyHeart = viewerReaction === '❤️'
      if (isCurrentlyHeart) {
        setViewerReaction(null)
        setReactionsCount((prev) => Math.max(0, prev - 1))
        try {
          await unlikeMutation.mutateAsync(story.id)
          toast.success(t('chat.unreactStorySuccess'))
        } catch {
          setViewerReaction('❤️')
          setReactionsCount((prev) => prev + 1)
        }
      } else {
        const prevReaction = viewerReaction
        setViewerReaction('❤️')
        setReactionsCount((prev) => prev + (prevReaction ? 0 : 1))
        try {
          await likeMutation.mutateAsync(story.id)
          toast.success('Đã thích tin')
        } catch {
          setViewerReaction(prevReaction)
          setReactionsCount((prev) => prev - (prevReaction ? 0 : 1))
        }
      }
      return
    }

    // Các biểu cảm khác (👍, 🥰, 😆, 😮, 😢, 😡): mirror sang tin nhắn 1:1
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

  const handleMuteAuthor = async () => {
    if (!story.authorId || story.mine) return
    try {
      await muteMutation.mutateAsync(story.authorId)
      toast.success(`Đã ẩn tin của ${authorTitle}`)
      handleNextStory()
    } catch {
      toast.error('Không thể ẩn tin của tác giả')
    }
  }

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (story.allowReplies === false) {
      toast.error('Người đăng đã tắt tính năng phản hồi tin nhắn trên tin này')
      return
    }
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
  const segmentsCount = Math.max(1, authorStories.length)

  if (embedded) {
    return (
      <div
        role="region"
        aria-label={t('chat.storyOf', { name: story.name })}
        className="relative flex h-full w-full flex-col items-center justify-between bg-black text-white select-none overflow-hidden font-sans pt-3 md:pt-4 pb-3"
      >
        {/* Mobile-only Back Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t('chat.closeStory')}
          className="md:hidden absolute top-3 left-3 z-30 grid size-9 place-items-center rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors cursor-pointer"
        >
          <ArrowLeft className="size-5" />
        </button>

        {/* Khung giữa: Nút Previous + Card Chuẩn Facebook Desktop 9:16 + Nút Next */}
        <div className="flex items-center justify-center w-full flex-1 min-h-0 relative px-2">
          {hasPrev ? (
            <button
              type="button"
              onClick={handlePrevStory}
              aria-label="Story trước"
              title="Story trước (Phím ←)"
              className="hidden md:grid size-12 place-items-center rounded-full bg-[#252728] hover:bg-[#3a3b3c] text-white shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer mr-6 lg:mr-10 shrink-0 ring-1 ring-white/10"
            >
              <ArrowLeft className="size-6" aria-hidden="true" />
            </button>
          ) : (
            <div className="hidden md:block w-12 mr-6 lg:mr-10 shrink-0" />
          )}

          {/* Story Card Lớn Chuẩn Facebook Desktop 9:16 */}
          <div
            className="story-card relative flex h-full max-h-[860px] aspect-[9/16] w-auto max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-xl md:rounded-2xl bg-neutral-950 shadow-2xl shadow-black ring-1 ring-white/10 transition-all select-none"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => {
              if (!draft.trim()) setIsPaused(false)
            }}
          >
            {/* Lớp hiển thị nội dung Story */}
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
                    'relative flex h-full w-full flex-col items-center justify-center px-6 py-20 text-center bg-linear-to-br',
                    story.background || TEXT_STORY_BG,
                  )}
                >
                  <BrandMark animated={false} className="size-16 sm:size-20 mb-6 drop-shadow-2xl opacity-95 transition-transform hover:scale-105" />
                  <p className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-snug drop-shadow-xl max-w-xs px-2 wrap-break-word text-center">
                    {story.caption || t('chat.storyGreeting', { name: story.name })}
                  </p>
                  {!story.caption && (
                    <p className="mt-4 text-xs sm:text-sm text-white/90 max-w-xs drop-shadow-md text-center">
                      {t('chat.storyBody')}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Vùng chạm điều hướng */}
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

            {/* Header trên Card: Segmented Progress Bar + Tác giả + Nhạc + Điều khiển */}
            <div className="absolute top-0 inset-x-0 z-20 flex flex-col gap-2.5 bg-linear-to-b from-black/85 via-black/45 to-transparent pt-3 pb-8 px-3.5 pointer-events-auto">
              {/* Segmented Progress Bars */}
              <div className="flex items-center gap-1.5 w-full" aria-hidden="true">
                {Array.from({ length: segmentsCount }).map((_, idx) => {
                  let segWidth = 0
                  if (idx < authorStoryIndex) {
                    segWidth = 100
                  } else if (idx === authorStoryIndex) {
                    segWidth = progress
                  } else {
                    segWidth = 0
                  }

                  return (
                    <div
                      key={idx}
                      className="h-1 flex-1 overflow-hidden rounded-full bg-white/30 backdrop-blur-xs"
                    >
                      <div
                        className="h-full rounded-full bg-white transition-[width] duration-100 ease-linear shadow-xs"
                        style={{ width: `${segWidth}%` }}
                      />
                    </div>
                  )
                })}
              </div>

              {/* Thông tin tác giả & Thẻ nhạc Facebook style */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserAvatar
                    name={story.name}
                    src={story.authorAvatar}
                    className="size-10 ring-2 ring-white/40 shadow-md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-bold text-white drop-shadow-sm leading-tight">
                        {authorTitle}
                      </p>
                      <span className="text-white/70 text-xs shrink-0">·</span>
                      <span className="text-white/80 text-xs shrink-0">{story.time || t('chat.now')}</span>
                      <span title="Bạn bè" className="flex items-center">
                        <UserGroup className="size-3.5 text-white/75 shrink-0" />
                      </span>
                    </div>

                    {/* Tag nhạc */}
                    <div className="flex items-center gap-1 mt-0.5 text-[11px] text-white/85 truncate">
                      <MusicNote className="size-3 text-white/80 shrink-0" />
                      <span className="truncate">Rapital · U Mê (feat. RPT Duke, RPT TC)</span>
                    </div>
                  </div>
                </div>

                {/* Nút điều khiển trong card */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsMuted((m) => !m)}
                    aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                    className="grid size-8 place-items-center rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-colors cursor-pointer"
                  >
                    {isMuted ? <VolumeMute className="size-4" /> : <VolumeHigh className="size-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPaused((p) => !p)}
                    aria-label={isPaused ? 'Phát tiếp' : 'Tạm dừng'}
                    className="grid size-8 place-items-center rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-colors cursor-pointer"
                  >
                    {isPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
                  </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="Tùy chọn khác"
                        onClick={() => setIsPaused(true)}
                        className="grid size-8 place-items-center rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-colors cursor-pointer"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 bg-[#242526] text-white border-[#3e4042]">
                      {!story.mine ? (
                        <>
                          <DropdownMenuItem
                            onClick={handleMuteAuthor}
                            className="text-rose-400 focus:bg-[#3a3b3c] focus:text-rose-400 cursor-pointer text-xs"
                          >
                            Ẩn tin của {authorTitle}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-[#3e4042]" />
                          <DropdownMenuItem
                            onClick={() => setIsSettingsOpen(true)}
                            className="focus:bg-[#3a3b3c] focus:text-white cursor-pointer text-xs"
                          >
                            Cài đặt tin
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
                          <DropdownMenuItem
                            onClick={() => {
                              onClose()
                              navigate(ROUTES.storiesArchive)
                            }}
                            className="focus:bg-[#3a3b3c] focus:text-white cursor-pointer text-xs"
                          >
                            Kho lưu trữ tin
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setIsSettingsOpen(true)}
                            className="focus:bg-[#3a3b3c] focus:text-white cursor-pointer text-xs"
                          >
                            Cài đặt tin
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>

          {/* Nút mũi tên Next ngoài khung story */}
          {hasNext ? (
            <button
              type="button"
              onClick={handleNextStory}
              aria-label="Story tiếp theo"
              title="Story tiếp theo (Phím →)"
              className="hidden md:grid size-12 place-items-center rounded-full bg-[#252728] hover:bg-[#3a3b3c] text-white shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer ml-6 lg:ml-10 shrink-0 ring-1 ring-white/10"
            >
              <ArrowRight className="size-6" aria-hidden="true" />
            </button>
          ) : (
            <div className="hidden md:block w-12 ml-6 lg:ml-10 shrink-0" />
          )}
        </div>

        {/* Bottom Interaction Dock — Chuẩn Facebook Web */}
        <footer className="w-full flex items-center justify-center pt-3 z-20 pointer-events-auto shrink-0">
          {!story.mine ? (
            <div className="flex items-center justify-center gap-2 sm:gap-3 max-w-[620px] w-full px-2">
              {/* Form phản hồi dạng viên thuốc */}
              {story.allowReplies === false ? (
                <div className="w-[240px] sm:w-[280px] md:w-[300px] flex h-11 items-center justify-center rounded-full border border-white/20 bg-black/40 px-4 text-xs text-white/50 select-none text-center">
                  Tác giả đã tắt tính năng phản hồi
                </div>
              ) : (
                <form onSubmit={handleSendReply} className="w-[240px] sm:w-[280px] md:w-[300px] shrink-0">
                  <label className="flex h-11 items-center rounded-full border border-white/35 bg-transparent hover:border-white/55 focus-within:border-white px-4 text-white text-sm transition-all shadow-md cursor-text">
                    <input
                      ref={replyInputRef}
                      type="text"
                      value={draft}
                      onFocus={() => setIsPaused(true)}
                      onBlur={() => {
                        if (!draft.trim()) setIsPaused(false)
                      }}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Gửi tin nhắn..."
                      aria-label="Gửi tin nhắn..."
                      className="h-11 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/70"
                    />
                    {draft.trim() && (
                      <button
                        type="submit"
                        disabled={isSending}
                        aria-label={t('chat.sendMessage')}
                        className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-40 ml-1 shrink-0"
                      >
                        <Send className="size-4" aria-hidden="true" />
                      </button>
                    )}
                  </label>
                </form>
              )}

              {/* Dải 7 biểu cảm Facebook */}
              <div
                className={cn(
                  'flex items-center gap-1 sm:gap-1.5 shrink-0',
                  story.allowReactions === false && 'opacity-40 pointer-events-none',
                )}
                role="toolbar"
                aria-label={t('chat.reactions')}
                title={story.allowReactions === false ? 'Tác giả đã tắt bày tỏ cảm xúc' : undefined}
              >
                {FACEBOOK_REACTIONS.map(({ emoji, label }) => {
                  const isActive = viewerReaction === emoji
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleToggleReaction(emoji)}
                      className={cn(
                        'grid size-9.5 sm:size-10 place-items-center rounded-full transition-transform duration-150 hover:scale-130 active:scale-95 cursor-pointer',
                        isActive && 'scale-115 ring-2 ring-white shadow-md',
                      )}
                      aria-label={`${isActive ? t('chat.unreactStory') : t('chat.reactStorySuccess')} ${emoji}`}
                      title={`${label} (${emoji})`}
                    >
                      {emoji === '👍' ? (
                        <span className="grid size-8 sm:size-9 place-items-center rounded-full bg-[#1877F2] text-white shadow-md">
                          <svg className="size-4.5 sm:size-5 fill-white text-white" viewBox="0 0 24 24">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                          </svg>
                        </span>
                      ) : emoji === '❤️' ? (
                        <span className="grid size-8 sm:size-9 place-items-center rounded-full bg-gradient-to-tr from-[#E41E3F] to-[#FA383E] text-white shadow-md">
                          <svg className="size-4.5 sm:size-5 fill-white text-white" viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          </svg>
                        </span>
                      ) : (
                        <span className="text-[26px] sm:text-[30px] leading-none select-none drop-shadow-sm">{emoji}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-6 rounded-full bg-[#18191a]/85 border border-white/20 px-6 py-2.5 text-sm text-white shadow-xl backdrop-blur-md">
              <span className="flex items-center gap-2 font-semibold">
                <Eye className="size-4.5 text-[#2e89ff]" aria-hidden="true" />
                <span>{story.viewsCount ?? 0} người xem</span>
              </span>
              <span className="text-white/40">·</span>
              <span className="flex items-center gap-2 font-semibold">
                <Heart className="size-4.5 text-rose-500 fill-rose-500" aria-hidden="true" />
                <span>{reactionsCount} cảm xúc</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  navigate(ROUTES.storiesArchive)
                }}
                className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <Archive className="size-4" />
                <span>Kho lưu trữ</span>
              </button>
            </div>
          )}
        </footer>
        <StorySettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      </div>
    )
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('chat.storyOf', { name: story.name })}
      className="fixed inset-0 z-50 flex h-screen w-screen bg-black text-white select-none overflow-hidden font-sans"
      onClick={onClose}
    >
      {/* =========================================================================
          CỘT BÊN TRÁI: SIDEBAR KIỂU FACEBOOK WEB (WIDTH ~360px)
         ========================================================================= */}
      <aside
        className="hidden md:flex flex-col w-[340px] lg:w-[360px] xl:w-[380px] shrink-0 h-full bg-[#18191a] border-r border-[#2f3031] text-[#e4e6eb] z-30 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header: Nút X đóng + Logo ứng dụng */}
        <div className="flex items-center gap-3 px-4 pt-3.5 pb-2 border-b border-[#2f3031]">
          <button
            type="button"
            onClick={onClose}
            aria-label={t('chat.closeStory')}
            title={`${t('chat.closeStory')} (Esc)`}
            className="grid size-10 place-items-center rounded-full bg-[#3a3b3c] hover:bg-[#4e4f50] text-white transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <BrandMark animated={false} className="size-9 drop-shadow-md" />
            <span className="font-bold text-white text-base tracking-tight hidden lg:inline">
              LemonChat
            </span>
          </div>
        </div>

        {/* Tiêu đề "Tin" + Liên kết Kho lưu trữ / Cài đặt */}
        <div className="px-4 pt-3.5 pb-2">
          <div className="flex items-baseline justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-white">Tin</h1>
            <div className="flex items-center gap-1.5 text-xs text-[#2e89ff]">
              <button
                type="button"
                onClick={() => navigate(ROUTES.storiesCreate)}
                className="hover:underline cursor-pointer flex items-center gap-1"
              >
                <Archive className="size-3.5" />
                <span>Kho lưu trữ</span>
              </button>
              <span className="text-[#b0b3b8]">·</span>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="hover:underline cursor-pointer flex items-center gap-1"
              >
                <Settings className="size-3.5" />
                <span>Cài đặt</span>
              </button>
            </div>
          </div>
        </div>

        {/* Danh sách cuộn chứa Tin của bạn & Tất cả tin */}
        <div className="flex-1 overflow-y-auto px-2 space-y-4 py-2 scrollbar-thin">
          {/* MỤC 1: TIN CỦA BẠN */}
          <div>
            <h2 className="text-[13px] font-semibold text-[#b0b3b8] px-2 mb-1.5 uppercase tracking-wider">
              Tin của bạn
            </h2>

            {/* Nút Tạo tin chuẩn Facebook */}
            <button
              type="button"
              onClick={() => navigate(ROUTES.storiesCreate)}
              className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-[#252728] cursor-pointer group"
            >
              <div className="grid size-12 place-items-center rounded-full bg-[#2e89ff]/15 text-[#2e89ff] group-hover:bg-[#2e89ff]/25 transition-colors shrink-0">
                <Plus className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-white leading-snug">Tạo tin</p>
                <p className="text-xs text-[#b0b3b8] truncate">
                  Chia sẻ ảnh, video hoặc viết gì đó
                </p>
              </div>
            </button>

            {/* Tin đã đăng của bạn (nếu có) */}
            {myStory && (
              <button
                type="button"
                onClick={() => onSelectStory?.(myStory)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors cursor-pointer mt-1',
                  story.id === myStory.id ? 'bg-[#3a3b3c]' : 'hover:bg-[#252728]',
                )}
              >
                <UserAvatar
                  name={myStory.name}
                  src={myStory.authorAvatar}
                  className="size-12 ring-2 ring-[#2e89ff] ring-offset-2 ring-offset-[#18191a]"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-white truncate">{myStory.name}</p>
                  <p className="text-xs text-[#b0b3b8] truncate flex items-center gap-1.5">
                    <span>{myStory.time || t('chat.now')}</span>
                    {myStory.viewsCount !== undefined && (
                      <span>· {myStory.viewsCount} lượt xem</span>
                    )}
                  </p>
                </div>
              </button>
            )}
          </div>

          {/* MỤC 2: TẤT CẢ TIN (BẠN BÈ) */}
          <div>
            <h2 className="text-[13px] font-semibold text-[#b0b3b8] px-2 mb-1.5 uppercase tracking-wider">
              Tất cả tin
            </h2>

            {friendStories.length === 0 ? (
              <p className="px-2 py-4 text-xs text-[#b0b3b8] text-center">
                Chưa có tin nào từ bạn bè
              </p>
            ) : (
              <div className="space-y-0.5">
                {friendStories.map((s) => {
                  const isSelected = s.id === story.id
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onSelectStory?.(s)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors cursor-pointer',
                        isSelected ? 'bg-[#3a3b3c]' : 'hover:bg-[#252728]',
                      )}
                    >
                      <UserAvatar
                        name={s.name}
                        src={s.authorAvatar}
                        className={cn(
                          'size-13',
                          s.viewed
                            ? 'ring-2 ring-[#4e4f50] ring-offset-2 ring-offset-[#18191a]'
                            : 'ring-2 ring-[#2e89ff] ring-offset-2 ring-offset-[#18191a]',
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold text-white truncate leading-snug">
                          {s.name}
                        </p>
                        <p className="text-xs text-[#b0b3b8] truncate flex items-center gap-1">
                          <span>
                            {s.viewed ? s.time : `1 thẻ mới · ${s.time || t('chat.now')}`}
                          </span>
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* =========================================================================
          KHU VỰC CHÍNH (RIGHT STAGE): NỀN ĐEN TUYỀN + CARD 9:16 + NÚT CHUYỂN TRANG
         ========================================================================= */}
      <main
        className="flex-1 h-full bg-black relative flex flex-col items-center justify-between pt-3 md:pt-4 pb-3 overflow-hidden select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Top Controls trong Modal */}
        <div className="absolute top-3 inset-x-4 z-30 flex items-center justify-between pointer-events-none">
          {/* Mobile Back / App icon */}
          <div className="flex md:hidden items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={onClose}
              aria-label={t('chat.closeStory')}
              className="grid size-9 place-items-center rounded-full bg-[#252728] hover:bg-[#3a3b3c] text-white transition-colors cursor-pointer"
            >
              <X className="size-5" />
            </button>
            <BrandMark animated={false} className="size-7" />
          </div>

          <div className="hidden md:block" />

          {/* Desktop Controls (Thoát, Âm thanh, v.v.) */}
          <div className="flex items-center gap-2 ml-auto pointer-events-auto">
            <button
              type="button"
              onClick={onClose}
              aria-label={t('chat.closeStory')}
              title={`${t('chat.closeStory')} (Esc)`}
              className="hidden md:grid size-10 place-items-center rounded-full bg-[#252728] hover:bg-[#3a3b3c] text-white transition-colors cursor-pointer ring-1 ring-white/10"
            >
              <X className="size-5" />
            </button>

            {user && (
              <UserAvatar
                name={user.fullName}
                src={user.avatarUrl}
                className="ml-1 size-10 ring-1 ring-white/20"
              />
            )}
          </div>
        </div>

        {/* Khung giữa: Nút Previous + Card 9:16 + Nút Next */}
        <div className="flex items-center justify-center w-full flex-1 relative px-2 min-h-0 py-1">
          {/* Nút mũi tên Previous ngoài khung story */}
          {hasPrev ? (
            <button
              type="button"
              onClick={handlePrevStory}
              aria-label="Story trước"
              title="Story trước (Phím ←)"
              className="hidden md:grid size-12 place-items-center rounded-full bg-[#252728] hover:bg-[#3a3b3c] text-white shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer mr-6 lg:mr-10 shrink-0 ring-1 ring-white/10"
            >
              <ArrowLeft className="size-6" aria-hidden="true" />
            </button>
          ) : (
            <div className="hidden md:block w-12 mr-6 lg:mr-10 shrink-0" />
          )}

          {/* Story Card Lớn Chuẩn Facebook Desktop */}
          <div
            className="story-card relative flex h-full max-h-[860px] aspect-[9/16] w-auto max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-xl md:rounded-2xl bg-neutral-950 shadow-2xl shadow-black ring-1 ring-white/10 transition-all select-none"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => {
              if (!draft.trim()) setIsPaused(false)
            }}
          >
            {/* Lớp hiển thị nội dung Story */}
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
                    'relative flex h-full w-full flex-col items-center justify-center px-6 py-20 text-center bg-linear-to-br',
                    story.background || TEXT_STORY_BG,
                  )}
                >
                  <BrandMark animated={false} className="size-16 sm:size-20 mb-6 drop-shadow-2xl opacity-95 transition-transform hover:scale-105" />
                  <p className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-snug drop-shadow-xl max-w-xs px-2 wrap-break-word text-center">
                    {story.caption || t('chat.storyGreeting', { name: story.name })}
                  </p>
                  {!story.caption && (
                    <p className="mt-4 text-xs sm:text-sm text-white/90 max-w-xs drop-shadow-md text-center">
                      {t('chat.storyBody')}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Vùng chạm điều hướng (Touch Zones kiểu Facebook/Instagram) */}
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

            {/* Header trên Card: Thanh tiến trình phân đoạn + Thông tin tác giả + Âm nhạc */}
            <div className="absolute top-0 inset-x-0 z-20 flex flex-col gap-3 bg-linear-to-b from-black/85 via-black/45 to-transparent pt-3 pb-10 px-3.5 pointer-events-auto">
              {/* Thanh tiến trình phân đoạn (Segmented Progress Bars) */}
              <div className="flex items-center gap-1.5 w-full" aria-hidden="true">
                {Array.from({ length: segmentsCount }).map((_, idx) => {
                  let segWidth = 0
                  if (idx < authorStoryIndex) {
                    segWidth = 100
                  } else if (idx === authorStoryIndex) {
                    segWidth = progress
                  } else {
                    segWidth = 0
                  }

                  return (
                    <div
                      key={idx}
                      className="h-1 flex-1 overflow-hidden rounded-full bg-white/30 backdrop-blur-xs"
                    >
                      <div
                        className="h-full rounded-full bg-white transition-[width] duration-100 ease-linear shadow-xs"
                        style={{ width: `${segWidth}%` }}
                      />
                    </div>
                  )
                })}
              </div>

              {/* Thông tin tác giả & Thẻ nhạc Facebook style */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserAvatar
                    name={story.name}
                    src={story.authorAvatar}
                    className="size-10 ring-2 ring-white/40 shadow-md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm sm:text-base font-bold text-white drop-shadow-sm leading-tight">
                        {authorTitle}
                      </p>
                      <span className="text-white/70 text-xs shrink-0">·</span>
                      <span className="text-white/80 text-xs shrink-0">{story.time || t('chat.now')}</span>
                      <span title="Bạn bè" className="flex items-center">
                        <UserGroup className="size-3.5 text-white/75 shrink-0" />
                      </span>
                    </div>

                    {/* Tag nhạc kiểu Facebook Stories (nếu có caption hoặc audio) */}
                    <div className="flex items-center gap-1 mt-0.5 text-[11px] text-white/85 truncate">
                      <MusicNote className="size-3 text-white/80 shrink-0" />
                      <span className="truncate">Rapital · U Mê (feat. RPT Duke, RPT TC)</span>
                    </div>
                  </div>
                </div>

                {/* Các nút bấm điều khiển nhỏ trong Card */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsMuted((m) => !m)}
                    aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                    className="grid size-8 place-items-center rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-colors"
                  >
                    {isMuted ? <VolumeMute className="size-4" /> : <VolumeHigh className="size-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPaused((p) => !p)}
                    aria-label={isPaused ? 'Phát tiếp' : 'Tạm dừng'}
                    className="grid size-8 place-items-center rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-colors"
                  >
                    {isPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
                  </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="Tùy chọn khác"
                        onClick={() => setIsPaused(true)}
                        className="grid size-8 place-items-center rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-colors cursor-pointer"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 bg-[#242526] text-white border-[#3e4042]">
                      {!story.mine ? (
                        <>
                          <DropdownMenuItem
                            onClick={handleMuteAuthor}
                            className="text-rose-400 focus:bg-[#3a3b3c] focus:text-rose-400 cursor-pointer text-xs"
                          >
                            Ẩn tin của {authorTitle}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-[#3e4042]" />
                          <DropdownMenuItem
                            onClick={() => setIsSettingsOpen(true)}
                            className="focus:bg-[#3a3b3c] focus:text-white cursor-pointer text-xs"
                          >
                            Cài đặt tin
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
                          <DropdownMenuItem
                            onClick={() => {
                              onClose()
                              navigate(ROUTES.storiesArchive)
                            }}
                            className="focus:bg-[#3a3b3c] focus:text-white cursor-pointer text-xs"
                          >
                            Kho lưu trữ tin
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setIsSettingsOpen(true)}
                            className="focus:bg-[#3a3b3c] focus:text-white cursor-pointer text-xs"
                          >
                            Cài đặt tin
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>

          {/* Nút mũi tên Next ngoài khung story */}
          {hasNext ? (
            <button
              type="button"
              onClick={handleNextStory}
              aria-label="Story tiếp theo"
              title="Story tiếp theo (Phím →)"
              className="hidden md:grid size-12 place-items-center rounded-full bg-[#252728] hover:bg-[#3a3b3c] text-white shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer ml-6 lg:ml-10 shrink-0 ring-1 ring-white/10"
            >
              <ArrowRight className="size-6" aria-hidden="true" />
            </button>
          ) : (
            <div className="hidden md:block w-12 ml-6 lg:mr-10 shrink-0" />
          )}
        </div>

        {/* =========================================================================
            BOTTOM INTERACTION DOCK: NẰM DƯỚI CÙNG CARD KIỂU FACEBOOK WEB
           ========================================================================= */}
        <footer className="w-full flex items-center justify-center pt-3 z-20 pointer-events-auto shrink-0">
          {!story.mine ? (
            <div className="flex items-center justify-center gap-2 sm:gap-3 max-w-[620px] w-full px-2">
              {/* Form phản hồi dạng viên thuốc */}
              {story.allowReplies === false ? (
                <div className="w-[240px] sm:w-[280px] md:w-[300px] flex h-11 items-center justify-center rounded-full border border-white/20 bg-black/40 px-4 text-xs text-white/50 select-none text-center">
                  Tác giả đã tắt tính năng phản hồi
                </div>
              ) : (
                <form onSubmit={handleSendReply} className="w-[240px] sm:w-[280px] md:w-[300px] shrink-0">
                  <label className="flex h-11 items-center rounded-full border border-white/35 bg-transparent hover:border-white/55 focus-within:border-white px-4 text-white text-sm transition-all shadow-md cursor-text">
                    <input
                      ref={replyInputRef}
                      type="text"
                      value={draft}
                      onFocus={() => setIsPaused(true)}
                      onBlur={() => {
                        if (!draft.trim()) setIsPaused(false)
                      }}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Gửi tin nhắn..."
                      aria-label="Gửi tin nhắn..."
                      className="h-11 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/70"
                    />
                    {draft.trim() && (
                      <button
                        type="submit"
                        disabled={isSending}
                        aria-label={t('chat.sendMessage')}
                        className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-40 ml-1 shrink-0"
                      >
                        <Send className="size-4" aria-hidden="true" />
                      </button>
                    )}
                  </label>
                </form>
              )}

              {/* Dải 7 biểu cảm Facebook */}
              <div
                className={cn(
                  'flex items-center gap-1 sm:gap-1.5 shrink-0',
                  story.allowReactions === false && 'opacity-40 pointer-events-none',
                )}
                role="toolbar"
                aria-label={t('chat.reactions')}
                title={story.allowReactions === false ? 'Tác giả đã tắt bày tỏ cảm xúc' : undefined}
              >
                {FACEBOOK_REACTIONS.map(({ emoji, label }) => {
                  const isActive = viewerReaction === emoji
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleToggleReaction(emoji)}
                      className={cn(
                        'grid size-9.5 sm:size-10 place-items-center rounded-full transition-transform duration-150 hover:scale-130 active:scale-95 cursor-pointer',
                        isActive && 'scale-115 ring-2 ring-white shadow-md',
                      )}
                      aria-label={`${isActive ? t('chat.unreactStory') : t('chat.reactStorySuccess')} ${emoji}`}
                      title={`${label} (${emoji})`}
                    >
                      {emoji === '👍' ? (
                        <span className="grid size-8 sm:size-9 place-items-center rounded-full bg-[#1877F2] text-white shadow-md">
                          <svg className="size-4.5 sm:size-5 fill-white text-white" viewBox="0 0 24 24">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                          </svg>
                        </span>
                      ) : emoji === '❤️' ? (
                        <span className="grid size-8 sm:size-9 place-items-center rounded-full bg-gradient-to-tr from-[#E41E3F] to-[#FA383E] text-white shadow-md">
                          <svg className="size-4.5 sm:size-5 fill-white text-white" viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          </svg>
                        </span>
                      ) : (
                        <span className="text-[26px] sm:text-[30px] leading-none select-none drop-shadow-sm">{emoji}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Thông tin lượt xem dành cho Story của chính mình */
            <div className="flex items-center justify-center gap-6 rounded-full bg-[#18191a]/85 border border-white/20 px-6 py-2.5 text-sm text-white shadow-xl backdrop-blur-md">
              <span className="flex items-center gap-2 font-semibold">
                <Eye className="size-4.5 text-[#2e89ff]" aria-hidden="true" />
                <span>{story.viewsCount ?? 0} người xem</span>
              </span>
              <span className="text-white/40">·</span>
              <span className="flex items-center gap-2 font-semibold">
                <Heart className="size-4.5 text-rose-500 fill-rose-500" aria-hidden="true" />
                <span>{reactionsCount} cảm xúc</span>
              </span>
            </div>
          )}
        </footer>
      </main>
      <StorySettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </div>
  )
}
