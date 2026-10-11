export {
  loginSchema,
  requestOtpSchema,
  verifyOtpSchema,
  signupInfoSchema,
  signupSchema,
  otpSchema,
  otpLocationStateSchema,
} from './schemas/auth.schema'
export type {
  LoginInput,
  RequestOtpInput,
  VerifyOtpInput,
  SignupInfoInput,
  SignupInput,
  OtpInput,
} from './schemas/auth.schema'
export {
  useAuth,
  useLogin,
  useRequestOtp,
  useVerifyOtpEarly,
  useSignup,
  useAutoSignin,
  useVerifyOtp,
  useForgotPassword,
  useResendOtp,
  useLogout,
} from './hooks/useAuth'
export { useOtpCountdown, formatCountdown } from './helpers'
export { LoginForm } from './components/LoginForm'
export { SignupWizard, EmailStep, OtpStep, InfoStep } from './components/signup'
export { OtpInputGroup, ResendOtp, VerificationMessage } from './components/otp'
export type {
  User,
  AuthSession,
  OtpFlow,
  OtpLocationState,
  VerificationState,
  VerificationErrorCode,
  RequestOtpPayload,
  VerifyOtpPayload,
  VerifyOtpEarlyPayload,
  SignupPayload,
  ResendOtpPayload,
  LoginPayload,
  RegisterPayload,
  SignupStep,
} from './types/auth.types'
