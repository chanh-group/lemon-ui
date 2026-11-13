import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Cancel01Icon as CancelData,
  Delete02Icon as TrashData,
  File01Icon as FileData,
  Mic01Icon as MicData,
  PaperclipIcon as PaperclipData,
  SentIcon as SendData,
} from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
import { toast } from 'sonner'
import type { MessageAttachmentInput } from '../../types/chat.types'
import { formatBytes, isImage } from '../../utils/fileTypes'
import { compressVideoIfNeeded } from '../../utils/videoCompressor'
import { generateUUID } from '@/lib/utils'

const Paperclip = createIcon(PaperclipData)
const Send = createIcon(SendData)
const CancelIcon = createIcon(CancelData)
const FileIcon = createIcon(FileData)
const MicIcon = createIcon(MicData)
const TrashIcon = createIcon(TrashData)

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

export interface PendingFile {
  id: string
  file: File
  previewUrl?: string
  isCompressing?: boolean
  uploadedAttachment?: MessageAttachmentInput
}

interface MessageComposerProps {
  draft: string
  onDraftChange: (v: string) => void
  onSubmit: (
    text: string,
    attachments?: MessageAttachmentInput[],
    pendingFiles?: PendingFile[],
  ) => boolean | void | Promise<boolean | void>
  disabled?: boolean
  isSending?: boolean
  onTypingStart?: () => void
  onTypingStop?: () => void
}

export function MessageComposer({
  draft,
  onDraftChange,
  onSubmit,
  disabled = false,
  isSending = false,
  onTypingStart,
  onTypingStop,
}: MessageComposerProps) {
  const { t } = useTranslation()
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const pendingFilesRef = useRef(pendingFiles)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    pendingFilesRef.current = pendingFiles
  }, [pendingFiles])

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current)
      pendingFilesRef.current.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl)
      })
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const cleanupRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsRecording(false)
    setRecordingSeconds(0)
    audioChunksRef.current = []
  }

  const handleStartRecording = async () => {
    if (disabled || isSending) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4'

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.start(200)
      setIsRecording(true)
      setRecordingSeconds(0)
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1)
      }, 1000)
    } catch {
      cleanupRecording()
      toast.error(t('chat.micPermissionDenied', 'Không thể truy cập microphone'))
    }
  }

  const handleCancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
    }
    cleanupRecording()
  }

  const handleStopAndSendRecording = async () => {
    const recorder = mediaRecorderRef.current
    if (!recorder || !isRecording) return

    const duration = recordingSeconds
    recorder.onstop = async () => {
      const mimeType = (recorder.mimeType || 'audio/webm').split(';', 1)[0]
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
      cleanupRecording()

      if (audioBlob.size < 100 || duration < 1) {
        toast.error(t('chat.recordingTooShort', 'Bản ghi âm quá ngắn'))
        return
      }

      const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm'
      const file = new File([audioBlob], `voice-note-${Date.now()}.${ext}`, { type: mimeType })
      const previewUrl = URL.createObjectURL(file)

      const pendingFile = { id: generateUUID(), file, previewUrl }
      const sent = await onSubmit('', undefined, [pendingFile])
      if (sent === false) {
        setPendingFiles((prev) => [...prev, pendingFile])
        return
      }
      URL.revokeObjectURL(previewUrl)
      toast.success(t('chat.voiceNoteSent', 'Đã gửi tin nhắn thoại'))
    }

    recorder.stop()
  }

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

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

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return

    for (const rawFile of files) {
      let fileToUse = rawFile
      const fileId = generateUUID()

      // Kiểm tra file thực thi độc hại
      if (/\.(exe|bat|cmd|sh|msi|dll|scr|vbs)$/i.test(rawFile.name)) {
        toast.error(`Tệp "${rawFile.name}" không được phép gửi vì lý do an toàn.`)
        continue
      }

      // Xử lý nén nếu là video
      if (rawFile.type.startsWith('video/')) {
        try {
          if (rawFile.size > 15 * 1024 * 1024) {
            toast.info(
              t('chat.optimizingVideo', {
                name: rawFile.name,
                defaultValue: `Đang tối ưu dung lượng video "${rawFile.name}"...`,
              }),
            )
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
        toast.error(
          t('chat.fileTooLarge', {
            fileName: fileToUse.name,
            fileSize: formatBytes(fileToUse.size),
            defaultValue: `Tệp "${fileToUse.name}" vượt quá giới hạn 25MB (${formatBytes(fileToUse.size)}).`,
          }),
        )
        continue
      }

      const previewUrl = isImage(fileToUse.type, fileToUse.name)
        ? URL.createObjectURL(fileToUse)
        : undefined

      setPendingFiles((prev) => [...prev, { id: fileId, file: fileToUse, previewUrl }])
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    await processFiles(files)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const clipboardFiles = e.clipboardData?.files
    if (clipboardFiles && clipboardFiles.length > 0) {
      const filesToAdd: File[] = []
      for (let i = 0; i < clipboardFiles.length; i++) {
        const f = clipboardFiles.item(i)
        if (f) filesToAdd.push(f)
      }
      if (filesToAdd.length > 0) {
        e.preventDefault()
        await processFiles(filesToAdd)
      }
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const droppedFiles = Array.from(e.dataTransfer.files || [])
    if (droppedFiles.length > 0) {
      await processFiles(droppedFiles)
    }
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
    if (disabled || isSending) return

    if (typingTimer.current) {
      clearTimeout(typingTimer.current)
      typingTimer.current = null
    }
    onTypingStop?.()

    const textToSend = text
    const filesToSend = [...pendingFiles]
    const sent = await onSubmit(
      textToSend,
      undefined,
      filesToSend.length > 0 ? filesToSend : undefined,
    )
    if (sent === false) return

    filesToSend.forEach((file) => {
      if (file.previewUrl) URL.revokeObjectURL(file.previewUrl)
    })
    const sentIds = new Set(filesToSend.map((file) => file.id))
    setPendingFiles((current) => current.filter((file) => !sentIds.has(file.id)))
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const canSubmit = (draft.trim().length > 0 || pendingFiles.length > 0) && !disabled && !isSending

  return (
    <footer
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="shrink-0 border-t border-border bg-card px-3 py-2.5 sm:px-5"
    >
      {/* Pending Files Preview Tray */}
      {pendingFiles.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-2 overflow-x-auto p-1.5 rounded-xl bg-muted/60 border border-border">
          {pendingFiles.map((p) => (
            <div
              key={p.id}
              className="group relative flex items-center gap-2 rounded-lg border border-border bg-card p-1.5 pr-2.5 shadow-xs text-xs"
            >
              {p.previewUrl && isImage(p.file.type, p.file.name) ? (
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
              <div className="max-w-32.5 min-w-0">
                <p className="truncate font-medium text-foreground">{p.file.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatBytes(p.file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveFile(p.id)}
                disabled={isSending}
                className="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Xóa bỏ"
              >
                <CancelIcon className="size-3.5" />
              </button>
            </div>
          ))}
          {isSending && (
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground animate-pulse">
              <span className="size-2 rounded-full bg-primary animate-ping" />
              <span>{t('chat.uploadingFiles', 'Đang gửi tệp đính kèm…')}</span>
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

      {isRecording ? (
        <div className="flex w-full items-center justify-between gap-3 min-h-11 rounded-full border border-blue-500/30 bg-blue-500/10 dark:bg-blue-950/40 px-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <span className="relative flex size-2.5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-blue-500" />
            </span>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 font-mono">
              {formatTimer(recordingSeconds)}
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {t('chat.recordingVoiceNote', 'Đang ghi âm tin nhắn thoại...')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancelRecording}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title={t('chat.cancelRecording', 'Hủy')}
            >
              <TrashIcon className="size-4" />
              <span>{t('chat.cancel', 'Hủy')}</span>
            </button>

            <button
              type="button"
              onClick={handleStopAndSendRecording}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground shadow-sm hover:opacity-90 active:scale-95 transition-all"
              title={t('chat.sendVoiceNote', 'Gửi tin nhắn thoại')}
            >
              <Send className="size-3.5" />
              <span>{t('chat.send', 'Gửi')}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex w-full items-center gap-1.5">
          <label className="chat-composer flex min-h-11 min-w-0 flex-1 items-center gap-1 rounded-full border border-border bg-muted px-4 transition-all duration-150 focus-within:border-ring focus-within:bg-card">
            <span className="sr-only">{t('chat.sendMessage')}</span>
            <input
              ref={inputRef}
              value={draft}
              disabled={disabled || isSending}
              onChange={(e) => handleChange(e.target.value)}
              onPaste={handlePaste}
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
              disabled={disabled || isSending}
              aria-label={t('chat.attachFile')}
              title="Đính kèm tệp tin / ảnh (< 25MB)"
              className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-border hover:text-foreground disabled:opacity-50"
            >
              <Paperclip className="size-5" aria-hidden="true" />
            </button>

            {/* Mic button to record voice note */}
            <button
              type="button"
              onClick={handleStartRecording}
              disabled={disabled || isSending}
              aria-label={t('chat.recordVoiceNote', 'Ghi âm')}
              title={t('chat.recordVoiceNote', 'Ghi âm tin nhắn thoại')}
              className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-border hover:text-foreground disabled:opacity-50"
            >
              <MicIcon className="size-5" aria-hidden="true" />
            </button>
          </label>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            aria-label={t('chat.sendMessage')}
            title={t('chat.sendMessage')}
            className="chat-send grid size-11 min-h-11 min-w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-md transition-all duration-150 hover:shadow-lg active:scale-90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
          >
            <Send className="size-5.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </footer>
  )
}
