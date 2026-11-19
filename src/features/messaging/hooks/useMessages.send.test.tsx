// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CHAT_QUERY_KEYS, useSendMessageMutation } from './useMessages'
import type { MessageResponse } from '@/features/messaging/types/message.types'

const mocks = vi.hoisted(() => ({
  presignFile: vi.fn(),
  uploadBinaryToUrl: vi.fn(),
  uploadFileViaBackend: vi.fn(),
  sendMessage: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@/features/auth/api', () => ({ useAuth: () => ({ user: { id: 'sender-1' } }) }))
vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}))
vi.mock('sonner', () => ({ toast: { error: mocks.toastError } }))
vi.mock('@/features/file/api/file.api', () => ({
  presignFile: mocks.presignFile,
  uploadBinaryToUrl: mocks.uploadBinaryToUrl,
  uploadFileViaBackend: mocks.uploadFileViaBackend,
}))
vi.mock('@/features/messaging/api/message.api', () => ({ sendMessage: mocks.sendMessage }))

const conversationId = 'conversation-1'

describe('failed attachment outbox', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
  })

  it('keeps the file and client ID on the row when upload fails, then retries there', async () => {
    const file = new File(['image'], 'photo.png', { type: 'image/png' })
    const pendingFile = { id: 'file-1', file, previewUrl: 'blob:photo' }
    const revoke = vi.fn()
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke })
    mocks.presignFile
      .mockRejectedValueOnce(new Error('R2 unavailable'))
      .mockResolvedValueOnce({ uploadUrl: 'https://storage.test/upload', objectKey: 'chat/photo' })
    mocks.uploadFileViaBackend.mockRejectedValueOnce(new Error('fallback unavailable'))
    mocks.uploadBinaryToUrl.mockResolvedValue(undefined)
    const serverMessage: MessageResponse = {
      id: 'message-1',
      conversationId,
      senderId: 'sender-1',
      kind: 'IMAGE',
      body: null,
      replyToId: null,
      clientMsgId: 'client-1',
      attachments: [],
      createdAt: new Date().toISOString(),
      editedAt: null,
      deletedAt: null,
    }
    mocks.sendMessage.mockResolvedValue(serverMessage)
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const hook = renderHook(() => useSendMessageMutation(conversationId), { wrapper })

    await act(async () => {
      await expect(
        hook.result.current.mutateAsync({
          body: '',
          pendingFiles: [pendingFile],
          clientMsgId: 'client-1',
        }),
      ).rejects.toThrow('fallback unavailable')
    })
    const failed = queryClient.getQueryData<MessageResponse[]>(
      CHAT_QUERY_KEYS.liveMessages(conversationId),
    )?.[0]
    expect(failed?.sendState).toBe('failed')
    expect(failed?.retryAttempt?.pendingFiles?.[0]?.file).toBe(file)
    expect(failed?.retryAttempt?.clientMsgId).toBe('client-1')
    expect(failed?.retryPayload).toBeUndefined()
    expect(revoke).not.toHaveBeenCalled()

    await act(async () => {
      await hook.result.current.mutateAsync(failed!.retryAttempt!)
    })
    await waitFor(() => expect(mocks.sendMessage).toHaveBeenCalledTimes(1))
    expect(mocks.sendMessage).toHaveBeenCalledWith(
      conversationId,
      expect.objectContaining({
        clientMsgId: 'client-1',
        attachments: [expect.objectContaining({ objectKey: 'chat/photo' })],
      }),
    )
    expect(revoke).toHaveBeenCalledWith('blob:photo')
    expect(
      queryClient.getQueryData<MessageResponse[]>(CHAT_QUERY_KEYS.liveMessages(conversationId))?.[0]
        ?.id,
    ).toBe('message-1')
  })
})
