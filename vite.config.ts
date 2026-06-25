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
        globPatterns: ['**/*.{js,css,html,json,png,svg,webmanifest}'],
        globIgnores: ['**/data/thisday/**'],
        runtimeCaching: [
          { urlPattern: /\/data\/thisday\/.*\.json$/, handler: 'CacheFirst', options: { cacheName: 'thisday' } },
          { urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/, handler: 'NetworkFirst', options: { cacheName: 'open-meteo', networkTimeoutSeconds: 5 } },
        ],
      },
    }),
  ],
  test: { environment: 'jsdom', globals: true, setupFiles: './src/setupTests.ts', css: false },
})
