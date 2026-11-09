import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { api } from '@/infrastructure/api/client'
import { updateProfile } from './api'

describe('updateProfile API', () => {
  beforeEach(() => {
    mock.restore()
  })

  it('calls PATCH /users/me with provided payload and returns updated user', async () => {
    const updatedUser = {
      id: 'user-123',
      fullName: 'New Name',
      username: 'lemon_user',
      email: 'user@example.com',
      avatarUrl: 'https://example.com/avatar.png',
      bio: 'New bio',
      phone: '0123456789',
      createdAt: '2026-01-01T00:00:00.000Z',
    }

    const patchSpy = mock(() => Promise.resolve({ data: updatedUser }))
    api.patch = patchSpy as unknown as typeof api.patch

    const payload = {
      fullName: 'New Name',
      avatarUrl: 'https://example.com/avatar.png',
      bio: 'New bio',
    }

    const res = await updateProfile(payload)

    expect(patchSpy).toHaveBeenCalledWith('/users/me', payload)
    expect(res).toEqual(updatedUser)
  })

  it('allows setting avatarUrl to null to remove avatar', async () => {
    const updatedUser = {
      id: 'user-123',
      fullName: 'User Name',
      username: 'lemon_user',
      email: 'user@example.com',
      avatarUrl: null,
      bio: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    }

    const patchSpy = mock(() => Promise.resolve({ data: updatedUser }))
    api.patch = patchSpy as unknown as typeof api.patch

    const res = await updateProfile({ avatarUrl: null, bio: null })

    expect(patchSpy).toHaveBeenCalledWith('/users/me', { avatarUrl: null, bio: null })
    expect(res.avatarUrl).toBeNull()
    expect(res.bio).toBeNull()
  })

  it('supports partial update with fullName only', async () => {
    const updatedUser = {
      id: 'user-123',
      fullName: 'Updated Name Only',
      username: 'lemon_user',
      email: 'user@example.com',
      avatarUrl: null,
      bio: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    }

    const patchSpy = mock(() => Promise.resolve({ data: updatedUser }))
    api.patch = patchSpy as unknown as typeof api.patch

    const res = await updateProfile({ fullName: 'Updated Name Only' })

    expect(patchSpy).toHaveBeenCalledWith('/users/me', { fullName: 'Updated Name Only' })
    expect(res.fullName).toBe('Updated Name Only')
  })

  it('supports updating avatarUrl with data URL format', async () => {
    const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
    const updatedUser = {
      id: 'user-123',
      fullName: 'User Name',
      username: 'lemon_user',
      email: 'user@example.com',
      avatarUrl: dataUrl,
      bio: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    }

    const patchSpy = mock(() => Promise.resolve({ data: updatedUser }))
    api.patch = patchSpy as unknown as typeof api.patch

    const res = await updateProfile({ avatarUrl: dataUrl })

    expect(patchSpy).toHaveBeenCalledWith('/users/me', { avatarUrl: dataUrl })
    expect(res.avatarUrl).toBe(dataUrl)
  })

  it('rejects when API call fails', async () => {
    const patchSpy = mock(() => Promise.reject(new Error('Network error')))
    api.patch = patchSpy as unknown as typeof api.patch

    await expect(updateProfile({ fullName: 'Fail' })).rejects.toThrow('Network error')
  })
})
