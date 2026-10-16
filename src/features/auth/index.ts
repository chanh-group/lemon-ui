export {
  loginSchema,
  requestOtpSchema,
  verifyOtpSchema,
  signupInfoSchema,
  signupSchema,
  resetPasswordSchema,
} from './schemas/auth.schema'
export type {
  LoginInput,
  RequestOtpInput,
  VerifyOtpInput,
  SignupInfoInput,
  SignupInput,
  ResetPasswordInput,
} from './schemas/auth.schema'
export {
  useAuth,
  useLogin,
  useRequestOtp,
  useVerifyOtpEarly,
  useSignup,
  useAutoSignin,
  useForgotPassword,
  useResetPassword,
  useResendOtp,
  useLogout,
} from './hooks/useAuth'
export { useOtpCountdown, formatCountdown } from './helpers'
export { LoginForm } from './components/LoginForm'
export { SignupWizard, EmailStep, OtpStep, InfoStep } from './components/signup'
export { ForgotPasswordWizard, ResetPasswordStep } from './components/forgot'
export { OtpInputGroup, VerificationMessage } from './components/otp'
export type {
  User,
  AuthSession,
  VerificationErrorCode,
  RequestOtpPayload,
  VerifyOtpEarlyPayload,
  SignupPayload,
  ResetPasswordPayload,
  ResendOtpPayload,
  LoginPayload,
  RegisterPayload,
  SignupStep,
  ForgotStep,
} from './types/auth.types'
