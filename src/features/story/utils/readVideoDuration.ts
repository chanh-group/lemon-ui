export function readVideoDuration(file: File, signal?: AbortSignal): Promise<number> {
  if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'))

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    let settled = false
    const timeout = setTimeout(
      () => finish(() => reject(new Error('Video metadata timeout'))),
      15000,
    )
    const cleanup = () => {
      clearTimeout(timeout)
      signal?.removeEventListener('abort', onAbort)
      URL.revokeObjectURL(url)
    }
    const finish = (settle: () => void) => {
      if (settled) return
      settled = true
      cleanup()
      settle()
    }
    const onAbort = () => finish(() => reject(new DOMException('Aborted', 'AbortError')))

    video.onloadedmetadata = () => {
      finish(() => resolve(video.duration))
    }
    video.onerror = () => {
      finish(() => reject(new Error('Invalid video')))
    }
    signal?.addEventListener('abort', onAbort)
    video.src = url
  })
}
