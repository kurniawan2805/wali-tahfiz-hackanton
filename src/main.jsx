import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import App from './App'
import './index.css'

const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    {!isLocalhost && <Analytics />}
    {!isLocalhost && <SpeedInsights />}
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => navigator.serviceWorker.register('/sw.js'))
    } else {
      setTimeout(() => navigator.serviceWorker.register('/sw.js'), 1000)
    }
  })
}
