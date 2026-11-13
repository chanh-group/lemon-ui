import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Pause,
  Play,
  Trash2,
  Pencil,
  X,
  Send,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TEXT_STORY_BG, storyDisplayName } from '../data/storiesData'
import { cn } from '@/lib/utils'
import {
  useDeleteStory,
  useLikeStory,
  useMuteAuthor,
  useReactStory,
  useReplyStory,
  useStoryMedia,
  useStoryViews,
  useUnlikeStory,
  useUnreactStory,
  useUpdateStory,
  useViewStory,
} from '../hooks/useStories'
import type { StoryEntry, StoryReactionType } from '../types/chat.types'

interface StoryViewerProps {
  story: StoryEntry
  stories?: StoryEntry[]
  embedded?: boolean
  onSelectStory?: (story: StoryEntry) => void
  onClose: () => void
  onReplySent?: (story: StoryEntry, text: string) => void
}

const reactions: StoryReactionType[] = ['👍', '❤️', '🥰', '😆', '😮', '😢', '😡']

export function StoryViewer({
  story,
  stories = [],
  embedded = false,
  onSelectStory,
  onClose,
  onReplySent,
}: StoryViewerProps) {
  const { t } = useTranslation()
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(true)
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const [caption, setCaption] = useState(story.caption ?? '')
  const [allowReplies, setAllowReplies] = useState(story.allowReplies !== false)
  const [allowReactions, setAllowReactions] = useState(story.allowReactions !== false)
  // Bản nháp riêng cho dialog sửa: đóng dialog không làm đổi nội dung đang hiển thị.
  const [editCaption, setEditCaption] = useState('')
  const [editAllowReplies, setEditAllowReplies] = useState(true)
  const [editAllowReactions, setEditAllowReactions] = useState(true)
  const [showViews, setShowViews] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const items = stories.length ? stories : [story]
  const index = items.findIndex((item) => item.id === story.id)
  const sameAuthor = items.filter((item) =>
    item.authorId ? item.authorId === story.authorId : item.id === story.id,
  )
  const media = useStoryMedia(story)
  const mediaUrl = story.mediaUrl || media.data
  const views = useStoryViews(story.mine && showViews ? story.id : undefined)
  const view = useViewStory()
  const react = useReactStory()
  const unreact = useUnreactStory()
  const like = useLikeStory()
  const unlike = useUnlikeStory()
  const reply = useReplyStory()
  const update = useUpdateStory()
  const remove = useDeleteStory()
  const mute = useMuteAuthor()
  const [reaction, setReaction] = useState(story.viewerReaction ?? null)
  const [reactionKind, setReactionKind] = useState(story.myReactionKind ?? null)
  const isVideo = story.mediaType === 'video'
  const isMedia = story.kind === 'MEDIA' || story.kind === 'media' || Boolean(story.mediaUrl)
  const stopped = paused || editing || showViews || confirmDelete || Boolean(draft)

  const next = () => {
    if (index >= 0 && index < items.length - 1 && onSelectStory) onSelectStory(items[index + 1])
    else onClose()
  }
  const previous = () => {
    if (index > 0 && onSelectStory) onSelectStory(items[index - 1])
  }

  useEffect(() => {
    setProgress(0)
    setPaused(false)
    setDraft('')
    setEditing(false)
    setShowViews(false)
    setCaption(story.caption ?? '')
    setAllowReplies(story.allowReplies !== false)
    setAllowReactions(story.allowReactions !== false)
    setReaction(story.viewerReaction ?? null)
    setReactionKind(story.myReactionKind ?? null)
    if (!story.mine && !story.viewed) view.mutate(story.id)
    // Reset for each selected story, not for query refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story.id])

  useEffect(() => {
    if (stopped || isVideo || (isMedia && !mediaUrl)) return
    const timer = window.setInterval(() => setProgress((value) => Math.min(100, value + 2)), 100)
    return () => window.clearInterval(timer)
  }, [stopped, isVideo, isMedia, story.id, mediaUrl])
  useEffect(() => {
    if (progress >= 100) next()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress])
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (stopped) video.pause()
    else void video.play().catch(() => setPaused(true))
  }, [stopped, mediaUrl, story.id])
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        editing ||
        showViews ||
        confirmDelete
      )
        return
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') previous()
      if (event.key === 'ArrowRight') next()
      if (event.key === ' ') {
        event.preventDefault()
        setPaused((value) => !value)
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })

  async function toggleReaction(emoji: StoryReactionType) {
    try {
      if (reaction === emoji) {
        if (reactionKind === 'LIKE') await unlike.mutateAsync(story.id)
        else await unreact.mutateAsync(story.id)
        setReaction(null)
        setReactionKind(null)
      } else {
        if (emoji === '❤️') {
          await like.mutateAsync(story.id)
          setReactionKind('LIKE')
        } else {
          await react.mutateAsync({ storyId: story.id, reaction: emoji })
          setReactionKind('REACTION')
        }
        setReaction(emoji)
      }
    } catch {
      toast.error(
        t('chat.storyActionError', {
          defaultValue: 'Không thể thực hiện thao tác. Vui lòng thử lại.',
        }),
      )
    }
  }
  async function sendReply(event: React.FormEvent) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || reply.isPending) return
    try {
      await reply.mutateAsync({ storyId: story.id, payload: { content: text } })
      setDraft('')
      onReplySent?.(story, text)
      toast.success(t('chat.replyStorySuccess'))
    } catch {
      toast.error(t('chat.replyStoryError'))
    }
  }
  function openEdit() {
    setEditCaption(caption)
    setEditAllowReplies(allowReplies)
    setEditAllowReactions(allowReactions)
    setEditing(true)
  }
  async function saveEdit() {
    if (story.kind === 'TEXT' && !editCaption.trim()) return
    try {
      await update.mutateAsync({
        id: story.id,
        payload: {
          caption: editCaption.trim(),
          allowReplies: editAllowReplies,
          allowReactions: editAllowReactions,
        },
      })
      setCaption(editCaption.trim())
      setAllowReplies(editAllowReplies)
      setAllowReactions(editAllowReactions)
      setEditing(false)
      toast.success(t('chat.storySaved', { defaultValue: 'Đã cập nhật tin' }))
    } catch {
      toast.error(
        t('chat.storyActionError', {
          defaultValue: 'Không thể thực hiện thao tác. Vui lòng thử lại.',
        }),
      )
    }
  }
  async function deleteCurrent() {
    try {
      await remove.mutateAsync(story.id)
      setConfirmDelete(false)
      onClose()
      toast.success(t('chat.storyDeleted', { defaultValue: 'Đã xóa tin' }))
    } catch {
      toast.error(
        t('chat.storyActionError', {
          defaultValue: 'Không thể thực hiện thao tác. Vui lòng thử lại.',
        }),
      )
    }
  }

  async function muteCurrentAuthor() {
    if (!story.authorId) return
    try {
      await mute.mutateAsync(story.authorId)
      onClose()
      toast.success(t('chat.storyMuted'))
    } catch {
      toast.error(t('chat.storyActionError'))
    }
  }

  const name = storyDisplayName(story, t)
  const actionClass =
    'grid size-10 place-items-center rounded-full bg-background/75 text-foreground shadow-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring'
  return (
    <div
      role={embedded ? undefined : 'dialog'}
      aria-modal={embedded ? undefined : true}
      aria-label={embedded ? undefined : name}
      className={cn(
        'z-40 flex min-h-0 w-full items-center justify-center bg-background text-foreground',
        embedded ? 'relative h-full' : 'fixed inset-0',
      )}
    >
      <button
        type="button"
        onClick={onClose}
        className={cn(actionClass, 'absolute left-3 top-3 z-20')}
        aria-label={t('common.close', { defaultValue: 'Đóng' })}
      >
        <X size={20} />
      </button>
      <button
        type="button"
        onClick={previous}
        disabled={index <= 0}
        className={cn(
          actionClass,
          'absolute left-3 top-1/2 z-20 hidden disabled:opacity-30 md:grid',
        )}
        aria-label={t('chat.previousStory', { defaultValue: 'Tin trước' })}
      >
        <ArrowLeft size={20} />
      </button>
      <section
        className="relative flex h-full w-full max-w-[460px] flex-col overflow-hidden bg-card shadow-2xl sm:my-4 sm:h-[min(90vh,820px)] sm:rounded-2xl"
        aria-label={name}
      >
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          {isMedia ? (
            mediaUrl ? (
              isVideo ? (
                <video
                  ref={videoRef}
                  src={mediaUrl}
                  playsInline
                  autoPlay
                  muted={muted}
                  className="h-full w-full object-contain"
                  onTimeUpdate={(e) => {
                    const v = e.currentTarget
                    if (Number.isFinite(v.duration) && v.duration > 0)
                      setProgress((v.currentTime / v.duration) * 100)
                  }}
                  onEnded={() => setProgress(100)}
                  onError={() => setPaused(true)}
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt={story.caption || name}
                  className="h-full w-full object-contain"
                />
              )
            ) : (
              <p role="status" className="px-6 text-center text-sm">
                {media.isError
                  ? t('chat.storyMediaError', { defaultValue: 'Không thể tải nội dung tin' })
                  : t('chat.pending')}
              </p>
            )
          ) : (
            <div
              className={cn(
                'flex h-full w-full items-center justify-center bg-linear-to-br p-8 text-center',
                story.background || TEXT_STORY_BG,
              )}
            >
              <p className="whitespace-pre-wrap break-words text-2xl font-bold text-white drop-shadow-md">
                {caption}
              </p>
            </div>
          )}
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/65 via-transparent to-background/75" />
        <header className="relative z-10 p-3">
          <div className="mb-3 flex gap-1">
            {sameAuthor.map((item) => (
              <div key={item.id} className="h-1 flex-1 overflow-hidden rounded-full bg-muted/70">
                <div
                  className="h-full bg-primary"
                  style={{
                    width:
                      item.id === story.id
                        ? `${progress}%`
                        : items.indexOf(item) < index
                          ? '100%'
                          : '0%',
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <UserAvatar name={name} src={story.authorAvatar} className="size-10" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{name}</p>
              <p className="text-xs text-muted-foreground">{story.time}</p>
            </div>
            <button
              type="button"
              onClick={() => setPaused(!paused)}
              className={actionClass}
              aria-label={
                paused
                  ? t('chat.play', { defaultValue: 'Phát' })
                  : t('chat.pause', { defaultValue: 'Tạm dừng' })
              }
            >
              {paused ? <Play size={18} /> : <Pause size={18} />}
            </button>
            {isVideo && (
              <button
                type="button"
                onClick={() => setMuted(!muted)}
                className={actionClass}
                aria-label={muted ? t('chat.unmuteVideo') : t('chat.muteVideo')}
              >
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            )}
            {story.mine && (
              <>
                {!story.archived && (
                  <button
                    type="button"
                    onClick={openEdit}
                    className={actionClass}
                    aria-label={t('chat.editStory', { defaultValue: 'Chỉnh sửa tin' })}
                  >
                    <Pencil size={18} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className={actionClass}
                  aria-label={t('chat.deleteStory', { defaultValue: 'Xóa tin' })}
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
            {!story.mine && story.authorId && (
              <button
                type="button"
                onClick={() => void muteCurrentAuthor()}
                disabled={mute.isPending}
                className={actionClass}
                aria-label={t('chat.muteStory')}
              >
                <EyeOff size={18} />
              </button>
            )}
          </div>
        </header>
        <div className="relative z-10 flex flex-1">
          <button
            type="button"
            aria-label={t('chat.previousStory')}
            disabled={index <= 0}
            onClick={previous}
            className="w-1/4"
          />
          <div className="flex-1" />
          <button type="button" aria-label={t('chat.nextStory')} onClick={next} className="w-1/4" />
        </div>
        <footer className="relative z-10 space-y-3 p-4">
          {isMedia && caption && (
            <p className="whitespace-pre-wrap break-words text-center text-sm font-medium">
              {caption}
            </p>
          )}
          {story.mine ? (
            <button
              type="button"
              onClick={() => setShowViews(true)}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-card-foreground"
            >
              <Eye size={18} />
              {t('chat.storyViewers', { defaultValue: 'Người xem' })}
            </button>
          ) : (
            <>
              {allowReactions && (
                <div className="flex flex-wrap justify-center gap-2">
                  {reactions.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => void toggleReaction(emoji)}
                      disabled={
                        react.isPending || unreact.isPending || like.isPending || unlike.isPending
                      }
                      aria-label={emoji}
                      aria-pressed={reaction === emoji}
                      className={cn(
                        'grid size-10 place-items-center rounded-full bg-muted text-2xl hover:bg-accent',
                        reaction === emoji && 'ring-2 ring-white',
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
              {allowReplies && (
                <form onSubmit={sendReply} className="flex gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    maxLength={4000}
                    placeholder={t('chat.replyPlaceholder', { defaultValue: 'Trả lời tin...' })}
                    className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || reply.isPending}
                    className={cn(actionClass, 'disabled:opacity-40')}
                    aria-label={t('chat.send', { defaultValue: 'Gửi' })}
                  >
                    <Send size={18} />
                  </button>
                </form>
              )}
            </>
          )}
        </footer>
      </section>
      <button
        type="button"
        onClick={next}
        className={cn(actionClass, 'absolute right-3 top-1/2 z-20 hidden md:grid')}
        aria-label={t('chat.nextStory', { defaultValue: 'Tin tiếp theo' })}
      >
        <ArrowRight size={20} />
      </button>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="text-foreground">
          <DialogHeader>
            <DialogTitle>{t('chat.editStory', { defaultValue: 'Chỉnh sửa tin' })}</DialogTitle>
          </DialogHeader>
          <textarea
            value={editCaption}
            onChange={(e) => setEditCaption(e.target.value)}
            maxLength={500}
            rows={4}
            className="w-full rounded-lg border border-border bg-background p-3"
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={editAllowReplies}
              onChange={(e) => setEditAllowReplies(e.target.checked)}
            />
            {t('chat.allowStoryReplies', { defaultValue: 'Cho phép trả lời' })}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={editAllowReactions}
              onChange={(e) => setEditAllowReactions(e.target.checked)}
            />
            {t('chat.allowStoryReactions', { defaultValue: 'Cho phép bày tỏ cảm xúc' })}
          </label>
          <button
            type="button"
            disabled={update.isPending || (story.kind === 'TEXT' && !editCaption.trim())}
            onClick={() => void saveEdit()}
            className="rounded-lg bg-primary p-2 font-semibold text-primary-foreground disabled:opacity-50"
          >
            {t('common.save', { defaultValue: 'Lưu' })}
          </button>
        </DialogContent>
      </Dialog>
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="text-foreground">
          <DialogHeader>
            <DialogTitle>
              {t('chat.deleteStoryConfirm', { defaultValue: 'Xóa tin này?' })}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {story.archived ? t('chat.archiveDeleteHint') : t('chat.deleteStoryHint')}
          </p>
          <button
            type="button"
            disabled={remove.isPending}
            onClick={() => void deleteCurrent()}
            className="rounded-lg bg-destructive p-2 font-semibold text-destructive-foreground disabled:opacity-50"
          >
            {t('chat.deleteStory', { defaultValue: 'Xóa tin' })}
          </button>
        </DialogContent>
      </Dialog>
      <Dialog open={showViews} onOpenChange={setShowViews}>
        <DialogContent className="text-foreground">
          <DialogHeader>
            <DialogTitle>
              {t('chat.storyViewers', { defaultValue: 'Người xem' })}{' '}
              {views.data ? `(${views.data.pages[0].totalViewsCount})` : ''}
            </DialogTitle>
          </DialogHeader>
          {views.isPending ? (
            <p>{t('chat.pending')}</p>
          ) : views.isError ? (
            <p>
              {t('chat.storyActionError', { defaultValue: 'Không thể tải danh sách người xem.' })}
            </p>
          ) : views.data?.pages.some((page) => page.items.length) ? (
            <ul className="max-h-80 space-y-3 overflow-y-auto">
              {views.data.pages
                .flatMap((page) => page.items)
                .map((item) => (
                  <li key={item.user.id} className="flex items-center gap-3">
                    <UserAvatar
                      name={item.user.fullName}
                      src={item.user.avatarUrl}
                      className="size-9"
                    />
                    <span className="flex-1 text-sm">{item.user.fullName}</span>
                    {item.reaction && <span aria-label={item.reaction}>{item.reaction}</span>}
                  </li>
                ))}
              {views.hasNextPage && (
                <li>
                  <button
                    type="button"
                    disabled={views.isFetchingNextPage}
                    onClick={() => void views.fetchNextPage()}
                    className="text-sm underline"
                  >
                    {t('chat.loadMore', { defaultValue: 'Xem thêm' })}
                  </button>
                </li>
              )}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('chat.noStoryViews', { defaultValue: 'Chưa có lượt xem.' })}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
