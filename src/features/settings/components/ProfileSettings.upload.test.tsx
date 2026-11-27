// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProfileSettings } from './ProfileSettings'

const mocks = vi.hoisted(() => ({
  presign: vi.fn(),
  direct: vi.fn(),
  fallback: vi.fn(),
  save: vi.fn(),
}))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/features/auth/api', () => ({
  useMe: () => ({
    data: {
      id: 'me',
      username: 'user',
      email: 'a@example.test',
      fullName: 'User',
      avatarUrl: null,
    },
    isPending: false,
    refetch: vi.fn(),
  }),
  useUpdateProfile: () => ({ mutateAsync: mocks.save, isPending: false }),
}))
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('@/features/file/api/file.api', () => ({
  presignFile: mocks.presign,
  uploadBinaryToUrl: mocks.direct,
  uploadFileViaBackend: mocks.fallback,
}))
vi.mock('@/config/env', () => ({ isAuthBypass: () => false }))
vi.mock('@/lib/avatar', () => ({
  fileToAvatarDataUrl: vi.fn(async () => 'data:image/png;base64,a'),
}))
vi.mock('@/components/common/UserAvatar', () => ({ UserAvatar: () => <div /> }))
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

afterEach(() => cleanup())
beforeEach(() => {
  vi.clearAllMocks()
  mocks.presign.mockResolvedValue({
    uploadUrl: 'https://upload.example.test',
    avatarUrl: 'https://image.example.test',
  })
  mocks.save.mockResolvedValue({})
})

describe('profile avatar upload', () => {
  it('shows known upload progress, then a separate save phase', async () => {
    const uploading = deferred()
    const saving = deferred()
    mocks.direct.mockImplementation((_url, _file, _mime, progress) => {
      progress(null)
      progress(42)
      return uploading.promise
    })
    mocks.save.mockReturnValue(saving.promise)
    const { container } = render(<ProfileSettings />)
    fireEvent.click(screen.getByRole('button', { name: 'chat.editPhoto' }))
    const input = container.querySelector('input[type=file]')!
    fireEvent.change(input, {
      target: { files: [new File(['data'], 'photo.png', { type: 'image/png' })] },
    })
    await waitFor(() => expect(screen.getByText('photo.png')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'chat.saveChanges' }))
    await waitFor(() => expect(screen.getByRole('progressbar').getAttribute('value')).toBe('42'))
    expect(screen.getByRole('status').textContent).toContain('chat.avatarUploading')
    expect(
      (screen.getByRole('button', { name: 'chat.cancel' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    uploading.resolve()
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('chat.avatarSaving'),
    )
    expect(screen.queryByRole('progressbar')).toBeNull()
    saving.resolve()
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
    expect(mocks.save).toHaveBeenCalledWith({ avatarUrl: 'https://image.example.test' })
  })

  it('resets progress when direct upload fails and backend fallback starts', async () => {
    const fallback = deferred()
    mocks.direct.mockImplementation(async (_url, _file, _mime, progress) => {
      progress(80)
      throw new Error('blocked')
    })
    mocks.fallback.mockImplementation(() =>
      fallback.promise.then(() => ({ avatarUrl: 'https://fallback.example.test' })),
    )
    const { container } = render(<ProfileSettings />)
    fireEvent.click(screen.getByRole('button', { name: 'chat.editPhoto' }))
    fireEvent.change(container.querySelector('input[type=file]')!, {
      target: { files: [new File(['data'], 'photo.png', { type: 'image/png' })] },
    })
    await waitFor(() => expect(screen.getByText('photo.png')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'chat.saveChanges' }))
    await waitFor(() => expect(mocks.fallback).toHaveBeenCalledOnce())
    expect(screen.getByRole('status').textContent).toContain('chat.avatarUploading')
    expect(screen.queryByRole('progressbar')).toBeNull()
    fallback.resolve()
    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledWith({ avatarUrl: 'https://fallback.example.test' }),
    )
  })
})
