import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppProvider } from './context/AppContext'
import { registerSW } from 'virtual:pwa-register'

// Auto-register service worker con detección y recarga instantánea de nuevas versiones
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true)
  },
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      // Chequear actualizaciones cada 60 segundos
      setInterval(() => {
        registration.update().catch(() => {})
      }, 60 * 1000)

      // Chequear actualizaciones cuando el usuario abre o vuelve a la app en su teléfono
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(() => {})
        }
      })
      window.addEventListener('focus', () => {
        registration.update().catch(() => {})
      })
    }
  },
})

// Recarga instantánea y automática de la pantalla apenas se activa una nueva versión
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true
      window.location.reload()
    }
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
)

