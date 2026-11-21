import { describe, expect, it, vi, beforeEach } from 'vitest'
import { api } from '@/infrastructure/api/client'
import { callApi } from './call.api'

vi.mock('@/infrastructure/api/client', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

describe('callApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initiateCall sends POST /calls with conversationId and media', async () => {
    const mockResponse = {
      data: {
        id: 'call-123',
        conversationId: 'conv-456',
        callerId: 'user-1',
        media: 'VIDEO',
        status: 'INITIATED',
        startedAt: '2026-11-21T00:00:00Z',
        answeredAt: null,
        endedAt: null,
        durationSecs: 0,
        livekit: {
          serverUrl: 'ws://localhost:7880',
          room: 'call-123',
          token: 'jwt-token',
        },
      },
    }
    vi.mocked(api.post).mockResolvedValueOnce(mockResponse)

    const result = await callApi.initiateCall({ conversationId: 'conv-456', media: 'VIDEO' })
    expect(api.post).toHaveBeenCalledWith('/calls', { conversationId: 'conv-456', media: 'VIDEO' })
    expect(result).toEqual(mockResponse.data)
  })

  it('acceptCall sends POST /calls/:id/accept', async () => {
    const mockResponse = {
      data: {
        id: 'call-123',
        status: 'ACCEPTED',
        answeredAt: '2026-11-21T00:01:00Z',
        livekit: {
          serverUrl: 'ws://localhost:7880',
          room: 'call-123',
          token: 'token-callee',
        },
      },
    }
    vi.mocked(api.post).mockResolvedValueOnce(mockResponse)

    const result = await callApi.acceptCall('call-123')
    expect(api.post).toHaveBeenCalledWith('/calls/call-123/accept')
    expect(result.status).toBe('ACCEPTED')
  })

  it('getCallToken sends GET /calls/:id/token', async () => {
    const mockResponse = {
      data: {
        serverUrl: 'ws://localhost:7880',
        room: 'call-123',
        token: 'refreshed-token',
      },
    }
    vi.mocked(api.get).mockResolvedValueOnce(mockResponse)

    const result = await callApi.getCallToken('call-123')
    expect(api.get).toHaveBeenCalledWith('/calls/call-123/token')
    expect(result.token).toBe('refreshed-token')
  })

  it('getActiveCall returns call or null', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        call: {
          id: 'call-123',
          status: 'ACCEPTED',
        },
      },
    })

    const result = await callApi.getActiveCall()
    expect(api.get).toHaveBeenCalledWith('/calls/active')
    expect(result?.id).toBe('call-123')
  })

  it('endCall sends POST /calls/:id/end', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { id: 'call-123', status: 'COMPLETED' },
    })

    const result = await callApi.endCall('call-123', 'USER_HANGUP')
    expect(api.post).toHaveBeenCalledWith('/calls/call-123/end', { reason: 'USER_HANGUP' })
    expect(result.status).toBe('COMPLETED')
  })
})
