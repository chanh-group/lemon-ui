import React, { useEffect, useState } from 'react'
import {
  Cancel01Icon as CloseData,
  Download01Icon as DownloadData,
  RotateRight01Icon as RotateData,
  ZoomInIcon as ZoomInData,
  ZoomOutIcon as ZoomOutData,
} from '@hugeicons/core-free-icons'
import { createIcon } from '@/components/icons/hugeIcon'
import type { MessageAttachmentItem } from '../../types/chat.types'

const CloseIcon = createIcon(CloseData)
const DownloadIcon = createIcon(DownloadData)
const RotateIcon = createIcon(RotateData)
const ZoomIn = createIcon(ZoomInData)
const ZoomOut = createIcon(ZoomOutData)

interface ImageLightboxModalProps {
  attachment: MessageAttachmentItem | null
  onClose: () => void
}

export function ImageLightboxModal({ attachment, onClose }: ImageLightboxModalProps) {
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [prevId, setPrevId] = useState<string | null>(null)

  if (attachment && attachment.id !== prevId) {
    setPrevId(attachment.id)
    setScale(1)
    setRotation(0)
  }

  useEffect(() => {
    if (!attachment) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [attachment, onClose])

  if (!attachment) return null

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation()
    setScale((prev) => Math.min(prev + 0.25, 3))
  }

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation()
    setScale((prev) => Math.max(prev - 0.25, 0.5))
  }

  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation()
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    const url = attachment.downloadUrl || attachment.previewUrl
    const a = document.createElement('a')
    a.href = url
    a.download = attachment.fileName || 'image'
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md transition-opacity duration-200 animate-in fade-in"
    >
      {/* Top Header Controls */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 inset-x-4 flex items-center justify-between text-white/90 z-10"
      >
        <span className="truncate max-w-[60vw] text-sm font-medium drop-shadow-sm">
          {attachment.fileName}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleZoomIn}
            className="grid size-9 place-items-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            title="Phóng to"
          >
            <ZoomIn className="size-5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="grid size-9 place-items-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            title="Thu nhỏ"
          >
            <ZoomOut className="size-5" />
          </button>
          <button
            type="button"
            onClick={handleRotate}
            className="grid size-9 place-items-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            title="Xoay ảnh"
          >
            <RotateIcon className="size-5" />
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="grid size-9 place-items-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            title="Tải về máy"
          >
            <DownloadIcon className="size-5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            title="Đóng (Esc)"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>
      </div>

      {/* Main Image Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] max-w-[90vw] items-center justify-center overflow-hidden p-4 select-none"
      >
        <img
          src={attachment.previewUrl || attachment.downloadUrl}
          alt={attachment.fileName}
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            transition: 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)',
          }}
          className="max-h-[80vh] max-w-[85vw] object-contain rounded-lg shadow-2xl cursor-grab active:cursor-grabbing"
          draggable={false}
        />
      </div>
    </div>
  )
}
