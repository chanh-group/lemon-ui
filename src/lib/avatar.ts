const AVATAR_BG = ['#F1E9A8', '#DDF4A7', '#EFEAD6', '#F6DFA8', '#E4EED2', '#FBF3C4']

/** Màu nền ổn định theo tên — cùng một người luôn cùng một màu. */
export function avatarColor(name?: string | null): string {
  const safeName = (name || 'User').trim()
  let hash = 0
  for (let i = 0; i < safeName.length; i++) hash = (hash * 31 + safeName.charCodeAt(i)) >>> 0
  return AVATAR_BG[hash % AVATAR_BG.length]
}

/** Chữ cái đầu của tên; tên một từ lấy hai ký tự đầu. */
export function initials(name?: string | null): string {
  const safeName = (name || 'U').trim()
  if (!safeName) return 'U'
  const parts = safeName.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Chuyển đổi và nén tệp ảnh đại diện thành Data URL tối ưu (JPEG, max 400x400).
 * Giúp avatar hiển thị ngay lập tức, tương thích 100% không phụ thuộc S3/R2 public URL
 * và không bị hủy bộ nhớ như blob URL.
 */
export async function fileToAvatarDataUrl(file: File | Blob, maxDim = 400, quality = 0.85): Promise<string> {
  // Nếu ở trình duyệt có canvas và Image, nén ảnh để tiết kiệm dung lượng
  if (typeof window !== 'undefined' && typeof Image !== 'undefined' && typeof document !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const rawDataUrl = reader.result as string
        if (file.type === 'image/svg+xml') {
          resolve(rawDataUrl)
          return
        }

        const img = new Image()
        img.onload = () => {
          try {
            let { width, height } = img
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width)
                width = maxDim
              } else {
                width = Math.round((width * maxDim) / height)
                height = maxDim
              }
            }
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            if (!ctx) {
              resolve(rawDataUrl)
              return
            }
            ctx.drawImage(img, 0, 0, width, height)
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
            resolve(compressedDataUrl)
          } catch {
            resolve(rawDataUrl)
          }
        }
        img.onerror = () => resolve(rawDataUrl)
        img.src = rawDataUrl
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Fallback cho môi trường test (Bun / Node) không có DOM canvas
  const arrayBuffer = await file.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64 = btoa(binary)
  return `data:${file.type || 'image/png'};base64,${base64}`
}
