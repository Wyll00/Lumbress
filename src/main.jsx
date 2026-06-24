import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { LibraryProvider } from './context/LibraryContext.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { PlayerProvider } from './context/PlayerContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'
import { Toaster, sileo } from 'sileo'
import 'sileo/styles.css'
import { isNative } from './config'
import './index.css'
import App from './App.jsx'

// Depuración en dev: poder lanzar toasts desde la consola (window.__sileo.success(...))
if (import.meta.env.DEV && typeof window !== 'undefined') window.__sileo = sileo;

// PWA: registrar el service worker SOLO en la web (en la app nativa Capacitor no hace falta
// y podría servir contenido cacheado tras una actualización).
if (!isNative && import.meta.env.PROD && 'serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <NotificationProvider>
            <LibraryProvider>
              <PlayerProvider>
                <App />
                <Toaster position="top-center" theme="dark" />
              </PlayerProvider>
            </LibraryProvider>
          </NotificationProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
)
