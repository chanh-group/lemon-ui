import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useFindUserByEmail, useFindUserByUsername } from '../../hooks/useFriends'
import { useCreateDirectChatMutation } from '../../hooks/useChatQueries'
import { ROUTES } from '@/config/constants'
import { PaneHeader } from './kit'
import { SearchResultCard } from './SearchResultCard'

/** Tìm user theo username / email. */
export function FindUserPane({
  mode,
  hint,
  onBack,
}: {
  mode: 'username' | 'email'
  hint: string
  onBack: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [debouncedValue, setDebouncedValue] = useState('')
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [value])
  const byUsername = useFindUserByUsername(mode === 'username' ? debouncedValue : '')
  const byEmail = useFindUserByEmail(mode === 'email' ? debouncedValue : '')
  const finder = mode === 'username' ? byUsername : byEmail
  const users = finder.data ?? []

  const createDirectChat = useCreateDirectChatMutation()

  const handleStartChat = async (userId: string) => {
    try {
      const conv = await createDirectChat.mutateAsync(userId)
      navigate(ROUTES.messages, { state: { select: conv.id } })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('common.error')
      toast.error(msg)
    }
  }

  return (
    <>
      <PaneHeader title={mode === 'username' ? t('chat.newChatByUsername') : t('chat.newChatByEmail')} onBack={onBack} />
      <div className="px-4 pb-2 sm:px-5">
        <label className="chat-search group flex items-center gap-2 rounded-lg border border-border bg-muted px-3.5 py-2.5 transition-all duration-150 focus-within:border-ring focus-within:bg-card">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={mode === 'username' ? t('chat.newChatByUsername') : t('chat.searchByEmailHint')}
            aria-label={hint}
            type={mode === 'email' ? 'email' : 'text'}
            inputMode="email"
            autoComplete="email"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
        <p className="px-1 pt-2 text-[13px] text-muted-foreground">{hint}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-3">
        {users.length > 0 ? (
          <div className="space-y-2 px-2">
            {users.map((user) => (
              <SearchResultCard key={user.id} user={user} onMessage={() => handleStartChat(user.id)} />
            ))}
          </div>
        ) : finder.isError ? (
          <p className="px-5 pt-4 text-sm text-destructive">{t('chat.searchUsersError')}</p>
        ) : debouncedValue.length >= 2 && !finder.isPending ? (
          <p className="px-5 pt-4 text-sm text-muted-foreground">{t('chat.userNotFound')}</p>
        ) : null}
      </div>

      {finder.isPending && <p className="px-5 pb-4 text-xs text-muted-foreground">{t('chat.pending')}</p>}
    </>
  )
}
