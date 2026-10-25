import React, { useEffect, useState } from 'react'
import {
  Cancel01Icon as CloseData,
  Download01Icon as DownloadData,
  File01Icon as FileData,
} from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
import type { MessageAttachmentItem } from '../../types/chat.types'
import { formatBytes, isPdf, isText } from '../../utils/fileTypes'

const CloseIcon = createIcon(CloseData)
const DownloadIcon = createIcon(DownloadData)
const FileIcon = createIcon(FileData)

interface DocumentPreviewModalProps {
  attachment: MessageAttachmentItem | null
  onClose: () => void
}

export function DocumentPreviewModal({ attachment, onClose }: DocumentPreviewModalProps) {
  const isPdfDoc = Boolean(attachment && isPdf(attachment.mimeType, attachment.fileName))
  const isTextDoc = Boolean(attachment && isText(attachment.mimeType, attachment.fileName))
  const [textContent, setTextContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(isTextDoc)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!attachment) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    if (isTextDoc) {
      let isMounted = true
      const url = attachment.previewUrl || attachment.downloadUrl
      
      fetch(url)
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.text()
        })
        .then((text) => {
          if (isMounted) {
            setTextContent(text)
            setLoading(false)
          }
        })
        .catch((err) => {
          if (isMounted) {
            setError(err instanceof Error ? err.message : 'Không thể tải nội dung văn bản')
            setLoading(false)
          }
        })

      return () => {
        isMounted = false
        window.removeEventListener('keydown', handleKeyDown)
      }
    }

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [attachment, isTextDoc, onClose])

  if (!attachment) return null

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    const url = attachment.downloadUrl || attachment.previewUrl
    const a = document.createElement('a')
    a.href = url
    a.download = attachment.fileName || 'document'
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col w-full max-w-4xl h-[85vh] rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <FileIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {attachment.fileName}
              </h3>
              <p className="text-xs text-muted-foreground">
                {formatBytes(attachment.sizeBytes)} • {attachment.mimeType}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs"
            >
              <DownloadIcon className="size-4" />
              <span>Tải xuống</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Đóng (Esc)"
            >
              <CloseIcon className="size-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden bg-background relative flex flex-col">
          {isPdfDoc ? (
            <iframe
              src={attachment.previewUrl || attachment.downloadUrl}
              title={attachment.fileName}
              className="w-full h-full border-0"
            />
          ) : isTextDoc ? (
            <div className="flex-1 overflow-auto p-4 sm:p-6 font-mono text-xs leading-relaxed text-foreground select-text">
              {loading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Đang tải nội dung văn bản...
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full text-destructive gap-2">
                  <p>{error}</p>
                  <button
                    onClick={handleDownload}
                    className="underline text-xs text-foreground cursor-pointer"
                  >
                    Bấm vào đây để tải về xem trực tiếp
                  </button>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap break-words">{textContent}</pre>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 gap-3">
              <FileIcon className="size-16 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                Định dạng tệp này không hỗ trợ xem trước trực tiếp.
              </p>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
              >
                <DownloadIcon className="size-4" />
                <span>Tải tệp về máy ({formatBytes(attachment.sizeBytes)})</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
