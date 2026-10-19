export {
  loginSchema,
  requestOtpSchema,
  verifyOtpSchema,
  signupInfoSchema,
  signupSchema,
  resetPasswordSchema,
  forgotOtpSchema,
} from '@/domain/auth'
export type {
  LoginInput,
  RequestOtpInput,
  VerifyOtpInput,
  SignupInfoInput,
  SignupInput,
  ResetPasswordInput,
  ForgotOtpInput,
  AuthUser,
  VerificationErrorCode,
  SignupStep,
  ForgotStep,
} from '@/domain/auth'
export {
  useAuth,
  useMe,
  useLogin,
  useRequestOtp,
  useVerifyOtpEarly,
  useSignup,
  useAutoSignin,
  useForgotPassword,
  useResetPassword,
  useLogout,
} from './hooks/useAuth'
export { useOtpCountdown, formatCountdown } from './hooks/useOtpCountdown'
export { LoginForm } from './components/LoginForm'
export { SignupWizard, EmailStep, OtpStep, InfoStep } from './components/signup'
export { ForgotPasswordWizard, ResetPasswordStep } from './components/forgot'
export { OtpInputGroup, VerificationMessage } from './components/otp'
