/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Set to '/<repo-name>/' for GitHub project pages.
const base = process.env.VITE_BASE ?? '/uccle-climate/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['.nojekyll', 'icons/*'],
      manifest: {
        name: 'Uccle Climate', short_name: 'Uccle Climate',
        description: 'How Brussels temperature changed since 1833',
        theme_color: '#b22222', background_color: '#ffffff',
        display: 'standalone', start_url: base, scope: base,
        icons: [{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,json,png,svg,webmanifest}'],
        runtimeCaching: [
          { urlPattern: /\/data\/thisday\/.*\.json$/, handler: 'CacheFirst', options: { cacheName: 'thisday' } },
          { urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/, handler: 'NetworkFirst', options: { cacheName: 'open-meteo', networkTimeoutSeconds: 5 } },
        ],
      },
    }),
  ],
  test: { environment: 'jsdom', globals: true, setupFiles: './src/setupTests.ts' },
})
