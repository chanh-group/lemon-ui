// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CallControls } from './CallControls'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) =>
      ({
        'chat.callMute': 'Tắt tiếng',
        'chat.callUnmute': 'Bật tiếng',
        'chat.callCameraOff': 'Tắt camera',
        'chat.callCameraOn': 'Bật camera',
        'chat.callMicBlocked': 'Lỗi Mic',
        'chat.callCameraBlocked': 'Lỗi Cam',
        'chat.callMicPermissionTooltip': 'Microphone chưa được cấp quyền. Bấm để thử lại',
        'chat.callCameraPermissionTooltip': 'Camera chưa được cấp quyền. Bấm để thử lại',
      })[key] ??
      fallback ??
      key,
  }),
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('CallControls Soft Permission Fallback UI', () => {
  const defaultProps = {
    phase: 'active' as const,
    media: 'video' as const,
    muted: false,
    speakerOn: true,
    cameraOn: true,
    hasMicError: false,
    hasCameraError: false,
    onToggleMute: vi.fn(),
    onToggleSpeaker: vi.fn(),
    onToggleCamera: vi.fn(),
    onFlipCamera: vi.fn(),
    onChangeMedia: vi.fn(),
    onEnd: vi.fn(),
    onAccept: vi.fn(),
    onDecline: vi.fn(),
    onRedial: vi.fn(),
    onClose: vi.fn(),
  }

  it('renders normal mic and camera buttons when there are no errors', () => {
    render(<CallControls {...defaultProps} />)
    expect(screen.queryByText('!')).toBeNull()
  })

  it('renders amber warning badge "!" on mic button when hasMicError is true', () => {
    render(<CallControls {...defaultProps} hasMicError={true} />)
    const warningBadge = screen.getByText('!')
    expect(warningBadge).toBeDefined()
    expect(warningBadge.getAttribute('title')).toContain('Microphone chưa được cấp quyền')
  })

  it('renders amber warning badge "!" on camera button when hasCameraError is true', () => {
    render(<CallControls {...defaultProps} hasCameraError={true} />)
    const warningBadge = screen.getByText('!')
    expect(warningBadge).toBeDefined()
    expect(warningBadge.getAttribute('title')).toContain('Camera chưa được cấp quyền')
  })

  it('triggers onToggleMute when clicking mic button with error', () => {
    const onToggleMute = vi.fn()
    render(<CallControls {...defaultProps} hasMicError={true} onToggleMute={onToggleMute} />)
    const micButton = screen.getByRole('button', { name: 'Lỗi Mic' })
    fireEvent.click(micButton)
    expect(onToggleMute).toHaveBeenCalledTimes(1)
  })

  it('triggers onToggleCamera when clicking camera button with error', () => {
    const onToggleCamera = vi.fn()
    render(<CallControls {...defaultProps} hasCameraError={true} onToggleCamera={onToggleCamera} />)
    const camButton = screen.getByRole('button', { name: 'Lỗi Cam' })
    fireEvent.click(camButton)
    expect(onToggleCamera).toHaveBeenCalledTimes(1)
  })

  it('renders camera toggle button during ringing phase for video call', () => {
    render(<CallControls {...defaultProps} phase="ringing" media="video" cameraOn={true} />)
    expect(screen.getByRole('button', { name: 'Tắt camera' })).toBeDefined()
  })

  it('does NOT render camera toggle button for voice call', () => {
    render(<CallControls {...defaultProps} phase="ringing" media="voice" />)
    expect(screen.queryByRole('button', { name: /camera/i })).toBeNull()
  })
})
