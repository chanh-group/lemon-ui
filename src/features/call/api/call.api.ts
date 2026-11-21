import { api } from '@/infrastructure/api/client'
import type {
  AcceptCallResponse,
  ActiveCallResponse,
  CallListResponse,
  CallMedia,
  CallResponse,
  CallTokenResponse,
  InitiateCallResponse,
} from '../types/call.types'

export const callApi = {
  /** Khởi tạo cuộc gọi thoại / video mới */
  initiateCall: async (data: { conversationId: string; media: CallMedia }): Promise<InitiateCallResponse> => {
    const res = await api.post<InitiateCallResponse>('/calls', data)
    return res.data
  },

  /** Người nhận chấp nhận cuộc gọi */
  acceptCall: async (callId: string): Promise<AcceptCallResponse> => {
    const res = await api.post<AcceptCallResponse>(`/calls/${callId}/accept`)
    return res.data
  },

  /** Lấy JWT token để kết nối LiveKit SFU */
  getCallToken: async (callId: string): Promise<CallTokenResponse> => {
    const res = await api.get<CallTokenResponse>(`/calls/${callId}/token`)
    return res.data
  },

  /** Lấy thông tin cuộc gọi đang hoạt động (phục vụ F5 reload recovery) */
  getActiveCall: async (): Promise<CallResponse | null> => {
    const res = await api.get<ActiveCallResponse>('/calls/active')
    return res.data?.call ?? null
  },

  /** Lấy thông tin chi tiết cuộc gọi theo ID */
  getCallById: async (callId: string): Promise<CallResponse> => {
    const res = await api.get<CallResponse>(`/calls/${callId}`)
    return res.data
  },

  /** Lấy danh sách lịch sử cuộc gọi của người dùng hiện tại */
  listCalls: async (params?: {
    cursor?: string
    limit?: number
    conversationId?: string
  }): Promise<CallListResponse> => {
    const res = await api.get<CallListResponse>('/calls', { params })
    return res.data
  },

  /** Lấy lịch sử cuộc gọi trong một hội thoại cụ thể */
  listConversationCalls: async (
    conversationId: string,
    params?: { cursor?: string; limit?: number },
  ): Promise<CallListResponse> => {
    const res = await api.get<CallListResponse>(`/conversations/${conversationId}/calls`, { params })
    return res.data
  },

  /** Người nhận từ chối cuộc gọi */
  rejectCall: async (callId: string, reason?: string): Promise<CallResponse> => {
    const res = await api.post<CallResponse>(`/calls/${callId}/reject`, { reason })
    return res.data
  },

  /** Người gọi hủy cuộc gọi trước khi đối phương trả lời */
  cancelCall: async (callId: string): Promise<CallResponse> => {
    const res = await api.post<CallResponse>(`/calls/${callId}/cancel`)
    return res.data
  },

  /** Kết thúc cuộc gọi đang diễn ra */
  endCall: async (callId: string, reason = 'NORMAL'): Promise<CallResponse> => {
    const res = await api.post<CallResponse>(`/calls/${callId}/end`, { reason })
    return res.data
  },
}
