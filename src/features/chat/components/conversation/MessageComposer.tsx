import { useTranslation } from 'react-i18next'
import { PaperclipIcon as PaperclipData, SentIcon as SendData } from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
const Paperclip = createIcon(PaperclipData)
const Send = createIcon(SendData)

interface MessageComposerProps {
  draft: string
  onDraftChange: (v: string) => void
  onSubmit: () => void
}

export function MessageComposer({ draft, onDraftChange, onSubmit }: MessageComposerProps) {
  const { t } = useTranslation()
  return (
    <footer className="shrink-0 border-t border-border bg-card px-3 py-2.5 sm:px-5">
      <div className="flex w-full items-center gap-1.5">
        <label className="chat-composer flex min-h-11 min-w-0 flex-1 items-center gap-1 rounded-full border border-border bg-muted px-4 transition-all duration-150 focus-within:border-ring focus-within:bg-card">
          <span className="sr-only">{t('chat.sendMessage')}</span>
          <input
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onSubmit()
              }
            }}
            placeholder={t('chat.composeHint')}
            aria-label={t('chat.composeHint')}
            className="h-11 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            aria-label={t('chat.attachFile')}
            title={t('chat.attachFile')}
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-border hover:text-foreground"
          >
            <Paperclip className="size-5" aria-hidden="true" />
          </button>
        </label>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!draft.trim()}
          aria-label={t('chat.sendMessage')}
          title={t('chat.sendMessage')}
          className="chat-send grid size-11 min-h-11 min-w-11 shrink-0 place-items-center rounded-full bg-brand-ink text-primary-foreground shadow-md transition-all duration-150 hover:shadow-lg active:scale-90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
        >
          <Send className="size-5.5" aria-hidden="true" />
        </button>
      </div>
    </footer>
  )
}
