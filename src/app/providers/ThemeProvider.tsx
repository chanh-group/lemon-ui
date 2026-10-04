import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * LemonChat chỉ hỗ trợ light mode.
 * Provider này khóa giao diện ở light và áp thuộc tính `data-theme` để CSS/token
 * luôn nhất quán trên mọi thiết bị (kể cả khi hệ điều hành đang ở dark).
 */
type Theme = 'light'

interface ThemeContextValue {
  theme: Theme
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'light' })

export function useTheme() {
  return useContext(ThemeContext)
}

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme] = useState<Theme>('light')

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = 'light'
    root.style.colorScheme = 'light'
  }, [])

  const value = useMemo(() => ({ theme }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
