import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  ArrowDown01Icon as ChevronDownData,
  ArrowUp01Icon as ChevronUpData,
  Camera01Icon as CameraData,
  Copy01Icon as CopyData,
  Download01Icon as DownloadData,
  Edit02Icon as EditData,
  File01Icon as FileData,
  Logout01Icon as LeaveData,
  MultiplicationSignIcon as CloseData,
  Notification01Icon as BellData,
  MoreHorizontalIcon as MoreData,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { useMe } from '@/features/auth/api'
import { cn } from '@/lib/utils'
import {
  CHAT_QUERY_KEYS,
  useConversationMediaArchiveQuery,
} from '@/features/messaging/hooks/useMessages'
import { useBlockUser, useFriends, useRemoveFriend } from '@/features/friend/hooks/useFriends'
import { queryKeys } from '@/infrastructure/query/keys'
import { GROUP_MAX_MEMBERS, GROUP_MAX_NAME_LENGTH } from '@/features/conversation/constants'
import {
  addGroupMembers,
  disbandGroup,
  getGroupMembers,
  leaveGroup,
  removeGroupMember,
  updateGroup,
  updateGroupMemberRole,
  uploadGroupAvatar,
} from '@/features/conversation/api/conversation.api'
import type { DayGroup, MessageAttachmentItem } from '@/features/messaging/types/message.types'
import type { Conversation } from '@/features/conversation/types/conversation.types'
import { formatBytes, isImage, isVideo } from '@/features/file/utils/fileTypes'
import { ImageLightboxModal } from './ImageLightboxModal'

import { AxiosError } from 'axios'
import { ApiError } from '@/infrastructure/api/errors'

const CloseIcon = createIcon(CloseData)
const UserIcon = createIcon(UserData)
const BellIcon = createIcon(BellData)
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
const CameraIcon = createIcon(CameraData)
const EditIcon = createIcon(EditData)
const MoreIcon = createIcon(MoreData)
const UserCheckIcon = createIcon(UserCheckData)

export interface UserProfileCardContentProps {
  conversation: Conversation
  username?: string
  bio?: string | null
  onUnfriend?: () => void
  onBlock?: () => void
}

export function UserProfileCardContent({
  conversation,
  username,
  bio,
  onUnfriend,
  onBlock,
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
        <p className="mt-3 max-w-[260px] text-xs text-muted-foreground italic px-2">{`"${bio}"`}</p>
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
  const [mediaOpen, setMediaOpen] = useState(defaultMediaOpen)
  const archiveQuery = useConversationMediaArchiveQuery(conversation.id, mediaOpen)

  const removeFriend = useRemoveFriend()
  const blockUser = useBlockUser()
  const friendsQuery = useFriends()
  const queryClient = useQueryClient()
  const currentUserId = useMe().data?.id
  const membersQuery = useQuery({
    queryKey: queryKeys.chat.groupMembers(conversation.id),
    queryFn: () => getGroupMembers(conversation.id),
    enabled: conversation.isGroup,
  })
  const [groupTitleDraft, setGroupTitleDraft] = useState(conversation.name)
  const [groupTitleEditing, setGroupTitleEditing] = useState(false)
  const [addMembersOpen, setAddMembersOpen] = useState(false)
  const [showAllMembers, setShowAllMembers] = useState(false)
  const [disbandGroupOpen, setDisbandGroupOpen] = useState(false)
  const [isDisbandingGroup, setIsDisbandingGroup] = useState(false)
  const [isUploadingGroupAvatar, setIsUploadingGroupAvatar] = useState(false)
  const groupAvatarInput = useRef<HTMLInputElement>(null)
  const memberSection = useRef<HTMLElement>(null)
  const [leaveGroupOpen, setLeaveGroupOpen] = useState(false)
  const [pendingGroupAction, setPendingGroupAction] = useState<{
    description: string
    successKey: string
    action: () => Promise<unknown>
  } | null>(null)
  const [isGroupActionPending, setIsGroupActionPending] = useState(false)
  const groupActionPendingRef = useRef(false)

  const friendData = useMemo(() => {
    if (!conversation.partnerId || !friendsQuery.data) return null
    return friendsQuery.data.find((f) => f.id === conversation.partnerId) ?? null
  }, [conversation.partnerId, friendsQuery.data])

  const username = conversation.partnerUsername || friendData?.username || ''
  const bio = conversation.partnerBio || null

  // Mặc định cả 2 ngăn đều ĐÓNG theo yêu cầu người dùng
  const [privacyOpen, setPrivacyOpen] = useState(defaultPrivacyOpen)
  const [mediaTab, setMediaTab] = useState<'media' | 'files'>('media')
  const [showAllMedia, setShowAllMedia] = useState(false)
  const [showAllFiles, setShowAllFiles] = useState(false)

  const MEDIA_DISPLAY_LIMIT = 6
  const FILES_DISPLAY_LIMIT = 4

  const [unfriendOpen, setUnfriendOpen] = useState(false)
  const [blockOpen, setBlockOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [selectedMediaAttachment, setSelectedMediaAttachment] =
    useState<MessageAttachmentItem | null>(null)

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

  const refreshGroup = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.groupMembers(conversation.id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations }),
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversation(conversation.id) }),
    ])
  }
  const runGroupAction = async (action: () => Promise<unknown>, successKey: string) => {
    if (groupActionPendingRef.current) return false
    groupActionPendingRef.current = true
    setIsGroupActionPending(true)
    try {
      await action()
      toast.success(t(successKey))
      return true
    } catch (error) {
      if (
        (error instanceof ApiError && (error.status === 403 || error.status === 404)) ||
        (error instanceof AxiosError &&
          (error.response?.status === 403 || error.response?.status === 404))
      ) {
        onClose?.()
      }
      toast.error(error instanceof Error ? error.message : t('common.error'))
      return false
    } finally {
      await refreshGroup().catch(() => undefined)
      groupActionPendingRef.current = false
      setIsGroupActionPending(false)
    }
  }

  const activeMembers = membersQuery.data ?? []
  const orderedMembers = useMemo(
    () =>
      [...(membersQuery.data ?? [])].sort(
        (a, b) =>
          Number(b.role === 'ADMIN') - Number(a.role === 'ADMIN') ||
          Date.parse(a.joinedAt) - Date.parse(b.joinedAt) ||
          a.id.localeCompare(b.id),
      ),
    [membersQuery.data],
  )
  const visibleMembers = showAllMembers ? orderedMembers : orderedMembers.slice(0, 3)
  const activeMemberIds = new Set(activeMembers.map((member) => member.id))
  const canManageGroup = conversation.myRole === 'ADMIN'
  const mustPromoteAdminBeforeLeaving =
    canManageGroup &&
    membersQuery.isSuccess &&
    activeMembers.length > 1 &&
    activeMembers.filter((member) => member.role === 'ADMIN').length === 1
  const canEditGroupMetadata = conversation.isGroup && conversation.myRole === 'ADMIN'

  const handleGroupAvatarFile = async (file?: File) => {
    if (!file) return
    if (!canEditGroupMetadata) {
      toast.error(t('chat.forbidden', 'Chỉ trưởng nhóm mới có quyền đổi ảnh nhóm'))
      return
    }
    if (
      file.size < 1 ||
      !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)
    ) {
      toast.error(t('chat.avatarInvalidType'))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('chat.avatarFileTooLarge'))
      return
    }
    setIsUploadingGroupAvatar(true)
    try {
      await runGroupAction(() => uploadGroupAvatar(conversation.id, file), 'chat.groupUpdated')
    } finally {
      setIsUploadingGroupAvatar(false)
    }
  }

  const handleDisbandGroup = async () => {
    if (isDisbandingGroup) return
    setIsDisbandingGroup(true)
    try {
      await disbandGroup(conversation.id)
      queryClient.removeQueries({ queryKey: queryKeys.chat.conversation(conversation.id) })
      queryClient.removeQueries({ queryKey: queryKeys.chat.groupMembers(conversation.id) })
      queryClient.removeQueries({ queryKey: CHAT_QUERY_KEYS.messages(conversation.id) })
      queryClient.removeQueries({ queryKey: CHAT_QUERY_KEYS.liveMessages(conversation.id) })
      queryClient.removeQueries({ queryKey: CHAT_QUERY_KEYS.mediaArchive(conversation.id) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations })
      toast.success(t('chat.groupDisbanded'))
      setDisbandGroupOpen(false)
      onClose()
      navigate(ROUTES.messages)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error'))
    } finally {
      setIsDisbandingGroup(false)
    }
  }

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

  // Merge the bounded chat window with the separately paginated archive history.
  const { mediaItems, fileItems } = useMemo(() => {
    const media: MessageAttachmentItem[] = []
    const files: MessageAttachmentItem[] = []
    const messages = new Map<
      string,
      {
        message: { attachments?: MessageAttachmentItem[]; createdAt?: string }
        order: number
      }
    >()
    let order = 0

    for (const page of archiveQuery.data?.pages ?? []) {
      for (const message of page.items) messages.set(message.id, { message, order: order++ })
    }
    for (const group of groups.slice().reverse()) {
      for (const message of group.messages.slice().reverse()) {
        if (!messages.has(message.id)) messages.set(message.id, { message, order: order++ })
      }
    }

    const seenAttachments = new Set<string>()
    const sortedMessages = [...messages.values()].sort((a, b) => {
      const aTime = Date.parse(a.message.createdAt ?? '')
      const bTime = Date.parse(b.message.createdAt ?? '')
      return Number.isFinite(aTime) && Number.isFinite(bTime) ? bTime - aTime : a.order - b.order
    })

    for (const { message } of sortedMessages) {
      for (const att of message.attachments ?? []) {
        if (seenAttachments.has(att.id)) continue
        seenAttachments.add(att.id)
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

    return { mediaItems: media, fileItems: files }
  }, [archiveQuery.data, groups])

  const displayedMedia = useMemo(() => {
    return showAllMedia ? mediaItems : mediaItems.slice(0, MEDIA_DISPLAY_LIMIT)
  }, [mediaItems, showAllMedia])

  const displayedFiles = useMemo(() => {
    return showAllFiles ? fileItems : fileItems.slice(0, FILES_DISPLAY_LIMIT)
  }, [fileItems, showAllFiles])

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
        aria-label={t('chat.resizeInfoPanel')}
        aria-valuemin={MIN_PANEL_WIDTH}
        aria-valuemax={
          typeof window === 'undefined'
            ? MAX_PANEL_WIDTH
            : Math.min(MAX_PANEL_WIDTH, Math.floor(window.innerWidth * 0.55))
        }
        aria-valuenow={panelWidth}
        title={t('chat.resizeInfoPanelHint')}
        tabIndex={0}
        onMouseDown={startResizing}
        onDoubleClick={resetWidth}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 32 : 8
          const maxAllowed = Math.min(MAX_PANEL_WIDTH, Math.floor(window.innerWidth * 0.55))
          if (event.key === 'ArrowLeft')
            setPanelWidth((width) => Math.min(maxAllowed, width + step))
          else if (event.key === 'ArrowRight')
            setPanelWidth((width) => Math.max(MIN_PANEL_WIDTH, width - step))
          else return
          event.preventDefault()
        }}
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
            {canEditGroupMetadata && (
              <>
                <input
                  ref={groupAvatarInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  aria-label={t('chat.chooseGroupAvatar')}
                  onChange={(event) => {
                    void handleGroupAvatarFile(event.target.files?.[0])
                    event.target.value = ''
                  }}
                />
                <button
                  type="button"
                  onClick={() => groupAvatarInput.current?.click()}
                  disabled={isUploadingGroupAvatar}
                  aria-label={t('chat.chooseGroupAvatar')}
                  className="absolute -right-1 -bottom-1 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
                >
                  <CameraIcon className="size-4" aria-hidden="true" />
                </button>
              </>
            )}
            {conversation.online && (
              <span
                className="absolute right-1 bottom-1 size-3.5 rounded-full bg-success ring-2 ring-card"
                title={t('chat.online')}
                aria-hidden="true"
              />
            )}
          </div>

          {groupTitleEditing ? (
            <form
              className="mt-3 flex w-full max-w-sm gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                const title = groupTitleDraft.trim()
                if (title && title.length <= GROUP_MAX_NAME_LENGTH)
                  void runGroupAction(
                    () => updateGroup(conversation.id, title),
                    'chat.groupUpdated',
                  ).then((success) => success && setGroupTitleEditing(false))
              }}
            >
              <input
                autoFocus
                maxLength={GROUP_MAX_NAME_LENGTH}
                value={groupTitleDraft}
                onChange={(event) => setGroupTitleDraft(event.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                aria-label={t('chat.groupName')}
              />
              <Button size="sm" type="submit" disabled={!groupTitleDraft.trim()}>
                {t('chat.save')}
              </Button>
              <Button
                size="sm"
                type="button"
                variant="ghost"
                onClick={() => setGroupTitleEditing(false)}
              >
                {t('chat.cancel')}
              </Button>
            </form>
          ) : (
            <div className="mt-3 flex max-w-full items-center gap-1">
              <h2 className="min-w-0 truncate px-2 text-base font-bold text-foreground">
                {conversation.name}
              </h2>
              {canEditGroupMetadata && (
                <button
                  type="button"
                  onClick={() => {
                    setGroupTitleDraft(conversation.name)
                    setGroupTitleEditing(true)
                  }}
                  aria-label={t('chat.editGroupName')}
                  title={t('chat.editGroupName')}
                  className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <EditIcon className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>
          )}

          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {conversation.isGroup
              ? t('chat.groupMemberCount', {
                  count: conversation.memberCount ?? activeMembers.length,
                })
              : conversation.online
                ? t('chat.online')
                : (conversation.lastActive ?? t('chat.offline'))}
          </p>
        </div>

        {/* 3. 3 Nút tròn Quick Action (Messenger Style) */}
        <div
          className={cn(
            'mt-5 grid gap-2 border-b border-border pb-5',
            conversation.isGroup && !canManageGroup ? 'grid-cols-2' : 'grid-cols-3',
          )}
        >
          {!conversation.isGroup && (
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="group flex flex-col items-center focus-visible:outline-hidden"
            >
              <div className="grid size-10 place-items-center rounded-full bg-muted text-brand-ink transition-colors group-hover:bg-accent">
                <UserIcon className="size-5" aria-hidden="true" />
              </div>
              <span className="mt-1.5 text-xs font-medium text-foreground">
                {t('chat.profile')}
              </span>
            </button>
          )}

          {conversation.isGroup && canManageGroup && (
            <button
              type="button"
              onClick={() => setAddMembersOpen(true)}
              disabled={(conversation.memberCount ?? activeMembers.length) >= GROUP_MAX_MEMBERS}
              title={
                (conversation.memberCount ?? activeMembers.length) >= GROUP_MAX_MEMBERS
                  ? t('chat.groupFull')
                  : undefined
              }
              className="group flex flex-col items-center focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="grid size-10 place-items-center rounded-full bg-muted text-brand-ink transition-colors group-hover:bg-accent">
                <UserCheckIcon className="size-5" aria-hidden="true" />
              </div>
              <span className="mt-1.5 text-xs font-medium text-foreground">
                {t('chat.groupAddMembers')}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => toast.info(t('chat.featureComingSoon'))}
            className="flex flex-col items-center group focus-visible:outline-hidden"
          >
            <div className="grid size-10 place-items-center rounded-full bg-muted text-brand-ink transition-colors group-hover:bg-accent">
              <BellIcon className="size-5" aria-hidden="true" />
            </div>
            <span className="mt-1.5 text-xs font-medium text-foreground">{t('chat.mute')}</span>
          </button>

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
                  {archiveQuery.isError && (
                    <button
                      type="button"
                      onClick={() => void archiveQuery.refetch()}
                      className="mb-2 w-full text-center text-xs text-destructive hover:underline"
                    >
                      {t('chat.messagesLoadError')} · {t('common.retry')}
                    </button>
                  )}
                  {archiveQuery.isPending && mediaItems.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      {t('chat.pending')}
                    </p>
                  ) : mediaItems.length === 0 ? (
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
                  {archiveQuery.hasNextPage && (
                    <button
                      type="button"
                      disabled={archiveQuery.isFetchingNextPage}
                      onClick={() => void archiveQuery.fetchNextPage()}
                      className="mt-2.5 w-full rounded-md border border-border/60 bg-muted/40 py-1.5 text-center text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
                    >
                      {archiveQuery.isFetchingNextPage
                        ? t('common.loading')
                        : t('chat.loadOlderMedia')}
                    </button>
                  )}
                </div>
              )}

              {/* Nội dung Tab Tệp tin & Tài liệu */}
              {mediaTab === 'files' && (
                <div className="mt-3">
                  {archiveQuery.isError && (
                    <button
                      type="button"
                      onClick={() => void archiveQuery.refetch()}
                      className="mb-2 w-full text-center text-xs text-destructive hover:underline"
                    >
                      {t('chat.messagesLoadError')} · {t('common.retry')}
                    </button>
                  )}
                  {archiveQuery.isPending && fileItems.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      {t('chat.pending')}
                    </p>
                  ) : fileItems.length === 0 ? (
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
                  {archiveQuery.hasNextPage && (
                    <button
                      type="button"
                      disabled={archiveQuery.isFetchingNextPage}
                      onClick={() => void archiveQuery.fetchNextPage()}
                      className="mt-2.5 w-full rounded-md border border-border/60 bg-muted/40 py-1.5 text-center text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
                    >
                      {archiveQuery.isFetchingNextPage
                        ? t('common.loading')
                        : t('chat.loadOlderMedia')}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {conversation.isGroup && (
          <section
            ref={memberSection}
            className="border-b border-border py-3"
            aria-label={t('chat.groupMembersTitle')}
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                {t('chat.groupMembersTitle')} ({activeMembers.length})
              </h3>
              {activeMembers.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllMembers((expanded) => !expanded)}
                  className="text-xs font-medium text-primary hover:underline"
                  aria-expanded={showAllMembers}
                >
                  {showAllMembers ? t('chat.collapse') : t('chat.viewAll')}
                </button>
              )}
            </div>
            {membersQuery.isPending ? (
              <p className="py-2 text-xs text-muted-foreground">{t('common.loading')}</p>
            ) : (
              <ul className="space-y-1">
                {visibleMembers.map((member) => (
                  <li key={member.id} className="flex items-center gap-2 rounded-lg px-1 py-1.5">
                    <UserAvatar
                      name={member.fullName || member.username}
                      src={member.avatarUrl}
                      className="size-8"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {member.fullName || member.username}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {t(`chat.groupRole${member.role}`)}
                    </span>
                    {canManageGroup && currentUserId && member.id !== currentUserId && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label={`${t('chat.moreOptions')} ${member.fullName || member.username}`}
                            className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <MoreIcon className="size-4" aria-hidden="true" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-40">
                          <DropdownMenuItem
                            onClick={() =>
                              void runGroupAction(
                                () =>
                                  updateGroupMemberRole(
                                    conversation.id,
                                    member.id,
                                    member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN',
                                  ),
                                'chat.groupUpdated',
                              )
                            }
                          >
                            {member.role === 'ADMIN'
                              ? t('chat.groupDemote')
                              : t('chat.groupPromote')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() =>
                              setPendingGroupAction({
                                description: t('chat.groupRemoveConfirm', {
                                  name: member.fullName || member.username,
                                }),
                                successKey: 'chat.groupMemberRemoved',
                                action: () => removeGroupMember(conversation.id, member.id),
                              })
                            }
                          >
                            {t('chat.groupRemove')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

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
                  onClick={() => setLeaveGroupOpen(true)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 dark:hover:bg-destructive/20"
                >
                  <LeaveIcon className="size-4" aria-hidden="true" />
                  <span>{t('chat.leaveGroup')}</span>
                </button>
              )}
              {conversation.isGroup && canManageGroup && (
                <button
                  type="button"
                  onClick={() => setDisbandGroupOpen(true)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 dark:hover:bg-destructive/20"
                >
                  <LeaveIcon className="size-4" aria-hidden="true" />
                  <span>{t('chat.disbandGroup')}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 6. Modal Xem Thẻ Thông Tin Cá Nhân (User Profile Card) */}
      {!conversation.isGroup && (
        <UserProfileDialog
          open={profileModalOpen}
          onOpenChange={setProfileModalOpen}
          conversation={conversation}
          username={username}
          bio={bio}
          onUnfriend={() => setUnfriendOpen(true)}
          onBlock={() => setBlockOpen(true)}
        />
      )}

      {/* 7. Modal Xem Ảnh Lightbox đồng bộ 100% với tin nhắn đoạn chat */}
      <ImageLightboxModal
        attachment={selectedMediaAttachment}
        onClose={() => setSelectedMediaAttachment(null)}
      />

      <Dialog open={addMembersOpen} onOpenChange={setAddMembersOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('chat.groupAddMembers')}</DialogTitle>
            <DialogDescription>{t('chat.groupAddMembersHint')}</DialogDescription>
          </DialogHeader>
          {friendsQuery.isPending ? (
            <p className="py-2 text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : friendsQuery.isError ? (
            <p className="py-2 text-sm text-destructive">{t('chat.friendsLoadError')}</p>
          ) : friendsQuery.data?.filter((friend) => !activeMemberIds.has(friend.id)).length ? (
            <div className="max-h-72 overflow-y-auto">
              {friendsQuery.data
                ?.filter((friend) => !activeMemberIds.has(friend.id))
                .map((friend) => (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() =>
                      !isGroupActionPending &&
                      void runGroupAction(
                        () => addGroupMembers(conversation.id, [friend.id]),
                        'chat.groupMembersAdded',
                      ).then((success) => success && setAddMembersOpen(false))
                    }
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted"
                  >
                    <UserAvatar name={friend.name} src={friend.avatarUrl} className="size-9" />
                    <span className="min-w-0 flex-1 truncate text-sm">{friend.name}</span>
                    <span className="text-xs text-primary">{t('chat.add')}</span>
                  </button>
                ))}
            </div>
          ) : (
            <p className="py-2 text-sm text-muted-foreground">{t('chat.groupNoFriendsToAdd')}</p>
          )}
        </DialogContent>
      </Dialog>

      {/* 8. Confirmation Dialog: Hủy kết bạn */}
      <Dialog open={unfriendOpen} onOpenChange={setUnfriendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('chat.unfriendConfirmTitle', { name: conversation.name })}</DialogTitle>
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
            <DialogTitle>{t('chat.blockConfirmTitle', { name: conversation.name })}</DialogTitle>
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

      <Dialog open={leaveGroupOpen} onOpenChange={setLeaveGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('chat.leaveGroupConfirmTitle', { name: conversation.name })}
            </DialogTitle>
            <DialogDescription>
              {mustPromoteAdminBeforeLeaving
                ? t('chat.lastAdminLeaveHint')
                : t('chat.leaveGroupConfirmDesc')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveGroupOpen(false)}>
              {t('chat.cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={mustPromoteAdminBeforeLeaving}
              onClick={() =>
                void runGroupAction(() => leaveGroup(conversation.id), 'chat.groupLeft').then(
                  (success) => {
                    if (!success) return
                    setLeaveGroupOpen(false)
                    onClose()
                    navigate(ROUTES.messages)
                  },
                )
              }
            >
              {t('chat.leaveGroupAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disbandGroupOpen} onOpenChange={setDisbandGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('chat.disbandGroupConfirmTitle', { name: conversation.name })}
            </DialogTitle>
            <DialogDescription>{t('chat.disbandGroupConfirmDesc')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDisbandGroupOpen(false)}
              disabled={isDisbandingGroup}
            >
              {t('chat.cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={isDisbandingGroup}
              onClick={() => void handleDisbandGroup()}
            >
              {isDisbandingGroup ? t('common.loading') : t('chat.disbandGroup')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(pendingGroupAction)}
        onOpenChange={(open) => !open && setPendingGroupAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('chat.confirmGroupActionTitle')}</DialogTitle>
            <DialogDescription>{pendingGroupAction?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingGroupAction(null)}>
              {t('chat.cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={isGroupActionPending}
              onClick={() => {
                if (!pendingGroupAction) return
                void runGroupAction(pendingGroupAction.action, pendingGroupAction.successKey).then(
                  (success) => {
                    if (success) setPendingGroupAction(null)
                  },
                )
              }}
            >
              {t('chat.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
