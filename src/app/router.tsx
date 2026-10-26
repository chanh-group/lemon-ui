import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '@/features/auth/api'
import { ROUTES } from '@/config/constants'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { CallsPage } from '@/pages/CallsPage'
import { NewCallPage } from '@/pages/NewCallPage'
import { NewChatPage } from '@/pages/NewChatPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { StoriesCreatePage } from '@/pages/StoriesCreatePage'
import { StoriesArchivePage } from '@/pages/StoriesArchivePage'
import { NotFoundPage } from '@/pages/NotFoundPage'

function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'restoring') {
    return <div className="min-h-dvh bg-background" aria-busy="true" />
  }

  if (status === 'anonymous') {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />
  }

  return <>{children}</>
}

function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { status } = useAuth()

  if (status === 'authenticated') {
    return <Navigate to={ROUTES.messages} replace />
  }

  return <>{children}</>
}

export const router = createBrowserRouter(
  [
    {
      path: ROUTES.home,
      element: <Navigate to={ROUTES.login} replace />,
    },
    {
      path: ROUTES.login,
      element: (
        <RedirectIfAuthed>
          <LoginPage />
        </RedirectIfAuthed>
      ),
    },
    {
      path: ROUTES.register,
      element: (
        <RedirectIfAuthed>
          <RegisterPage />
        </RedirectIfAuthed>
      ),
    },
    {
      path: ROUTES.forgotPassword,
      element: (
        <RedirectIfAuthed>
          <ForgotPasswordPage />
        </RedirectIfAuthed>
      ),
    },
    {
      path: ROUTES.messages,
      element: (
        <RequireAuth>
          <DashboardPage />
        </RequireAuth>
      ),
    },
    {
      path: ROUTES.conversation,
      element: (
        <RequireAuth>
          <DashboardPage />
        </RequireAuth>
      ),
    },
    {
      path: ROUTES.calls,
      element: (
        <RequireAuth>
          <CallsPage />
        </RequireAuth>
      ),
    },
    {
      path: ROUTES.newCall,
      element: (
        <RequireAuth>
          <NewCallPage />
        </RequireAuth>
      ),
    },
    {
      path: ROUTES.newChat,
      element: (
        <RequireAuth>
          <NewChatPage />
        </RequireAuth>
      ),
    },
    {
      path: ROUTES.storiesCreate,
      element: (
        <RequireAuth>
          <StoriesCreatePage />
        </RequireAuth>
      ),
    },
    {
      path: ROUTES.storiesArchive,
      element: (
        <RequireAuth>
          <StoriesArchivePage />
        </RequireAuth>
      ),
    },
    {
      path: ROUTES.settings,
      element: (
        <RequireAuth>
          <SettingsPage />
        </RequireAuth>
      ),
    },
    // Alias /setting -> /settings
    {
      path: '/setting',
      element: <Navigate to={ROUTES.settings} replace />,
    },
    {
      path: '*',
      element: <NotFoundPage />,
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  },
)
