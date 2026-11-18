// @vitest-environment happy-dom
import { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MessageComposer } from './MessageComposer'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) =>
      ({
        'chat.failedMessage': 'Tin chưa gửi được',
        'common.retry': 'Thử lại',
        'common.close': 'Đóng',
      })[key] ??
      fallback ??
      key,
  }),
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

type Submit = NonNullable<Parameters<typeof MessageComposer>[0]['onSubmit']>

function renderComposer(conversationId: string, onSubmit: Submit) {
  function Harness() {
    const [draft, setDraft] = useState('ok')
    return (
      <MessageComposer
        conversationId={conversationId}
        draft={draft}
        onDraftChange={setDraft}
        onSubmit={onSubmit}
      />
    )
  }
  render(<Harness />)
  return screen.getByRole('textbox') as HTMLInputElement
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('MessageComposer pending send', () => {
  it('keeps a second identical draft when the first send succeeds', async () => {
    const request = deferred<boolean>()
    const onSubmit = vi.fn(() => request.promise)
    const input = renderComposer('second-identical-draft', onSubmit)

    fireEvent.click(screen.getByRole('button', { name: 'chat.sendMessage' }))
    expect(onSubmit).toHaveBeenCalledWith('ok', undefined, undefined, undefined, expect.any(String))
    fireEvent.change(input, { target: { value: 'ok' } })

    request.resolve(true)
    await waitFor(() => expect(input.value).toBe('ok'))
    expect(screen.queryByText(/Tin chưa gửi được/)).toBeNull()
  })

  it('preserves a new draft when a previous send fails and keeps composer clean', async () => {
    const request = deferred<boolean>()
    const onSubmit = vi
      .fn()
      .mockImplementationOnce(() => request.promise)
      .mockResolvedValue(true)
    const input = renderComposer('failed-with-new-draft', onSubmit)

    fireEvent.click(screen.getByRole('button', { name: 'chat.sendMessage' }))
    const originalClientId = onSubmit.mock.calls[0][4]
    expect(originalClientId).toBeTruthy()
    fireEvent.change(input, { target: { value: 'new draft' } })
    request.resolve(false)

    await waitFor(() => expect(input.value).toBe('new draft'))
    expect(screen.queryByText(/Tin chưa gửi được/)).toBeNull()
  })

  it('keeps newly typed draft intact when file upload in flight resolves', async () => {
    const request = deferred<boolean>()
    const onSubmit = vi
      .fn()
      .mockImplementationOnce(() => request.promise)
      .mockResolvedValue(true)
    const input = renderComposer('failed-file-with-new-draft', onSubmit)
    const file = new File(['payload'], 'notes.txt', { type: 'text/plain' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    fireEvent.change(fileInput, { target: { files: [file] } })
    await screen.findByText('notes.txt')
    fireEvent.click(screen.getByRole('button', { name: 'chat.sendMessage' }))
    fireEvent.change(input, { target: { value: 'later' } })
    request.resolve(false)

    await waitFor(() => expect(input.value).toBe('later'))
    expect(screen.queryByText(/Tin chưa gửi được/)).toBeNull()
  })
})
