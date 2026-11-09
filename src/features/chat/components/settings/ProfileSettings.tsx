import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  AtIcon as AtSignData,
  Camera01Icon as CameraData,
  CheckIcon as CheckData,
  CopyIcon as CopyData,
  Delete02Icon as DeleteData,
  Edit02Icon as PencilData,
  ImagePlusIcon as ImagePlusData,
  LoaderCircleIcon as LoaderData,
  Logout02Icon as SignOutData,
  Mail01Icon as MailData,
  MultiplicationSignIcon as XData,
  Upload01Icon as UploadData,
  User02Icon as UserIconData,
} from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
import { UserAvatar } from '@/components/common/UserAvatar'
import { fileToAvatarDataUrl } from '@/lib/avatar'
import { useMe, useUpdateProfile } from '@/features/auth/api'
import { useLogout } from '@/features/auth/hooks/useAuth'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { presignFile, uploadBinaryToUrl, uploadFileViaBackend } from '@/features/chat/api/chat.api'
import { isAuthBypass } from '@/config/env'
import { cn } from '@/lib/utils'

const AtSign = createIcon(AtSignData)
const Camera = createIcon(CameraData)
const Check = createIcon(CheckData)
const Copy = createIcon(CopyData)
const DeleteIcon = createIcon(DeleteData)
const Pencil = createIcon(PencilData)
const ImagePlus = createIcon(ImagePlusData)
const Loader = createIcon(LoaderData)
const SignOut = createIcon(SignOutData)
const Mail = createIcon(MailData)
const XIcon = createIcon(XData)
const UploadIcon = createIcon(UploadData)
const UserIcon = createIcon(UserIconData)

type CopyField = 'username' | 'email'
const AVATAR_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

export function ProfileSettings() {
  const { t } = useTranslation()
  const { data: user, isPending, refetch } = useMe()
  const updateProfileMutation = useUpdateProfile()
  const logout = useLogout()

  const [copiedField, setCopiedField] = useState<CopyField | null>(null)

  // Full Name inline edit state
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

  // Bio inline edit state
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [bioDraft, setBioDraft] = useState('')

  // Avatar Dialog state
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false)
  const [isSavingAvatar, setIsSavingAvatar] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleCopy = async (field: CopyField, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      window.setTimeout(() => setCopiedField((current) => (current === field ? null : current)), 1500)
    } catch {
      setCopiedField(null)
    }
  }

  // --- Full Name Handlers ---
  const handleStartEditName = () => {
    setNameDraft(user?.fullName || '')
    setIsEditingName(true)
  }

  const handleCancelName = () => {
    setIsEditingName(false)
    setNameDraft('')
  }

  const handleSaveName = async () => {
    const trimmed = nameDraft.trim()
    if (!trimmed) {
      toast.error(t('chat.fullNameRequired'))
      return
    }
    if (trimmed.length > 100) {
      toast.error(t('chat.fullNameMaxLength'))
      return
    }

    try {
      await updateProfileMutation.mutateAsync({ fullName: trimmed })
      toast.success(t('chat.profileUpdated'))
      setIsEditingName(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('chat.profileUpdateFailed'))
    }
  }

  // --- Bio Handlers ---
  const handleStartEditBio = () => {
    setBioDraft(user?.bio || '')
    setIsEditingBio(true)
  }

  const handleCancelBio = () => {
    setIsEditingBio(false)
    setBioDraft('')
  }

  const handleSaveBio = async () => {
    if (bioDraft.length > 500) {
      toast.error(t('chat.bioMaxLength'))
      return
    }

    try {
      await updateProfileMutation.mutateAsync({ bio: bioDraft.trim() || null })
      toast.success(t('chat.profileUpdated'))
      setIsEditingBio(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('chat.profileUpdateFailed'))
    }
  }

  // --- Avatar Handlers ---
  const handleOpenAvatarDialog = () => {
    setSelectedFile(null)
    setAvatarPreviewUrl(null)
    setIsRemovingAvatar(false)
    setIsAvatarDialogOpen(true)
  }

  const handleCloseAvatarDialog = () => {
    setSelectedFile(null)
    setAvatarPreviewUrl(null)
    setIsRemovingAvatar(false)
    setIsAvatarDialogOpen(false)
  }

  const handleFileChange = async (file?: File) => {
    if (!file) return
    if (!AVATAR_MIME_TYPES.includes(file.type)) {
      toast.error(t('chat.avatarInvalidType'))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('chat.avatarFileTooLarge'))
      return
    }

    setSelectedFile(file)
    setIsRemovingAvatar(false)

    try {
      const dataUrl = await fileToAvatarDataUrl(file)
      setAvatarPreviewUrl(dataUrl)
    } catch {
      const fallbackUrl = URL.createObjectURL(file)
      setAvatarPreviewUrl(fallbackUrl)
    }
  }

  const handleRemoveAvatarChoice = () => {
    setSelectedFile(null)
    setAvatarPreviewUrl(null)
    setIsRemovingAvatar(true)
  }

  const handleSaveAvatar = async () => {
    setIsSavingAvatar(true)
    try {
      let finalAvatarUrl: string | null | undefined = undefined

      if (isRemovingAvatar) {
        finalAvatarUrl = null
      } else if (selectedFile) {
        let dataUrl = avatarPreviewUrl
        if (!dataUrl || (!dataUrl.startsWith('data:') && !dataUrl.startsWith('http'))) {
          dataUrl = await fileToAvatarDataUrl(selectedFile)
        }
        if (isAuthBypass()) {
          finalAvatarUrl = dataUrl
        } else {
          const mimeType = selectedFile.type || 'image/png'
          let avatarUrl: string | undefined
          let presignRes: Awaited<ReturnType<typeof presignFile>> | null = null
          try {
            presignRes = await presignFile({
              kind: 'USER_AVATAR',
              sizeBytes: selectedFile.size,
              mimeType,
              fileName: selectedFile.name,
            })
          } catch {
            presignRes = null
          }
          if (presignRes) {
            try {
              await uploadBinaryToUrl(presignRes.uploadUrl, selectedFile, mimeType)
              avatarUrl = presignRes.avatarUrl
            } catch {
              const fallback = await uploadFileViaBackend(selectedFile, 'USER_AVATAR', undefined, selectedFile.name)
              avatarUrl = fallback.avatarUrl
            }
          } else {
            const fallback = await uploadFileViaBackend(selectedFile, 'USER_AVATAR', undefined, selectedFile.name)
            avatarUrl = fallback.avatarUrl
          }
          if (!avatarUrl) throw new Error(t('chat.profileUpdateFailed'))
          finalAvatarUrl = avatarUrl
        }
      } else {
        handleCloseAvatarDialog()
        setIsSavingAvatar(false)
        return
      }

      await updateProfileMutation.mutateAsync({ avatarUrl: finalAvatarUrl })
      toast.success(finalAvatarUrl === null ? t('chat.avatarRemoved') : t('chat.avatarUpdated'))
      handleCloseAvatarDialog()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('chat.profileUpdateFailed'))
    } finally {
      setIsSavingAvatar(false)
    }
  }

  if (isPending) {
    return (
      <div className="flex justify-center py-10 text-sm text-muted-foreground" aria-busy="true">
        {t('common.loading')}
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm font-semibold text-foreground">{t('common.errorTitle')}</p>
        <p className="text-sm text-muted-foreground">{t('common.errorMessage')}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
        >
          {t('common.retry')}
        </button>
      </div>
    )
  }

  const userName = user.fullName?.trim() || user.username
  const copied = (field: CopyField) => (copiedField === field ? t('chat.copied') : null)

  // Determine which avatar to show in preview
  const currentPreviewSrc = isRemovingAvatar
    ? null
    : avatarPreviewUrl !== null
      ? avatarPreviewUrl
      : user.avatarUrl

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      <h2 className="text-center text-base font-bold text-foreground">
        {t('chat.profile')}
      </h2>

      {/* Avatar Section */}
      <div className="flex flex-col items-center">
        <UserAvatar
          name={userName}
          src={user.avatarUrl}
          className="size-24 ring-4 ring-card shadow-lg sm:size-28"
          fallbackClassName="text-3xl font-bold text-foreground"
        />

        <button
          type="button"
          onClick={handleOpenAvatarDialog}
          className="mt-3.5 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
        >
          <Camera className="size-3.5 text-brand-ink" aria-hidden="true" />
          <span>{t('chat.editPhoto')}</span>
        </button>
      </div>

      {/* Full Name & Bio Section */}
      <div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {/* Full Name Row */}
          {isEditingName ? (
            <div className="flex flex-col gap-2 p-3.5">
              <label className="text-xs font-medium text-muted-foreground">{t('chat.nameLabel')}</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSaveName()
                    if (e.key === 'Escape') handleCancelName()
                  }}
                  maxLength={100}
                  autoFocus
                  disabled={updateProfileMutation.isPending}
                  className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-1.5 text-sm font-semibold text-foreground focus:border-brand-ink focus:outline-none focus:ring-1 focus:ring-brand-ink"
                  placeholder={t('chat.nameLabel')}
                />
                <button
                  type="button"
                  onClick={() => void handleSaveName()}
                  disabled={updateProfileMutation.isPending}
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-brand-ink px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {updateProfileMutation.isPending ? (
                    <Loader className="size-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Check className="size-3.5" aria-hidden="true" />
                  )}
                  <span>{t('chat.save')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelName}
                  disabled={updateProfileMutation.isPending}
                  className="inline-flex shrink-0 items-center rounded-xl border border-border bg-muted/60 p-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <XIcon className="size-4" aria-hidden="true" />
                </button>
              </div>
              <span className="text-[11px] text-muted-foreground">{nameDraft.length}/100</span>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div className="flex min-w-0 items-center gap-3.5">
                <UserIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0">
                  <span className="block text-xs font-medium text-muted-foreground">{t('chat.nameLabel')}</span>
                  <span className="block truncate text-sm font-semibold text-foreground">{userName}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleStartEditName}
                aria-label={t('chat.editFullName')}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-muted/60 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <Pencil className="size-3.5" aria-hidden="true" />
                <span>{t('chat.editFullName')}</span>
              </button>
            </div>
          )}

          <div className="mx-4 border-t border-border" aria-hidden="true" />

          {/* Bio Row */}
          {isEditingBio ? (
            <div className="flex flex-col gap-2 p-3.5">
              <label className="text-xs font-medium text-muted-foreground">{t('chat.aboutLabel')}</label>
              <textarea
                value={bioDraft}
                onChange={(e) => setBioDraft(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') void handleSaveBio()
                  if (e.key === 'Escape') handleCancelBio()
                }}
                maxLength={500}
                rows={3}
                autoFocus
                disabled={updateProfileMutation.isPending}
                className="min-w-0 resize-y rounded-xl border border-border bg-background p-2.5 text-sm text-foreground focus:border-brand-ink focus:outline-none focus:ring-1 focus:ring-brand-ink"
                placeholder={t('chat.bioPlaceholder')}
              />
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'text-[11px]',
                    bioDraft.length > 500 ? 'text-destructive font-semibold' : 'text-muted-foreground',
                  )}
                >
                  {bioDraft.length}/500
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelBio}
                    disabled={updateProfileMutation.isPending}
                    className="inline-flex items-center rounded-xl border border-border bg-muted/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <span>{t('chat.cancel')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveBio()}
                    disabled={updateProfileMutation.isPending || bioDraft.length > 500}
                    className="inline-flex items-center gap-1 rounded-xl bg-brand-ink px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {updateProfileMutation.isPending ? (
                      <Loader className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Check className="size-3.5" aria-hidden="true" />
                    )}
                    <span>{t('chat.save')}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div className="flex min-w-0 items-center gap-3.5">
                <Pencil className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-muted-foreground">{t('chat.aboutLabel')}</span>
                  <span
                    className={
                      user.bio
                        ? 'block break-words text-sm text-foreground whitespace-pre-wrap'
                        : 'block truncate text-sm text-muted-foreground'
                    }
                  >
                    {user.bio || t('chat.aboutDefault')}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleStartEditBio}
                aria-label={t('chat.editBio')}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-muted/60 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <Pencil className="size-3.5" aria-hidden="true" />
                <span>{t('chat.editBio')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Username & Email Readonly Section */}
      <div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="flex min-w-0 items-center gap-3.5">
              <AtSign className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0">
                <span className="block text-xs font-medium text-muted-foreground">{t('chat.usernameLabel')}</span>
                <span className="block truncate text-sm font-semibold text-foreground">@{user.username}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleCopy('username', user.username)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-muted/60 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
            >
              {copiedField === 'username' ? (
                <Check className="size-3.5 text-emerald-500" aria-hidden="true" />
              ) : (
                <Copy className="size-3.5" aria-hidden="true" />
              )}
              <span>{copied('username') ?? t('chat.copyUsername')}</span>
            </button>
          </div>

          <div className="mx-4 border-t border-border" aria-hidden="true" />

          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="flex min-w-0 items-center gap-3.5">
              <Mail className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0">
                <span className="block text-xs font-medium text-muted-foreground">{t('chat.emailLabel')}</span>
                <span className="block truncate text-sm font-semibold text-foreground">{user.email}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleCopy('email', user.email)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-muted/60 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
            >
              {copiedField === 'email' ? (
                <Check className="size-3.5 text-emerald-500" aria-hidden="true" />
              ) : (
                <Copy className="size-3.5" aria-hidden="true" />
              )}
              <span>{copied('email') ?? t('chat.copyEmail')}</span>
            </button>
          </div>
        </div>

        <p className="mt-2 px-3 text-xs text-muted-foreground">
          {t('chat.usernameSubtitle')}
        </p>
        <p className="mt-1 px-3 text-xs text-muted-foreground">
          {t('chat.emailSubtitle')}
        </p>
      </div>

      {/* Đăng xuất — nút logout chính của mobile */}
      <button
        type="button"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        className="flex w-full items-center gap-3.5 rounded-2xl border border-border bg-card p-4 text-destructive shadow-sm transition-all duration-150 hover:bg-destructive/10 disabled:opacity-40"
      >
        <SignOut className="size-5 shrink-0" aria-hidden="true" />
        <span className="text-sm font-semibold">{t('chat.signOut')}</span>
      </button>

      {/* Avatar Edit Dialog */}
      <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">{t('chat.editPhotoDialogTitle')}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t('chat.editPhotoDialogDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-2">
            {/* Live Preview */}
            <div className="relative">
              <UserAvatar
                name={userName}
                src={currentPreviewSrc}
                className="size-28 ring-4 ring-card shadow-md"
                fallbackClassName="text-3xl font-bold text-foreground"
              />
              {isRemovingAvatar && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-xs font-bold text-white">
                  {t('chat.removePhoto')}
                </span>
              )}
            </div>

            {/* Option 1: File Upload Dropzone */}
            <input
              ref={fileInputRef}
              type="file"
              accept={AVATAR_MIME_TYPES.join(',')}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                handleFileChange(file)
              }}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                const file = e.dataTransfer.files?.[0]
                handleFileChange(file)
              }}
              className={cn(
                'flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-4 text-center transition-colors',
                isDragging
                  ? 'border-brand-ink bg-brand-ink/5'
                  : 'border-border bg-muted/40 hover:border-brand-ink/50 hover:bg-muted/70',
              )}
            >
              <div className="grid size-10 place-items-center rounded-full bg-background shadow-xs">
                <UploadIcon className="size-5 text-brand-ink" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {selectedFile ? selectedFile.name : t('chat.uploadFromDevice')}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{t('chat.dragOrClickPhoto')}</p>
              </div>
            </div>

            {/* Remove Avatar */}
            {(user.avatarUrl || currentPreviewSrc) && !isRemovingAvatar && (
              <button
                type="button"
                onClick={handleRemoveAvatarChoice}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive hover:underline"
              >
                <DeleteIcon className="size-3.5" aria-hidden="true" />
                <span>{t('chat.removePhoto')}</span>
              </button>
            )}
          </div>

          <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCloseAvatarDialog}
              disabled={isSavingAvatar}
              className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
            >
              {t('chat.cancel')}
            </button>
            <button
              type="button"
              onClick={() => void handleSaveAvatar()}
              disabled={isSavingAvatar || (!selectedFile && !isRemovingAvatar)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-ink px-4 py-2 text-xs font-semibold text-white shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isSavingAvatar ? (
                <Loader className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <ImagePlus className="size-3.5" aria-hidden="true" />
              )}
              <span>{t('chat.saveChanges')}</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
