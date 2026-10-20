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
import { ROUTES } from '@/config/constants'
import { useAuth } from '@/features/auth/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { avatarColor, initials } from '../data/mockData'
import { storyDisplayName, TEXT_STORY_BG } from '../data/storiesData'
import { useReactStory, useReplyStory, useUnreactStory, useViewStory } from '../hooks/useStories'
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
  const replyMutation = useReplyStory()

  // Reset local state khi đổi story
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
  const segmentsCount = Math.max(1, authorStories.length)

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
                onClick={() => navigate(ROUTES.settings)}
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
                <span
                  className="grid size-12 shrink-0 place-items-center rounded-full text-sm font-bold text-foreground ring-2 ring-[#2e89ff] ring-offset-2 ring-offset-[#18191a]"
                  style={{ backgroundColor: avatarColor(myStory.name) }}
                >
                  {initials(myStory.name)}
                </span>
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
                      <span
                        className={cn(
                          'grid size-13 shrink-0 place-items-center rounded-full text-sm font-bold text-foreground',
                          s.viewed
                            ? 'ring-2 ring-[#4e4f50] ring-offset-2 ring-offset-[#18191a]'
                            : 'ring-2 ring-[#2e89ff] ring-offset-2 ring-offset-[#18191a]',
                        )}
                        style={{ backgroundColor: avatarColor(s.name) }}
                      >
                        {initials(s.name)}
                      </span>
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
        className="flex-1 h-full bg-black relative flex flex-col items-center justify-between p-3 md:p-6 overflow-hidden select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header trên Right Stage */}
        <header className="w-full flex items-center justify-between z-20 pointer-events-auto">
          {/* Mobile-only header (Back / App name) */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              aria-label={t('chat.closeStory')}
              className="grid size-9 place-items-center rounded-full bg-[#242526] hover:bg-[#3a3b3c] text-white transition-colors"
            >
              <X className="size-5" />
            </button>
            <BrandMark animated={false} className="size-7" />
          </div>

          <div className="hidden md:block" />

          {/* Top-right Action Buttons (Âm thanh, Tạm dừng, Thoát, Avatar người dùng) */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setIsMuted((m) => !m)}
              aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              className="grid size-10 place-items-center rounded-full bg-[#242526] hover:bg-[#3a3b3c] text-white transition-colors cursor-pointer"
            >
              {isMuted ? <VolumeMute className="size-5" /> : <VolumeHigh className="size-5" />}
            </button>

            <button
              type="button"
              onClick={() => setIsPaused((p) => !p)}
              aria-label={isPaused ? 'Phát tiếp' : 'Tạm dừng'}
              title={isPaused ? 'Phát tiếp (Phím cách)' : 'Tạm dừng (Phím cách)'}
              className="grid size-10 place-items-center rounded-full bg-[#242526] hover:bg-[#3a3b3c] text-white transition-colors cursor-pointer"
            >
              {isPaused ? <Play className="size-5" /> : <Pause className="size-5" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label={t('chat.closeStory')}
              title={`${t('chat.closeStory')} (Esc)`}
              className="hidden md:grid size-10 place-items-center rounded-full bg-[#242526] hover:bg-[#3a3b3c] text-white transition-colors cursor-pointer"
            >
              <X className="size-5" />
            </button>

            {user && (
              <span
                className="grid size-10 shrink-0 place-items-center rounded-full text-xs font-bold text-foreground ring-1 ring-white/20 ml-1"
                style={{ backgroundColor: avatarColor(user.fullName) }}
                title={user.fullName}
              >
                {initials(user.fullName)}
              </span>
            )}
          </div>
        </header>

        {/* Khung giữa: Nút Previous + Card 9:16 + Nút Next */}
        <div className="flex items-center justify-center w-full flex-1 relative my-auto">
          {/* Nút mũi tên Previous ngoài khung story */}
          {hasPrev ? (
            <button
              type="button"
              onClick={handlePrevStory}
              aria-label="Story trước"
              title="Story trước (Phím ←)"
              className="hidden md:grid size-12 place-items-center rounded-full bg-[#242526]/90 hover:bg-[#3a3b3c] text-white shadow-2xl transition-all hover:scale-110 active:scale-95 cursor-pointer mr-4 lg:mr-8 shrink-0 ring-1 ring-white/10"
            >
              <ArrowLeft className="size-6" aria-hidden="true" />
            </button>
          ) : (
            <div className="hidden md:block w-12 mr-4 lg:mr-8 shrink-0" />
          )}

          {/* Story Card Chuẩn 9:16 Mobile-in-Desktop View */}
          <div
            className="story-card relative flex h-[72vh] sm:h-[76vh] md:h-[80vh] lg:h-[82vh] max-h-[860px] aspect-[9/16] flex-col overflow-hidden rounded-2xl bg-neutral-950 shadow-2xl shadow-black ring-1 ring-white/15 transition-all select-none"
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
                    'relative flex h-full w-full flex-col items-center justify-center px-8 py-28 text-center bg-linear-to-br',
                    story.background || TEXT_STORY_BG,
                  )}
                >
                  <BrandMark animated={false} className="size-16 mb-6 drop-shadow-xl opacity-90" />
                  <p className="text-2xl sm:text-3xl font-extrabold text-white leading-relaxed drop-shadow-lg max-w-sm wrap-break-word">
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
                  <span
                    aria-hidden="true"
                    className="grid size-10 shrink-0 place-items-center rounded-full text-[13px] font-bold text-foreground ring-2 ring-white/40 shadow-md"
                    style={{ backgroundColor: avatarColor(story.name) }}
                  >
                    {initials(story.name)}
                  </span>
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

                  <button
                    type="button"
                    aria-label="Tùy chọn khác"
                    className="grid size-8 place-items-center rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-colors"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
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
              className="hidden md:grid size-12 place-items-center rounded-full bg-[#242526]/90 hover:bg-[#3a3b3c] text-white shadow-2xl transition-all hover:scale-110 active:scale-95 cursor-pointer ml-4 lg:ml-8 shrink-0 ring-1 ring-white/10"
            >
              <ArrowRight className="size-6" aria-hidden="true" />
            </button>
          ) : (
            <div className="hidden md:block w-12 ml-4 lg:ml-8 shrink-0" />
          )}
        </div>

        {/* =========================================================================
            BOTTOM INTERACTION DOCK: NẰM DƯỚI CÙNG CARD KIỂU FACEBOOK WEB
           ========================================================================= */}
        <footer className="w-full max-w-[620px] flex items-center justify-center gap-3 pt-2 pb-1 px-2 z-20 pointer-events-auto">
          {!story.mine ? (
            <>
              {/* Thanh gõ tin nhắn phản hồi story 1:1 kiểu Facebook */}
              <form onSubmit={handleSendReply} className="flex-1 min-w-[200px] max-w-[340px]">
                <label className="flex h-11 items-center rounded-full bg-[#18191a]/85 hover:bg-[#242526] focus-within:bg-[#242526] border border-white/20 focus-within:border-white/50 px-4 text-white text-sm backdrop-blur-md transition-all shadow-lg cursor-text">
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
                    className="h-11 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/60"
                  />
                  {draft.trim() && (
                    <button
                      type="submit"
                      disabled={isSending}
                      aria-label={t('chat.sendMessage')}
                      className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
                    >
                      <Send className="size-4" aria-hidden="true" />
                    </button>
                  )}
                </label>
              </form>

              {/* Dải 7 biểu cảm Facebook nổi bật đặt cạnh thanh gửi tin nhắn */}
              <div
                className="flex items-center gap-1 sm:gap-1.5"
                role="toolbar"
                aria-label={t('chat.reactions')}
              >
                {FACEBOOK_REACTIONS.map(({ emoji, label }) => {
                  const isActive = viewerReaction === emoji
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleToggleReaction(emoji)}
                      className={cn(
                        'grid size-9 sm:size-10 place-items-center rounded-full text-2xl sm:text-3xl transition-transform duration-150 hover:scale-135 active:scale-95 cursor-pointer',
                        isActive && 'scale-120 bg-white/20 ring-2 ring-white shadow-md',
                      )}
                      aria-label={`${isActive ? t('chat.unreactStory') : t('chat.reactStorySuccess')} ${emoji}`}
                      title={`${label} (${emoji})`}
                    >
                      <span className="filter drop-shadow-md">{emoji}</span>
                    </button>
                  )
                })}
              </div>
            </>
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
    </div>
  )
}
