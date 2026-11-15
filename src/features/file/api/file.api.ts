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
): Promise<void> {
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
): Promise<{ objectKey: string; avatarUrl?: string }> {
  const formData = new FormData()
  formData.append('file', file, fileName || (file instanceof File ? file.name : 'attachment'))
  formData.append('kind', kind)
  if (conversationId) formData.append('conversationId', conversationId)
  const endpoint = kind === 'USER_AVATAR' ? '/files/avatars/upload' : '/files/upload'
  const res = await api.post<{ objectKey: string; avatarUrl?: string }>(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}
