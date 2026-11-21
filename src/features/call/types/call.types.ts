export interface CallEntry {
  id: string
  name: string
  direction: 'incoming' | 'outgoing' | 'missed'
  kind: 'voice' | 'video'
  time: string
  online: boolean
}

export type CallMedia = 'VOICE' | 'VIDEO'

export type CallStatus =
  | 'INITIATED'
  | 'RINGING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'MISSED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'FAILED'

export interface LiveKitConnectionDetails {
  serverUrl: string
  room: string
  token: string
}

export interface CallResponse {
  id: string
  conversationId: string
  callerId: string
  calleeId?: string | null
  media: CallMedia
  status: CallStatus
  startedAt: string
  answeredAt: string | null
  endedAt: string | null
  durationSecs: number
  endReason?: string | null
  livekit?: LiveKitConnectionDetails
}

export interface InitiateCallResponse extends CallResponse {
  livekit: LiveKitConnectionDetails
}

export interface AcceptCallResponse {
  id: string
  status: 'ACCEPTED'
  answeredAt: string
  livekit: LiveKitConnectionDetails
}

export type CallTokenResponse = LiveKitConnectionDetails

export interface ActiveCallResponse {
  call: CallResponse | null
}

export interface CallListResponse {
  items: CallResponse[]
  hasMore: boolean
  nextCursor?: string | null
}

export interface CallIncomingPayload {
  callId: string
  conversationId: string
  caller: {
    id: string
    username: string
    fullName?: string | null
    avatarUrl?: string | null
  }
  media: CallMedia
}

export interface CallAcceptedPayload {
  callId: string
  acceptedBy: string
  answeredAt: string
}

export interface CallRejectedPayload {
  callId: string
  rejectedBy: string
  reason?: string
}

export interface CallCancelledPayload {
  callId: string
  cancelledBy: string
}

export interface CallMissedPayload {
  callId: string
  callerId: string
  media: CallMedia
  reason: string
}

export interface CallEndedPayload {
  callId: string
  endedBy: string
  reason: string
  durationSecs: number
}

export interface CallUserDisconnectedPayload {
  callId: string
  userId: string
}

export interface CallUserReconnectedPayload {
  callId: string
  userId: string
}

export type CallClientPhase = 'idle' | 'outgoing' | 'incoming' | 'active' | 'reconnecting' | 'ended'

export function toApiMedia(media: 'voice' | 'video' | CallMedia): CallMedia {
  return media.toUpperCase() === 'VIDEO' ? 'VIDEO' : 'VOICE'
}

export function toUiMedia(media: CallMedia | 'voice' | 'video'): 'voice' | 'video' {
  return media.toLowerCase() === 'video' ? 'video' : 'voice'
}
