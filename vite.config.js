import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  optimizeDeps: {
    exclude: ['sweph-wasm']
  },
  assetsInclude: ['**/*.wasm'],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        tutorial: resolve(__dirname, 'tutorial.html'),
      },
    },
  },
})