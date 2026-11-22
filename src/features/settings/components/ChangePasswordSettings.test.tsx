// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChangePasswordSettings } from './ChangePasswordSettings'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}))

const mutate = vi.fn()
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useChangePassword: () => ({ mutate }),
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function currentPasswordInput(): HTMLInputElement {
  return screen.getByPlaceholderText('chat.currentPassword') as HTMLInputElement
}

describe('ChangePasswordSettings', () => {
  it('hides the current-password field from browser autofill until the user focuses it', () => {
    render(<ChangePasswordSettings />)
    const input = currentPasswordInput()
    expect(input.getAttribute('autocomplete')).toBe('off')
    expect(input.readOnly).toBe(true)
    fireEvent.focus(input)
    expect(input.readOnly).toBe(false)
  })

  it('turns autocomplete off for the whole form', () => {
    render(<ChangePasswordSettings />)
    const form = document.querySelector('form')
    expect(form?.getAttribute('autocomplete')).toBe('off')
  })
})
