import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  File01Icon as FileData,
  Search01Icon as SearchData,
  SentIcon as SendData,
  Share01Icon as ShareData,
} from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { UserAvatar } from '@/components/common/UserAvatar'
import { useConversationsQuery, useSendMessageMutation } from '../../hooks/useChatQueries'
import type { ChatMessage, Conversation, MessageAttachmentInput } from '../../types/chat.types'
import { formatBytes } from '../../utils/fileTypes'
import { cn } from '@/lib/utils'

const SearchIcon = createIcon(SearchData)
const SendIcon = createIcon(SendData)
const FileIcon = createIcon(FileData)
const ShareIcon = createIcon(ShareData)

export interface ForwardMessageModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  message: ChatMessage | null
  currentConversationId?: string
}

export function ForwardMessageModal({
  open,
  onOpenChange,
  message,
  currentConversationId,
}: ForwardMessageModalProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [targetConvId, setTargetConvId] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)

  const { data: conversations = [] } = useConversationsQuery()
  const sendMutation = useSendMessageMutation(targetConvId)

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase()
    return conversations.filter((c: Conversation) => {
      if (currentConversationId && c.id === currentConversationId) return false
      if (!q) return true
      return c.name.toLowerCase().includes(q)
    })
  }, [conversations, search, currentConversationId])

  const handleForwardTo = async (conversation: Conversation) => {
    if (!message) return
    setIsSending(true)
    setTargetConvId(conversation.id)

    try {
      const attachmentsPayload: MessageAttachmentInput[] | undefined =
        message.attachments?.map((att) => ({
          objectKey: (att as unknown as { objectKey?: string }).objectKey || att.previewUrl.split('?')[0].replace(/^https?:\/\/[^/]+\//, ''),
          fileName: att.fileName,
          mimeType: att.mimeType,
          sizeBytes: att.sizeBytes,
          kind: att.kind,
          width: att.width ?? undefined,
          height: att.height ?? undefined,
          durationMs: att.durationMs ?? undefined,
        }))

      await sendMutation.mutateAsync({
        body: message.text || undefined,
        isForwarded: true,
        attachments: attachmentsPayload && attachmentsPayload.length > 0 ? attachmentsPayload : undefined,
      })

      toast.success(`${t('chat.forwardSuccess', 'Đã chuyển tiếp tin nhắn đến')} ${conversation.name}`)
      onOpenChange(false)
    } catch {
      toast.error(t('chat.forwardFailed', 'Chuyển tiếp tin nhắn thất bại'))
    } finally {
      setIsSending(false)
      setTargetConvId(null)
    }
  }

  if (!message) return null

  const hasAttachments = Boolean(message.attachments && message.attachments.length > 0)
  const firstAttachment = message.attachments?.[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0 rounded-2xl border border-border/80 bg-card shadow-2xl">
        <DialogHeader className="p-4 border-b border-border/60">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <ShareIcon className="size-5 text-primary" />
            {t('chat.forwardMessage', 'Chuyển tiếp tin nhắn')}
          </DialogTitle>
        </DialogHeader>

        {/* Message preview snippet */}
        <div className="p-3.5 bg-muted/30 border-b border-border/40 text-xs">
          <div className="text-muted-foreground font-medium mb-1.5 flex items-center gap-1.5">
            <span>{t('chat.messagePreview', 'Nội dung chuyển tiếp:')}</span>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/80 p-2.5 flex items-center gap-3">
            {hasAttachments && firstAttachment ? (
              <div className="size-11 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border/60">
                {firstAttachment.kind === 'IMAGE' ? (
                  <img
                    src={firstAttachment.previewUrl}
                    alt={firstAttachment.fileName}
                    className="size-full object-cover"
                  />
                ) : (
                  <FileIcon className="size-5 text-muted-foreground" />
                )}
              </div>
            ) : null}

            <div className="min-w-0 flex-1">
              {message.text ? (
                <p className="line-clamp-2 text-foreground font-normal leading-relaxed text-xs">
                  {message.text}
                </p>
              ) : null}

              {hasAttachments && firstAttachment ? (
                <p className="text-[11px] text-muted-foreground truncate">
                  {firstAttachment.fileName} ({formatBytes(firstAttachment.sizeBytes)})
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Search box */}
        <div className="p-3 border-b border-border/40">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('chat.searchConversations', 'Tìm kiếm cuộc trò chuyện...')}
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-muted/50 border border-border/60 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background transition-all"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="max-h-64 overflow-y-auto divide-y divide-border/30 p-1">
          {filteredConversations.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              {t('chat.noConversationsFound', 'Không tìm thấy cuộc trò chuyện phù hợp')}
            </div>
          ) : (
            filteredConversations.map((c: Conversation) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-2.5 hover:bg-muted/40 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar
                    src={c.partnerAvatar}
                    name={c.name}
                    className="size-9 rounded-full shrink-0 border border-border/60"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{c.preview || t('chat.directChat', 'Trò chuyện')}</p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSending && targetConvId === c.id}
                  onClick={() => handleForwardTo(c)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 shadow-sm transition-all',
                    'bg-primary text-primary-foreground hover:opacity-90 active:scale-95',
                    'disabled:opacity-50 disabled:pointer-events-none',
                  )}
                >
                  <SendIcon className="size-3.5" />
                  <span>{t('chat.send', 'Gửi')}</span>
                </button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
