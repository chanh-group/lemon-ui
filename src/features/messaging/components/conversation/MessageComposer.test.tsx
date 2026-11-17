// @vitest-environment happy-dom
import { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MessageComposer } from './MessageComposer'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
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

  it('keeps both the failed send and a new draft, then retries with the same client ID', async () => {
    const request = deferred<boolean>()
    const onSubmit = vi
      .fn()
      .mockImplementationOnce(() => request.promise)
      .mockResolvedValue(true)
    const input = renderComposer('failed-with-new-draft', onSubmit)

    fireEvent.click(screen.getByRole('button', { name: 'chat.sendMessage' }))
    const originalClientId = onSubmit.mock.calls[0][4]
    fireEvent.change(input, { target: { value: 'new draft' } })
    request.resolve(false)

    await screen.findByText('Tin chưa gửi được: ok')
    expect(input.value).toBe('new draft')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2))
    expect(onSubmit.mock.calls[1][0]).toBe('ok')
    expect(onSubmit.mock.calls[1][4]).toBe(originalClientId)
    expect(input.value).toBe('new draft')
  })

  it('retains a failed attachment for retry while a new draft is typed', async () => {
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
    const originalFiles = onSubmit.mock.calls[0][2]
    fireEvent.change(input, { target: { value: 'later' } })
    request.resolve(false)

    await screen.findByText('Tin chưa gửi được: ok')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2))
    expect(onSubmit.mock.calls[1][2]).toBe(originalFiles)
    expect(onSubmit.mock.calls[1][2][0].file).toBe(file)
    expect(input.value).toBe('later')
  })
})
