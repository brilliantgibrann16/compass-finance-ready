import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    alias: {
      // Memetakan alias '@/' langsung ke folder utama proyek lu
      '@': path.resolve(__dirname, './'),
    },
  },
})