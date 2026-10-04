export const env = {
  APP_NAME: import.meta.env.VITE_APP_NAME ?? 'LemonChat',
  API_URL: import.meta.env.VITE_API_URL ?? '/api',
  APP_ENV: import.meta.env.VITE_APP_ENV ?? 'production',
} as const

/** Khi VITE_APP_ENV=dev: bỏ qua xác thực thật (login/đăng ký/OTP), chỉ validate zod phía client. */
export function isAuthBypass(): boolean {
  return env.APP_ENV === 'dev'
}
