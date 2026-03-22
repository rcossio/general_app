import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: './__tests__/setup/global.ts',
    setupFiles: ['./__tests__/setup/each.ts'],
    testTimeout: 30000,
    exclude: ['**/node_modules/**', '**/__tests__/_*/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
