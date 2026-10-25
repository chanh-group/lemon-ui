import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Cancel01Icon as CancelData,
  File01Icon as FileData,
  PaperclipIcon as PaperclipData,
  SentIcon as SendData,
} from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
import { toast } from 'sonner'
import type { MessageAttachmentInput } from '../../types/chat.types'
import { presignFile, uploadBinaryToUrl } from '../../api/chat.api'
import { formatBytes, getKindFromMime, isImage } from '../../utils/fileTypes'
import { compressVideoIfNeeded } from '../../utils/videoCompressor'

const Paperclip = createIcon(PaperclipData)
const Send = createIcon(SendData)
const CancelIcon = createIcon(CancelData)
const FileIcon = createIcon(FileData)

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

interface PendingFile {
  id: string
  file: File
  previewUrl?: string
  isCompressing?: boolean
}

interface MessageComposerProps {
  draft: string
  onDraftChange: (v: string) => void
  onSubmit: (text: string, attachments?: MessageAttachmentInput[]) => void | Promise<void>
  disabled?: boolean
  conversationId?: string
  onTypingStart?: () => void
  onTypingStop?: () => void
}

export function MessageComposer({
  draft,
  onDraftChange,
  onSubmit,
  disabled = false,
  conversationId,
  onTypingStart,
  onTypingStop,
}: MessageComposerProps) {
  const { t } = useTranslation()
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current)
      pendingFiles.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl)
      })
    }
  }, [pendingFiles])

  const handleChange = (val: string) => {
    onDraftChange(val)
    if (val.trim()) {
      onTypingStart?.()
      if (typingTimer.current) clearTimeout(typingTimer.current)
      typingTimer.current = setTimeout(() => {
        onTypingStop?.()
        typingTimer.current = null
      }, 1500)
    } else {
      if (typingTimer.current) clearTimeout(typingTimer.current)
      onTypingStop?.()
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    for (const rawFile of files) {
      let fileToUse = rawFile
      const fileId = crypto.randomUUID()

      // Kiểm tra file thực thi độc hại
      if (/\.(exe|bat|cmd|sh|msi|dll|scr|vbs)$/i.test(rawFile.name)) {
        toast.error(`Tệp "${rawFile.name}" không được phép gửi vì lý do an toàn.`)
        continue
      }

      // Xử lý nén nếu là video
      if (rawFile.type.startsWith('video/')) {
        try {
          if (rawFile.size > 15 * 1024 * 1024) {
            toast.info(`Đang tối ưu dung lượng video "${rawFile.name}"...`)
          }
          const compressed = await compressVideoIfNeeded(rawFile, { maxSizeBytes: MAX_FILE_SIZE })
          if (compressed instanceof File) {
            fileToUse = compressed
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Lỗi khi nén video')
          continue
        }
      }

      if (fileToUse.size > MAX_FILE_SIZE) {
        toast.error(`Tệp "${fileToUse.name}" vượt quá giới hạn 25MB (${formatBytes(fileToUse.size)}).`)
        continue
      }

      const previewUrl = isImage(fileToUse.type, fileToUse.name)
        ? URL.createObjectURL(fileToUse)
        : undefined

      setPendingFiles((prev) => [...prev, { id: fileId, file: fileToUse, previewUrl }])
    }

    // Reset input để có thể chọn lại file cùng tên nếu muốn
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemoveFile = (id: string) => {
    setPendingFiles((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((p) => p.id !== id)
    })
  }

  const handleSubmit = async () => {
    const text = draft.trim()
    if (!text && pendingFiles.length === 0) return
    if (disabled || isUploading) return

    if (typingTimer.current) {
      clearTimeout(typingTimer.current)
      typingTimer.current = null
    }
    onTypingStop?.()

    if (pendingFiles.length === 0) {
      onSubmit(text)
      return
    }

    // Upload các tệp đính kèm lên Cloudflare R2
    setIsUploading(true)
    const attachments: MessageAttachmentInput[] = []

    try {
      for (const item of pendingFiles) {
        const file = item.file
        const mimeType = file.type || 'application/octet-stream'
        const kind = getKindFromMime(mimeType, file.name)

        // 1. Lấy presigned upload URL
        const { uploadUrl, objectKey } = await presignFile({
          kind,
          sizeBytes: file.size,
          mimeType,
          fileName: file.name,
          conversationId,
        })

        // 2. Upload trực tiếp binary lên Cloudflare R2
        await uploadBinaryToUrl(uploadUrl, file, mimeType)

        // 3. Gom attachment metadata
        attachments.push({
          objectKey,
          fileName: file.name,
          mimeType,
          sizeBytes: file.size,
          kind: kind.replace('CHAT_', '') as 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE',
        })
      }

      // 4. Gửi tin nhắn kèm danh sách attachments
      await onSubmit(text, attachments)

      // Xóa danh sách pending files sau khi gửi thành công
      pendingFiles.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl)
      })
      setPendingFiles([])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Tải tệp lên thất bại. Vui lòng thử lại.')
    } finally {
      setIsUploading(false)
    }
  }

  const canSubmit = (draft.trim().length > 0 || pendingFiles.length > 0) && !disabled && !isUploading

  return (
    <footer className="shrink-0 border-t border-border bg-card px-3 py-2.5 sm:px-5">
      {/* Pending Files Preview Tray */}
      {pendingFiles.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-2 overflow-x-auto p-1.5 rounded-xl bg-muted/60 border border-border">
          {pendingFiles.map((p) => (
            <div
              key={p.id}
              className="group relative flex items-center gap-2 rounded-lg border border-border bg-card p-1.5 pr-2.5 shadow-xs text-xs"
            >
              {p.previewUrl ? (
                <img
                  src={p.previewUrl}
                  alt={p.file.name}
                  className="size-9 rounded-md object-cover"
                />
              ) : (
                <div className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
                  <FileIcon className="size-4" />
                </div>
              )}
              <div className="max-w-[130px] min-w-0">
                <p className="truncate font-medium text-foreground">{p.file.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatBytes(p.file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveFile(p.id)}
                disabled={isUploading}
                className="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Xóa bỏ"
              >
                <CancelIcon className="size-3.5" />
              </button>
            </div>
          ))}
          {isUploading && (
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground animate-pulse">
              Đang tải tệp lên Cloudflare R2...
            </div>
          )}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex w-full items-center gap-1.5">
        <label className="chat-composer flex min-h-11 min-w-0 flex-1 items-center gap-1 rounded-full border border-border bg-muted px-4 transition-all duration-150 focus-within:border-ring focus-within:bg-card">
          <span className="sr-only">{t('chat.sendMessage')}</span>
          <input
            value={draft}
            disabled={disabled || isUploading}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder={
              pendingFiles.length > 0
                ? 'Thêm tin nhắn hoặc bấm gửi tệp...'
                : t('chat.composeHint')
            }
            aria-label={t('chat.composeHint')}
            className="h-11 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            aria-label={t('chat.attachFile')}
            title="Đính kèm tệp tin / ảnh (< 25MB)"
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-border hover:text-foreground disabled:opacity-50"
          >
            <Paperclip className="size-5" aria-hidden="true" />
          </button>
        </label>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
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
