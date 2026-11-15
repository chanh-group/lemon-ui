export interface PresignFileRequest {
  kind:
    | 'STORY_IMAGE'
    | 'STORY_VIDEO'
    | 'CHAT_IMAGE'
    | 'CHAT_VIDEO'
    | 'CHAT_AUDIO'
    | 'CHAT_FILE'
    | 'USER_AVATAR'
  sizeBytes: number
  mimeType: string
  fileName?: string
  conversationId?: string
}

export interface PresignFileResponse {
  uploadUrl: string
  objectKey: string
  avatarUrl?: string
}
