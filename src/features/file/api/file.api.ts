import { api } from '@/infrastructure/api/client'
import type { PresignFileRequest, PresignFileResponse } from '../types/file.types'
export type { PresignFileRequest, PresignFileResponse } from '../types/file.types'

/** Cấp Presigned URL để upload trực tiếp lên Cloudflare R2. */
export async function presignFile(payload: PresignFileRequest): Promise<PresignFileResponse> {
  const res = await api.post<PresignFileResponse>('/files/presign', payload)
  return res.data
}

/** Upload binary trực tiếp lên R2 thông qua presigned URL. */
export async function uploadBinaryToUrl(
  uploadUrl: string,
  file: Blob | File,
  mimeType: string,
  onProgress?: (percent: number | null) => void,
): Promise<void> {
  if (onProgress) {
    await new Promise<void>((resolve, reject) => {
      const request = new XMLHttpRequest()
      request.open('PUT', uploadUrl)
      // Không đặt timeout tổng: file đính kèm/story video tới 25MB trên uplink chậm
      // cần hơn 15s — fetch trên main cũng không có timeout. shortcut: không có
      // guard socket treo, nâng cấp timeout theo độ trễ (inactivity) nếu gặp thực tế.
      request.withCredentials = false
      request.setRequestHeader('Content-Type', mimeType)
      request.upload.onprogress = (event) => {
        onProgress(
          event.lengthComputable && event.total > 0
            ? Math.min(100, Math.floor((event.loaded / event.total) * 100))
            : null,
        )
      }
      request.onload = () => {
        if (request.status >= 200 && request.status < 300) resolve()
        else reject(new Error(`Upload lên máy chủ lưu trữ thất bại (${request.status})`))
      }
      request.onerror = () => reject(new Error('Upload lên máy chủ lưu trữ thất bại'))
      request.onabort = () => reject(new Error('Upload lên máy chủ lưu trữ bị hủy'))
      request.send(file)
    })
    return
  }
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: file,
  })
  if (!response.ok) throw new Error(`Upload lên máy chủ lưu trữ thất bại (${response.status})`)
}

/** Upload file thông qua backend (fallback an toàn khi direct upload bị chặn). */
export async function uploadFileViaBackend(
  file: File | Blob,
  kind: PresignFileRequest['kind'],
  conversationId?: string,
  fileName?: string,
  onProgress?: (percent: number | null) => void,
): Promise<{ objectKey: string; avatarUrl?: string }> {
  const formData = new FormData()
  formData.append('file', file, fileName || (file instanceof File ? file.name : 'attachment'))
  formData.append('kind', kind)
  if (conversationId) formData.append('conversationId', conversationId)
  const endpoint = kind === 'USER_AVATAR' ? '/files/avatars/upload' : '/files/upload'
  const res = await api.post<{ objectKey: string; avatarUrl?: string }>(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    // Fallback phục file lớn — không kế thừa timeout 15s của axios instance.
    timeout: 0,
    ...(onProgress && {
      onUploadProgress: ({ loaded, total }) => {
        onProgress(total && total > 0 ? Math.min(100, Math.floor((loaded / total) * 100)) : null)
      },
    }),
  })
  return res.data
}
