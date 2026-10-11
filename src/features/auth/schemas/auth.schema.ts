import { z } from 'zod'
import { PASSWORD_MIN_LENGTH } from '@/config/constants'

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập email')
  .email('Email không hợp lệ')

const passwordSchema = z
  .string()
  .min(1, 'Vui lòng nhập mật khẩu')
  .min(PASSWORD_MIN_LENGTH, `Mật khẩu phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự`)

const otpCodeSchema = z
  .string()
  .regex(/^\d{6}$/, 'Mã OTP phải có đúng 6 chữ số')

/* ------------------------------------------------------------------ */
/* Login                                                               */
/* ------------------------------------------------------------------ */

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})
export type LoginInput = z.infer<typeof loginSchema>

/* ------------------------------------------------------------------ */
/* Signup wizard                                                       */
/* ------------------------------------------------------------------ */

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

/** Bước cuối wizard signup: tên + mật khẩu + nhập lại (email/otp đã chốt trước đó). */
export const signupInfoSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập họ và tên')
      .min(2, 'Họ và tên phải có ít nhất 2 ký tự')
      .max(60, 'Họ và tên tối đa 60 ký tự'),
    password: z
      .string()
      .min(1, 'Vui lòng nhập mật khẩu')
      .min(PASSWORD_MIN_LENGTH, `Mật khẩu phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự`)
      .regex(/[A-Za-z]/, 'Mật khẩu phải chứa ít nhất một chữ cái')
      .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất một chữ số'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  })
export type SignupInfoInput = z.infer<typeof signupInfoSchema>

/** Full signup payload — dùng khi gọi API signup. */
export const signupSchema = z.object({
  email: emailSchema,
  fullName: z.string().min(1).max(255),
  password: passwordSchema,
  otp: otpCodeSchema,
})
export type SignupInput = z.infer<typeof signupSchema>

/* ------------------------------------------------------------------ */
/* OTP (cho forgot-password flow)                                       */
/* ------------------------------------------------------------------ */

export const otpSchema = z.object({
  email: emailSchema,
  code: otpCodeSchema,
})
export type OtpInput = z.infer<typeof otpSchema>

export const otpLocationStateSchema = z.object({
  email: z.string().email().optional(),
  flow: z.enum(['registration', 'forgot-password']).optional(),
})
