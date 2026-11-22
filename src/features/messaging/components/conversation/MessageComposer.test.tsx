// @vitest-environment happy-dom
import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MessageComposer } from './MessageComposer'
import { getConversationDraft, setConversationDraft } from '@/features/messaging/utils/draftStore'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) =>
      ({
        'chat.failedMessage': 'Tin chưa gửi được',
        'common.retry': 'Thử lại',
        'common.close': 'Đóng',
        'chat.messageTooLong': 'Tin nhắn vượt quá giới hạn {{max}} ký tự.',
        'chat.messageLengthCounter': '{{count}} / {{max}}',
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
  setConversationDraft(conversationId, 'ok')
  render(<MessageComposer conversationId={conversationId} onSubmit={onSubmit} />)
  return screen.getByRole('textbox') as HTMLTextAreaElement
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

    await act(async () => {
      request.resolve(true)
    })
    expect(input.value).toBe('ok')
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
    await act(async () => {
      request.resolve(false)
    })

    expect(input.value).toBe('new draft')
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
    await act(async () => {
      request.resolve(false)
    })

    expect(input.value).toBe('later')
    expect(screen.queryByText(/Tin chưa gửi được/)).toBeNull()
  })

  it('keeps an image preview alive when the send result is false', async () => {
    const revoke = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn().mockReturnValue('blob:failed-image'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke })
    const onSubmit = vi.fn().mockResolvedValue(false)
    renderComposer('failed-image', onSubmit)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, {
      target: { files: [new File(['image'], 'photo.png', { type: 'image/png' })] },
    })
    await screen.findByText('photo.png')
    fireEvent.click(screen.getByRole('button', { name: 'chat.sendMessage' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(revoke).not.toHaveBeenCalledWith('blob:failed-image')
  })

  it('ignores Enter key while IME composition is active or keyCode is 229', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true)
    const input = renderComposer('ime-test', onSubmit)

    // Keydown with isComposing = true
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false, isComposing: true })
    expect(onSubmit).not.toHaveBeenCalled()

    // Keydown with keyCode = 229
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false, keyCode: 229 })
    expect(onSubmit).not.toHaveBeenCalled()

    // Keydown standard Enter without composition
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false, isComposing: false })
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('keeps Shift+Enter for a newline instead of submitting', () => {
    const onSubmit = vi.fn().mockResolvedValue(true)
    const input = renderComposer('shift-enter', onSubmit)

    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits exactly 4000 code points', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true)
    const input = renderComposer('message-boundary-valid', onSubmit)
    const body = '😀'.repeat(4000)

    fireEvent.change(input, { target: { value: body } })
    fireEvent.click(screen.getByRole('button', { name: 'chat.sendMessage' }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        body,
        undefined,
        undefined,
        undefined,
        expect.any(String),
      ),
    )
  })

  it('keeps an over-limit draft and prevents optimistic submission', () => {
    const onSubmit = vi.fn().mockResolvedValue(true)
    const input = renderComposer('message-boundary-invalid', onSubmit)
    const body = '😀'.repeat(4001)

    fireEvent.change(input, { target: { value: body } })

    expect(input.value).toBe(body)
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByRole('alert').textContent).toContain('Tin nhắn vượt quá giới hạn')
    expect(
      (screen.getByRole('button', { name: 'chat.sendMessage' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    fireEvent.keyDown(input, { key: 'Enter', isComposing: false })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('caps composer growth and enables internal scrolling after six lines', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true)
    const input = renderComposer('autosize', onSubmit)
    Object.defineProperty(input, 'scrollHeight', { configurable: true, value: 200 })

    fireEvent.change(input, { target: { value: 'multiple lines' } })

    await waitFor(() => {
      expect(input.style.height).toBe('144px')
      expect(input.style.overflowY).toBe('auto')
    })
  })
})

describe('MessageComposer draft persistence', () => {
  it('persists the draft per conversation and restores it when switching', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true)
    setConversationDraft('draft-conv-a', 'draft A')
    setConversationDraft('draft-conv-b', 'draft B')

    function Harness() {
      const [conversationId, setConversationId] = useState('draft-conv-a')
      return (
        <>
          <MessageComposer conversationId={conversationId} onSubmit={onSubmit} />
          <button type="button" onClick={() => setConversationId('draft-conv-b')}>
            switch
          </button>
        </>
      )
    }
    render(<Harness />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    expect(input.value).toBe('draft A')

    fireEvent.change(input, { target: { value: 'draft A typed' } })
    expect(getConversationDraft('draft-conv-a')).toBe('draft A typed')

    fireEvent.click(screen.getByRole('button', { name: 'switch' }))
    await waitFor(() => expect(input.value).toBe('draft B'))
    expect(getConversationDraft('draft-conv-b')).toBe('draft B')
  })
})
