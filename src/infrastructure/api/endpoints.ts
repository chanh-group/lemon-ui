/**
 * Path builders auth — khớp LemonCore `@Controller('auth')`.
 * `baseURL` (VITE_API_URL) đã gồm prefix `/api` nếu có.
 */
export const authEndpoints = {
  requestOtp: '/auth/request-otp',
  verifyOtp: '/auth/verify-otp',
  signup: '/auth/signup',
  login: '/auth/login',
  refresh: '/auth/refresh',
  logout: '/auth/logout',
  forgotOtp: '/auth/forgot-password/otp',
  resetPassword: '/auth/forgot-password/reset',
  me: '/auth/me',
  changePassword: '/auth/change-password',
} as const

/** 401 trên các path này là lỗi credential — KHÔNG silent refresh. */
export const NO_SILENT_REFRESH_PATHS: readonly string[] = [
  authEndpoints.login,
  authEndpoints.signup,
  authEndpoints.requestOtp,
  authEndpoints.verifyOtp,
  authEndpoints.forgotOtp,
  authEndpoints.resetPassword,
  authEndpoints.refresh,
]
