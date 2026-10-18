import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/config/constants'
import type { NewChatPane } from '../../types/new-chat.types'
import { SideNav } from '../SideNav'
import { MainPane } from './MainPane'
import { GroupWizard } from './GroupWizard'
import { RequestsPane } from './RequestsPane'
import { FindUserPane } from './FindUserPane'
import { PaneHeader } from './kit'

/** Shell màn "New chat" — máy trạng thái các pane: main → group/username/email/requests. */
export function NewChatView() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [pane, setPane] = useState<NewChatPane>('main')

  const backToMessages = () => navigate(ROUTES.messages)

  return (
    <main className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <SideNav active="messages" onOpenSettings={() => navigate(ROUTES.settings)} mobileBarVisible={false} />

      <aside
        className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col border-r border-border bg-card md:w-88 md:flex-none lg:w-100"
        aria-label={t('chat.newChat')}
      >
        {pane === 'main' && (
          <>
            <PaneHeader title={t('chat.newChat')} onBack={backToMessages} />
            <MainPane onOpenPane={setPane} />
          </>
        )}
        {pane === 'group' && <GroupWizard onBack={() => setPane('main')} onDone={backToMessages} />}
        {pane === 'requests' && <RequestsPane onBack={() => setPane('main')} />}
        {pane === 'username' && (
          <FindUserPane mode="username" hint={t('chat.searchByUsernameHint')} onBack={() => setPane('main')} />
        )}
        {pane === 'email' && (
          <FindUserPane mode="email" hint={t('chat.searchByEmailHint')} onBack={() => setPane('main')} />
        )}
      </aside>

      <section className="hidden h-full min-h-0 min-w-0 flex-1 md:block" aria-hidden="true" />
    </main>
  )
}
