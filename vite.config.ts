/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.VITE_BASE ?? '/uccle-climate/'

export default defineConfig({
  base,
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['.nojekyll', 'icons/*'],
      manifest: {
        name: 'Uccle Climate', short_name: 'Uccle Climate',
        description: 'How Brussels temperature changed since 1833',
        theme_color: '#2563eb', background_color: '#f6f8fa',
        display: 'standalone', start_url: base, scope: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Precache the app shell only (no JSON). Data is served NetworkFirst so an
        // installed app always gets the daily-refreshed data when online, with a cache
        // fallback offline. (Old CacheFirst 'thisday' never revalidated → stale recent days.)
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        globIgnores: ['**/data/**'],
        runtimeCaching: [
          { urlPattern: /\/data\/.*\.json$/, handler: 'NetworkFirst',
            options: { cacheName: 'climate-data', networkTimeoutSeconds: 5,
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] } } },
          { urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/, handler: 'NetworkFirst', options: { cacheName: 'open-meteo', networkTimeoutSeconds: 5 } },
        ],
      },
    }),
  ],
  test: { environment: 'jsdom', globals: true, setupFiles: './src/setupTests.ts', css: false },
})
