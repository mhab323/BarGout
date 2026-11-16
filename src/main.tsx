import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'

import './index.css'
import App from './App.tsx'

// Offline app install for the staff devices only. Guests (QR page) don't need to download
// the whole app in the background.
if (!window.location.pathname.startsWith('/join')) registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
