import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { generateUUID } from '@/lib/utils'
import { useAuth } from '@/features/auth/api'
import { CallScreen } from './CallScreen'
import type { CallPreview } from './types'

interface DocumentPipApi {
  readonly window: Window | null
  requestWindow(options: { width: number; height: number }): Promise<Window>
}

interface CallWindowSession {
  id: string
  call: CallPreview
  window: Window
  root: HTMLElement
}

interface CallWindowContextValue {
  openCall: (call: CallPreview, onFallback: () => void) => boolean
  closeCall: () => void
  session: CallWindowSession | null
}

const CallWindowContext = createContext<CallWindowContextValue | null>(null)

export function getDocumentPipApi(target: {
  documentPictureInPicture?: unknown
}): DocumentPipApi | undefined {
  const api = target.documentPictureInPicture
  if (
    typeof api !== 'object' ||
    api === null ||
    !('requestWindow' in api) ||
    typeof api.requestWindow !== 'function' ||
    !('window' in api)
  )
    return undefined
  return api as DocumentPipApi
}

function copyAppStyles(target: Document): void {
  // A PiP document has its own DOM and does not inherit the opener's CSS.
  target.documentElement.className = document.documentElement.className
  target.documentElement.style.colorScheme = getComputedStyle(document.documentElement).colorScheme
  for (const node of document.head.querySelectorAll('link[rel="stylesheet"], style')) {
    if (node instanceof HTMLLinkElement) {
      const link = target.createElement('link')
      link.rel = 'stylesheet'
      link.href = node.href
      link.media = node.media
      target.head.append(link)
    } else {
      target.head.append(target.importNode(node, true))
    }
  }
  target.body.style.margin = '0'
  target.body.style.minWidth = '320px'
  target.body.style.minHeight = '100dvh'
}

export function CallWindowProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const [session, setSession] = useState<CallWindowSession | null>(null)
  const sessionRef = useRef<CallWindowSession | null>(null)
  const opening = useRef(false)
  const generation = useRef(0)

  const closeCall = useCallback(() => {
    generation.current += 1
    const current = sessionRef.current
    sessionRef.current = null
    setSession(null)
    if (current && !current.window.closed) current.window.close()
  }, [])

  const openCall = useCallback((call: CallPreview, onFallback: () => void): boolean => {
    const api = getDocumentPipApi(window as Window & { documentPictureInPicture?: unknown })
    if (!api) return false

    if (sessionRef.current && !sessionRef.current.window.closed) {
      const next = { ...sessionRef.current, id: generateUUID(), call }
      sessionRef.current = next
      next.window.document.title = `LemonChat · ${call.peerName}`
      setSession(next)
      sessionRef.current.window.focus()
      return true
    }
    if (opening.current) return true

    opening.current = true
    const attempt = generation.current
    let openedWindow: Window | null = null
    void api
      .requestWindow({ width: 480, height: 720 })
      .then((pipWindow) => {
        openedWindow = pipWindow
        if (attempt !== generation.current) {
          pipWindow.close()
          openedWindow = null
          return
        }
        const existing = pipWindow.document.getElementById('call-pip-root')
        const root = existing ?? pipWindow.document.createElement('div')
        root.id = 'call-pip-root'
        root.style.cssText = 'width:100%;height:100%;min-height:100dvh;overflow:hidden'
        if (!existing) pipWindow.document.body.append(root)
        copyAppStyles(pipWindow.document)
        pipWindow.document.title = `LemonChat · ${call.peerName}`

        const next: CallWindowSession = { id: generateUUID(), call, window: pipWindow, root }
        sessionRef.current = next
        setSession(next)
        openedWindow = null
        pipWindow.addEventListener(
          'pagehide',
          () => {
            if (sessionRef.current?.window !== pipWindow) return
            generation.current += 1
            sessionRef.current = null
            setSession(null)
          },
          { once: true },
        )
      })
      .catch(() => {
        if (attempt !== generation.current) return
        openedWindow?.close()
        onFallback()
      })
      .finally(() => {
        opening.current = false
      })
    return true
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') closeCall()
  }, [status, closeCall])

  return (
    <CallWindowContext.Provider value={{ openCall, closeCall, session }}>
      {children}
    </CallWindowContext.Provider>
  )
}

export function useCallWindow(): CallWindowContextValue {
  const context = useContext(CallWindowContext)
  if (!context) throw new Error('useCallWindow must be used within CallWindowProvider')
  return context
}

export function CallWindowHost() {
  const { session, closeCall } = useCallWindow()
  if (!session || session.window.closed) return null

  return createPortal(
    <CallScreen
      key={session.id}
      previewCall={session.call}
      previewWindow={session.window}
      onPreviewClose={closeCall}
    />,
    session.root,
  )
}
