import { RouterProvider } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { CursorGlow } from '@/components/common/CursorGlow'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { LanguageProvider } from '@/app/providers/LanguageProvider'
import { SessionProvider } from '@/app/providers/SessionProvider'
import { router } from '@/app/router'

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <SessionProvider>
          <CursorGlow />
          <RouterProvider router={router} />
          <Toaster position="top-center" richColors closeButton />
        </SessionProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
