import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
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

function getMediaErrorMessage(
  err: unknown,
  kind: 'audio' | 'video',
  t: (key: string, optionsOrFallback?: any) => string,
): string {
  const errorName = err instanceof Error ? err.name : ''
  if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
    return kind === 'audio'
      ? t(
          'chat.callMicNotFoundAlert',
          'Không tìm thấy thiết bị Microphone trên máy tính. Vui lòng cắm tai nghe hoặc microphone.',
        )
      : t(
          'chat.callCameraNotFoundAlert',
          'Không tìm thấy thiết bị Camera trên máy tính. Vui lòng kết nối webcam.',
        )
  }
  if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
    return t(
      'chat.callDeviceInUseAlert',
      'Thiết bị đang bị ứng dụng khác sử dụng. Vui lòng đóng các ứng dụng đang dùng mic/camera và thử lại.',
    )
  }
  return kind === 'audio'
    ? t(
        'chat.callMicBlockedAlert',
        'Microphone đang bị chặn trong trình duyệt. Vui lòng bấm vào biểu tượng cài đặt/ổ khóa trên thanh địa chỉ để Bật quyền.',
      )
    : t(
        'chat.callCameraBlockedAlert',
        'Camera đang bị chặn trong trình duyệt. Vui lòng bấm vào biểu tượng cài đặt/ổ khóa trên thanh địa chỉ để Bật quyền.',
      )
}

export function useLiveKitCall(): UseLiveKitCallReturn {
  const { t } = useTranslation()
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

    // 1. Lắng nghe trạng thái quyền qua Permissions API nếu trình duyệt hỗ trợ
    if (typeof navigator.permissions !== 'undefined' && navigator.permissions.query) {
      try {
        const micStatus = await navigator.permissions.query({
          name: 'microphone' as PermissionName,
        })
        if (micStatus.state === 'denied') {
          setHasMicError(true)
        } else if (micStatus.state === 'granted') {
          setHasMicError(false)
        }
        micStatus.onchange = () => {
          if (micStatus.state === 'granted') setHasMicError(false)
          if (micStatus.state === 'denied') setHasMicError(true)
        }
      } catch {
        // query mic không được hỗ trợ trên trình duyệt này
      }

      if (media === 'VIDEO') {
        try {
          const camStatus = await navigator.permissions.query({ name: 'camera' as PermissionName })
          if (camStatus.state === 'denied') {
            setHasCameraError(true)
          } else if (camStatus.state === 'granted') {
            setHasCameraError(false)
          }
          camStatus.onchange = () => {
            if (camStatus.state === 'granted') setHasCameraError(false)
            if (camStatus.state === 'denied') setHasCameraError(true)
          }
        } catch {
          // query cam không được hỗ trợ
        }
      }
    }

    // 2. Yêu cầu Microphone riêng biệt
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStream.getTracks().forEach((track) => track.stop())
      setHasMicError(false)
    } catch (err: unknown) {
      console.warn('Browser mic permission request error:', err)
      const errorName = err instanceof Error ? err.name : ''
      if (
        errorName === 'NotAllowedError' ||
        errorName === 'PermissionDeniedError' ||
        errorName === 'NotFoundError'
      ) {
        setHasMicError(true)
      }
    }

    // 3. Yêu cầu Camera riêng biệt nếu là VIDEO
    if (media === 'VIDEO') {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true })
        videoStream.getTracks().forEach((track) => track.stop())
        setHasCameraError(false)
      } catch (err: unknown) {
        console.warn('Browser camera permission request error:', err)
        const errorName = err instanceof Error ? err.name : ''
        if (
          errorName === 'NotAllowedError' ||
          errorName === 'PermissionDeniedError' ||
          errorName === 'NotFoundError'
        ) {
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
    let permissionGrantedNow = false
    // 1. Thử yêu cầu lại quyền qua getUserMedia nếu đang có lỗi
    if (hasMicError && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach((track) => track.stop())
        setHasMicError(false)
        setIsMuted(false)
        permissionGrantedNow = true
      } catch (err: unknown) {
        console.warn('Microphone permission retry failed on user click:', err)
        setHasMicError(true)
        toast.error(getMediaErrorMessage(err, 'audio', t))
        return
      }
    }

    const room = roomRef.current
    if (!room) {
      // Khi đang ringing (chưa có phòng), chỉ toggle trạng thái mic UI
      if (!permissionGrantedNow) {
        setIsMuted((prev) => !prev)
      }
      return
    }

    // 2. Thử bật/tắt trên LiveKit participant
    const nextState = permissionGrantedNow ? false : hasMicError ? false : !isMuted
    try {
      await room.localParticipant.setMicrophoneEnabled(!nextState)
      setHasMicError(false)
      setIsMuted(nextState)
      if (nextState) {
        setLocalAudioTrack(null)
      } else {
        const micTrack = room.localParticipant.getTrackPublication(Track.Source.Microphone)?.track
        if (micTrack) setLocalAudioTrack(micTrack)
      }
    } catch (err) {
      console.warn('Failed to toggle microphone on room:', err)
      setHasMicError(true)
      setIsMuted(true)
      toast.error(t('chat.callMicBlockedAlert'))
    }
  }, [hasMicError, isMuted, t])

  const toggleCamera = useCallback(async () => {
    let permissionGrantedNow = false
    // 1. Thử yêu cầu lại quyền qua getUserMedia nếu đang có lỗi
    if (
      hasCameraError &&
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices?.getUserMedia
    ) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        stream.getTracks().forEach((track) => track.stop())
        setHasCameraError(false)
        setIsCameraOff(false)
        permissionGrantedNow = true
      } catch (err: unknown) {
        console.warn('Camera permission retry failed on user click:', err)
        setHasCameraError(true)
        toast.error(getMediaErrorMessage(err, 'video', t))
        return
      }
    }

    const room = roomRef.current
    if (!room) {
      // Khi đang ringing (chưa có phòng), chỉ toggle trạng thái camera UI
      if (!permissionGrantedNow) {
        setIsCameraOff((prev) => !prev)
      }
      return
    }

    // 2. Thử bật/tắt trên LiveKit participant
    const nextState = permissionGrantedNow ? false : hasCameraError ? false : !isCameraOff
    try {
      await room.localParticipant.setCameraEnabled(!nextState)
      setHasCameraError(false)
      setIsCameraOff(nextState)
      if (nextState) {
        setLocalVideoTrack(null)
      } else {
        const camTrack = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track
        if (camTrack) setLocalVideoTrack(camTrack)
      }
    } catch (err) {
      console.warn('Failed to toggle camera on room:', err)
      setHasCameraError(true)
      setIsCameraOff(true)
      toast.error(t('chat.callCameraBlockedAlert'))
    }
  }, [hasCameraError, isCameraOff, t])

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
