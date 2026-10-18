import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckIcon as CheckData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const Check = createIcon(CheckData)
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useCreateGroup } from '../../hooks/useFriends'
import { MOCK_FRIENDS } from '../../data/mockData'
import { Avatar, PaneHeader, SearchBox } from './kit'

/** Wizard tạo nhóm 2 bước: chọn thành viên (chỉ bạn bè) → đặt tên nhóm. */
export function GroupWizard({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const { t } = useTranslation()
  const [step, setStep] = useState<'members' | 'name'>('members')
  const [selected, setSelected] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [groupName, setGroupName] = useState('')
  const createGroup = useCreateGroup()

  const friends = useMemo(() => {
    const q = query.trim().toLowerCase()
    return MOCK_FRIENDS.filter((f) => !q || f.name.toLowerCase().includes(q) || f.username.toLowerCase().includes(q))
  }, [query])

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const handleCreate = () => {
    const name = groupName.trim()
    if (!name || selected.length === 0) return
    createGroup.mutate(
      { name, memberIds: selected },
      {
        onSuccess: (group) => {
          toast.success(t('chat.groupCreated', { name: group.name }))
          onDone()
        },
      },
    )
  }

  return (
    <>
      <PaneHeader
        title={step === 'members' ? t('chat.chooseMembers') : t('chat.groupName')}
        onBack={step === 'members' ? onBack : () => setStep('members')}
      />
      <div className="px-4 pb-3 sm:px-5">
        <SearchBox value={step === 'members' ? query : groupName} onChange={step === 'members' ? setQuery : setGroupName} hint={step === 'members' ? t('chat.searchPeopleHint') : t('chat.groupNamePlaceholder')} />
        {step === 'name' && <p className="px-2 pt-2 text-xs text-muted-foreground">{t('chat.selectedCount', { count: selected.length })}</p>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {step === 'members' ? (
          <>
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
                      <Avatar name={friend.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">{friend.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">@{friend.username}</span>
                      </span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          'grid size-6 shrink-0 place-items-center rounded-full border-2 transition-all duration-150',
                          checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
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
                onClick={onDone}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
              >
                {t('chat.skip')}
              </button>
              <button
                type="button"
                onClick={() => selected.length > 0 && setStep('name')}
                disabled={selected.length === 0}
                className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
              >
                {t('chat.next')}
              </button>
            </div>
          </>
        ) : (
          <div className="flex justify-end gap-2 px-3 pt-4">
            <button
              type="button"
              onClick={handleCreate}
              disabled={!groupName.trim() || selected.length === 0 || createGroup.isPending}
              className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
            >
              {createGroup.isPending ? t('chat.pending') : t('chat.createGroup')}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
