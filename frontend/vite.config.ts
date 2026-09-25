import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // The app already ships its own public/manifest.json linked from index.html — keep that
      // as the single source of truth instead of having the plugin generate a second one.
      manifest: false,
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        // Precache the built app shell (JS/CSS/HTML/fonts/icons) so the app can still launch
        // with no network at all. API calls are deliberately NOT cached here — they go through
        // TripDataContext's own IndexedDB snapshot instead, which is scoped per signed-in user
        // and updated explicitly on every successful fetch, rather than an opaque HTTP cache.
        navigateFallbackDenylist: [/^\/api\//],
        // The main JS bundle is ~2.6 MB (pdf.js + maplibre + leaflet pull it well past Workbox's
        // 2 MB default) — raise the ceiling instead of trying to shrink it here, since we want it
        // fully precached, not skipped.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  // Mirrors the dev proxy above so `vite preview` (serving the real production build, service
  // worker included) can also reach the local backend — useful for testing the PWA/offline
  // behavior against a real build instead of only the dev server.
  preview: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
