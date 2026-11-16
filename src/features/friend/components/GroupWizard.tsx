import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera01Icon as CameraData, CheckIcon as CheckData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const Check = createIcon(CheckData)
const Camera = createIcon(CameraData)
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useFriends } from '@/features/friend/hooks/useFriends'
import {
  useCreateGroupMutation,
  useUploadGroupAvatarMutation,
} from '@/features/conversation/hooks/useConversations'
import { UserAvatar } from '@/components/common/UserAvatar'
import type { ConversationResponse } from '@/features/conversation/types/conversation.types'
import {
  GROUP_MAX_INVITED_MEMBERS,
  GROUP_MAX_NAME_LENGTH,
  GROUP_MIN_INVITED_MEMBERS,
} from '@/features/conversation/constants'
import { Avatar, PaneHeader, SearchBox } from './kit'

/** Wizard tạo nhóm 2 bước: chọn thành viên (chỉ bạn bè) → đặt tên nhóm. */
export function GroupWizard({
  onBack,
  onDone,
}: {
  onBack: () => void
  onDone: (conversationId?: string) => void
}) {
  const { t } = useTranslation()
  const [step, setStep] = useState<'members' | 'name'>('members')
  const [selected, setSelected] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [groupName, setGroupName] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdGroup, setCreatedGroup] = useState<ConversationResponse | null>(null)
  const avatarInput = useRef<HTMLInputElement>(null)
  const requestId = useRef<{ signature: string; id: string } | null>(null)
  const createGroup = useCreateGroupMutation()
  const uploadAvatar = useUploadGroupAvatarMutation()
  const friendsQuery = useFriends()

  useEffect(
    () => () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    },
    [avatarPreview],
  )

  const friends = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (friendsQuery.data ?? []).filter(
      (friend) =>
        !q || friend.name.toLowerCase().includes(q) || friend.username.toLowerCase().includes(q),
    )
  }, [friendsQuery.data, query])

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const handleAvatarSelect = (file?: File) => {
    if (!file) return
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
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleCreate = async () => {
    if (isSubmitting) return
    const name = groupName.trim() || t('chat.defaultGroupName')
    if (selected.length < GROUP_MIN_INVITED_MEMBERS || selected.length > GROUP_MAX_INVITED_MEMBERS)
      return
    const signature = JSON.stringify({ title: name, memberIds: [...selected].sort() })
    if (requestId.current?.signature !== signature) {
      requestId.current = { signature, id: crypto.randomUUID() }
    }
    setIsSubmitting(true)
    try {
      const group =
        createdGroup ??
        (await createGroup.mutateAsync({
          title: name,
          memberIds: selected,
          clientRequestId: requestId.current.id,
        }))
      if (!createdGroup) setCreatedGroup(group)
      if (avatarFile) {
        try {
          await uploadAvatar.mutateAsync({ conversationId: group.id, file: avatarFile })
        } catch {
          toast.error(t('chat.groupAvatarUploadFailed'))
          return
        }
      }
      toast.success(t('chat.groupCreated', { name: group.title ?? name }))
      requestId.current = null
      onDone(group.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <PaneHeader
        title={step === 'members' ? t('chat.chooseMembers') : t('chat.groupName')}
        onBack={
          step === 'members'
            ? onBack
            : createdGroup
              ? () => onDone(createdGroup.id)
              : () => setStep('members')
        }
      />
      <div className="px-4 pb-3 sm:px-5">
        <SearchBox
          value={step === 'members' ? query : groupName}
          onChange={step === 'members' ? setQuery : setGroupName}
          hint={step === 'members' ? t('chat.searchPeopleHint') : t('chat.groupNamePlaceholder')}
          maxLength={step === 'name' ? GROUP_MAX_NAME_LENGTH : undefined}
          disabled={step === 'name' && Boolean(createdGroup)}
        />
        {step === 'name' && (
          <div className="px-2 pt-2 text-xs text-muted-foreground">
            <p>{t('chat.selectedCount', { count: selected.length })}</p>
            <p>{t('chat.groupNameOptional', { name: t('chat.defaultGroupName') })}</p>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {step === 'members' ? (
          <>
            {friendsQuery.isPending && (
              <p className="px-4 py-2 text-sm text-muted-foreground">{t('chat.pending')}</p>
            )}
            {friendsQuery.isError && (
              <p className="px-4 py-2 text-sm text-destructive">{t('chat.friendsLoadError')}</p>
            )}
            <ul className="flex flex-col gap-0.5" role="list">
              {friends.map((friend) => {
                const checked = selected.includes(friend.id)
                return (
                  <li key={friend.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() => toggle(friend.id)}
                      className={cn(
                        'chat-item flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-150 hover:bg-muted',
                        checked && 'bg-secondary/60',
                      )}
                    >
                      <Avatar name={friend.name} src={friend.avatarUrl} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {friend.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          @{friend.username}
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          'grid size-6 shrink-0 place-items-center rounded-full border-2 transition-all duration-150',
                          checked
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border',
                        )}
                      >
                        {checked && <Check className="size-3.5" aria-hidden="true" />}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <div className="sticky bottom-0 flex justify-end gap-2 bg-linear-to-t from-card via-card/95 to-transparent px-3 pt-6 pb-2">
              <button
                type="button"
                onClick={() => onDone()}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
              >
                {t('chat.skip')}
              </button>
              <button
                type="button"
                onClick={() => selected.length >= GROUP_MIN_INVITED_MEMBERS && setStep('name')}
                disabled={
                  selected.length < GROUP_MIN_INVITED_MEMBERS ||
                  friendsQuery.isPending ||
                  friendsQuery.isError
                }
                className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
              >
                {t('chat.next')}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 px-3 pt-4">
            <input
              ref={avatarInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              aria-label={t('chat.chooseGroupAvatar')}
              onChange={(event) => {
                handleAvatarSelect(event.target.files?.[0])
                event.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => avatarInput.current?.click()}
              disabled={isSubmitting}
              aria-label={t('chat.chooseGroupAvatar')}
              className="relative rounded-2xl focus-visible:outline-2 focus-visible:outline-primary"
            >
              <UserAvatar
                name={groupName.trim() || t('chat.defaultGroupName')}
                src={avatarPreview}
                square
                className="size-20"
              />
              <span className="absolute -right-1 -bottom-1 grid size-7 place-items-center rounded-full bg-primary text-primary-foreground">
                <Camera className="size-4" aria-hidden="true" />
              </span>
            </button>
            <span className="text-xs text-muted-foreground">{t('chat.chooseGroupAvatar')}</span>
            {avatarFile && (
              <button
                type="button"
                onClick={() => {
                  setAvatarFile(null)
                  setAvatarPreview(null)
                }}
                disabled={isSubmitting}
                className="text-xs font-medium text-destructive hover:underline"
              >
                {t('chat.removeGroupAvatar')}
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={
                selected.length < GROUP_MIN_INVITED_MEMBERS ||
                selected.length > GROUP_MAX_INVITED_MEMBERS ||
                isSubmitting
              }
              className="self-end rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
            >
              {isSubmitting
                ? t('chat.pending')
                : createdGroup
                  ? t(avatarFile ? 'chat.retryGroupAvatar' : 'chat.openGroup')
                  : t('chat.createGroup')}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
