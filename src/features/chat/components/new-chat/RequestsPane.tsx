import { useTranslation } from 'react-i18next'
import { useFriendRequests } from '../../hooks/useFriends'
import { PaneHeader, SectionLabel } from './kit'
import { RequestRow } from './RequestRow'

/** Lời mời kết bạn — incoming (chấp nhận/từ chối) và outgoing (hủy). */
export function RequestsPane({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation()
  const { data: requests } = useFriendRequests()
  const incoming = requests?.incoming ?? []
  const outgoing = requests?.outgoing ?? []

  return (
    <>
      <PaneHeader title={t('chat.friendRequests')} onBack={onBack} />
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <SectionLabel>{t('chat.requestsIncoming')}</SectionLabel>
        {incoming.length === 0 ? (
          <p className="px-4 py-2 text-sm text-muted-foreground">{t('chat.noRequests')}</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {incoming.map((r) => (
              <RequestRow key={r.id} request={r} />
            ))}
          </ul>
        )}

        <SectionLabel>{t('chat.requestsOutgoing')}</SectionLabel>
        {outgoing.length === 0 ? (
          <p className="px-4 py-2 text-sm text-muted-foreground">{t('chat.noRequests')}</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {outgoing.map((r) => (
              <RequestRow key={r.id} request={r} />
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
