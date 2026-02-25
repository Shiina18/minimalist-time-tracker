import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'fs'
import { execSync } from 'child_process'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

function getVersion() {
  try {
    return execSync('git describe --tags --always --dirty', { encoding: 'utf-8' }).trim()
  } catch {
    return pkg.version
  }
}

export default defineConfig({
  base: process.env.BASE_URL || '/minimalist-time-tracker/',
  define: {
    __APP_VERSION__: JSON.stringify(getVersion()),
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js', 'src/**/*.spec.js'],
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
})
