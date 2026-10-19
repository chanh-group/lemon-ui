/** Envelope LemonCore — success (`utils/response.ts`) + error (`ErrorFilter`). */
export interface SuccessEnvelope<T = unknown> {
  success: true
  message: string
  data?: T
}

export interface ErrorEnvelope {
  success: false
  code: string
  message: string
}

export type ApiEnvelope<T = unknown> = SuccessEnvelope<T> | ErrorEnvelope
