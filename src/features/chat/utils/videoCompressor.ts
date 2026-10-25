/**
 * Module nén video phía Client sử dụng Canvas và MediaRecorder (Native Web APIs).
 * Hoạt động mượt mà không cần nạp thư viện WASM nặng.
 */

export interface CompressionOptions {
  maxSizeBytes?: number // Mặc định 25MB (26,214,400 bytes)
  targetBitrate?: number // Bitrate mục tiêu (bps), mặc định 1.5 Mbps
  maxDimension?: number // Chiều dài/rộng tối đa (px), mặc định 1280
  fps?: number // Tốc độ khung hình (khung/giây), mặc định 24
}

const DEFAULT_MAX_SIZE = 25 * 1024 * 1024 // 25MB

/**
 * Kiểm tra và nén video nếu kích thước vượt ngưỡng hoặc dung lượng lớn.
 * Trả về File/Blob đã được tối ưu.
 */
export async function compressVideoIfNeeded(
  file: File,
  options: CompressionOptions = {},
): Promise<File | Blob> {
  const maxSizeBytes = options.maxSizeBytes ?? DEFAULT_MAX_SIZE
  const targetBitrate = options.targetBitrate ?? 1_500_000 // 1.5 Mbps
  const maxDimension = options.maxDimension ?? 1280
  const fps = options.fps ?? 24

  // Nếu video đã nhỏ hơn 10MB và dưới ngưỡng tối đa thì không cần nén, giữ nguyên chất lượng
  if (file.size <= 10 * 1024 * 1024 && file.size <= maxSizeBytes) {
    return file
  }

  // Kiểm tra trình duyệt có hỗ trợ MediaRecorder và Canvas captureStream không
  if (
    typeof window === 'undefined' ||
    typeof window.MediaRecorder === 'undefined' ||
    typeof HTMLCanvasElement.prototype.captureStream === 'undefined'
  ) {
    if (file.size > maxSizeBytes) {
      throw new Error('Video vượt quá giới hạn 25MB và trình duyệt không hỗ trợ nén tự động.')
    }
    return file
  }

  return new Promise<File | Blob>((resolve, reject) => {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'

    const objectUrl = URL.createObjectURL(file)
    video.src = objectUrl

    video.onloadedmetadata = () => {
      let width = video.videoWidth || 1280
      let height = video.videoHeight || 720

      // Thu nhỏ resolution nếu quá lớn
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        } else {
          width = Math.round((width * maxDimension) / height)
          height = maxDimension
        }
      }
      // Đảm bảo width/height là số chẵn
      width = width % 2 === 0 ? width : width - 1
      height = height % 2 === 0 ? height : height - 1

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        URL.revokeObjectURL(objectUrl)
        if (file.size > maxSizeBytes) {
          reject(new Error('Không thể khởi tạo bộ xử lý video để nén.'))
        } else {
          resolve(file)
        }
        return
      }

      // Xác định định dạng được hỗ trợ bởi MediaRecorder
      let mimeType = 'video/webm;codecs=vp8,opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm'
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4'
      }

      const stream = canvas.captureStream(fps)
      let recorder: MediaRecorder
      try {
        recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: targetBitrate,
        })
      } catch {
        URL.revokeObjectURL(objectUrl)
        if (file.size > maxSizeBytes) {
          reject(new Error('Không thể khởi tạo MediaRecorder để nén video.'))
        } else {
          resolve(file)
        }
        return
      }

      const chunks: Blob[] = []
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      recorder.onstop = () => {
        URL.revokeObjectURL(objectUrl)
        const compressedBlob = new Blob(chunks, { type: mimeType })
        if (compressedBlob.size > 0 && compressedBlob.size < file.size) {
          const extension = mimeType.includes('mp4') ? 'mp4' : 'webm'
          const compressedFile = new File(
            [compressedBlob],
            file.name.replace(/\.[^/.]+$/, `.${extension}`),
            { type: mimeType },
          )
          resolve(compressedFile)
        } else {
          // Nếu sau nén không nhẹ hơn, dùng file gốc nếu <= 25MB
          if (file.size <= maxSizeBytes) {
            resolve(file)
          } else {
            reject(new Error('Nén video không đạt kích thước yêu cầu (<25MB).'))
          }
        }
      }

      let animId: number
      const drawFrame = () => {
        if (video.paused || video.ended) return
        ctx.drawImage(video, 0, 0, width, height)
        animId = requestAnimationFrame(drawFrame)
      }

      video.onplay = () => {
        recorder.start(100)
        drawFrame()
      }

      video.onended = () => {
        cancelAnimationFrame(animId)
        if (recorder.state === 'recording') {
          recorder.stop()
        }
      }

      video.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        cancelAnimationFrame(animId)
        if (file.size <= maxSizeBytes) {
          resolve(file)
        } else {
          reject(new Error('Lỗi khi đọc file video để nén.'))
        }
      }

      // Bắt đầu playback để ghi
      video.play().catch(() => {
        URL.revokeObjectURL(objectUrl)
        if (file.size <= maxSizeBytes) {
          resolve(file)
        } else {
          reject(new Error('Trình duyệt chặn phát video nền để nén.'))
        }
      })
    }

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      if (file.size <= maxSizeBytes) {
        resolve(file)
      } else {
        reject(new Error('Không thể mở video để xử lý.'))
      }
    }
  })
}

