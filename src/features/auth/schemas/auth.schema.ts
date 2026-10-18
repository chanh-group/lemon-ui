import { z } from 'zod'
import { PASSWORD_MIN_LENGTH } from '@/config/constants'

const emailSchema = z
  .string()
  .trim()
  .min(1, 'errors.required')
  .email('errors.emailInvalid')

const passwordSchema = z
  .string()
  .min(1, 'errors.required')
  .min(PASSWORD_MIN_LENGTH, 'errors.passwordMinLength')

const otpCodeSchema = z
  .string()
  .regex(/^\d{6}$/, 'errors.otpInvalid')

const usernameSchema = z
  .string()
  .trim()
  .min(1, 'errors.required')
  .min(3, 'errors.usernameMinLength')
  .max(30, 'errors.usernameMaxLength')
  .regex(/^[a-z0-9._-]+$/, 'errors.usernameRule')

/* ---- Login ---- */

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'errors.required'),
})
export type LoginInput = z.infer<typeof loginSchema>

/* ---- Signup wizard ---- */

export const requestOtpSchema = z.object({
  email: emailSchema,
})
export type RequestOtpInput = z.infer<typeof requestOtpSchema>

export const verifyOtpSchema = z.object({
  email: emailSchema,
  otp: otpCodeSchema,
  purpose: z.enum(['signup', 'reset']),
})
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>

export const signupInfoSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, 'errors.required')
      .min(2, 'errors.fullNameMinLength')
      .max(60, 'errors.fullNameMaxLength'),
    username: usernameSchema,
    password: z
      .string()
      .min(1, 'errors.required')
      .min(PASSWORD_MIN_LENGTH, 'errors.passwordMinLength')
      .regex(/[A-Za-z]/, 'errors.passwordLetter')
      .regex(/[0-9]/, 'errors.passwordDigit'),
    confirmPassword: z.string().min(1, 'errors.required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'errors.passwordMismatch',
    path: ['confirmPassword'],
  })
export type SignupInfoInput = z.infer<typeof signupInfoSchema>

export const signupSchema = z.object({
  email: emailSchema,
  fullName: z.string().min(1, 'errors.required').max(255, 'errors.fullNameMaxLength'),
  username: usernameSchema,
  password: passwordSchema,
  otp: otpCodeSchema,
})
export type SignupInput = z.infer<typeof signupSchema>

/* ---- Forgot password ---- */

export const resetPasswordSchema = z
  .object({
    otp: otpCodeSchema,
    newPassword: z
      .string()
      .min(1, 'errors.required')
      .min(PASSWORD_MIN_LENGTH, 'errors.passwordMinLength')
      .regex(/[A-Za-z]/, 'errors.passwordLetter')
      .regex(/[0-9]/, 'errors.passwordDigit'),
    confirmPassword: z.string().min(1, 'errors.required'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'errors.passwordMismatch',
    path: ['confirmPassword'],
  })
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
