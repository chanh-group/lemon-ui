import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowDown01Icon as ChevronDownData,
  ArrowUp01Icon as ChevronUpData,
  Copy01Icon as CopyData,
  Download01Icon as DownloadData,
  File01Icon as FileData,
  Logout01Icon as LeaveData,
  MultiplicationSignIcon as CloseData,
  Notification01Icon as BellData,
  NotificationOff01Icon as BellOffData,
  PlayIcon as PlayData,
  Search01Icon as SearchData,
  Tick01Icon as CheckData,
  UserBlock01Icon as BlockData,
  UserCheck01Icon as UserCheckData,
  UserIcon as UserData,
  UserRemove01Icon as UnfriendData,
} from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
import { toast } from 'sonner'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ROUTES } from '@/config/constants'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { useConversationMute } from '../../hooks/useConversationMute'
import { useBlockUser, useFriends, useRemoveFriend } from '../../hooks/useFriends'
import type { Conversation, DayGroup, MessageAttachmentItem } from '../../types/chat.types'
import { formatBytes, isImage, isVideo } from '../../utils/fileTypes'
import { ImageLightboxModal } from './ImageLightboxModal'

const CloseIcon = createIcon(CloseData)
const UserIcon = createIcon(UserData)
const BellIcon = createIcon(BellData)
const BellOffIcon = createIcon(BellOffData)
const SearchIcon = createIcon(SearchData)
const PlayIcon = createIcon(PlayData)
const FileIcon = createIcon(FileData)
const DownloadIcon = createIcon(DownloadData)
const ChevronDown = createIcon(ChevronDownData)
const ChevronUp = createIcon(ChevronUpData)
const UnfriendIcon = createIcon(UnfriendData)
const BlockIcon = createIcon(BlockData)
const LeaveIcon = createIcon(LeaveData)
const CopyIcon = createIcon(CopyData)
const CheckIcon = createIcon(CheckData)
const UserCheckIcon = createIcon(UserCheckData)

export interface UserProfileCardContentProps {
  conversation: Conversation
  username?: string
  bio?: string | null
  onUnfriend?: () => void
  onBlock?: () => void
  onClose?: () => void
}

export function UserProfileCardContent({
  conversation,
  username,
  bio,
  onUnfriend,
  onBlock,
  onClose,
}: UserProfileCardContentProps) {
  const { t } = useTranslation()
  const [isCopied, setIsCopied] = useState(false)
  const handleCopyUsername = useCallback(async () => {
    if (!username) return
    try {
      await navigator.clipboard.writeText(`@${username}`)
      setIsCopied(true)
      toast.success(t('chat.usernameCopied'))
      window.setTimeout(() => setIsCopied(false), 2000)
    } catch {
      // ignore
    }
  }, [username, t])

  return (
    <div className="flex flex-col items-center py-4 text-center">
      <div className="relative">
        <UserAvatar
          name={conversation.name}
          src={conversation.partnerAvatar}
          square={conversation.isGroup}
          className="size-20 text-2xl shadow-sm ring-2 ring-border/40"
        />
        {conversation.online && (
          <span
            className="absolute right-1 bottom-1 size-3.5 rounded-full bg-success ring-2 ring-card"
            title={t('chat.online')}
            aria-hidden="true"
          />
        )}
      </div>

      <h3 className="mt-3 text-base font-bold text-foreground">{conversation.name}</h3>

      {/* Username + Copy button */}
      {username && (
        <div className="mt-1 flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{`@${username}`}</span>
          <button
            type="button"
            onClick={handleCopyUsername}
            aria-label={t('chat.copyUsername')}
            title={t('chat.copyUsername')}
            className="rounded p-0.5 hover:text-foreground transition-colors cursor-pointer"
          >
            {isCopied ? (
              <CheckIcon className="size-3.5 text-success" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
          </button>
        </div>
      )}

      {/* Relationship Badge */}
      {!conversation.isGroup && (
        <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
          <UserCheckIcon className="size-3.5" />
          <span>{t('chat.friendBadge')}</span>
        </div>
      )}

      {/* Bio / Tiểu sử nếu có */}
      {bio && (
        <p className="mt-3 max-w-[260px] text-xs text-muted-foreground italic px-2">
          {`"${bio}"`}
        </p>
      )}

      {/* 2 Nút hành động cốt lõi: Hủy kết bạn & Chặn người dùng */}
      {!conversation.isGroup && conversation.partnerId && (
        <div className="mt-5 flex w-full items-center gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onUnfriend}
            className="flex-1 gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
          >
            <UnfriendIcon className="size-4" />
            <span>{t('chat.unfriendAction')}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBlock}
            className="flex-1 gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
          >
            <BlockIcon className="size-4" />
            <span>{t('chat.blockAction')}</span>
          </Button>
        </div>
      )}

      {onClose && (
        <div className="mt-4 w-full">
          <Button
            variant="secondary"
            className="w-full text-xs"
            onClick={onClose}
          >
            {t('chat.closeAction')}
          </Button>
        </div>
      )}
    </div>
  )
}

export interface UserProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversation: Conversation
  username?: string
  bio?: string | null
  onUnfriend?: () => void
  onBlock?: () => void
}

export function UserProfileDialog({
  open,
  onOpenChange,
  conversation,
  username,
  bio,
  onUnfriend,
  onBlock,
}: UserProfileDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('chat.personalInfo')}</DialogTitle>
        </DialogHeader>
        <UserProfileCardContent
          conversation={conversation}
          username={username}
          bio={bio}
          onUnfriend={() => {
            onOpenChange(false)
            onUnfriend?.()
          }}
          onBlock={() => {
            onOpenChange(false)
            onBlock?.()
          }}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function formatDuration(sec: number) {
  if (!sec || isNaN(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

const STORAGE_WIDTH_KEY = 'lemon_chat_info_panel_width'
const DEFAULT_PANEL_WIDTH = 340
const MIN_PANEL_WIDTH = 280
const MAX_PANEL_WIDTH = 600

export interface ConversationInfoPanelProps {
  conversation: Conversation
  groups: DayGroup[]
  onClose: () => void
  onOpenSearch?: () => void
  defaultMediaOpen?: boolean
  defaultPrivacyOpen?: boolean
}

export function ConversationInfoPanel({
  conversation,
  groups,
  onClose,
  onOpenSearch,
  defaultMediaOpen = false,
  defaultPrivacyOpen = false,
}: ConversationInfoPanelProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const { isMuted, toggleMute } = useConversationMute(conversation.id)

  const removeFriend = useRemoveFriend()
  const blockUser = useBlockUser()
  const friendsQuery = useFriends()

  const friendData = useMemo(() => {
    if (!conversation.partnerId || !friendsQuery.data) return null
    return friendsQuery.data.find((f) => f.id === conversation.partnerId) ?? null
  }, [conversation.partnerId, friendsQuery.data])

  const username = conversation.partnerUsername || friendData?.username || ''
  const bio = conversation.partnerBio || null

  // Mặc định cả 2 ngăn đều ĐÓNG theo yêu cầu người dùng
  const [mediaOpen, setMediaOpen] = useState(defaultMediaOpen)
  const [privacyOpen, setPrivacyOpen] = useState(defaultPrivacyOpen)
  const [mediaTab, setMediaTab] = useState<'media' | 'files'>('media')
  const [showAllMedia, setShowAllMedia] = useState(false)
  const [showAllFiles, setShowAllFiles] = useState(false)

  const MEDIA_DISPLAY_LIMIT = 6
  const FILES_DISPLAY_LIMIT = 4

  const [unfriendOpen, setUnfriendOpen] = useState(false)
  const [blockOpen, setBlockOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [selectedMediaAttachment, setSelectedMediaAttachment] = useState<MessageAttachmentItem | null>(null)

  // Khởi tạo độ rộng panel từ localStorage hoặc mặc định 340px
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_PANEL_WIDTH
    try {
      const saved = localStorage.getItem(STORAGE_WIDTH_KEY)
      if (saved) {
        const parsed = Number(saved)
        if (!isNaN(parsed) && parsed >= MIN_PANEL_WIDTH && parsed <= MAX_PANEL_WIDTH) {
          return parsed
        }
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_PANEL_WIDTH
  })

  const [isResizing, setIsResizing] = useState(false)

  // Xử lý kéo ra kéo vào (resize ngang) trên Desktop
  const startResizing = useCallback(
    (mouseDownEvent: React.MouseEvent) => {
      mouseDownEvent.preventDefault()
      setIsResizing(true)

      const startX = mouseDownEvent.clientX
      const startWidth = panelWidth

      const onMouseMove = (mouseMoveEvent: MouseEvent) => {
        const delta = startX - mouseMoveEvent.clientX
        const rawNewWidth = startWidth + delta
        const maxAllowed = Math.min(MAX_PANEL_WIDTH, Math.floor(window.innerWidth * 0.55))
        const clamped = Math.max(MIN_PANEL_WIDTH, Math.min(maxAllowed, rawNewWidth))
        setPanelWidth(clamped)
      }

      const onMouseUp = () => {
        setIsResizing(false)
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [panelWidth],
  )

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_WIDTH_KEY, panelWidth.toString())
      } catch {
        // ignore
      }
    }
  }, [panelWidth])

  const resetWidth = () => {
    setPanelWidth(DEFAULT_PANEL_WIDTH)
  }

  // Trích xuất ảnh, video và file từ các tin nhắn hiện có trong hội thoại (mới nhất lên đầu)
  const { mediaItems, fileItems } = useMemo(() => {
    const media: MessageAttachmentItem[] = []
    const files: MessageAttachmentItem[] = []

    for (const group of groups) {
      for (const msg of group.messages) {
        if (!msg.attachments || msg.attachments.length === 0) continue
        for (const att of msg.attachments) {
          if (
            att.kind === 'IMAGE' ||
            att.kind === 'VIDEO' ||
            isImage(att.mimeType, att.fileName) ||
            isVideo(att.mimeType, att.fileName)
          ) {
            media.push(att)
          } else {
            files.push(att)
          }
        }
      }
    }

    return {
      mediaItems: media.reverse(),
      fileItems: files.reverse(),
    }
  }, [groups])

  const displayedMedia = useMemo(() => {
    return showAllMedia ? mediaItems : mediaItems.slice(0, MEDIA_DISPLAY_LIMIT)
  }, [mediaItems, showAllMedia])

  const displayedFiles = useMemo(() => {
    return showAllFiles ? fileItems : fileItems.slice(0, FILES_DISPLAY_LIMIT)
  }, [fileItems, showAllFiles])

  const handleToggleMute = () => {
    const nextMuted = toggleMute()
    if (nextMuted) {
      toast.success(t('chat.mutedConversation'))
    } else {
      toast.info(t('chat.unmutedConversation'))
    }
  }

  const handleConfirmUnfriend = () => {
    if (!conversation.partnerId) return
    removeFriend.mutate(conversation.partnerId, {
      onSuccess: () => {
        toast.success(t('chat.friendRemoved'))
        setUnfriendOpen(false)
        onClose()
        navigate(ROUTES.messages)
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : t('common.error'))
      },
    })
  }

  const handleConfirmBlock = () => {
    if (!conversation.partnerId) return
    blockUser.mutate(conversation.partnerId, {
      onSuccess: () => {
        toast.warning(t('chat.userBlocked'))
        setBlockOpen(false)
        onClose()
        navigate(ROUTES.messages)
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : t('common.error'))
      },
    })
  }

  return (
    <aside
      aria-label={t('chat.conversationInfo')}
      style={isDesktop ? { width: `${panelWidth}px` } : undefined}
      className={cn(
        'relative flex h-full shrink-0 flex-col border-l border-border bg-card/95 backdrop-blur',
        'duration-150 ease-out transition-[width,background-color,border-color]',
        isResizing && 'transition-none select-none',
        'max-md:absolute max-md:inset-0 max-md:z-40 max-md:w-full max-md:border-l-0',
      )}
    >
      {/* Thanh kéo chỉnh kích thước chiều ngang (chỉ hiện trên desktop/tablet) */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Kéo để thay đổi kích thước"
        title="Kéo sang trái/phải để thay đổi chiều rộng, nhấp đúp để đặt lại 340px"
        onMouseDown={startResizing}
        onDoubleClick={resetWidth}
        className={cn(
          'group absolute -left-1.5 top-0 z-30 hidden h-full w-3 cursor-col-resize select-none items-center justify-center md:flex',
          isResizing && 'cursor-col-resize',
        )}
      >
        <div
          className={cn(
            'h-full w-0.5 rounded-full transition-colors duration-150',
            isResizing ? 'w-1 bg-primary' : 'group-hover:w-1 group-hover:bg-primary/70',
          )}
        />
      </div>

      {/* 1. Header Bar: Tiêu đề + Nút đóng X */}
      <div className="flex h-[61px] shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">{t('chat.conversationInfo')}</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('chat.closeInfo')}
          title={t('chat.closeInfo')}
          className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <CloseIcon className="size-5" aria-hidden="true" />
        </button>
      </div>

      {/* Body cuộn dọc: Chứa toàn bộ nội dung */}
      <div className="flex-1 overflow-y-auto px-4 py-5 scrollbar-thin">
        {/* 2. Nhận diện đối thoại (Profile Identity) */}
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <UserAvatar
              name={conversation.name}
              src={conversation.partnerAvatar}
              square={conversation.isGroup}
              className="size-20 text-2xl shadow-sm ring-2 ring-border/40"
            />
            {conversation.online && (
              <span
                className="absolute right-1 bottom-1 size-3.5 rounded-full bg-success ring-2 ring-card"
                title={t('chat.online')}
                aria-hidden="true"
              />
            )}
          </div>

          <h2 className="mt-3 max-w-full truncate px-2 text-base font-bold text-foreground">
            {conversation.name}
          </h2>

          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {conversation.isGroup
              ? conversation.members
              : conversation.online
                ? t('chat.online')
                : (conversation.lastActive ?? t('chat.offline'))}
          </p>
        </div>

        {/* 3. 3 Nút tròn Quick Action (Messenger Style) */}
        <div className="mt-5 grid grid-cols-3 gap-2 border-b border-border pb-5">
          {/* Nút 1: Trang cá nhân */}
          <button
            type="button"
            onClick={() => setProfileModalOpen(true)}
            className="flex flex-col items-center group focus-visible:outline-hidden"
          >
            <div className="grid size-10 place-items-center rounded-full bg-muted text-brand-ink transition-colors group-hover:bg-accent">
              <UserIcon className="size-5" aria-hidden="true" />
            </div>
            <span className="mt-1.5 text-xs font-medium text-foreground">
              {t('chat.profile')}
            </span>
          </button>

          {/* Nút 2: Tắt / Bật thông báo */}
          <button
            type="button"
            onClick={handleToggleMute}
            className="flex flex-col items-center group focus-visible:outline-hidden"
          >
            <div
              className={cn(
                'grid size-10 place-items-center rounded-full transition-colors',
                isMuted
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400'
                  : 'bg-muted text-brand-ink group-hover:bg-accent',
              )}
            >
              {isMuted ? (
                <BellOffIcon className="size-5" aria-hidden="true" />
              ) : (
                <BellIcon className="size-5" aria-hidden="true" />
              )}
            </div>
            <span className="mt-1.5 text-xs font-medium text-foreground">
              {isMuted ? t('chat.unmute') : t('chat.mute')}
            </span>
          </button>

          {/* Nút 3: Tìm kiếm */}
          <button
            type="button"
            onClick={() => {
              if (onOpenSearch) {
                onOpenSearch()
              } else {
                toast.info(t('chat.searchInConversationComingSoon'))
              }
            }}
            className="flex flex-col items-center group focus-visible:outline-hidden"
          >
            <div className="grid size-10 place-items-center rounded-full bg-muted text-brand-ink transition-colors group-hover:bg-accent">
              <SearchIcon className="size-5" aria-hidden="true" />
            </div>
            <span className="mt-1.5 text-xs font-medium text-foreground">
              {t('chat.searchInConversation')}
            </span>
          </button>
        </div>

        {/* 4. Accordion 1: File phương tiện và File (Mặc định đóng) */}
        <div className="border-b border-border py-3">
          <button
            type="button"
            onClick={() => setMediaOpen((prev) => !prev)}
            aria-expanded={mediaOpen}
            className="flex w-full items-center justify-between py-1.5 text-sm font-semibold text-foreground transition-colors hover:text-brand-ink"
          >
            <span>{t('chat.mediaAndFiles')}</span>
            {mediaOpen ? (
              <ChevronUp className="size-4 text-muted-foreground" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
            )}
          </button>

          {mediaOpen && (
            <div className="mt-2.5">
              {/* Tabs chuyển đổi Ảnh/Video vs Tài liệu */}
              <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setMediaTab('media')}
                  className={cn(
                    'flex-1 rounded-md py-1 text-center text-xs font-medium transition-all',
                    mediaTab === 'media'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t('chat.photosAndVideos')} ({mediaItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMediaTab('files')}
                  className={cn(
                    'flex-1 rounded-md py-1 text-center text-xs font-medium transition-all',
                    mediaTab === 'files'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t('chat.documentsAndFiles')} ({fileItems.length})
                </button>
              </div>

              {/* Nội dung Tab Ảnh & Video */}
              {mediaTab === 'media' && (
                <div className="mt-3">
                  {mediaItems.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      {t('chat.noMediaYet')}
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-1.5">
                        {displayedMedia.map((item) => {
                          const isItemVideo =
                            item.kind === 'VIDEO' || isVideo(item.mimeType, item.fileName)
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setSelectedMediaAttachment(item)}
                              className="group relative aspect-square overflow-hidden rounded-md bg-zinc-900 ring-1 ring-border/40 focus-visible:outline-hidden cursor-pointer"
                              title={item.fileName}
                            >
                              {isItemVideo ? (
                                <>
                                  <video
                                    src={item.previewUrl || item.downloadUrl}
                                    preload="metadata"
                                    muted
                                    playsInline
                                    className="h-full w-full object-cover pointer-events-none"
                                  />
                                  {/* Play icon overlay */}
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/35 transition-colors group-hover:bg-black/15">
                                    <div className="grid size-8 place-items-center rounded-full bg-black/60 text-white shadow-md transition-transform group-hover:scale-110 group-hover:bg-primary">
                                      <PlayIcon className="size-4 fill-current ml-0.5" />
                                    </div>
                                  </div>
                                  {/* Duration / VIDEO badge */}
                                  <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 py-0.5 font-mono text-[9px] font-semibold text-white uppercase tracking-wider leading-none">
                                    {item.durationMs
                                      ? formatDuration(Math.round(item.durationMs / 1000))
                                      : 'VIDEO'}
                                  </span>
                                </>
                              ) : (
                                <img
                                  src={item.previewUrl || item.downloadUrl}
                                  alt={item.fileName}
                                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                  loading="lazy"
                                />
                              )}
                            </button>
                          )
                        })}
                      </div>

                      {mediaItems.length > MEDIA_DISPLAY_LIMIT && (
                        <button
                          type="button"
                          onClick={() => setShowAllMedia((prev) => !prev)}
                          className="mt-2.5 w-full rounded-md border border-border/60 bg-muted/40 py-1.5 text-center text-xs font-medium text-foreground transition-colors hover:bg-muted"
                        >
                          {showAllMedia
                            ? t('chat.collapse', 'Thu gọn')
                            : `${t('chat.viewAll', 'Xem tất cả')} (${mediaItems.length})`}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Nội dung Tab Tệp tin & Tài liệu */}
              {mediaTab === 'files' && (
                <div className="mt-3">
                  {fileItems.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      {t('chat.noFilesYet')}
                    </p>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        {displayedFiles.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between gap-2.5 rounded-lg border border-border/40 bg-muted/40 p-2 transition-colors hover:bg-muted"
                          >
                            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground">
                              <FileIcon className="size-4" aria-hidden="true" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium text-foreground">
                                {file.fileName}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {formatBytes(file.sizeBytes)}
                              </p>
                            </div>
                            <a
                              href={file.downloadUrl || file.previewUrl}
                              download={file.fileName}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`${t('chat.downloadFile')} ${file.fileName}`}
                              className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-card hover:text-foreground"
                            >
                              <DownloadIcon className="size-4" aria-hidden="true" />
                            </a>
                          </div>
                        ))}
                      </div>

                      {fileItems.length > FILES_DISPLAY_LIMIT && (
                        <button
                          type="button"
                          onClick={() => setShowAllFiles((prev) => !prev)}
                          className="mt-2.5 w-full rounded-md border border-border/60 bg-muted/40 py-1.5 text-center text-xs font-medium text-foreground transition-colors hover:bg-muted"
                        >
                          {showAllFiles
                            ? t('chat.collapse', 'Thu gọn')
                            : `${t('chat.viewAll', 'Xem tất cả')} (${fileItems.length})`}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 5. Accordion 2: Quyền riêng tư & Quản lý (Mặc định đóng) */}
        <div className="py-3">
          <button
            type="button"
            onClick={() => setPrivacyOpen((prev) => !prev)}
            aria-expanded={privacyOpen}
            className="flex w-full items-center justify-between py-1.5 text-sm font-semibold text-foreground transition-colors hover:text-brand-ink"
          >
            <span>{t('chat.privacyAndSupport')}</span>
            {privacyOpen ? (
              <ChevronUp className="size-4 text-muted-foreground" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
            )}
          </button>

          {privacyOpen && (
            <div className="mt-2 space-y-1">
              {/* Các thao tác dành cho chat 1-1 */}
              {!conversation.isGroup && conversation.partnerId && (
                <>
                  <button
                    type="button"
                    onClick={() => setUnfriendOpen(true)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 dark:hover:bg-destructive/20"
                  >
                    <UnfriendIcon className="size-4" aria-hidden="true" />
                    <span>{t('chat.removeFriend')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBlockOpen(true)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 dark:hover:bg-destructive/20"
                  >
                    <BlockIcon className="size-4" aria-hidden="true" />
                    <span>{t('chat.blockUser')}</span>
                  </button>
                </>
              )}

              {/* Thao tác dành cho Nhóm */}
              {conversation.isGroup && (
                <button
                  type="button"
                  onClick={() => toast.info(t('chat.featureUnderDevelopment') || 'Tính năng đang phát triển')}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 dark:hover:bg-destructive/20"
                >
                  <LeaveIcon className="size-4" aria-hidden="true" />
                  <span>{t('chat.leaveGroup')}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 6. Modal Xem Thẻ Thông Tin Cá Nhân (User Profile Card) */}
      <UserProfileDialog
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        conversation={conversation}
        username={username}
        bio={bio}
        onUnfriend={() => setUnfriendOpen(true)}
        onBlock={() => setBlockOpen(true)}
      />

      {/* 7. Modal Xem Ảnh Lightbox đồng bộ 100% với tin nhắn đoạn chat */}
      <ImageLightboxModal
        attachment={selectedMediaAttachment}
        onClose={() => setSelectedMediaAttachment(null)}
      />

      {/* 8. Confirmation Dialog: Hủy kết bạn */}
      <Dialog open={unfriendOpen} onOpenChange={setUnfriendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('chat.unfriendConfirmTitle', { name: conversation.name })}
            </DialogTitle>
            <DialogDescription>
              {t('chat.unfriendConfirmDesc', { name: conversation.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setUnfriendOpen(false)}
              disabled={removeFriend.isPending}
            >
              {t('chat.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmUnfriend}
              disabled={removeFriend.isPending}
            >
              {removeFriend.isPending ? t('common.loading') : t('chat.unfriendAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 9. Confirmation Dialog: Chặn người dùng */}
      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('chat.blockConfirmTitle', { name: conversation.name })}
            </DialogTitle>
            <DialogDescription>
              {t('chat.blockConfirmDesc', { name: conversation.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setBlockOpen(false)}
              disabled={blockUser.isPending}
            >
              {t('chat.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmBlock}
              disabled={blockUser.isPending}
            >
              {blockUser.isPending ? t('common.loading') : t('chat.blockAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
