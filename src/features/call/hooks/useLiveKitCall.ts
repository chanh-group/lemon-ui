import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  type LocalTrack,
  type RemoteTrack,
} from 'livekit-client'
import type { CallMedia } from '../types/call.types'

export interface UseLiveKitCallReturn {
  remoteVideoTrack: RemoteTrack | null
  remoteAudioTrack: RemoteTrack | null
  localVideoTrack: LocalTrack | null
  localAudioTrack: LocalTrack | null
  isMuted: boolean
  isCameraOff: boolean
  hasMicError: boolean
  hasCameraError: boolean
  isPeerSpeaking: boolean
  isReconnecting: boolean
  connectionState: ConnectionState
  requestMediaPermissions: (media: CallMedia) => Promise<void>
  connect: (serverUrl: string, token: string, media: CallMedia) => Promise<void>
  toggleMicrophone: () => Promise<void>
  toggleCamera: () => Promise<void>
  flipCamera: () => Promise<void>
  disconnect: () => void
}

export function useLiveKitCall(): UseLiveKitCallReturn {
  const roomRef = useRef<Room | null>(null)

  const [remoteVideoTrack, setRemoteVideoTrack] = useState<RemoteTrack | null>(null)
  const [remoteAudioTrack, setRemoteAudioTrack] = useState<RemoteTrack | null>(null)
  const [localVideoTrack, setLocalVideoTrack] = useState<LocalTrack | null>(null)
  const [localAudioTrack, setLocalAudioTrack] = useState<LocalTrack | null>(null)

  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [hasMicError, setHasMicError] = useState(false)
  const [hasCameraError, setHasCameraError] = useState(false)
  const [isPeerSpeaking, setIsPeerSpeaking] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.Disconnected,
  )

  const getRoom = useCallback(() => {
    if (!roomRef.current) {
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      })

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Video) setRemoteVideoTrack(track)
        if (track.kind === Track.Kind.Audio) setRemoteAudioTrack(track)
      })

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        if (track.kind === Track.Kind.Video) setRemoteVideoTrack(null)
        if (track.kind === Track.Kind.Audio) setRemoteAudioTrack(null)
      })

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const peerSpeaking = speakers.some((s) => !s.isLocal)
        setIsPeerSpeaking(peerSpeaking)
      })

      room.on(RoomEvent.Reconnecting, () => {
        setIsReconnecting(true)
        setConnectionState(ConnectionState.Reconnecting)
      })

      room.on(RoomEvent.Reconnected, () => {
        setIsReconnecting(false)
        setConnectionState(ConnectionState.Connected)
      })

      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        setConnectionState(state)
      })

      room.on(RoomEvent.Disconnected, () => {
        setConnectionState(ConnectionState.Disconnected)
        setRemoteVideoTrack(null)
        setRemoteAudioTrack(null)
        setLocalVideoTrack(null)
        setLocalAudioTrack(null)
        setIsPeerSpeaking(false)
        setIsReconnecting(false)
      })

      roomRef.current = room
    }
    return roomRef.current
  }, [])

  const requestMediaPermissions = useCallback(async (media: CallMedia) => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: media === 'VIDEO',
      })
      stream.getTracks().forEach((track) => track.stop())
      setHasMicError(false)
      setHasCameraError(false)
    } catch (err: unknown) {
      console.warn('Browser permission request error:', err)
      const errorName = err instanceof Error ? err.name : ''
      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        setHasMicError(true)
        if (media === 'VIDEO') {
          setHasCameraError(true)
        }
      }
    }
  }, [])

  const connect = useCallback(
    async (serverUrl: string, token: string, media: CallMedia) => {
      const room = getRoom()
      if (room.state === ConnectionState.Connected) {
        room.disconnect()
      }

      await room.connect(serverUrl, token)

      // Kích hoạt Microphone với cơ chế Soft Fallback
      try {
        await room.localParticipant.setMicrophoneEnabled(true)
        setHasMicError(false)
        setIsMuted(false)
        const micTrack = room.localParticipant.getTrackPublication(Track.Source.Microphone)?.track
        if (micTrack) setLocalAudioTrack(micTrack)
      } catch (err) {
        console.warn('Microphone permission or hardware error:', err)
        setHasMicError(true)
        setIsMuted(true)
        // TUYỆT ĐỐI KHÔNG ngắt kết nối cuộc gọi!
      }

      // Kích hoạt Camera nếu là cuộc gọi Video
      if (media === 'VIDEO') {
        try {
          await room.localParticipant.setCameraEnabled(true)
          setHasCameraError(false)
          setIsCameraOff(false)
          const camTrack = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track
          if (camTrack) setLocalVideoTrack(camTrack)
        } catch (err) {
          console.warn('Camera permission or hardware error:', err)
          setHasCameraError(true)
          setIsCameraOff(true)
          // TUYỆT ĐỐI KHÔNG ngắt kết nối cuộc gọi!
        }
      } else {
        setIsCameraOff(true)
      }
    },
    [getRoom],
  )

  const toggleMicrophone = useCallback(async () => {
    const room = roomRef.current
    if (!room) return

    // Khi đang có lỗi quyền: thử xin cấp lại quyền
    if (hasMicError) {
      try {
        await room.localParticipant.setMicrophoneEnabled(true)
        setHasMicError(false)
        setIsMuted(false)
        const micTrack = room.localParticipant.getTrackPublication(Track.Source.Microphone)?.track
        if (micTrack) setLocalAudioTrack(micTrack)
      } catch (err) {
        console.warn('Microphone permission retry failed:', err)
        setHasMicError(true)
      }
      return
    }

    const nextState = !isMuted
    try {
      await room.localParticipant.setMicrophoneEnabled(!nextState)
      setIsMuted(nextState)
      if (nextState) {
        setLocalAudioTrack(null)
      } else {
        const micTrack = room.localParticipant.getTrackPublication(Track.Source.Microphone)?.track
        if (micTrack) setLocalAudioTrack(micTrack)
      }
    } catch (err) {
      console.warn('Failed to toggle microphone:', err)
      setHasMicError(true)
    }
  }, [hasMicError, isMuted])

  const toggleCamera = useCallback(async () => {
    const room = roomRef.current
    if (!room) return

    // Khi đang có lỗi quyền: thử xin cấp lại quyền
    if (hasCameraError) {
      try {
        await room.localParticipant.setCameraEnabled(true)
        setHasCameraError(false)
        setIsCameraOff(false)
        const camTrack = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track
        if (camTrack) setLocalVideoTrack(camTrack)
      } catch (err) {
        console.warn('Camera permission retry failed:', err)
        setHasCameraError(true)
      }
      return
    }

    const nextState = !isCameraOff
    try {
      await room.localParticipant.setCameraEnabled(!nextState)
      setIsCameraOff(nextState)
      if (nextState) {
        setLocalVideoTrack(null)
      } else {
        const camTrack = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track
        if (camTrack) setLocalVideoTrack(camTrack)
      }
    } catch (err) {
      console.warn('Failed to toggle camera:', err)
      setHasCameraError(true)
    }
  }, [hasCameraError, isCameraOff])

  const flipCamera = useCallback(async () => {
    const room = roomRef.current
    if (!room) return

    const videoPub = room.localParticipant.getTrackPublication(Track.Source.Camera)
    if (!videoPub || !videoPub.videoTrack) return

    try {
      // LiveKit supports restarting track with different facing mode or device
      const currentFacing = videoPub.videoTrack.mediaStreamTrack.getSettings().facingMode
      const nextFacing = currentFacing === 'user' ? 'environment' : 'user'
      await videoPub.videoTrack.restartTrack({
        facingMode: nextFacing,
      })
      const camTrack = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track
      if (camTrack) setLocalVideoTrack(camTrack)
    } catch (err) {
      console.warn('Failed to flip camera:', err)
    }
  }, [])

  const disconnect = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect()
      roomRef.current = null
    }
    setRemoteVideoTrack(null)
    setRemoteAudioTrack(null)
    setLocalVideoTrack(null)
    setLocalAudioTrack(null)
    setIsPeerSpeaking(false)
    setIsReconnecting(false)
    setConnectionState(ConnectionState.Disconnected)
  }, [])

  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect()
        roomRef.current = null
      }
    }
  }, [])

  return {
    remoteVideoTrack,
    remoteAudioTrack,
    localVideoTrack,
    localAudioTrack,
    isMuted,
    isCameraOff,
    hasMicError,
    hasCameraError,
    isPeerSpeaking,
    isReconnecting,
    connectionState,
    requestMediaPermissions,
    connect,
    toggleMicrophone,
    toggleCamera,
    flipCamera,
    disconnect,
  }
}
