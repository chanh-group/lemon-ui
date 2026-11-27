import { useTranslation } from 'react-i18next'
import type { ChatUser } from '@/features/friend/types/friend.types'

export type StoryAudienceMode = 'ALL_FRIENDS' | 'CUSTOM' | 'EXCLUDE'
interface Props {
  mode: StoryAudienceMode
  selected: string[]
  friends: ChatUser[]
  loading: boolean
  error: boolean
  onChange: (mode: StoryAudienceMode, selected: string[]) => void
}

export function StoryAudienceSelector({
  mode,
  selected,
  friends,
  loading,
  error,
  onChange,
}: Props) {
  const { t } = useTranslation()
  return (
    <fieldset className="space-y-2 border-b border-border p-4 text-sm">
      <legend className="font-semibold">{t('chat.storyAudienceLabel')}</legend>
      <select
        aria-label={t('chat.storyAudienceLabel')}
        value={mode}
        onChange={(event) => onChange(event.target.value as StoryAudienceMode, [])}
        className="w-full rounded-lg border border-border bg-card p-2 text-foreground"
      >
        <option value="ALL_FRIENDS">{t('chat.storyAudienceAll')}</option>
        <option value="CUSTOM">{t('chat.storyAudienceOnly')}</option>
        <option value="EXCLUDE">{t('chat.storyAudienceExcept')}</option>
      </select>
      {mode !== 'ALL_FRIENDS' &&
        (loading ? (
          <p>{t('common.loading')}</p>
        ) : error ? (
          <p role="alert">{t('common.errorMessage')}</p>
        ) : (
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {friends.map((friend) => (
              <label key={friend.id} className="flex items-center gap-2 rounded p-1">
                <input
                  type="checkbox"
                  checked={selected.includes(friend.id)}
                  onChange={(event) =>
                    onChange(
                      mode,
                      event.target.checked
                        ? [...selected, friend.id]
                        : selected.filter((id) => id !== friend.id),
                    )
                  }
                />
                {friend.name}
              </label>
            ))}
            {friends.length === 0 && <p>{t('chat.storyAudienceNoFriends')}</p>}
          </div>
        ))}
    </fieldset>
  )
}
