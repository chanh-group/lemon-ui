export { loginSchema, registerSchema, otpSchema, otpLocationStateSchema } from './schemas/auth.schema'
export type { LoginInput, RegisterInput, OtpInput } from './schemas/auth.schema'
export {
  useAuth,
  useLogin,
  useRegister,
  useLogout,
  useVerifyOtp,
  useForgotPassword,
  useResendOtp,
} from './hooks/useAuth'
export { LoginForm } from './components/LoginForm'
export { RegisterForm } from './components/RegisterForm'
export { OtpInputGroup, ResendOtp, VerificationMessage } from './components/otp'
export type {
  User,
  AuthSession,
  OtpFlow,
  OtpLocationState,
  VerificationState,
  VerificationErrorCode,
  VerifyOtpPayload,
  ResendOtpPayload,
  LoginPayload,
  RegisterPayload,
} from './types/auth.types'
