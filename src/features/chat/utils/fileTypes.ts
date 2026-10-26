/** Định dạng kích thước tệp thành dạng đọc được (B, KB, MB, GB) */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export function isImage(mimeType = '', fileName = ''): boolean {
  if (mimeType.startsWith('image/')) return true
  return /\.(jpe?g|png|gif|webp|svg|bmp|ico)$/i.test(fileName)
}

export function isVideo(mimeType = '', fileName = ''): boolean {
  if (mimeType.startsWith('video/')) return true
  return /\.(mp4|webm|mov|mkv|avi|flv)$/i.test(fileName)
}

export function isAudio(mimeType = '', fileName = ''): boolean {
  if (mimeType.startsWith('audio/')) return true
  return /\.(mp3|wav|ogg|m4a|aac|opus)$/i.test(fileName)
}

export function isPdf(mimeType = '', fileName = ''): boolean {
  if (mimeType === 'application/pdf') return true
  return /\.pdf$/i.test(fileName)
}

export function isText(mimeType = '', fileName = ''): boolean {
  if (mimeType.startsWith('text/')) return true
  if (
    mimeType === 'application/json' ||
    mimeType === 'application/javascript' ||
    mimeType === 'application/xml'
  ) {
    return true
  }
  return /\.(txt|json|csv|log|md|xml|js|ts|tsx|jsx|css|html|yaml|yml)$/i.test(fileName)
}

export function isPreviewable(mimeType = '', fileName = ''): boolean {
  return (
    isImage(mimeType, fileName) ||
    isVideo(mimeType, fileName) ||
    isPdf(mimeType, fileName) ||
    isText(mimeType, fileName)
  )
}

export function getKindFromMime(
  mimeType = '',
  fileName = '',
): 'CHAT_IMAGE' | 'CHAT_VIDEO' | 'CHAT_AUDIO' | 'CHAT_FILE' {
  if (isImage(mimeType, fileName)) return 'CHAT_IMAGE'
  if (isVideo(mimeType, fileName)) return 'CHAT_VIDEO'
  if (isAudio(mimeType, fileName)) return 'CHAT_AUDIO'
  return 'CHAT_FILE'
}

