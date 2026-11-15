export type Nullable<T> = T | null

export interface CursorPage<T> {
  items: T[]
  nextCursor?: string
  hasMore: boolean
}

export type ChatTab = 'messages' | 'calls' | 'stories'

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'

export interface SelectOption {
  label: string
  value: string
}
