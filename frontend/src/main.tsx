import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import 'maplibre-gl/dist/maplibre-gl.css'
import './styles.css'
import App from './App.tsx'
import { AuthProvider } from './state/AuthContext'
import { ThemeProvider } from './state/ThemeContext'
import { LanguageProvider } from './state/LanguageContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <LanguageProvider>
            <App />
          </LanguageProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

// Let React paint at least one frame before swapping away the static
// pre-JS splash (in index.html), so there's never a blank flash between it
// and React's own loading screen.
requestAnimationFrame(() => requestAnimationFrame(() => {
  document.getElementById('initial-splash')?.remove();
}));
