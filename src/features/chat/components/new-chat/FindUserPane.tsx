import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useFindUserByEmail, useFindUserByUsername } from '../../hooks/useFriends'
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
  const [submitted, setSubmitted] = useState('')
  const byUsername = useFindUserByUsername()
  const byEmail = useFindUserByEmail()
  const finder = mode === 'username' ? byUsername : byEmail
  const user = finder.data ?? null

  const handleNext = () => {
    const v = value.trim()
    if (!v) return
    setSubmitted(v)
    if (mode === 'username') byUsername.mutate(v)
    else byEmail.mutate(v)
  }

  const openMessages = () => navigate(ROUTES.messages)

  return (
    <>
      <PaneHeader title={mode === 'username' ? t('chat.newChatByUsername') : t('chat.newChatByEmail')} onBack={onBack} />
      <div className="px-4 pb-2 sm:px-5">
        <label className="chat-search group flex items-center gap-2 rounded-lg border border-border bg-muted px-3.5 py-2.5 transition-all duration-150 focus-within:border-ring focus-within:bg-card">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNext()}
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
        {user ? (
          <SearchResultCard user={user} onMessage={openMessages} />
        ) : submitted && !finder.isPending ? (
          <p className="px-5 pt-4 text-sm text-muted-foreground">{t('chat.userNotFound')}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 justify-end px-4 pb-4">
        <button
          type="button"
          onClick={handleNext}
          disabled={!value.trim() || finder.isPending}
          className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
        >
          {finder.isPending ? t('chat.pending') : t('chat.next')}
        </button>
      </div>
    </>
  )
}
