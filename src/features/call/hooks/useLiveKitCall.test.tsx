// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useLiveKitCall } from './useLiveKitCall'

const { mockRoom, mockLocalParticipant } = vi.hoisted(() => {
  const localParticipant = {
    setMicrophoneEnabled: vi.fn(),
    setCameraEnabled: vi.fn(),
    getTrackPublication: vi.fn().mockReturnValue(null),
  }
  const room = {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    on: vi.fn(),
    localParticipant,
    state: 'disconnected',
  }
  return { mockRoom: room, mockLocalParticipant: localParticipant }
})

vi.mock('livekit-client', () => {
  class MockRoom {
    connect = mockRoom.connect
    disconnect = mockRoom.disconnect
    on = mockRoom.on
    localParticipant = mockRoom.localParticipant
    state = mockRoom.state
  }

  return {
    Room: MockRoom,
    RoomEvent: {
      TrackSubscribed: 'trackSubscribed',
      TrackUnsubscribed: 'trackUnsubscribed',
      ActiveSpeakersChanged: 'activeSpeakersChanged',
      Reconnecting: 'reconnecting',
      Reconnected: 'reconnected',
      ConnectionStateChanged: 'connectionStateChanged',
      Disconnected: 'disconnected',
    },
    Track: {
      Kind: {
        Video: 'video',
        Audio: 'audio',
      },
      Source: {
        Camera: 'camera',
        Microphone: 'microphone',
      },
    },
    ConnectionState: {
      Connected: 'connected',
      Disconnected: 'disconnected',
      Reconnecting: 'reconnecting',
    },
  }
})

describe('useLiveKitCall Hook - Soft Permission Fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('connects successfully when permissions are granted', async () => {
    mockLocalParticipant.setMicrophoneEnabled.mockResolvedValueOnce(undefined)
    mockLocalParticipant.setCameraEnabled.mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useLiveKitCall())

    await act(async () => {
      await result.current.connect('ws://localhost:7880', 'token-123', 'VIDEO')
    })

    expect(mockRoom.connect).toHaveBeenCalledWith('ws://localhost:7880', 'token-123')
    expect(result.current.hasMicError).toBe(false)
    expect(result.current.hasCameraError).toBe(false)
    expect(result.current.isMuted).toBe(false)
    expect(result.current.isCameraOff).toBe(false)
  })

  it('keeps call alive with soft error fallback when microphone permission is denied', async () => {
    // Giả lập trình duyệt chặn quyền Mic
    mockLocalParticipant.setMicrophoneEnabled.mockRejectedValueOnce(
      new Error('NotAllowedError: Permission denied'),
    )
    mockLocalParticipant.setCameraEnabled.mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useLiveKitCall())

    await act(async () => {
      await result.current.connect('ws://localhost:7880', 'token-123', 'VIDEO')
    })

    // XÁC NHẬN: Không ngắt kết nối cuộc gọi!
    expect(mockRoom.disconnect).not.toHaveBeenCalled()
    // Cờ lỗi mic được kích hoạt và trạng thái mute được đặt
    expect(result.current.hasMicError).toBe(true)
    expect(result.current.isMuted).toBe(true)
    // Camera vẫn hoạt động bình thường
    expect(result.current.hasCameraError).toBe(false)
    expect(result.current.isCameraOff).toBe(false)
  })

  it('retries requesting mic permission when toggleMicrophone is called on error state', async () => {
    mockLocalParticipant.setMicrophoneEnabled.mockRejectedValueOnce(
      new Error('NotAllowedError: Permission denied'),
    )

    const { result } = renderHook(() => useLiveKitCall())

    await act(async () => {
      await result.current.connect('ws://localhost:7880', 'token-123', 'VOICE')
    })

    expect(result.current.hasMicError).toBe(true)

    // Người dùng bấm vào nút Mic có badge '!' để cấp lại quyền
    mockLocalParticipant.setMicrophoneEnabled.mockResolvedValueOnce(undefined)

    await act(async () => {
      await result.current.toggleMicrophone()
    })

    // Sau khi cấp quyền thành công: cờ lỗi được xóa, mic được bật
    expect(result.current.hasMicError).toBe(false)
    expect(result.current.isMuted).toBe(false)
  })

  it('keeps call alive with soft error fallback when camera permission is denied', async () => {
    mockLocalParticipant.setMicrophoneEnabled.mockResolvedValueOnce(undefined)
    mockLocalParticipant.setCameraEnabled.mockRejectedValueOnce(
      new Error('NotAllowedError: Permission denied'),
    )

    const { result } = renderHook(() => useLiveKitCall())

    await act(async () => {
      await result.current.connect('ws://localhost:7880', 'token-123', 'VIDEO')
    })

    expect(mockRoom.disconnect).not.toHaveBeenCalled()
    expect(result.current.hasMicError).toBe(false)
    expect(result.current.hasCameraError).toBe(true)
    expect(result.current.isCameraOff).toBe(true)
  })
})
