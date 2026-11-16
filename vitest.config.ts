import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  test: {
    // The rules test kit uses the Firebase compat SDK internally; load it as ESM together
    // with the app's modular SDK so both share one Firebase instance.
    server: { deps: { inline: ['@firebase/rules-unit-testing'] } },
  },
})
