import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/app/App'
import '@/app/styles/globals.css'
import '@/app/styles/chat.css'
import './i18n'

// Tabler icons mặc định strokeWidth 2 — nét dày, bo tròn, phong cách mũm mĩm như Signal
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
