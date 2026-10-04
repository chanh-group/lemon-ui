export type Nullable<T> = T | null

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'

export interface SelectOption {
  label: string
  value: string
}
