import { CallScreen } from '@/features/chat'
import { isCallPreviewEnabled } from '@/config/env'
import { ROUTES } from '@/config/constants'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'

/** Màn gọi thoại/video đang hoạt động (route /call/:conversationId). */
export function CallPage() {
  return isCallPreviewEnabled() ? <CallScreen /> : <CallUnavailable />
}

function CallUnavailable() {
  const { t } = useTranslation()
  useEffect(() => {
    toast.info(t('chat.callsNotAvailable'), { id: 'calls-unavailable' })
  }, [t])
  return <Navigate to={ROUTES.calls} replace />
}
